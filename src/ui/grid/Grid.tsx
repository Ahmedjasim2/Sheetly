import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, CSSProperties, KeyboardEvent, MouseEvent } from 'react'
import {
  cellStyleKey,
  columnLabel,
  createRange,
  formatDisplayValue,
  getCellValue,
  rangeContains,
} from '../../core/model'
import type { CellAddress, CellStyle, Sheet } from '../../core/model'
import type { Selection } from '../state/gridState'
import './Grid.css'

export interface GridProps {
  readonly sheet: Sheet
  readonly selection: Selection
  readonly editing: boolean
  readonly draft: string
  /** Cell styles for the active sheet, keyed by `cellStyleKey`. */
  readonly styles?: ReadonlyMap<string, CellStyle>
  /** Sheet row indices to render; defaults to every row. */
  readonly visibleRows?: readonly number[]
  readonly onSelect: (cell: CellAddress) => void
  readonly onExtendSelection: (cell: CellAddress) => void
  readonly onStartEditing: () => void
  readonly onChangeDraft: (value: string) => void
  readonly onCommit: () => void
  readonly onCancel: () => void
}

interface Direction {
  readonly dRow: number
  readonly dColumn: number
}

function directionFromKey(key: string): Direction | null {
  switch (key) {
    case 'ArrowUp':
      return { dRow: -1, dColumn: 0 }
    case 'ArrowDown':
      return { dRow: 1, dColumn: 0 }
    case 'ArrowLeft':
      return { dRow: 0, dColumn: -1 }
    case 'ArrowRight':
      return { dRow: 0, dColumn: 1 }
    default:
      return null
  }
}

function clampAddress(address: CellAddress, sheet: Sheet): CellAddress {
  return {
    row: Math.max(0, Math.min(address.row, sheet.rowCount - 1)),
    column: Math.max(0, Math.min(address.column, sheet.columnCount - 1)),
  }
}

