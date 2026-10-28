import { createRange, formatCellValue, getCellValue, setCellValue } from '../model'
import type { CellAddress, CellValue, Range, Sheet } from '../model'

/** True when the cell's displayed text contains the query. */
export function matchesQuery(value: CellValue, query: string, caseSensitive: boolean): boolean {
  if (query === '') {
    return false
  }

  const text = formatCellValue(value)
  if (text === '') {
    return false
  }

  return caseSensitive ? text.includes(query) : text.toLowerCase().includes(query.toLowerCase())
}

export interface ReplacementResult {
  readonly value: CellValue
  readonly changed: boolean
}

/**
 * Replaces the first (or all) literal occurrence(s) of `query` in a string.
 * Non-string values are never modified.
 */
export function replaceTextValue(
  value: CellValue,
  query: string,
  replacement: string,
  caseSensitive: boolean,
  replaceAll: boolean,
): ReplacementResult {
  if (typeof value !== 'string' || query === '') {
    return { value, changed: false }
  }

  if (caseSensitive) {
    if (replaceAll) {
      if (!value.includes(query)) {
        return { value, changed: false }
      }
      return { value: value.split(query).join(replacement), changed: true }
    }

    const index = value.indexOf(query)
    if (index === -1) {
      return { value, changed: false }
    }
    return { value: value.slice(0, index) + replacement + value.slice(index + query.length), changed: true }
  }

  const lower = value.toLowerCase()
  const lowerQuery = query.toLowerCase()

  if (replaceAll) {
    if (!lower.includes(lowerQuery)) {
      return { value, changed: false }
    }

    let result = ''
    let lastIndex = 0
    let index = lower.indexOf(lowerQuery)
    while (index !== -1) {
      result += value.slice(lastIndex, index) + replacement
      lastIndex = index + lowerQuery.length
      index = lower.indexOf(lowerQuery, lastIndex)
    }
    result += value.slice(lastIndex)
    return { value: result, changed: true }
  }

  const index = lower.indexOf(lowerQuery)
  if (index === -1) {
    return { value, changed: false }
  }
  return { value: value.slice(0, index) + replacement + value.slice(index + lowerQuery.length), changed: true }
}

/** Cell addresses (row-major) whose displayed text matches the query. */
export function findMatches(sheet: Sheet, range: Range, query: string, caseSensitive: boolean): CellAddress[] {
  const normalized = createRange(range.start, range.end)
  const top = Math.max(0, normalized.start.row)
  const left = Math.max(0, normalized.start.column)
  const bottom = Math.min(sheet.rowCount - 1, normalized.end.row)
  const right = Math.min(sheet.columnCount - 1, normalized.end.column)

  const matches: CellAddress[] = []
  for (let row = top; row <= bottom; row += 1) {
    for (let column = left; column <= right; column += 1) {
      if (matchesQuery(getCellValue(sheet, row, column), query, caseSensitive)) {
        matches.push({ row, column })
      }
    }
  }
  return matches
}

/** Replaces occurrences in a single cell; returns whether it changed. */
export function replaceInCell(
  sheet: Sheet,
  row: number,
  column: number,
  query: string,
  replacement: string,
  caseSensitive: boolean,
  replaceAll: boolean,
): { readonly sheet: Sheet; readonly changed: boolean } {
  const value = getCellValue(sheet, row, column)
  const result = replaceTextValue(value, query, replacement, caseSensitive, replaceAll)

  if (!result.changed) {
    return { sheet, changed: false }
  }

  return { sheet: setCellValue(sheet, row, column, result.value), changed: true }
}

/** Replaces occurrences across a range; returns the number of changed cells. */
export function replaceInRange(
  sheet: Sheet,
  range: Range,
  query: string,
  replacement: string,
  caseSensitive: boolean,
  replaceAll: boolean,
): { readonly sheet: Sheet; readonly changedCells: number } {
  const normalized = createRange(range.start, range.end)
  const top = Math.max(0, normalized.start.row)
  const left = Math.max(0, normalized.start.column)
  const bottom = Math.min(sheet.rowCount - 1, normalized.end.row)
  const right = Math.min(sheet.columnCount - 1, normalized.end.column)

  let next = sheet
  let changedCells = 0

  for (let row = top; row <= bottom; row += 1) {
    for (let column = left; column <= right; column += 1) {
      const result = replaceInCell(next, row, column, query, replacement, caseSensitive, replaceAll)
      if (result.changed) {
        next = result.sheet
        changedCells += 1
      }
    }
  }

  return { sheet: next, changedCells }
}
