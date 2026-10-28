import { useMemo, useState } from 'react'
import type { Range, Sheet } from '../../core/model'
import {
  applyPlanAction,
  buildSelectionContext,
  defaultConfig,
  interpretResponse,
} from '../../core/ai'
import type { AIOperation, AIProvider, AIResponse, ApplyOutcome } from '../../core/ai'
import { useI18n } from '../i18n'
import { AiPreview } from './AiPreview'

export interface AiPanelProps {
  readonly sheet: Sheet
  readonly selection: Range | null
  readonly visibleRows: readonly number[]
  readonly onApply: (outcome: ApplyOutcome) => void
  /** When provided, the local AI is considered ready (used by tests). */
  readonly providerFactory?: () => AIProvider | null
}

interface ConversationEntry {
  readonly role: 'user' | 'assistant'
  readonly text: string
}

const MAX_CONVERSATION = 8

export function AiPanel(props: AiPanelProps) {
  const { t } = useI18n()
  const { providerFactory } = props
  const ready = providerFactory !== undefined

  const provider = useMemo<AIProvider | null>(
    () => (ready ? (providerFactory?.() ?? null) : null),
    [ready, providerFactory],
  )

  const [operation, setOperation] = useState<AIOperation>('ask')
  const [userText, setUserText] = useState('')
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [result, setResult] = useState<AIResponse | null>(null)
  const [conversation, setConversation] = useState<readonly ConversationEntry[]>([])

  async function handleAsk(): Promise<void> {
    setResult(null)
    setStatusMessage('')

    if (!ready) {
      setStatusMessage('Local AI is not ready')
      return
    }
    if (props.selection === null) {
      setStatusMessage('Select a range first, then ask.')
      return
    }
    if (provider === null) {
      setStatusMessage('Local AI is not ready')
      return
    }
    if (userText.trim() === '') {
      setStatusMessage('Type a request first.')
      return
    }

    const context = buildSelectionContext(props.sheet, props.selection, {
      visibleRows: props.visibleRows,
    })
    const config = defaultConfig('local')

    setLoading(true)
    setConversation((current) =>
      [...current, { role: 'user' as const, text: userText }].slice(-MAX_CONVERSATION),
    )
    try {
      const response = await provider.generate({ operation, userText, context, config })
      const interpreted = interpretResponse({ operation, userText, context, config }, response.text)
      setResult(interpreted)
      setConversation((current) =>
        [...current, { role: 'assistant' as const, text: interpreted.text }].slice(-MAX_CONVERSATION),
      )
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setLoading(false)
    }
  }

  function handleApply(): void {
    if (result === null || result.plan === null) {
      return
    }

    let sheet = props.sheet
    let sheetNotice = ''
    let other: ApplyOutcome | null = null

    for (const action of result.plan.actions) {
      const outcome = applyPlanAction(sheet, action)
      if (outcome.kind === 'sheet') {
        sheet = outcome.sheet
        sheetNotice = outcome.notice
      } else {
        other = outcome
      }
    }

    if (other !== null) {
      props.onApply(other)
    } else {
      props.onApply({ kind: 'sheet', sheet, notice: sheetNotice })
    }
    setResult(null)
  }

  function handleClear(): void {
    setResult(null)
    setConversation([])
    setStatusMessage('')
    setUserText('')
  }

  return (
    <div className="ai-panel">
      <h3 className="ai-panel-title">{t('Sheetly AI')}</h3>

      {!ready ? (
        <div className="ai-not-ready">
          <p className="ai-not-ready-title">{t('Local AI is not ready')}</p>
          <p className="ai-note">{t('Local AI setup will be available in a later phase.')}</p>
        </div>
      ) : (
        <p className="ai-note">{t('Local AI — data stays on this device.')}</p>
      )}

      {statusMessage !== '' && <p className="ai-error">{statusMessage}</p>}

      <div className="ai-request">
        <select
          className="ai-operation"
          aria-label="AI operation"
          value={operation}
          onChange={(event) => setOperation(event.target.value as AIOperation)}
        >
          <option value="ask">{t('Ask about selection')}</option>
          <option value="explain">{t('Explain selection')}</option>
          <option value="suggest">{t('Suggest changes')}</option>
        </select>

        <textarea
          className="ai-request-input"
          aria-label="AI request"
          placeholder="e.g. What is the highest value?"
          value={userText}
          onChange={(event) => setUserText(event.target.value)}
        />

        <button
          type="button"
          className="ai-button ai-button-primary"
          onClick={handleAsk}
          disabled={loading || !ready}
        >
          {loading ? 'Working…' : t('Ask')}
        </button>
      </div>

      {result !== null && (
        <div className="ai-result">
          {result.text !== '' && <p className="ai-result-text">{result.text}</p>}
          {result.plan !== null && (
            <AiPreview
              plan={result.plan}
              errors={result.validationErrors}
              onApply={handleApply}
              onCancel={() => setResult(null)}
            />
          )}
        </div>
      )}

      {conversation.length > 0 && (
        <div className="ai-conversation">
          {conversation.map((entry, index) => (
            <p key={index} className={`ai-conversation-entry ai-conversation-${entry.role}`}>
              {entry.text}
            </p>
          ))}
        </div>
      )}

      <button type="button" className="ai-button ai-clear" onClick={handleClear}>
        {t('Clear conversation')}
      </button>
    </div>
  )
}
