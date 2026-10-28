import { formatCellId, getCellValue } from '../model'
import type { Cell, CellId, CellValue, Sheet } from '../model'

/**
 * Converts an ExcelJS-style raw cell value into our `CellValue`.
 *
 * - null/undefined -> null (empty).
 * - string/number/boolean -> as-is.
 * - Date -> ISO string (`toISOString`); dates are imported as text.
 * - formula object `{ formula, result }` -> the formula text (never evaluated).
 * - hyperlink object `{ text }` -> the display text.
 * - rich text -> joined plain text.
 * - anything else -> its string form.
 */
export function excelCellToValue(raw: unknown): CellValue {
  if (raw === null || raw === undefined) {
    return null
  }
  if (typeof raw === 'string') {
    return raw
  }
  if (typeof raw === 'number') {
    return raw
  }
  if (typeof raw === 'boolean') {
    return raw
  }
  if (raw instanceof Date) {
    return raw.toISOString()
  }

  if (typeof raw === 'object') {
    const object = raw as Record<string, unknown>

    if (object.formula !== undefined) {
      return String(object.formula)
    }
    if (object.result !== undefined) {
      return excelCellToValue(object.result)
    }
    if (object.text !== undefined) {
      return String(object.text)
    }
    if (Array.isArray(object.richText)) {
      return object.richText
        .map((part) => (typeof part === 'object' && part !== null && 'text' in part ? String((part as { text: unknown }).text) : ''))
        .join('')
    }
    return JSON.stringify(raw)
  }

  return String(raw)
}

/** Renders a sheet as a rectangular grid of `CellValue`s (types preserved). */
export function sheetToCellValues(sheet: Sheet): CellValue[][] {
  const rows: CellValue[][] = []

  for (let row = 0; row < sheet.rowCount; row += 1) {
    const values: CellValue[] = []
    for (let column = 0; column < sheet.columnCount; column += 1) {
      values.push(getCellValue(sheet, row, column))
    }
    rows.push(values)
  }

  return rows
}

export interface CellValuesToSheetOptions {
  readonly id: string
  readonly name: string
}

/** Builds a sheet from a grid of cell values; empty (`null`) cells are not stored. */
export function cellValuesToSheet(
  rows: readonly (readonly CellValue[])[],
  options: CellValuesToSheetOptions,
): Sheet {
  const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0)
  const cells = new Map<CellId, Cell>()

  for (let row = 0; row < rows.length; row += 1) {
    const values = rows[row]
    for (let column = 0; column < values.length; column += 1) {
      const value = values[column]
      if (value !== null) {
        cells.set(formatCellId(row, column), { row, column, value })
      }
    }
  }

  return { id: options.id, name: options.name, rowCount: rows.length, columnCount, cells }
}
