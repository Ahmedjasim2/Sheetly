import { useEffect, useRef, useState } from 'react'

export interface FindBarProps {
  /** Increment to move focus to the find input. */
  readonly focusToken?: number
  readonly onFindNext: (query: string, caseSensitive: boolean) => void
  readonly onReplaceCurrent: (query: string, replacement: string, caseSensitive: boolean) => void
  readonly onReplaceAll: (query: string, replacement: string, caseSensitive: boolean) => void
}

export function FindBar(props: FindBarProps) {
  const [query, setQuery] = useState('')
  const [replacement, setReplacement] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(true)
  const findRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (props.focusToken !== undefined && props.focusToken > 0) {
      findRef.current?.focus()
      findRef.current?.select()
    }
  }, [props.focusToken])

  return (
    <div className="find-bar" role="group" aria-label="Find and replace">
      <span className="filter-label">Find and replace</span>
      <input
        ref={findRef}
        type="text"
        aria-label="Find text"
        placeholder="Find"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <input
        type="text"
        aria-label="Replace text"
        placeholder="Replace with"
        value={replacement}
        onChange={(event) => setReplacement(event.target.value)}
      />
      <label className="find-case">
        <input
          type="checkbox"
          checked={caseSensitive}
          onChange={(event) => setCaseSensitive(event.target.checked)}
        />
        Case sensitive
      </label>
      <button type="button" onClick={() => props.onFindNext(query, caseSensitive)} disabled={query === ''}>
        Find next
      </button>
      <button
        type="button"
        onClick={() => props.onReplaceCurrent(query, replacement, caseSensitive)}
        disabled={query === ''}
      >
        Replace current
      </button>
      <button
        type="button"
        onClick={() => props.onReplaceAll(query, replacement, caseSensitive)}
        disabled={query === ''}
      >
        Replace all
      </button>
    </div>
  )
}
