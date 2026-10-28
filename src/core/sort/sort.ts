import { formatCellId, getCellValue } from '../model'
import type { Cell, CellId, CellValue, Sheet } from '../model'

export type SortDirection = 'ascending' | 'descending'

function toText(value: string | boolean): string {
  return typeof value === 'boolean' ? (value ? 'true' : 'false') : value
}

/**
 * Compares two cell values for sorting.
 *
 * Documented ordering:
 * - Numbers sort numerically.
 * - Text (and booleans, as `true`/`false`) sort alphabetically.
 * - Numbers come before text when ascending; the order reverses when descending.
 * - Empty cells always sort last, in both directions.
 */
function compareKeys(a: CellValue, b: CellValue, direction: SortDirection): number {
  if (a === null && b === null) {
    return 0
  }
  if (a === null) {
    return 1
  }
  if (b === null) {
    return -1
  }

  if (typeof a === 'number' && typeof b === 'number') {
    return direction === 'ascending' ? a - b : b - a
  }

  if (typeof a === 'number') {
    return direction === 'ascending' ? -1 : 1
  }
  if (typeof b === 'number') {
    return direction === 'ascending' ? 1 : -1
  }

  const comparison = toText(a).localeCompare(toText(b))
  return direction === 'ascending' ? comparison : -comparison
}

/**
 * Sorts the rows in `[startRow, endRow]` by the value in `column`, keeping each
 * row's cells together. Returns a new sheet; the input is never mutated.
 *
 * Already-sorted input returns the same sheet reference.
 */
export function sortRowsByColumn(
  sheet: Sheet,
  column: number,
  startRow: number,
  endRow: number,
  direction: SortDirection,
): Sheet {
  if (column < 0 || column >= sheet.columnCount) {
    throw new RangeError(`sort column ${column} is outside the sheet columns`)
  }
  if (startRow < 0 || endRow >= sheet.rowCount || startRow > endRow) {
    throw new RangeError(`sort rows ${startRow}..${endRow} are outside the sheet`)
  }

  const original: number[] = []
  for (let row = startRow; row <= endRow; row += 1) {
    original.push(row)
  }

  const sorted = original.slice().sort((a, b) =>
    compareKeys(getCellValue(sheet, a, column), getCellValue(sheet, b, column), direction),
  )

  let changed = false
  for (let index = 0; index < original.length; index += 1) {
    if (sorted[index] !== original[index]) {
      changed = true
      break
    }
  }
  if (!changed) {
    return sheet
  }

  const targetRow = new Map<number, number>()
  for (let index = 0; index < sorted.length; index += 1) {
    targetRow.set(sorted[index], startRow + index)
  }

  const cells = new Map<CellId, Cell>()
  for (const [id, cell] of sheet.cells) {
    const nextRow = targetRow.get(cell.row) ?? cell.row
    if (nextRow === cell.row) {
      cells.set(id, cell)
    } else {
      cells.set(formatCellId(nextRow, cell.column), { ...cell, row: nextRow })
    }
  }

  return { ...sheet, cells }
}
