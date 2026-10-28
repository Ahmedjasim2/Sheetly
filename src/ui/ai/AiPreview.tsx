import { describeAction } from '../../core/ai'
import type { ActionPlan } from '../../core/ai'
import { useI18n } from '../i18n'

export interface AiPreviewProps {
  readonly plan: ActionPlan
  readonly errors: readonly string[]
  readonly onApply: () => void
  readonly onCancel: () => void
}

export function AiPreview(props: AiPreviewProps) {
  const { t } = useI18n()

  return (
    <div className="ai-preview" role="region" aria-label="AI Preview">
      <p className="ai-preview-summary">{props.plan.summary}</p>
      <ul className="ai-preview-actions">
        {props.plan.actions.map((action, index) => (
          <li key={index} className="ai-preview-action">
            {describeAction(action)}
          </li>
        ))}
      </ul>

      {props.errors.length > 0 && (
        <p className="ai-error" role="alert">
          {props.errors.map((error) => (
            <span key={error}>{error}</span>
          ))}
        </p>
      )}

      <div className="ai-preview-buttons">
        <button
          type="button"
          className="ai-button ai-button-primary"
          onClick={props.onApply}
          disabled={props.errors.length > 0}
        >
          {t('common.apply')}
        </button>
        <button type="button" className="ai-button" onClick={props.onCancel}>
          {t('common.cancel')}
        </button>
      </div>
    </div>
  )
}
