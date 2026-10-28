import { useI18n } from '../i18n'

export interface ImportPromptProps {
  readonly filename: string
  readonly onConfirm: () => void
  readonly onCancel: () => void
}

export function ImportPrompt(props: ImportPromptProps) {
  const { t } = useI18n()

  return (
    <div className="import-prompt" role="dialog" aria-label={t('import.dialog')}>
      <p>{t('import.prompt', { filename: props.filename })}</p>
      <div className="import-prompt-actions">
        <button type="button" onClick={props.onConfirm}>
          {t('import.replaceData')}
        </button>
        <button type="button" onClick={props.onCancel}>
          {t('common.cancel')}
        </button>
      </div>
    </div>
  )
}
