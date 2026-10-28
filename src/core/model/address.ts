import type { CellAddress, CellId, Range } from './types'
import { assertNonNegativeInteger } from './validation'

/** Converts a zero-based column index to a spreadsheet label: 0 -> A, 26 -> AA. */
export function columnLabel(column: number): string {
  assertNonNegativeInteger(column, 'column')

  let label = ''
  let remaining = column

  while (remaining >= 0) {
    label = String.fromCharCode(65 + (remaining % 26)) + label
    remaining = Math.floor(remaining / 26) - 1
  }

  return label
}

/** Returns the address key for a cell: (0, 0) -> "A1". */
export function formatCellId(row: number, column: number): CellId {
  assertNonNegativeInteger(row, 'row')
  return `${columnLabel(column)}${row + 1}`
}

export function assertCellAddress(address: CellAddress): void {
  if (typeof address !== 'object' || address === null) {
    throw new TypeError('address must be an object with row and column')
  }

  assertNonNegativeInteger(address.row, 'address.row')
  assertNonNegativeInteger(address.column, 'address.column')
}

/** Builds a normalized range from any two corner cells. */
export function createRange(first: CellAddress, second: CellAddress): Range {
  assertCellAddress(first)
  assertCellAddress(second)

  return {
    start: {
      row: Math.min(first.row, second.row),
      column: Math.min(first.column, second.column),
    },
    end: {
      row: Math.max(first.row, second.row),
      column: Math.max(first.column, second.column),
    },
  }
}

/** True when the address falls inside the range, including its edges. */
export function rangeContains(range: Range, address: CellAddress): boolean {
  assertCellAddress(address)

  const top = Math.min(range.start.row, range.end.row)
  const bottom = Math.max(range.start.row, range.end.row)
  const left = Math.min(range.start.column, range.end.column)
  const right = Math.max(range.start.column, range.end.column)

  return address.row >= top && address.row <= bottom && address.column >= left && address.column <= right
}

export interface RangeDimensions {
  readonly rows: number
  readonly columns: number
}

/** Number of rows and columns covered by a range, regardless of corner order. */
export function rangeDimensions(range: Range): RangeDimensions {
  assertCellAddress(range.start)
  assertCellAddress(range.end)

  return {
    rows: Math.abs(range.end.row - range.start.row) + 1,
    columns: Math.abs(range.end.column - range.start.column) + 1,
  }
}
