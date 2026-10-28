import { describe, expect, it } from 'vitest'
import { createSheet, getCellValue, setCellValue } from '../model'
import type { CellValue, Sheet } from '../model'
import {
  cleanCellValue,
  cleanRange,
  cleanText,
  collapseWhitespace,
  trimWhitespace,
} from './clean'

function sheetWith(entries: ReadonlyArray<readonly [number, number, CellValue]>): Sheet {
  let sheet = createSheet({ id: 's', name: 'Sheet', rowCount: 4, columnCount: 4 })
  for (const [row, column, value] of entries) {
    sheet = setCellValue(sheet, row, column, value)
  }
  return sheet
}

describe('trimWhitespace', () => {
  it('removes leading and trailing spaces and tabs', () => {
    expect(trimWhitespace('  hi  ')).toBe('hi')
    expect(trimWhitespace('\t x \t')).toBe('x')
    expect(trimWhitespace('  مرحبا  ')).toBe('مرحبا')
    expect(trimWhitespace('clean')).toBe('clean')
    expect(trimWhitespace('')).toBe('')
  })
})

describe('collapseWhitespace', () => {
  it('collapses runs of spaces and tabs to a single space', () => {
    expect(collapseWhitespace('a   b')).toBe('a b')
    expect(collapseWhitespace('a\t\tb')).toBe('a b')
    expect(collapseWhitespace('a  b   c')).toBe('a b c')
    expect(collapseWhitespace('مرحبا   بالعالم')).toBe('مرحبا بالعالم')
    expect(collapseWhitespace('clean')).toBe('clean')
  })
})

describe('cleanCellValue', () => {
  it('only changes strings', () => {
    expect(cleanCellValue('  x  ', 'trim')).toBe('x')
    expect(cleanCellValue(42, 'trim')).toBe(42)
    expect(cleanCellValue(true, 'collapse')).toBe(true)
    expect(cleanCellValue(null, 'trim')).toBeNull()
  })
})

describe('cleanRange', () => {
  it('trims every string in the range and counts changes', () => {
    const sheet = sheetWith([
      [0, 0, '  a  '],
      [0, 1, '  b  '],
      [0, 2, 'clean'],
      [0, 3, 7],
      [1, 0, null],
      [1, 1, false],
    ])
    const range = { start: { row: 0, column: 0 }, end: { row: 1, column: 3 } }

    const result = cleanRange(sheet, range, 'trim')

    expect(result.changedCells).toBe(2)
    expect(getCellValue(result.sheet, 0, 0)).toBe('a')
    expect(getCellValue(result.sheet, 0, 1)).toBe('b')
    expect(getCellValue(result.sheet, 0, 2)).toBe('clean')
    expect(getCellValue(result.sheet, 0, 3)).toBe(7)
    expect(getCellValue(result.sheet, 1, 0)).toBeNull()
    expect(getCellValue(result.sheet, 1, 1)).toBe(false)
  })

  it('collapses repeated spaces', () => {
    const sheet = sheetWith([
      [0, 0, 'a   b'],
      [0, 1, 'x\t\ty'],
    ])
    const range = { start: { row: 0, column: 0 }, end: { row: 0, column: 1 } }

    const result = cleanRange(sheet, range, 'collapse')

    expect(result.changedCells).toBe(2)
    expect(getCellValue(result.sheet, 0, 0)).toBe('a b')
    expect(getCellValue(result.sheet, 0, 1)).toBe('x y')
  })

  it('only affects the selected range', () => {
    const sheet = sheetWith([
      [0, 0, '  a  '],
      [2, 0, '  b  '],
    ])
    const range = { start: { row: 0, column: 0 }, end: { row: 0, column: 0 } }

    const result = cleanRange(sheet, range, 'trim')

    expect(getCellValue(result.sheet, 0, 0)).toBe('a')
    expect(getCellValue(result.sheet, 2, 0)).toBe('  b  ')
  })

  it('returns the same sheet and zero changes when nothing to clean', () => {
    const sheet = sheetWith([[0, 0, 'clean']])
    const range = { start: { row: 0, column: 0 }, end: { row: 0, column: 0 } }

    const result = cleanRange(sheet, range, 'trim')

    expect(result.sheet).toBe(sheet)
    expect(result.changedCells).toBe(0)
  })

  it('does not change row or column counts', () => {
    const sheet = sheetWith([[0, 0, '  a  ']])
    const result = cleanRange(sheet, { start: { row: 0, column: 0 }, end: { row: 0, column: 0 } }, 'trim')

    expect(result.sheet.rowCount).toBe(sheet.rowCount)
    expect(result.sheet.columnCount).toBe(sheet.columnCount)
  })

  it('supports the cleanText helper for a single string', () => {
    expect(cleanText('  a   b  ', 'trim')).toBe('a   b')
    expect(cleanText('  a   b  ', 'collapse')).toBe(' a b ')
  })
})
