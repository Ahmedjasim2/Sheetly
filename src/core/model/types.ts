/**
 * Core spreadsheet data model.
 *
 * Guarantees:
 * - Pure TypeScript: no React, DOM, or browser APIs.
 * - Immutable: every operation returns a new object and never mutates its input.
 * - Sparse: only cells that hold a value are stored.
 * - Coordinates are zero-based (`row: 0, column: 0` is the top-left cell).
 *
 * Empty-cell semantics:
 * - A cell that was never written, was cleared with `null`, or was removed by a
 *   row/column deletion reads as `null`.
 * - An empty string (`''`), `0`, and `false` are real values, not empty cells.
 * - Reading or writing outside the sheet bounds throws a `RangeError`.
 */

/** A value a cell can hold. `null` means "no value". */
export type CellValue = string | number | boolean | null

/** A value actually stored in a cell; empty cells are absent instead of stored. */
export type StoredCellValue = Exclude<CellValue, null>

/** Stable address key for a cell, for example `A1` or `AB10`. */
export type CellId = string

export interface CellAddress {
  readonly row: number
  readonly column: number
}

/**
 * A stored, non-empty cell.
 *
 * Cells live in `Sheet.cells` keyed by their `CellId`. `row` and `column` are
 * duplicated on the cell so row/column operations can move cells without
 * re-parsing their key.
 */
export interface Cell {
  readonly row: number
  readonly column: number
  readonly value: StoredCellValue
}

export interface Sheet {
  readonly id: string
  readonly name: string
  readonly rowCount: number
  readonly columnCount: number
  /** Sparse map from `CellId` (for example `A1`) to stored cells only. */
  readonly cells: ReadonlyMap<CellId, Cell>
}

export interface Workbook {
  readonly id: string
  readonly name: string
  readonly sheets: readonly Sheet[]
}

/**
 * A rectangular block of cells.
 *
 * Ranges built with `createRange` are normalized: `start` is the top-left
 * corner and `end` is the bottom-right corner, regardless of the order of the
 * points passed in.
 */
export interface Range {
  readonly start: CellAddress
  readonly end: CellAddress
}
