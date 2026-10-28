import { describe, expect, it } from 'vitest'
import { createSheet, getCellValue, setCellValue } from '../model'
import type { CellValue, Sheet } from '../model'
import { sortRowsByColumn } from './sort'

function sheetWithColumn(column: number, values: CellValue[]): Sheet {
  let sheet = createSheet({
    id: 's',
    name: 'Sheet',
    rowCount: values.length,
    columnCount: 3,
  })
  values.forEach((value, row) => {
    sheet = setCellValue(sheet, row, column, value)
  })
  return sheet
}

function readColumn(sheet: Sheet, column: number): CellValue[] {
  const values: CellValue[] = []
  for (let row = 0; row < sheet.rowCount; row += 1) {
    values.push(getCellValue(sheet, row, column))
  }
  return values
}

describe('sortRowsByColumn', () => {
  it('sorts numbers ascending', () => {
    const sheet = sheetWithColumn(0, [3, 1, 2])

    expect(readColumn(sortRowsByColumn(sheet, 0, 0, 2, 'ascending'), 0)).toEqual([1, 2, 3])
  })

  it('sorts numbers descending', () => {
    const sheet = sheetWithColumn(0, [3, 1, 2])

    expect(readColumn(sortRowsByColumn(sheet, 0, 0, 2, 'descending'), 0)).toEqual([3, 2, 1])
  })

  it('sorts text alphabetically', () => {
    const sheet = sheetWithColumn(0, ['pear', 'apple', 'kiwi'])

    expect(readColumn(sortRowsByColumn(sheet, 0, 0, 2, 'ascending'), 0)).toEqual([
      'apple',
      'kiwi',
      'pear',
    ])
  })

  it('keeps empty cells at the end in both directions', () => {
    const sheet = sheetWithColumn(0, [null, 2, null, 1])

    expect(readColumn(sortRowsByColumn(sheet, 0, 0, 3, 'ascending'), 0)).toEqual([1, 2, null, null])
    expect(readColumn(sortRowsByColumn(sheet, 0, 0, 3, 'descending'), 0)).toEqual([2, 1, null, null])
  })

  it('sorts mixed values: numbers first, then text, then empty', () => {
    const sheet = sheetWithColumn(0, [2, 'a', null, 1, 'b'])

    expect(readColumn(sortRowsByColumn(sheet, 0, 0, 4, 'ascending'), 0)).toEqual([
      1,
      2,
      'a',
      'b',
      null,
    ])
  })

  it('keeps each row together across columns', () => {
    let sheet = createSheet({ id: 's', name: 'Sheet', rowCount: 3, columnCount: 2 })
    sheet = setCellValue(sheet, 0, 0, 3)
    sheet = setCellValue(sheet, 0, 1, 'c')
    sheet = setCellValue(sheet, 1, 0, 1)
    sheet = setCellValue(sheet, 1, 1, 'a')
    sheet = setCellValue(sheet, 2, 0, 2)
    sheet = setCellValue(sheet, 2, 1, 'b')

    const sorted = sortRowsByColumn(sheet, 0, 0, 2, 'ascending')

    expect(getCellValue(sorted, 0, 0)).toBe(1)
    expect(getCellValue(sorted, 0, 1)).toBe('a')
    expect(getCellValue(sorted, 1, 0)).toBe(2)
    expect(getCellValue(sorted, 1, 1)).toBe('b')
    expect(getCellValue(sorted, 2, 0)).toBe(3)
    expect(getCellValue(sorted, 2, 1)).toBe('c')
  })

  it('sorts only the rows of a partial range', () => {
    const sheet = sheetWithColumn(0, [4, 3, 2, 1])

    expect(readColumn(sortRowsByColumn(sheet, 0, 1, 2, 'ascending'), 0)).toEqual([4, 2, 3, 1])
  })

  it('does not change the row or column count', () => {
    const sheet = sheetWithColumn(0, [3, 1, 2])
    const sorted = sortRowsByColumn(sheet, 0, 0, 2, 'ascending')

    expect(sorted.rowCount).toBe(sheet.rowCount)
    expect(sorted.columnCount).toBe(sheet.columnCount)
  })

  it('does not mutate the original sheet', () => {
    const sheet = sheetWithColumn(0, [3, 1, 2])
    sortRowsByColumn(sheet, 0, 0, 2, 'ascending')

    expect(readColumn(sheet, 0)).toEqual([3, 1, 2])
  })

  it('returns the same sheet when already sorted or a single row', () => {
    const sorted = sheetWithColumn(0, [1, 2, 3])
    expect(sortRowsByColumn(sorted, 0, 0, 2, 'ascending')).toBe(sorted)

    const single = sheetWithColumn(0, [2, 1])
    expect(sortRowsByColumn(single, 0, 1, 1, 'ascending')).toBe(single)
  })

  it('rejects an invalid column or row range', () => {
    const sheet = sheetWithColumn(0, [1, 2])

    expect(() => sortRowsByColumn(sheet, 5, 0, 1, 'ascending')).toThrow(RangeError)
    expect(() => sortRowsByColumn(sheet, 0, 0, 5, 'ascending')).toThrow(RangeError)
    expect(() => sortRowsByColumn(sheet, 0, 2, 1, 'ascending')).toThrow(RangeError)
  })
})
