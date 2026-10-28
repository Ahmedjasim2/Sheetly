import { columnLabel, formatCellId, getCellValue } from '../model'
import type { CellValue, Range, Sheet } from '../model'
import type { SelectionContext } from './types'

export interface ContextOptions {
  readonly maxCells: number
  readonly maxChars: number
  /** Row indices currently visible; hidden rows inside the range are excluded. */
  readonly visibleRows?: readonly number[]
}

export const DEFAULT_MAX_CELLS = 200
export const DEFAULT_MAX_CHARS = 8000

function typeName(value: CellValue): string {
  if (value === null) {
    return 'empty'
  }
  if (typeof value === 'number') {
    return 'number'
  }
  if (typeof value === 'boolean') {
    return 'boolean'
  }
  return 'text'
}

/**
 * Builds a safe, bounded context from the selected range. It never reads cells
 * outside the selection and never includes sheet names, file paths, or any
 * system/configuration data.
 */
export function buildSelectionContext(
  sheet: Sheet,
  selection: Range,
  options: Partial<ContextOptions> = {},
): SelectionContext {
  const maxCells = options.maxCells ?? DEFAULT_MAX_CELLS
  const maxChars = options.maxChars ?? DEFAULT_MAX_CHARS
  const visibleRows = options.visibleRows

  const startRow = Math.max(0, selection.start.row)
  const startColumn = Math.max(0, selection.start.column)
  const endRow = Math.min(sheet.rowCount - 1, selection.end.row)
  const endColumn = Math.min(sheet.columnCount - 1, selection.end.column)

  const columns: string[] = []
  for (let column = startColumn; column <= endColumn; column += 1) {
    columns.push(columnLabel(column))
  }

  const visibleSet = visibleRows ? new Set(visibleRows) : null
  const rows: CellValue[][] = []
  const warnings: string[] = []
  let cellCount = 0
  let charBudget = maxChars
  let truncated = false
  let hiddenExcluded = 0

  for (let row = startRow; row <= endRow && !truncated; row += 1) {
    if (visibleSet !== null && !visibleSet.has(row)) {
      hiddenExcluded += 1
      continue
    }

    const values: CellValue[] = []
    for (let column = startColumn; column <= endColumn; column += 1) {
      if (cellCount >= maxCells) {
        truncated = true
        break
      }
      const value = getCellValue(sheet, row, column)
      values.push(value)
      cellCount += 1
      charBudget -= value === null ? 0 : String(value).length
      if (charBudget <= 0) {
        truncated = true
      }
    }
    rows.push(values)
  }

  if (hiddenExcluded > 0) {
    warnings.push(`${hiddenExcluded} hidden row(s) inside the selection were excluded.`)
  }
  if (truncated) {
    warnings.push('The selection was truncated because it exceeded the cell or text limits.')
  }

  const rangeLabel =
    startRow === endRow && startColumn === endColumn
      ? formatCellId(startRow, startColumn)
      : `${formatCellId(startRow, startColumn)}:${formatCellId(endRow, endColumn)}`

  const firstRow = rows[0]
  const header =
    firstRow !== undefined &&
    firstRow.length > 0 &&
    firstRow.every((value) => typeof value === 'string' && value.trim() !== '')
      ? (firstRow as readonly string[])
      : null

  return {
    rangeLabel,
    range: {
      start: { row: startRow, column: startColumn },
      end: { row: endRow, column: endColumn },
    },
    rowCount: Math.max(0, endRow - startRow + 1),
    columnCount: Math.max(0, endColumn - startColumn + 1),
    cellCount,
    columns,
    header,
    rows,
    truncated,
    warnings,
  }
}

/** Renders the context as a compact, typed text block for the model prompt. */
export function contextToText(context: SelectionContext): string {
  const lines: string[] = []
  lines.push(
    `Range: ${context.rangeLabel} (${context.rowCount} rows, ${context.columnCount} columns)`,
  )
  if (context.header !== null && context.header.length > 0) {
    lines.push(`Columns: ${context.header.join(' | ')}`)
  }
  for (const row of context.rows) {
    lines.push(
      row.map((value) => (value === null ? '(empty)' : `${JSON.stringify(value)} [${typeName(value)}]`)).join('\t'),
    )
  }
  if (context.warnings.length > 0) {
    lines.push(`Warnings: ${context.warnings.join(' ')}`)
  }
  return lines.join('\n')
}
