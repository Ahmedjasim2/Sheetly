import { describe, expect, it } from 'vitest'
import {
  createSheet,
  deleteColumns,
  deleteRows,
  getCell,
  getCellValue,
  hasCell,
  insertColumns,
  insertRows,
  setCellValue,
} from './sheet'
import type { CellValue, Sheet } from './types'

function makeSheet(rowCount = 4, columnCount = 3): Sheet {
  return createSheet({ id: 'sheet-1', name: 'Sheet 1', rowCount, columnCount })
}

function fillFirstColumn(sheet: Sheet, values: readonly CellValue[]): Sheet {
  return values.reduce<Sheet>(
    (current, value, row) => setCellValue(current, row, 0, value),
    sheet,
  )
}

describe('createSheet', () => {
  it('creates an empty sheet with the requested dimensions', () => {
    const sheet = makeSheet(4, 3)

    expect(sheet.id).toBe('sheet-1')
    expect(sheet.name).toBe('Sheet 1')
    expect(sheet.rowCount).toBe(4)
    expect(sheet.columnCount).toBe(3)
    expect(sheet.cells.size).toBe(0)
  })

  it('rejects invalid dimensions', () => {
    expect(() => makeSheet(-1, 3)).toThrow(RangeError)
    expect(() => makeSheet(4, 2.5)).toThrow(RangeError)
    expect(() => makeSheet(Number.NaN, 3)).toThrow(RangeError)
  })

  it('rejects blank ids and names', () => {
    expect(() => createSheet({ id: ' ', name: 'Sheet', rowCount: 1, columnCount: 1 })).toThrow(
      TypeError,
    )
    expect(() => createSheet({ id: 's', name: '', rowCount: 1, columnCount: 1 })).toThrow(
      TypeError,
    )
  })
})

describe('cell access', () => {
  it('reads unwritten cells as empty', () => {
    const sheet = makeSheet()

    expect(getCell(sheet, 0, 0)).toBeUndefined()
    expect(getCellValue(sheet, 0, 0)).toBeNull()
    expect(hasCell(sheet, 0, 0)).toBe(false)
  })

  it('stores strings, numbers, booleans, and the empty string', () => {
    let sheet = makeSheet()
    sheet = setCellValue(sheet, 0, 0, 'hello')
    sheet = setCellValue(sheet, 1, 0, 42)
    sheet = setCellValue(sheet, 2, 0, false)
    sheet = setCellValue(sheet, 3, 0, '')
    sheet = setCellValue(sheet, 0, 1, 0)

    expect(getCellValue(sheet, 0, 0)).toBe('hello')
    expect(getCellValue(sheet, 1, 0)).toBe(42)
    expect(getCellValue(sheet, 2, 0)).toBe(false)
    expect(getCellValue(sheet, 3, 0)).toBe('')
    expect(getCellValue(sheet, 0, 1)).toBe(0)
    expect(hasCell(sheet, 3, 0)).toBe(true)
    expect(hasCell(sheet, 0, 1)).toBe(true)
    expect(sheet.cells.size).toBe(5)
  })

  it('overwrites a value without mutating the original sheet', () => {
    const original = setCellValue(makeSheet(), 0, 0, 'old')
    const updated = setCellValue(original, 0, 0, 'new')

    expect(getCellValue(original, 0, 0)).toBe('old')
    expect(getCellValue(updated, 0, 0)).toBe('new')
  })

  it('returns the same sheet for no-op writes', () => {
    const sheet = setCellValue(makeSheet(), 0, 0, 'same')

    expect(setCellValue(sheet, 0, 0, 'same')).toBe(sheet)
    expect(setCellValue(sheet, 1, 1, null)).toBe(sheet)
  })

  it('clears a cell with null', () => {
    const sheet = setCellValue(makeSheet(), 0, 0, 'value')
    const cleared = setCellValue(sheet, 0, 0, null)

    expect(getCell(cleared, 0, 0)).toBeUndefined()
    expect(getCellValue(cleared, 0, 0)).toBeNull()
    expect(hasCell(cleared, 0, 0)).toBe(false)
    expect(cleared.cells.size).toBe(0)
    expect(cleared.rowCount).toBe(sheet.rowCount)
  })

  it('rejects unsupported values', () => {
    const sheet = makeSheet()
    const invalidValues: readonly unknown[] = [
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      undefined,
      { text: 'x' },
      ['x'],
    ]

    for (const value of invalidValues) {
      expect(() => setCellValue(sheet, 0, 0, value as CellValue)).toThrow(TypeError)
    }
  })

  it('rejects out-of-bounds coordinates', () => {
    const sheet = makeSheet(2, 2)

    expect(() => getCellValue(sheet, 2, 0)).toThrow(RangeError)
    expect(() => getCellValue(sheet, 0, 2)).toThrow(RangeError)
    expect(() => getCellValue(sheet, -1, 0)).toThrow(RangeError)
    expect(() => setCellValue(sheet, 0, 2, 'x')).toThrow(RangeError)
  })

  it('keeps the input sheet unchanged after a write', () => {
    const original = makeSheet()
    const changed = setCellValue(original, 0, 0, 'x')

    expect(original.cells.size).toBe(0)
    expect(changed.cells.size).toBe(1)
  })
})

