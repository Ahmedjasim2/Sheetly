export interface DedupePromptProps {
  readonly removedRows: number
  readonly onConfirm: () => void
  readonly onCancel: () => void
}

export function DedupePrompt(props: DedupePromptProps) {
  return (
    <div className="import-prompt" role="dialog" aria-label="Remove duplicate rows confirmation">
      <p>Remove {props.removedRows} duplicate rows?</p>
      <div className="import-prompt-actions">
        <button type="button" onClick={props.onConfirm}>
          Remove rows
        </button>
        <button type="button" onClick={props.onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
