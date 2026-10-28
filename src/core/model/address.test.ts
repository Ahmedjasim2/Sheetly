import { describe, expect, it } from 'vitest'
import {
  columnLabel,
  createRange,
  formatCellId,
  rangeContains,
  rangeDimensions,
} from './address'

describe('columnLabel', () => {
  it('converts zero-based indexes to spreadsheet labels', () => {
    expect(columnLabel(0)).toBe('A')
    expect(columnLabel(25)).toBe('Z')
    expect(columnLabel(26)).toBe('AA')
    expect(columnLabel(51)).toBe('AZ')
    expect(columnLabel(52)).toBe('BA')
    expect(columnLabel(701)).toBe('ZZ')
    expect(columnLabel(702)).toBe('AAA')
  })

  it('rejects negative and non-integer indexes', () => {
    expect(() => columnLabel(-1)).toThrow(RangeError)
    expect(() => columnLabel(1.5)).toThrow(RangeError)
  })
})

describe('formatCellId', () => {
  it('uses one-based row numbers', () => {
    expect(formatCellId(0, 0)).toBe('A1')
    expect(formatCellId(9, 27)).toBe('AB10')
  })

  it('rejects invalid coordinates', () => {
    expect(() => formatCellId(-1, 0)).toThrow(RangeError)
    expect(() => formatCellId(0, 2.5)).toThrow(RangeError)
  })
})

describe('ranges', () => {
  it('normalizes corners into top-left and bottom-right', () => {
    const range = createRange({ row: 4, column: 3 }, { row: 1, column: 2 })

    expect(range.start).toEqual({ row: 1, column: 2 })
    expect(range.end).toEqual({ row: 4, column: 3 })
  })

  it('contains addresses including the edges', () => {
    const range = createRange({ row: 1, column: 1 }, { row: 3, column: 3 })

    expect(rangeContains(range, { row: 1, column: 1 })).toBe(true)
    expect(rangeContains(range, { row: 2, column: 2 })).toBe(true)
    expect(rangeContains(range, { row: 3, column: 3 })).toBe(true)
    expect(rangeContains(range, { row: 0, column: 2 })).toBe(false)
    expect(rangeContains(range, { row: 2, column: 4 })).toBe(false)
  })

  it('reports dimensions from either corner order', () => {
    expect(rangeDimensions(createRange({ row: 2, column: 5 }, { row: 5, column: 3 }))).toEqual({
      rows: 4,
      columns: 3,
    })
  })

  it('rejects invalid addresses', () => {
    expect(() => createRange({ row: -1, column: 0 }, { row: 0, column: 0 })).toThrow(RangeError)
    expect(() => rangeContains(createRange({ row: 0, column: 0 }, { row: 1, column: 1 }), { row: 0, column: -1 })).toThrow(
      RangeError,
    )
  })
})
