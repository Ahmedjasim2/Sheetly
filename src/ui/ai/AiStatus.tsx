import { privacyLabel } from '../../core/ai'
import type { AIMode } from '../../core/ai'
import { useI18n } from '../i18n'

export interface AiStatusProps {
  readonly mode: AIMode
  readonly endpoint: string
  readonly loading: boolean
  readonly statusMessage: string
}

export function AiStatus(props: AiStatusProps) {
  const { t } = useI18n()
  const label = privacyLabel(props.mode, props.endpoint)

  return (
    <div className={`ai-status ai-status-${props.mode}`} aria-live="polite">
      <span className="ai-status-dot" aria-hidden="true" />
      <span className="ai-status-label">{label}</span>
      {props.loading && <span className="ai-status-loading">{t('common.working')}</span>}
      {props.statusMessage !== '' && (
        <span className="ai-status-message">{props.statusMessage}</span>
      )}
    </div>
  )
}
