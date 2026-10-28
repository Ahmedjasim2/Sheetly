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
      setStatusMessage(t('ai.localNotReady'))
      return
    }
    if (props.selection === null) {
      setStatusMessage(t('ai.selectRangeFirst'))
      return
    }
    if (provider === null) {
      setStatusMessage(t('ai.localNotReady'))
      return
    }
    if (userText.trim() === '') {
      setStatusMessage(t('ai.typeRequestFirst'))
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
        [
          ...current,
          { role: 'assistant' as const, text: interpreted.text },
        ].slice(-MAX_CONVERSATION),
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
      <h3 className="ai-panel-title">{t('sidebar.sheetlyAi')}</h3>

      {!ready ? (
        <div className="ai-not-ready">
          <p className="ai-not-ready-title">{t('ai.localNotReady')}</p>
          <p className="ai-note">{t('ai.localSetupLater')}</p>
        </div>
      ) : (
        <p className="ai-note">{t('ai.dataStays')}</p>
      )}

      {statusMessage !== '' && (
        <p className="ai-error" role="alert">
          {statusMessage}
        </p>
      )}

      <div className="ai-request">
        <select
          className="ai-operation"
          aria-label={t('ai.operationLabel')}
          value={operation}
          onChange={(event) => setOperation(event.target.value as AIOperation)}
        >
          <option value="ask">{t('ai.askSelection')}</option>
          <option value="explain">{t('ai.explainSelection')}</option>
          <option value="suggest">{t('ai.suggestChanges')}</option>
        </select>

        <textarea
          className="ai-request-input"
          aria-label={t('ai.requestLabel')}
          placeholder={t('ai.placeholder')}
          value={userText}
          onChange={(event) => setUserText(event.target.value)}
        />

        <button
          type="button"
          className="ai-button ai-button-primary"
          onClick={handleAsk}
          disabled={loading || !ready}
        >
          {loading ? t('ai.working') : t('ai.ask')}
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
        {t('ai.clearConversation')}
      </button>
    </div>
  )
}
