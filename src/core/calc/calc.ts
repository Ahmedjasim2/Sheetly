import { createRange, getCellValue } from '../model'
import type { Range, Sheet } from '../model'

export type CalculationName = 'sum' | 'average' | 'minimum' | 'maximum' | 'count'

/** Collects every finite numeric value in the range, ignoring text, booleans, and empty cells. */
function numericValues(sheet: Sheet, range: Range): number[] {
  const normalized = createRange(range.start, range.end)
  const values: number[] = []

  for (let row = normalized.start.row; row <= normalized.end.row; row += 1) {
    for (let column = normalized.start.column; column <= normalized.end.column; column += 1) {
      const value = getCellValue(sheet, row, column)
      if (typeof value === 'number' && Number.isFinite(value)) {
        values.push(value)
      }
    }
  }

  return values
}

/** Sum of numeric values, or `null` when the range has none. */
export function sumRange(sheet: Sheet, range: Range): number | null {
  const values = numericValues(sheet, range)
  if (values.length === 0) {
    return null
  }

  let total = 0
  for (const value of values) {
    total += value
  }
  return total
}

/** Average of numeric values, or `null` when the range has none. */
export function averageRange(sheet: Sheet, range: Range): number | null {
  const values = numericValues(sheet, range)
  if (values.length === 0) {
    return null
  }

  let total = 0
  for (const value of values) {
    total += value
  }
  return total / values.length
}

/** Smallest numeric value, or `null` when the range has none. */
export function minimumRange(sheet: Sheet, range: Range): number | null {
  const values = numericValues(sheet, range)
  if (values.length === 0) {
    return null
  }

  let minimum = values[0]
  for (let index = 1; index < values.length; index += 1) {
    if (values[index] < minimum) {
      minimum = values[index]
    }
  }
  return minimum
}

/** Largest numeric value, or `null` when the range has none. */
export function maximumRange(sheet: Sheet, range: Range): number | null {
  const values = numericValues(sheet, range)
  if (values.length === 0) {
    return null
  }

  let maximum = values[0]
  for (let index = 1; index < values.length; index += 1) {
    if (values[index] > maximum) {
      maximum = values[index]
    }
  }
  return maximum
}

/** Number of numeric values (not a count of non-empty cells). */
export function countNumeric(sheet: Sheet, range: Range): number {
  return numericValues(sheet, range).length
}

/**
 * Runs a calculation over the range.
 *
 * Sum/Average/Minimum/Maximum return `null` when the range has no numeric
 * values; Count returns `0` in that case.
 */
export function calculate(operation: CalculationName, sheet: Sheet, range: Range): number | null {
  switch (operation) {
    case 'sum':
      return sumRange(sheet, range)
    case 'average':
      return averageRange(sheet, range)
    case 'minimum':
      return minimumRange(sheet, range)
    case 'maximum':
      return maximumRange(sheet, range)
    case 'count':
      return countNumeric(sheet, range)
  }
}
