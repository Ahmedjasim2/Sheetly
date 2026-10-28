export interface ConfirmDialogProps {
  readonly title: string
  readonly message: string
  readonly confirmLabel: string
  readonly onConfirm: () => void
  readonly onCancel: () => void
}

export function ConfirmDialog(props: ConfirmDialogProps) {
  return (
    <div className="modal-backdrop">
      <div className="confirm-dialog" role="dialog" aria-label={props.title}>
        <h2 className="confirm-title">{props.title}</h2>
        <p className="confirm-message">{props.message}</p>
        <div className="confirm-actions">
          <button type="button" className="confirm-primary" onClick={props.onConfirm}>
            {props.confirmLabel}
          </button>
          <button type="button" onClick={props.onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
