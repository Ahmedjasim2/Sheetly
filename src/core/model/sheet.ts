import { formatCellId } from './address'
import type { Cell, CellId, CellValue, Sheet, StoredCellValue } from './types'
import {
  assertNonEmptyString,
  assertNonNegativeInteger,
  assertPositiveInteger,
} from './validation'

export interface CreateSheetOptions {
  readonly id: string
  readonly name: string
  readonly rowCount: number
  readonly columnCount: number
}

/**
 * Creates an empty sheet. Dimensions may be zero, in which case no cell can be
 * read or written until rows or columns are inserted.
 */
export function createSheet(options: CreateSheetOptions): Sheet {
  assertNonEmptyString(options.id, 'sheet id')
  assertNonEmptyString(options.name, 'sheet name')
  assertNonNegativeInteger(options.rowCount, 'rowCount')
  assertNonNegativeInteger(options.columnCount, 'columnCount')

  return {
    id: options.id,
    name: options.name,
    rowCount: options.rowCount,
    columnCount: options.columnCount,
    cells: new Map(),
  }
}

function assertCellInBounds(sheet: Sheet, row: number, column: number): void {
  assertNonNegativeInteger(row, 'row')
  assertNonNegativeInteger(column, 'column')

  if (row >= sheet.rowCount || column >= sheet.columnCount) {
    throw new RangeError(
      `Cell (${row}, ${column}) is outside sheet bounds ${sheet.rowCount}x${sheet.columnCount}`,
    )
  }
}

function assertStoredCellValue(value: unknown): asserts value is StoredCellValue {
  if (typeof value === 'string' || typeof value === 'boolean') {
    return
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return
  }

  throw new TypeError('Cell value must be a string, a finite number, a boolean, or null')
}

/** Returns the stored cell, or `undefined` when the cell is empty. */
export function getCell(sheet: Sheet, row: number, column: number): Cell | undefined {
  assertCellInBounds(sheet, row, column)
  return sheet.cells.get(formatCellId(row, column))
}

/** Returns the cell value, or `null` when the cell is empty. */
export function getCellValue(sheet: Sheet, row: number, column: number): CellValue {
  return getCell(sheet, row, column)?.value ?? null
}

/** True when the cell currently holds a value. */
export function hasCell(sheet: Sheet, row: number, column: number): boolean {
  return getCell(sheet, row, column) !== undefined
}

/**
 * Writes a cell value and returns a new sheet.
 *
 * - `null` clears the cell; clearing an already-empty cell returns the same sheet.
 * - The empty string, `0`, and `false` are stored as real values.
 * - `NaN`, `Infinity`, `undefined`, and non-primitive values throw a `TypeError`.
 */
export function setCellValue(
  sheet: Sheet,
  row: number,
  column: number,
  value: CellValue,
): Sheet {
  assertCellInBounds(sheet, row, column)

  const id = formatCellId(row, column)
  const existing = sheet.cells.get(id)

  if (value === null) {
    if (existing === undefined) {
      return sheet
    }

    const cells = new Map(sheet.cells)
    cells.delete(id)
    return { ...sheet, cells }
  }

  assertStoredCellValue(value)

  if (existing !== undefined && existing.value === value) {
    return sheet
  }

  const cells = new Map(sheet.cells)
  cells.set(id, { row, column, value })
  return { ...sheet, cells }
}

function rebuildCells(
  sheet: Sheet,
  move: (cell: Cell) => Cell | null,
): ReadonlyMap<CellId, Cell> {
  const cells = new Map<CellId, Cell>()

  for (const cell of sheet.cells.values()) {
    const next = move(cell)
    if (next !== null) {
      cells.set(formatCellId(next.row, next.column), next)
    }
  }

  return cells
}

function assertInsertPosition(position: number, size: number, axis: 'row' | 'column'): void {
  assertNonNegativeInteger(position, `${axis} insertion index`)

  if (position > size) {
    throw new RangeError(
      `${axis} insertion index ${position} is beyond the sheet size ${size}`,
    )
  }
}

function assertDeleteWindow(
  position: number,
  count: number,
  size: number,
  axis: 'row' | 'column',
): void {
  assertNonNegativeInteger(position, `${axis} deletion index`)
  assertPositiveInteger(count, `${axis} deletion count`)

  if (position >= size) {
    throw new RangeError(`${axis} deletion index ${position} is outside the sheet size ${size}`)
  }

  if (position + count > size) {
    throw new RangeError(
      `Cannot delete ${count} ${axis}s starting at ${position} from a sheet with ${size}`,
    )
  }
}

/** Inserts empty rows at `index`, shifting lower rows down. */
export function insertRows(sheet: Sheet, index: number, count = 1): Sheet {
  assertInsertPosition(index, sheet.rowCount, 'row')
  assertPositiveInteger(count, 'row insertion count')

  const rowCount = sheet.rowCount + count
  assertNonNegativeInteger(rowCount, 'resulting rowCount')

  const cells = rebuildCells(sheet, (cell) =>
    cell.row >= index ? { ...cell, row: cell.row + count } : cell,
  )

  return { ...sheet, rowCount, cells }
}

/** Deletes `count` rows starting at `index`, shifting lower rows up. */
export function deleteRows(sheet: Sheet, index: number, count = 1): Sheet {
  assertDeleteWindow(index, count, sheet.rowCount, 'row')

  const cells = rebuildCells(sheet, (cell) => {
    if (cell.row >= index && cell.row < index + count) {
      return null
    }

    return cell.row >= index + count ? { ...cell, row: cell.row - count } : cell
  })

  return { ...sheet, rowCount: sheet.rowCount - count, cells }
}

/** Inserts empty columns at `index`, shifting right-hand columns to the right. */
export function insertColumns(sheet: Sheet, index: number, count = 1): Sheet {
  assertInsertPosition(index, sheet.columnCount, 'column')
  assertPositiveInteger(count, 'column insertion count')

  const columnCount = sheet.columnCount + count
  assertNonNegativeInteger(columnCount, 'resulting columnCount')

  const cells = rebuildCells(sheet, (cell) =>
    cell.column >= index ? { ...cell, column: cell.column + count } : cell,
  )

  return { ...sheet, columnCount, cells }
}

/** Deletes `count` columns starting at `index`, shifting right-hand columns left. */
export function deleteColumns(sheet: Sheet, index: number, count = 1): Sheet {
  assertDeleteWindow(index, count, sheet.columnCount, 'column')

  const cells = rebuildCells(sheet, (cell) => {
    if (cell.column >= index && cell.column < index + count) {
      return null
    }

    return cell.column >= index + count ? { ...cell, column: cell.column - count } : cell
  })

  return { ...sheet, columnCount: sheet.columnCount - count, cells }
}
