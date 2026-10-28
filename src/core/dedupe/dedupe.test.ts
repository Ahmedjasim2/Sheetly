import { describe, expect, it } from 'vitest'
import { createSheet, getCellValue, setCellValue } from '../model'
import type { CellValue, Sheet } from '../model'
import { removeDuplicateRows } from './dedupe'

function sheetFrom(rows: readonly (readonly CellValue[])[]): Sheet {
  const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 1)
  let sheet = createSheet({ id: 's', name: 'Sheet', rowCount: rows.length, columnCount })
  rows.forEach((row, r) => {
    row.forEach((value, c) => {
      sheet = setCellValue(sheet, r, c, value)
    })
  })
  return sheet
}

function fullRange(sheet: Sheet) {
  return { start: { row: 0, column: 0 }, end: { row: sheet.rowCount - 1, column: sheet.columnCount - 1 } }
}

function column(sheet: Sheet, column: number): CellValue[] {
  const values: CellValue[] = []
  for (let row = 0; row < sheet.rowCount; row += 1) {
    values.push(getCellValue(sheet, row, column))
  }
  return values
}

describe('removeDuplicateRows', () => {
  it('removes adjacent duplicates and keeps the first', () => {
    const sheet = sheetFrom([['a'], ['a'], ['b']])

    const result = removeDuplicateRows(sheet, fullRange(sheet))

    expect(result.removedRows).toBe(1)
    expect(column(result.sheet, 0)).toEqual(['a', 'b'])
  })

  it('removes non-adjacent duplicates', () => {
    const sheet = sheetFrom([['a'], ['b'], ['a']])

    const result = removeDuplicateRows(sheet, fullRange(sheet))

    expect(result.removedRows).toBe(1)
    expect(column(result.sheet, 0)).toEqual(['a', 'b'])
  })

  it('preserves order of kept rows', () => {
    const sheet = sheetFrom([['x'], ['y'], ['x'], ['z']])

    const result = removeDuplicateRows(sheet, fullRange(sheet))

    expect(column(result.sheet, 0)).toEqual(['x', 'y', 'z'])
  })

  it('treats empty cells as equal', () => {
    const sheet = sheetFrom([
      ['a', null],
      ['a', null],
      ['b', null],
    ])

    const result = removeDuplicateRows(sheet, fullRange(sheet))

    expect(result.removedRows).toBe(1)
    expect(getCellValue(result.sheet, 0, 0)).toBe('a')
    expect(getCellValue(result.sheet, 1, 0)).toBe('b')
  })

  it('distinguishes numbers from text', () => {
    const sheet = sheetFrom([[1], ['1']])

    const result = removeDuplicateRows(sheet, fullRange(sheet))

    expect(result.removedRows).toBe(0)
    expect(result.sheet).toBe(sheet)
  })

  it('compares booleans as booleans', () => {
    const sheet = sheetFrom([[true], [true], [false]])

    const result = removeDuplicateRows(sheet, fullRange(sheet))

    expect(result.removedRows).toBe(1)
    expect(column(result.sheet, 0)).toEqual([true, false])
  })

  it('uses only the selected columns as the key', () => {
    const sheet = sheetFrom([
      [1, 'x'],
      [1, 'y'],
      [2, 'z'],
    ])
    const range = { start: { row: 0, column: 0 }, end: { row: 2, column: 0 } }

    const result = removeDuplicateRows(sheet, range)

    expect(result.removedRows).toBe(1)
    expect(getCellValue(result.sheet, 0, 0)).toBe(1)
    expect(getCellValue(result.sheet, 0, 1)).toBe('x')
    expect(getCellValue(result.sheet, 1, 0)).toBe(2)
    expect(getCellValue(result.sheet, 1, 1)).toBe('z')
  })

  it('does nothing for a single-row range', () => {
    const sheet = sheetFrom([['a'], ['a']])
    const range = { start: { row: 0, column: 0 }, end: { row: 0, column: 0 } }

    const result = removeDuplicateRows(sheet, range)

    expect(result.removedRows).toBe(0)
    expect(result.sheet).toBe(sheet)
  })

  it('returns the same sheet when there are no duplicates', () => {
    const sheet = sheetFrom([['a', 'x'], ['b', 'y'], ['c', 'z']])

    const result = removeDuplicateRows(sheet, fullRange(sheet))

    expect(result.removedRows).toBe(0)
    expect(result.sheet).toBe(sheet)
  })

  it('does not change the column count', () => {
    const sheet = sheetFrom([['a', 1], ['a', 1]])

    const result = removeDuplicateRows(sheet, fullRange(sheet))

    expect(result.sheet.columnCount).toBe(sheet.columnCount)
  })

  it('keeps non-duplicate rows intact', () => {
    const sheet = sheetFrom([['a'], ['b'], ['a'], ['c']])

    const result = removeDuplicateRows(sheet, fullRange(sheet))

    expect(column(result.sheet, 0)).toEqual(['a', 'b', 'c'])
  })
})
