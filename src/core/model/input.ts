import type { CellValue } from './types'

const NUMERIC_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/

/** Converts a cell value to its plain-text form for display and editing. */
export function formatCellValue(value: CellValue): string {
  if (value === null) {
    return ''
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }

  return String(value)
}

/**
 * Interprets text typed into a cell.
 *
 * - Empty or whitespace-only input clears the cell (`null`).
 * - Input that looks like a finite decimal number is stored as a `number`.
 * - Anything else is stored as the exact string the user typed.
 */
export function parseCellInput(input: string): CellValue {
  const trimmed = input.trim()

  if (trimmed === '') {
    return null
  }

  if (NUMERIC_PATTERN.test(trimmed)) {
    const number = Number(trimmed)
    if (Number.isFinite(number)) {
      return number
    }
  }

  return input
}