export function Grid(props: GridProps) {
  const { sheet, selection, editing, draft } = props
  const gridRef = useRef<HTMLTableElement>(null)
  const wasEditing = useRef(false)
  const [dragging, setDragging] = useState(false)

  // Return keyboard focus to the grid after an edit finishes.
  useEffect(() => {
    if (wasEditing.current && !editing) {
      gridRef.current?.focus()
    }
    wasEditing.current = editing
  }, [editing])

  const range = selection === null ? null : createRange(selection.anchor, selection.focus)
  const focus = selection === null ? null : selection.focus
  const selectedColumns = new Set<number>()
  const selectedRows = new Set<number>()
  if (range !== null) {
    for (let column = range.start.column; column <= range.end.column; column += 1) {
      selectedColumns.add(column)
    }
    for (let row = range.start.row; row <= range.end.row; row += 1) {
      selectedRows.add(row)
    }
  }
  const rowIndices =
    props.visibleRows ?? Array.from({ length: sheet.rowCount }, (_, index) => index)
  const columns = Array.from({ length: sheet.columnCount }, (_, index) => index)

  function handleGridKeyDown(event: KeyboardEvent<HTMLTableElement>): void {
    if (editing) {
      return
    }

    if (event.key === 'Enter' || event.key === 'F2') {
      event.preventDefault()
      props.onStartEditing()
      return
    }

    const direction = directionFromKey(event.key)
    if (direction !== null && selection !== null) {
      event.preventDefault()
      const target = clampAddress(
        {
          row: selection.focus.row + direction.dRow,
          column: selection.focus.column + direction.dColumn,
        },
        sheet,
      )

      if (event.shiftKey) {
        props.onExtendSelection(target)
      } else {
        props.onSelect(target)
      }
    }
  }

  function handleMouseDown(cell: CellAddress, event: MouseEvent<HTMLTableCellElement>): void {
    gridRef.current?.focus()
    setDragging(true)

    if (event.shiftKey) {
      props.onExtendSelection(cell)
    } else {
      props.onSelect(cell)
    }
  }

  function handleMouseEnter(cell: CellAddress): void {
    if (dragging) {
      props.onExtendSelection(cell)
    }
  }

  return (
    <div className="grid-scroll">
      <table
        ref={gridRef}
        className="grid"
        role="grid"
        aria-label="Spreadsheet grid"
        tabIndex={0}
        onKeyDown={handleGridKeyDown}
        onMouseUp={() => setDragging(false)}
        onMouseLeave={() => setDragging(false)}
      >
        <thead>
          <tr>
            <th className="grid-corner" aria-hidden="true" />
            {columns.map((column) => {
              const classes = ['grid-header']
              if (focus !== null && focus.column === column) {
                classes.push('is-active-col')
              }
              if (selectedColumns.has(column)) {
                classes.push('is-selected')
              }
              return (
                <th key={column} scope="col" className={classes.join(' ')}>
                  {columnLabel(column)}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {rowIndices.map((row) => (
            <tr key={row}>
              <th
                scope="row"
                className={[
                  'grid-header',
                  'grid-row-header',
                  focus !== null && focus.row === row ? 'is-active-row' : '',
                  selectedRows.has(row) ? 'is-selected' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {row + 1}
              </th>
              {columns.map((column) => (
                <GridCell
                  key={column}
                  sheet={sheet}
                  row={row}
                  column={column}
                  selected={range !== null && rangeContains(range, { row, column })}
                  active={
                    selection !== null &&
                    selection.focus.row === row &&
                    selection.focus.column === column
                  }
                  editing={
                    editing &&
                    selection !== null &&
                    selection.focus.row === row &&
                    selection.focus.column === column
                  }
                  draft={draft}
                  style={props.styles?.get(cellStyleKey(row, column))}
                  onMouseDown={(event) => handleMouseDown({ row, column }, event)}
                  onMouseEnter={() => handleMouseEnter({ row, column })}
                  onDoubleClick={() => {
                    props.onSelect({ row, column })
                    props.onStartEditing()
                  }}
                  onChangeDraft={props.onChangeDraft}
                  onCommit={props.onCommit}
                  onCancel={props.onCancel}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface GridCellProps {
  readonly sheet: Sheet
  readonly row: number
  readonly column: number
  readonly selected: boolean
  readonly active: boolean
  readonly editing: boolean
  readonly draft: string
  readonly style?: CellStyle
  readonly onMouseDown: (event: MouseEvent<HTMLTableCellElement>) => void
  readonly onMouseEnter: () => void
  readonly onDoubleClick: () => void
  readonly onChangeDraft: (value: string) => void
  readonly onCommit: () => void
  readonly onCancel: () => void
}

function styleToCss(style: CellStyle | undefined): CSSProperties | undefined {
  if (!style) {
    return undefined
  }

  const css: CSSProperties = {}
  if (style.fontFamily) {
    css.fontFamily = style.fontFamily
  }
  if (style.fontSize !== undefined) {
    css.fontSize = `${style.fontSize}px`
  }
  if (style.bold) {
    css.fontWeight = 700
  }
  if (style.italic) {
    css.fontStyle = 'italic'
  }
  const decorations: string[] = []
  if (style.underline) {
    decorations.push('underline')
  }
  if (style.strikethrough) {
    decorations.push('line-through')
  }
  if (decorations.length > 0) {
    css.textDecoration = decorations.join(' ')
  }
  if (style.textColor) {
    css.color = style.textColor
  }
  if (style.backgroundColor) {
    css.backgroundColor = style.backgroundColor
  }
  if (style.align) {
    css.textAlign = style.align
  }
  if (style.verticalAlign) {
    css.verticalAlign = style.verticalAlign
  }
  if (style.wrap) {
    css.whiteSpace = 'normal'
    css.wordBreak = 'break-word'
  }
  if (style.border === 'all') {
    css.border = '1px solid var(--grid-border-strong, #9aa3b2)'
  }
  if (style.border === 'none') {
    css.borderStyle = 'none'
  }
  return css
}

function GridCell(props: GridCellProps) {
  const { sheet, row, column, selected, active, editing, draft, style } = props

  if (editing) {
    function handleChange(event: ChangeEvent<HTMLInputElement>): void {
      props.onChangeDraft(event.target.value)
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
      if (event.key === 'Enter') {
        event.preventDefault()
        props.onCommit()
      } else if (event.key === 'Escape') {
        event.preventDefault()
        props.onCancel()
      }
    }

    return (
      <td
        className="grid-cell is-selected is-focus is-editing"
        role="gridcell"
        aria-selected="true"
        style={styleToCss(style)}
      >
        <input
          className="grid-input"
          value={draft}
          aria-label={`Edit cell ${columnLabel(column)}${row + 1}`}
          autoFocus
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={() => props.onCommit()}
        />
      </td>
    )
  }

  const className = [
    'grid-cell',
    selected ? 'is-selected' : '',
    active ? 'is-focus' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <td
      className={className}
      role="gridcell"
      aria-selected={selected}
      style={styleToCss(style)}
      onMouseDown={props.onMouseDown}
      onMouseEnter={props.onMouseEnter}
      onDoubleClick={props.onDoubleClick}
    >
      {formatDisplayValue(getCellValue(sheet, row, column), style)}
    </td>
  )
}
