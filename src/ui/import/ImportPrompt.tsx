export interface ImportPromptProps {
  readonly filename: string
  readonly onConfirm: () => void
  readonly onCancel: () => void
}

export function ImportPrompt(props: ImportPromptProps) {
  return (
    <div className="import-prompt" role="dialog" aria-label="Replace data confirmation">
      <p>
        Replace the current data with &ldquo;{props.filename}&rdquo;? This cannot be undone.
      </p>
      <div className="import-prompt-actions">
        <button type="button" onClick={props.onConfirm}>
          Replace data
        </button>
        <button type="button" onClick={props.onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
