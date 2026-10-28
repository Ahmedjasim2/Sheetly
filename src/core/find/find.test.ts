import { describe, expect, it } from 'vitest'
import { createSheet, getCellValue, setCellValue } from '../model'
import type { CellValue, Sheet } from '../model'
import { findMatches, matchesQuery, replaceInRange, replaceTextValue } from './find'

function sheetWith(entries: ReadonlyArray<readonly [number, number, CellValue]>): Sheet {
  let sheet = createSheet({ id: 's', name: 'Sheet', rowCount: 4, columnCount: 4 })
  for (const [row, column, value] of entries) {
    sheet = setCellValue(sheet, row, column, value)
  }
  return sheet
}

const full = { start: { row: 0, column: 0 }, end: { row: 3, column: 3 } }

describe('matchesQuery', () => {
  it('matches text and displayed values', () => {
    expect(matchesQuery('hello', 'hell', true)).toBe(true)
    expect(matchesQuery(42, '4', true)).toBe(true)
    expect(matchesQuery(true, 'true', true)).toBe(true)
    expect(matchesQuery('مرحبا', 'مرح', true)).toBe(true)
  })

  it('is case-sensitive by default and case-insensitive when disabled', () => {
    expect(matchesQuery('Hello', 'hello', true)).toBe(false)
    expect(matchesQuery('Hello', 'hello', false)).toBe(true)
  })

  it('never matches empty cells or an empty query', () => {
    expect(matchesQuery(null, 'a', true)).toBe(false)
    expect(matchesQuery('', 'a', true)).toBe(false)
    expect(matchesQuery('hello', '', true)).toBe(false)
  })
})

describe('findMatches', () => {
  it('finds matching cells', () => {
    const sheet = sheetWith([
      [0, 0, 'apple'],
      [1, 0, 'banana'],
      [2, 0, 'pineapple'],
    ])

    expect(findMatches(sheet, full, 'apple', true)).toEqual([
      { row: 0, column: 0 },
      { row: 2, column: 0 },
    ])
  })

  it('returns an empty list when nothing matches', () => {
    const sheet = sheetWith([[0, 0, 'apple']])

    expect(findMatches(sheet, full, 'zzz', true)).toEqual([])
  })

  it('searches only the given range', () => {
    const sheet = sheetWith([
      [0, 0, 'apple'],
      [3, 3, 'apple'],
    ])

    expect(findMatches(sheet, { start: { row: 0, column: 0 }, end: { row: 0, column: 0 } }, 'apple', true)).toEqual([
      { row: 0, column: 0 },
    ])
  })
})

describe('replaceTextValue', () => {
  it('replaces the first occurrence only', () => {
    expect(replaceTextValue('banana', 'na', 'X', true, false)).toEqual({ value: 'baXna', changed: true })
  })

  it('replaces all occurrences', () => {
    expect(replaceTextValue('banana', 'na', 'X', true, true)).toEqual({ value: 'baXX', changed: true })
  })

  it('replaces case-insensitively', () => {
    expect(replaceTextValue('Banana', 'na', 'X', false, true)).toEqual({ value: 'BaXX', changed: true })
    expect(replaceTextValue('Banana', 'na', 'X', false, false)).toEqual({ value: 'BaXna', changed: true })
  })

  it('does not change non-strings or non-matching strings', () => {
    expect(replaceTextValue(42, '4', 'x', true, true)).toEqual({ value: 42, changed: false })
    expect(replaceTextValue(true, 'true', 'x', true, true)).toEqual({ value: true, changed: false })
    expect(replaceTextValue(null, 'a', 'x', true, true)).toEqual({ value: null, changed: false })
    expect(replaceTextValue('apple', 'zz', 'x', true, true)).toEqual({ value: 'apple', changed: false })
  })

  it('supports Arabic text', () => {
    expect(replaceTextValue('مرحبا بالعالم', 'العالم', 'الجميع', true, false)).toEqual({
      value: 'مرحبا بالجميع',
      changed: true,
    })
  })
})

describe('replaceInRange', () => {
  it('replaces all occurrences across the range and counts cells', () => {
    const sheet = sheetWith([
      [0, 0, 'apple'],
      [0, 1, 'apple apple'],
      [1, 0, 'banana'],
      [2, 0, 7],
    ])

    const result = replaceInRange(sheet, full, 'apple', 'pear', true, true)

    expect(result.changedCells).toBe(2)
    expect(getCellValue(result.sheet, 0, 0)).toBe('pear')
    expect(getCellValue(result.sheet, 0, 1)).toBe('pear pear')
    expect(getCellValue(result.sheet, 1, 0)).toBe('banana')
    expect(getCellValue(result.sheet, 2, 0)).toBe(7)
  })

  it('only changes cells inside the range', () => {
    const sheet = sheetWith([
      [0, 0, 'apple'],
      [3, 3, 'apple'],
    ])

    const result = replaceInRange(sheet, { start: { row: 0, column: 0 }, end: { row: 0, column: 0 } }, 'apple', 'pear', true, true)

    expect(getCellValue(result.sheet, 0, 0)).toBe('pear')
    expect(getCellValue(result.sheet, 3, 3)).toBe('apple')
    expect(result.changedCells).toBe(1)
  })

  it('returns the same sheet when nothing changes', () => {
    const sheet = sheetWith([[0, 0, 'apple']])

    const result = replaceInRange(sheet, full, 'zzz', 'pear', true, true)

    expect(result.sheet).toBe(sheet)
    expect(result.changedCells).toBe(0)
  })
})
