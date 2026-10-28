import { useState } from 'react'
import type { KeyboardEvent } from 'react'

export interface FormulaBarProps {
  readonly selectionLabel: string
  readonly value: string
  readonly onCommit: (value: string) => void
  readonly onCancel: () => void
}

export function FormulaBar(props: FormulaBarProps) {
  const [draft, setDraft] = useState(props.value)
  const disabled = props.selectionLabel === ''

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Enter') {
      event.preventDefault()
      props.onCommit(draft)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setDraft(props.value)
      props.onCancel()
    }
  }

  return (
    <div className="formula-bar" role="toolbar" aria-label="Formula bar">
      <span className="formula-name" aria-label="Selected cells">
        {disabled ? '\u2014' : props.selectionLabel}
      </span>
      <span className="formula-expand" aria-hidden="true">
        {'\u2921'}
      </span>
      <span className="formula-fx" aria-hidden="true">
        fx
      </span>
      <button
        type="button"
        className="formula-button formula-cancel"
        aria-label="Cancel formula edit"
        title="Cancel (Escape)"
        disabled={disabled}
        onClick={() => {
          setDraft(props.value)
          props.onCancel()
        }}
      >
        {'\u2715'}
      </button>
      <button
        type="button"
        className="formula-button formula-confirm"
        aria-label="Commit formula edit"
        title="Commit (Enter)"
        disabled={disabled}
        onClick={() => props.onCommit(draft)}
      >
        {'\u2713'}
      </button>
      <input
        className="formula-input"
        aria-label="Formula bar"
        placeholder={disabled ? 'Select a cell to edit' : 'Type a value and press Enter'}
        value={draft}
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
      />
    </div>
  )
}
