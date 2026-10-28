import { formatCellValue, getCellValue } from '../model'
import type { CellValue, Sheet } from '../model'

export type FilterOperator =
  | 'equals'
  | 'not-equals'
  | 'contains'
  | 'not-contains'
  | 'empty'
  | 'not-empty'
  | 'greater-than'
  | 'greater-than-or-equal'
  | 'less-than'
  | 'less-than-or-equal'

export interface FilterSpec {
  readonly column: number
  readonly operator: FilterOperator
  readonly value: string
}

const NUMERIC_OPERATORS: readonly FilterOperator[] = [
  'greater-than',
  'greater-than-or-equal',
  'less-than',
  'less-than-or-equal',
]

function parseNumber(query: string): number | null {
  const trimmed = query.trim()
  if (trimmed === '') {
    return null
  }

  const value = Number(trimmed)
  return Number.isFinite(value) ? value : null
}

/**
 * Tests one cell value against a filter operator.
 *
 * Rules:
 * - `empty` / `not-empty` treat only `null` as empty; `''`, `0`, and `false` are values.
 * - Text operators compare the cell's display text via `formatCellValue`, exactly and
 *   case-sensitively; they never match empty cells.
 * - Numeric operators only match numeric cells; a non-numeric query matches nothing.
 * - Empty cells never match text or numeric operators.
 */
export function matchesFilterValue(
  value: CellValue,
  operator: FilterOperator,
  query: string,
): boolean {
  if (operator === 'empty') {
    return value === null
  }

  if (operator === 'not-empty') {
    return value !== null
  }

  if (value === null) {
    return false
  }

  if (NUMERIC_OPERATORS.includes(operator)) {
    if (typeof value !== 'number') {
      return false
    }

    const target = parseNumber(query)
    if (target === null) {
      return false
    }

    switch (operator) {
      case 'greater-than':
        return value > target
      case 'greater-than-or-equal':
        return value >= target
      case 'less-than':
        return value < target
      case 'less-than-or-equal':
        return value <= target
    }
  }

  const text = formatCellValue(value)

  switch (operator) {
    case 'equals':
      return text === query
    case 'not-equals':
      return text !== query
    case 'contains':
      return text.includes(query)
    case 'not-contains':
      return !text.includes(query)
    default:
      return false
  }
}

/** True when the row's cell in the filter column matches the filter. */
export function rowMatchesFilter(sheet: Sheet, row: number, filter: FilterSpec): boolean {
  return matchesFilterValue(
    getCellValue(sheet, row, filter.column),
    filter.operator,
    filter.value,
  )
}

/**
 * Row indices that should be visible, in their original order. Filtering is a
 * view concern: it never removes or reorders rows in the sheet.
 */
export function visibleRowIndices(sheet: Sheet, filter: FilterSpec | null): number[] {
  if (filter === null) {
    return Array.from({ length: sheet.rowCount }, (_, row) => row)
  }

  const rows: number[] = []
  for (let row = 0; row < sheet.rowCount; row += 1) {
    if (rowMatchesFilter(sheet, row, filter)) {
      rows.push(row)
    }
  }
  return rows
}
