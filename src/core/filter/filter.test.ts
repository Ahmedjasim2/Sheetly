import { describe, expect, it } from 'vitest'
import { createSheet, getCellValue, setCellValue } from '../model'
import type { CellValue, Sheet } from '../model'
import { matchesFilterValue, rowMatchesFilter, visibleRowIndices } from './filter'

function sheetWithColumn(column: number, values: CellValue[]): Sheet {
  let sheet = createSheet({ id: 's', name: 'Sheet', rowCount: values.length, columnCount: 3 })
  values.forEach((value, row) => {
    sheet = setCellValue(sheet, row, column, value)
  })
  return sheet
}

describe('text filters', () => {
  it('equals matches the exact display text', () => {
    expect(matchesFilterValue('apple', 'equals', 'apple')).toBe(true)
    expect(matchesFilterValue('apple', 'equals', 'Apple')).toBe(false)
    expect(matchesFilterValue(42, 'equals', '42')).toBe(true)
    expect(matchesFilterValue(true, 'equals', 'true')).toBe(true)
  })

  it('not-equals excludes matching values and empty cells', () => {
    expect(matchesFilterValue('apple', 'not-equals', 'banana')).toBe(true)
    expect(matchesFilterValue('apple', 'not-equals', 'apple')).toBe(false)
    expect(matchesFilterValue(null, 'not-equals', 'apple')).toBe(false)
  })

  it('contains and not-contains use substrings', () => {
    expect(matchesFilterValue('pineapple', 'contains', 'apple')).toBe(true)
    expect(matchesFilterValue('pineapple', 'contains', 'banana')).toBe(false)
    expect(matchesFilterValue('pineapple', 'not-contains', 'banana')).toBe(true)
    expect(matchesFilterValue('pineapple', 'not-contains', 'apple')).toBe(false)
  })

  it('text operators never match empty cells', () => {
    expect(matchesFilterValue(null, 'equals', '')).toBe(false)
    expect(matchesFilterValue(null, 'contains', '')).toBe(false)
  })
})

describe('empty filters', () => {
  it('treats only null as empty', () => {
    expect(matchesFilterValue(null, 'empty', '')).toBe(true)
    expect(matchesFilterValue('', 'empty', '')).toBe(false)
    expect(matchesFilterValue(0, 'empty', '')).toBe(false)
    expect(matchesFilterValue(false, 'empty', '')).toBe(false)
  })

  it('not-empty includes empty strings, zero, and booleans', () => {
    expect(matchesFilterValue(null, 'not-empty', '')).toBe(false)
    expect(matchesFilterValue('', 'not-empty', '')).toBe(true)
    expect(matchesFilterValue(0, 'not-empty', '')).toBe(true)
    expect(matchesFilterValue(false, 'not-empty', '')).toBe(true)
    expect(matchesFilterValue('x', 'not-empty', '')).toBe(true)
  })
})

describe('numeric filters', () => {
  it('compares numbers with each operator', () => {
    expect(matchesFilterValue(10, 'greater-than', '5')).toBe(true)
    expect(matchesFilterValue(10, 'greater-than-or-equal', '10')).toBe(true)
    expect(matchesFilterValue(10, 'less-than', '5')).toBe(false)
    expect(matchesFilterValue(10, 'less-than-or-equal', '10')).toBe(true)
    expect(matchesFilterValue(-3, 'less-than', '0')).toBe(true)
    expect(matchesFilterValue(2.5, 'greater-than', '2.4')).toBe(true)
  })

  it('ignores non-numeric cells and invalid queries', () => {
    expect(matchesFilterValue('10', 'greater-than', '5')).toBe(false)
    expect(matchesFilterValue(true, 'less-than', '5')).toBe(false)
    expect(matchesFilterValue(null, 'greater-than', '5')).toBe(false)
    expect(matchesFilterValue(10, 'greater-than', 'abc')).toBe(false)
    expect(matchesFilterValue(10, 'greater-than', '')).toBe(false)
  })
})

describe('visibleRowIndices', () => {
  it('returns all rows when there is no filter', () => {
    const sheet = sheetWithColumn(0, ['a', 'b', 'c'])

    expect(visibleRowIndices(sheet, null)).toEqual([0, 1, 2])
  })

  it('returns only matching rows in their original order', () => {
    const sheet = sheetWithColumn(0, ['apple', 'banana', 'apple', ''])

    expect(
      visibleRowIndices(sheet, { column: 0, operator: 'equals', value: 'apple' }),
    ).toEqual([0, 2])
  })

  it('returns an empty list when nothing matches', () => {
    const sheet = sheetWithColumn(0, ['a', 'b'])

    expect(
      visibleRowIndices(sheet, { column: 0, operator: 'equals', value: 'zzz' }),
    ).toEqual([])
  })

  it('does not delete or change data', () => {
    const sheet = sheetWithColumn(0, ['a', 'b'])
    const before = sheet.cells.size

    visibleRowIndices(sheet, { column: 0, operator: 'equals', value: 'a' })

    expect(sheet.cells.size).toBe(before)
    expect(getCellValue(sheet, 1, 0)).toBe('b')
  })
})

describe('rowMatchesFilter', () => {
  it('reads the filter column for the row', () => {
    let sheet = sheetWithColumn(0, ['a', 'b'])
    sheet = setCellValue(sheet, 0, 1, 'keep')

    expect(rowMatchesFilter(sheet, 0, { column: 1, operator: 'equals', value: 'keep' })).toBe(true)
    expect(rowMatchesFilter(sheet, 1, { column: 1, operator: 'equals', value: 'keep' })).toBe(false)
  })
})
