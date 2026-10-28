import { privacyLabel } from '../../core/ai'
import type { AIMode } from '../../core/ai'

export interface AiStatusProps {
  readonly mode: AIMode
  readonly endpoint: string
  readonly loading: boolean
  readonly statusMessage: string
}

export function AiStatus(props: AiStatusProps) {
  const label = privacyLabel(props.mode, props.endpoint)

  return (
    <div className={`ai-status ai-status-${props.mode}`} aria-live="polite">
      <span className="ai-status-dot" aria-hidden="true" />
      <span className="ai-status-label">{label}</span>
      {props.loading && <span className="ai-status-loading">Working…</span>}
      {props.statusMessage !== '' && <span className="ai-status-message">{props.statusMessage}</span>}
    </div>
  )
}
