import { describe, expect, it } from 'vitest'
import { createSheet, setCellValue } from '../model'
import type { CellValue, Sheet } from '../model'
import {
  averageRange,
  calculate,
  countNumeric,
  maximumRange,
  minimumRange,
  sumRange,
} from './calc'

function sheetWith(entries: ReadonlyArray<readonly [number, number, CellValue]>): Sheet {
  let sheet = createSheet({ id: 's', name: 'Sheet', rowCount: 5, columnCount: 5 })
  for (const [row, column, value] of entries) {
    sheet = setCellValue(sheet, row, column, value)
  }
  return sheet
}

const full = { start: { row: 0, column: 0 }, end: { row: 4, column: 4 } }

describe('sumRange', () => {
  it('sums numeric values', () => {
    const sheet = sheetWith([
      [0, 0, 1],
      [0, 1, 2],
      [0, 2, 3],
    ])

    expect(sumRange(sheet, { start: { row: 0, column: 0 }, end: { row: 0, column: 2 } })).toBe(6)
  })

  it('handles negatives, zero, and decimals', () => {
    const sheet = sheetWith([
      [0, 0, 10],
      [0, 1, -5],
      [0, 2, 0],
      [0, 3, 2.5],
    ])

    expect(sumRange(sheet, { start: { row: 0, column: 0 }, end: { row: 0, column: 3 } })).toBe(7.5)
  })

  it('returns null when there are no numeric values', () => {
    expect(sumRange(sheetWith([]), full)).toBeNull()
  })
})

describe('averageRange', () => {
  it('averages numeric values', () => {
    const sheet = sheetWith([
      [0, 0, 10],
      [0, 1, -5],
      [0, 2, 2.5],
    ])

    expect(averageRange(sheet, { start: { row: 0, column: 0 }, end: { row: 0, column: 2 } })).toBe(
      2.5,
    )
  })

  it('returns null when there are no numeric values', () => {
    expect(averageRange(sheetWith([]), full)).toBeNull()
  })
})

describe('minimumRange and maximumRange', () => {
  it('finds the minimum and maximum', () => {
    const sheet = sheetWith([
      [0, 0, 10],
      [0, 1, -5],
      [0, 2, 2.5],
    ])
    const range = { start: { row: 0, column: 0 }, end: { row: 0, column: 2 } }

    expect(minimumRange(sheet, range)).toBe(-5)
    expect(maximumRange(sheet, range)).toBe(10)
  })

  it('return null when there are no numeric values', () => {
    const sheet = sheetWith([])

    expect(minimumRange(sheet, full)).toBeNull()
    expect(maximumRange(sheet, full)).toBeNull()
  })
})

describe('countNumeric', () => {
  it('counts only numeric cells', () => {
    const sheet = sheetWith([
      [0, 0, 10],
      [0, 1, 'text'],
      [0, 2, true],
      [0, 3, -5],
    ])

    expect(countNumeric(sheet, { start: { row: 0, column: 0 }, end: { row: 0, column: 3 } })).toBe(2)
  })

  it('returns 0 for a range with no numbers', () => {
    expect(countNumeric(sheetWith([]), full)).toBe(0)
  })
})

describe('numeric-value filtering', () => {
  it('ignores empty cells, text, and booleans', () => {
    const sheet = sheetWith([
      [0, 0, 10],
      [0, 1, 'x'],
      [0, 2, null],
      [0, 3, true],
      [0, 4, -5],
    ])

    const range = { start: { row: 0, column: 0 }, end: { row: 0, column: 4 } }

    expect(sumRange(sheet, range)).toBe(5)
    expect(countNumeric(sheet, range)).toBe(2)
    expect(minimumRange(sheet, range)).toBe(-5)
    expect(maximumRange(sheet, range)).toBe(10)
  })

  it('handles a single numeric cell', () => {
    const sheet = sheetWith([[2, 3, 42]])

    const range = { start: { row: 2, column: 3 }, end: { row: 2, column: 3 } }
    expect(sumRange(sheet, range)).toBe(42)
    expect(countNumeric(sheet, range)).toBe(1)
  })

  it('handles a single non-numeric cell', () => {
    const sheet = sheetWith([[2, 3, 'x']])

    const range = { start: { row: 2, column: 3 }, end: { row: 2, column: 3 } }
    expect(sumRange(sheet, range)).toBeNull()
    expect(countNumeric(sheet, range)).toBe(0)
  })
})

describe('calculate dispatcher', () => {
  it('dispatches by operation name', () => {
    const sheet = sheetWith([
      [0, 0, 10],
      [0, 1, -5],
      [0, 2, 2.5],
    ])
    const range = { start: { row: 0, column: 0 }, end: { row: 0, column: 2 } }

    expect(calculate('sum', sheet, range)).toBe(7.5)
    expect(calculate('average', sheet, range)).toBe(2.5)
    expect(calculate('minimum', sheet, range)).toBe(-5)
    expect(calculate('maximum', sheet, range)).toBe(10)
    expect(calculate('count', sheet, range)).toBe(3)
  })

  it('returns null for numeric operations and 0 for count when empty', () => {
    const sheet = sheetWith([])

    expect(calculate('sum', sheet, full)).toBeNull()
    expect(calculate('average', sheet, full)).toBeNull()
    expect(calculate('minimum', sheet, full)).toBeNull()
    expect(calculate('maximum', sheet, full)).toBeNull()
    expect(calculate('count', sheet, full)).toBe(0)
  })
})

describe('non-destructiveness', () => {
  it('does not mutate the sheet', () => {
    const sheet = sheetWith([
      [0, 0, 10],
      [0, 1, 'x'],
      [0, 2, -5],
    ])
    const range = { start: { row: 0, column: 0 }, end: { row: 0, column: 2 } }

    const before = sheet.cells.size
    sumRange(sheet, range)
    averageRange(sheet, range)
    minimumRange(sheet, range)
    maximumRange(sheet, range)
    countNumeric(sheet, range)

    expect(sheet.cells.size).toBe(before)
  })
})
