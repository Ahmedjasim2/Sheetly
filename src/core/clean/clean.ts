import { createRange, getCellValue, setCellValue } from '../model'
import type { CellValue, Range, Sheet } from '../model'

export type CleanOperation = 'trim' | 'collapse'

/** Removes leading and trailing spaces and tabs. */
export function trimWhitespace(input: string): string {
  return input.replace(/^[ \t]+/, '').replace(/[ \t]+$/, '')
}

/** Collapses runs of internal spaces and tabs into a single space. */
export function collapseWhitespace(input: string): string {
  return input.replace(/[ \t]+/g, ' ')
}

/** Applies one cleaning operation to a string. */
export function cleanText(input: string, operation: CleanOperation): string {
  return operation === 'trim' ? trimWhitespace(input) : collapseWhitespace(input)
}

/**
 * Cleans a cell value. Only strings change; numbers, booleans, and empty cells
 * are returned untouched.
 */
export function cleanCellValue(value: CellValue, operation: CleanOperation): CellValue {
  if (typeof value !== 'string') {
    return value
  }

  return cleanText(value, operation)
}

export interface CleanResult {
  readonly sheet: Sheet
  readonly changedCells: number
}

/**
 * Applies a cleaning operation to every string in a range. Returns a new sheet
 * and the number of cells whose text changed. Cells outside the range and
 * non-string values are never touched, and the row/column count is unchanged.
 */
export function cleanRange(sheet: Sheet, range: Range, operation: CleanOperation): CleanResult {
  const normalized = createRange(range.start, range.end)
  let next = sheet
  let changedCells = 0

  for (let row = normalized.start.row; row <= normalized.end.row; row += 1) {
    for (let column = normalized.start.column; column <= normalized.end.column; column += 1) {
      const value = getCellValue(sheet, row, column)
      if (typeof value !== 'string') {
        continue
      }

      const cleaned = cleanText(value, operation)
      if (cleaned !== value) {
        next = setCellValue(next, row, column, cleaned)
        changedCells += 1
      }
    }
  }

  return { sheet: next, changedCells }
}
