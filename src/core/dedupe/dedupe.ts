import { createRange, formatCellId, getCellValue } from '../model'
import type { Cell, CellId, CellValue, Range, Sheet } from '../model'

export interface DedupeResult {
  readonly sheet: Sheet
  readonly removedRows: number
  /** Old row indices that remain, in order (within the range). */
  readonly keptRows: readonly number[]
}

/** Encodes a cell value with its type, so `1` and `"1"` are distinct. */
function cellKeyPart(value: CellValue): string {
  if (value === null) {
    return 'null'
  }
  if (typeof value === 'number') {
    return `n:${value}`
  }
  if (typeof value === 'boolean') {
    return value ? 'b:1' : 'b:0'
  }
  return `s:${JSON.stringify(value)}`
}

function rowKey(sheet: Sheet, row: number, keyStart: number, keyEnd: number): string {
  const parts: string[] = []
  for (let column = keyStart; column <= keyEnd; column += 1) {
    parts.push(cellKeyPart(getCellValue(sheet, row, column)))
  }
  return parts.join('\u0000')
}

/**
 * Removes duplicate rows within the range.
 *
 * The comparison key is built from every column of the range; the first
 * occurrence of each key is kept and later duplicates are removed. Values are
 * compared with their types (number `1` differs from text `"1"`; `null` equals
 * `null`; booleans compare as booleans). The row and column order are
 * otherwise preserved.
 */
export function removeDuplicateRows(sheet: Sheet, range: Range): DedupeResult {
  const normalized = createRange(range.start, range.end)
  const startRow = Math.max(0, normalized.start.row)
  const endRow = Math.min(sheet.rowCount - 1, normalized.end.row)
  const keyStart = Math.max(0, normalized.start.column)
  const keyEnd = Math.min(sheet.columnCount - 1, normalized.end.column)

  const keptRows: number[] = []
  const seen = new Set<string>()
  for (let row = startRow; row <= endRow; row += 1) {
    const key = rowKey(sheet, row, keyStart, keyEnd)
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    keptRows.push(row)
  }

  const removedRows = endRow - startRow + 1 - keptRows.length
  if (removedRows === 0) {
    return { sheet, removedRows: 0, keptRows }
  }

  const keptPosition = new Map<number, number>()
  for (let index = 0; index < keptRows.length; index += 1) {
    keptPosition.set(keptRows[index], startRow + index)
  }

  const cells = new Map<CellId, Cell>()
  for (const [id, cell] of sheet.cells) {
    let newRow = cell.row
    if (cell.row >= startRow && cell.row <= endRow) {
      const mapped = keptPosition.get(cell.row)
      if (mapped === undefined) {
        continue
      }
      newRow = mapped
    } else if (cell.row > endRow) {
      newRow = cell.row - removedRows
    }

    if (newRow === cell.row) {
      cells.set(id, cell)
    } else {
      cells.set(formatCellId(newRow, cell.column), { ...cell, row: newRow })
    }
  }

  return {
    sheet: { ...sheet, rowCount: sheet.rowCount - removedRows, cells },
    removedRows,
    keptRows,
  }
}
