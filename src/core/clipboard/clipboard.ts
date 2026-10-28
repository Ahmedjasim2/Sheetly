import { createRange, getCellValue, setCellValue } from '../model'
import type { CellAddress, CellValue, Range, Sheet } from '../model'

/** A rectangular block of cell values copied from the sheet. */
export type CellBlock = readonly (readonly CellValue[])[]

export interface PasteResult {
  readonly sheet: Sheet
  /** The rectangle actually written, or `null` when nothing was written. */
  readonly writtenRange: Range | null
}

/** Copies a range as a rectangular block; empty cells become `null`. */
export function copyRange(sheet: Sheet, range: Range): CellValue[][] {
  const normalized = createRange(range.start, range.end)
  const block: CellValue[][] = []

  for (let row = normalized.start.row; row <= normalized.end.row; row += 1) {
    const values: CellValue[] = []
    for (let column = normalized.start.column; column <= normalized.end.column; column += 1) {
      values.push(getCellValue(sheet, row, column))
    }
    block.push(values)
  }

  return block
}

/**
 * Pastes a block anchored at `anchor`, overwriting existing cells.
 *
 * The block is clipped to the sheet bounds: cells beyond the right or bottom
 * edge are not written. Empty cells in the block clear the target cell.
 */
export function pasteBlock(sheet: Sheet, block: CellBlock, anchor: CellAddress): PasteResult {
  if (anchor.row < 0 || anchor.column < 0) {
    return { sheet, writtenRange: null }
  }

  const availableRows = Math.max(0, sheet.rowCount - anchor.row)
  const availableColumns = Math.max(0, sheet.columnCount - anchor.column)
  const rows = Math.min(block.length, availableRows)
  const columns = Math.min(block[0]?.length ?? 0, availableColumns)

  if (rows <= 0 || columns <= 0) {
    return { sheet, writtenRange: null }
  }

  let next = sheet
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const value = block[row]?.[column] ?? null
      next = setCellValue(next, anchor.row + row, anchor.column + column, value)
    }
  }

  return {
    sheet: next,
    writtenRange: {
      start: { row: anchor.row, column: anchor.column },
      end: { row: anchor.row + rows - 1, column: anchor.column + columns - 1 },
    },
  }
}
