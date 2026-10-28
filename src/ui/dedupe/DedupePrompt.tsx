import { useI18n } from '../i18n'

export interface DedupePromptProps {
  readonly removedRows: number
  readonly onConfirm: () => void
  readonly onCancel: () => void
}

export function DedupePrompt(props: DedupePromptProps) {
  const { t } = useI18n()

  return (
    <div className="import-prompt" role="dialog" aria-label={t('dedupe.dialog')}>
      <p>{t('dedupe.prompt', { count: props.removedRows })}</p>
      <div className="import-prompt-actions">
        <button type="button" onClick={props.onConfirm}>
          {t('dedupe.removeRows')}
        </button>
        <button type="button" onClick={props.onCancel}>
          {t('common.cancel')}
        </button>
      </div>
    </div>
  )
}
