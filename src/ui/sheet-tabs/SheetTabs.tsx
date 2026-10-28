import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { Sheet } from '../../core/model'

export interface SheetTabsProps {
  readonly sheets: readonly Sheet[]
  readonly activeId: string
  readonly onSelect: (id: string) => void
  readonly onAdd: () => void
  readonly onRename: (id: string, name: string) => void
}

export function SheetTabs(props: SheetTabsProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingId !== null) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editingId])

  const activeIndex = props.sheets.findIndex((sheet) => sheet.id === props.activeId)

  function goTo(offset: number): void {
    const target = props.sheets[activeIndex + offset]
    if (target) {
      props.onSelect(target.id)
    }
  }

  function startRename(sheet: Sheet): void {
    setEditingId(sheet.id)
    setDraft(sheet.name)
  }

  function commit(): void {
    if (editingId === null) {
      return
    }
    props.onRename(editingId, draft)
    setEditingId(null)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Enter') {
      event.preventDefault()
      commit()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setEditingId(null)
    }
  }

  return (
    <div className="sheet-tabs" role="tablist" aria-label="Sheets">
      <div className="sheet-nav">
        <button
          type="button"
          className="sheet-nav-button"
          aria-label="First sheet"
          title="First sheet"
          disabled={activeIndex <= 0}
          onClick={() => props.onSelect(props.sheets[0].id)}
        >
          {'\u226A'}
        </button>
        <button
          type="button"
          className="sheet-nav-button"
          aria-label="Previous sheet"
          title="Previous sheet"
          disabled={activeIndex <= 0}
          onClick={() => goTo(-1)}
        >
          {'\u2039'}
        </button>
        <button
          type="button"
          className="sheet-nav-button"
          aria-label="Next sheet"
          title="Next sheet"
          disabled={activeIndex < 0 || activeIndex >= props.sheets.length - 1}
          onClick={() => goTo(1)}
        >
          {'\u203A'}
        </button>
        <button
          type="button"
          className="sheet-nav-button"
          aria-label="Last sheet"
          title="Last sheet"
          disabled={activeIndex < 0 || activeIndex >= props.sheets.length - 1}
          onClick={() => props.onSelect(props.sheets[props.sheets.length - 1].id)}
        >
          {'\u226B'}
        </button>
        <button
          type="button"
          className="sheet-nav-button sheet-add"
          aria-label="Add sheet"
          title="Add sheet"
          onClick={props.onAdd}
        >
          +
        </button>
      </div>

      <div className="sheet-tab-list">
        {props.sheets.map((sheet) => {
          const active = sheet.id === props.activeId
          return editingId === sheet.id ? (
            <input
              key={sheet.id}
              ref={inputRef}
              className="sheet-rename"
              aria-label={`Rename ${sheet.name}`}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={commit}
            />
          ) : (
            <button
              key={sheet.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`sheet-tab${active ? ' is-active' : ''}`}
              title={`${sheet.name} (double-click to rename)`}
              onClick={() => props.onSelect(sheet.id)}
              onDoubleClick={() => startRename(sheet)}
            >
              {sheet.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