describe('insertRows', () => {
  it('shifts cells down from the insertion point', () => {
    let sheet = makeSheet(4, 3)
    sheet = setCellValue(sheet, 0, 0, 'top')
    sheet = setCellValue(sheet, 2, 1, 'middle')
    sheet = setCellValue(sheet, 3, 2, 'bottom')

    const result = insertRows(sheet, 2, 1)

    expect(result.rowCount).toBe(5)
    expect(getCellValue(result, 0, 0)).toBe('top')
    expect(getCellValue(result, 2, 1)).toBeNull()
    expect(getCellValue(result, 3, 1)).toBe('middle')
    expect(getCellValue(result, 4, 2)).toBe('bottom')
    expect(getCell(result, 3, 1)).toMatchObject({ row: 3, column: 1 })
  })

  it('inserts at the start and at the end', () => {
    const sheet = setCellValue(makeSheet(2, 2), 0, 0, 'a')

    const atStart = insertRows(sheet, 0, 2)
    expect(atStart.rowCount).toBe(4)
    expect(getCellValue(atStart, 2, 0)).toBe('a')

    const atEnd = insertRows(sheet, sheet.rowCount, 1)
    expect(atEnd.rowCount).toBe(3)
    expect(getCellValue(atEnd, 0, 0)).toBe('a')
  })

  it('does not mutate the input sheet', () => {
    const sheet = fillFirstColumn(makeSheet(2, 1), ['a', 'b'])
    const result = insertRows(sheet, 1)

    expect(sheet.rowCount).toBe(2)
    expect(getCellValue(sheet, 1, 0)).toBe('b')
    expect(getCellValue(result, 2, 0)).toBe('b')
  })

  it('rejects invalid insertion arguments', () => {
    const sheet = makeSheet(2, 2)

    expect(() => insertRows(sheet, -1)).toThrow(RangeError)
    expect(() => insertRows(sheet, 3)).toThrow(RangeError)
    expect(() => insertRows(sheet, 0, 0)).toThrow(RangeError)
    expect(() => insertRows(sheet, 0, 1.5)).toThrow(RangeError)
  })
})

describe('deleteRows', () => {
  it('removes rows and shifts lower cells up', () => {
    const sheet = fillFirstColumn(makeSheet(4, 2), ['r0', 'r1', 'r2', 'r3'])

    const result = deleteRows(sheet, 1, 2)

    expect(result.rowCount).toBe(2)
    expect(getCellValue(result, 0, 0)).toBe('r0')
    expect(getCellValue(result, 1, 0)).toBe('r3')
    expect(result.cells.size).toBe(2)
    expect(getCellValue(sheet, 1, 0)).toBe('r1')
  })

  it('can delete every row and be grown again', () => {
    const sheet = fillFirstColumn(makeSheet(2, 2), ['a', 'b'])

    const empty = deleteRows(sheet, 0, 2)

    expect(empty.rowCount).toBe(0)
    expect(empty.cells.size).toBe(0)
    expect(() => getCellValue(empty, 0, 0)).toThrow(RangeError)

    const regrown = insertRows(empty, 0, 1)
    expect(regrown.rowCount).toBe(1)
    expect(regrown.columnCount).toBe(2)
  })

  it('rejects invalid deletion windows', () => {
    const sheet = makeSheet(3, 2)

    expect(() => deleteRows(sheet, 3)).toThrow(RangeError)
    expect(() => deleteRows(sheet, 2, 2)).toThrow(RangeError)
    expect(() => deleteRows(sheet, 0, 0)).toThrow(RangeError)
    expect(() => deleteRows(sheet, -1)).toThrow(RangeError)
  })
})

describe('columns', () => {
  it('inserts columns and shifts cells right', () => {
    let sheet = makeSheet(2, 3)
    sheet = setCellValue(sheet, 0, 0, 'left')
    sheet = setCellValue(sheet, 1, 2, 'right')

    const result = insertColumns(sheet, 1, 2)

    expect(result.columnCount).toBe(5)
    expect(getCellValue(result, 0, 0)).toBe('left')
    expect(getCellValue(result, 1, 4)).toBe('right')
    expect(getCell(result, 1, 4)).toMatchObject({ row: 1, column: 4 })
  })

  it('deletes columns and shifts cells left', () => {
    let sheet = makeSheet(2, 4)
    sheet = setCellValue(sheet, 0, 0, 'c0')
    sheet = setCellValue(sheet, 0, 1, 'c1')
    sheet = setCellValue(sheet, 0, 2, 'c2')
    sheet = setCellValue(sheet, 0, 3, 'c3')

    const result = deleteColumns(sheet, 1, 2)

    expect(result.columnCount).toBe(2)
    expect(getCellValue(result, 0, 0)).toBe('c0')
    expect(getCellValue(result, 0, 1)).toBe('c3')
    expect(getCellValue(sheet, 0, 1)).toBe('c1')
  })

  it('rejects invalid column operations', () => {
    const sheet = makeSheet(2, 3)

    expect(() => insertColumns(sheet, 4)).toThrow(RangeError)
    expect(() => insertColumns(sheet, 0, 0)).toThrow(RangeError)
    expect(() => deleteColumns(sheet, 3)).toThrow(RangeError)
    expect(() => deleteColumns(sheet, 1, 3)).toThrow(RangeError)
  })

  it('supports growing an empty sheet one axis at a time', () => {
    const empty = createSheet({ id: 'empty', name: 'Empty', rowCount: 0, columnCount: 0 })

    expect(empty.cells.size).toBe(0)
    expect(() => getCellValue(empty, 0, 0)).toThrow(RangeError)

    const withRows = insertRows(empty, 0, 1)
    expect(withRows.rowCount).toBe(1)
    expect(withRows.columnCount).toBe(0)
    expect(() => setCellValue(withRows, 0, 0, 'x')).toThrow(RangeError)

    const withColumns = insertColumns(withRows, 0, 1)
    const written = setCellValue(withColumns, 0, 0, 'x')

    expect(getCellValue(written, 0, 0)).toBe('x')
  })
})
