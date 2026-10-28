import { describe, expect, it } from 'vitest'
import { createSheet, getCellValue, setCellValue } from '../model'
import type { Sheet } from '../model'
import { cellValuesToSheet, excelCellToValue, sheetToCellValues } from './convert'

function makeSheet(): Sheet {
  return createSheet({ id: 's', name: 'Sheet', rowCount: 3, columnCount: 3 })
}

describe('excelCellToValue', () => {
  it('keeps primitives and maps null', () => {
    expect(excelCellToValue(null)).toBeNull()
    expect(excelCellToValue(undefined)).toBeNull()
    expect(excelCellToValue('مرحبا')).toBe('مرحبا')
    expect(excelCellToValue(42)).toBe(42)
    expect(excelCellToValue(true)).toBe(true)
    expect(excelCellToValue(false)).toBe(false)
  })

  it('converts dates to ISO strings', () => {
    const date = new Date('2026-01-15T10:30:00.000Z')

    expect(excelCellToValue(date)).toBe('2026-01-15T10:30:00.000Z')
  })

  it('treats formulas as text without evaluating them', () => {
    expect(excelCellToValue({ formula: 'A1+B1', result: 42 })).toBe('A1+B1')
    expect(excelCellToValue({ result: 7 })).toBe(7)
  })

  it('reads hyperlink text and rich text', () => {
    expect(excelCellToValue({ text: 'link label', hyperlink: 'https://example.com' })).toBe('link label')
    expect(excelCellToValue({ richText: [{ text: 'He' }, { text: 'llo' }] })).toBe('Hello')
  })
})

describe('sheetToCellValues', () => {
  it('preserves value types', () => {
    let sheet = makeSheet()
    sheet = setCellValue(sheet, 0, 0, 'name')
    sheet = setCellValue(sheet, 0, 1, 42)
    sheet = setCellValue(sheet, 0, 2, true)
    sheet = setCellValue(sheet, 1, 0, 1.5)

    expect(sheetToCellValues(sheet)).toEqual([
      ['name', 42, true],
      [1.5, null, null],
      [null, null, null],
    ])
  })
})

describe('cellValuesToSheet', () => {
  it('builds a sheet from typed values and preserves types', () => {
    const sheet = cellValuesToSheet(
      [
        ['name', 42, true],
        [1.5, null, -3],
      ],
      { id: 's', name: 'Sheet' },
    )

    expect(sheet.rowCount).toBe(2)
    expect(sheet.columnCount).toBe(3)
    expect(getCellValue(sheet, 0, 0)).toBe('name')
    expect(getCellValue(sheet, 0, 1)).toBe(42)
    expect(getCellValue(sheet, 0, 2)).toBe(true)
    expect(getCellValue(sheet, 1, 0)).toBe(1.5)
    expect(getCellValue(sheet, 1, 1)).toBeNull()
    expect(getCellValue(sheet, 1, 2)).toBe(-3)
  })

  it('round-trips through sheetToCellValues', () => {
    const original = cellValuesToSheet(
      [
        ['a', 1, false],
        ['مرحبا', null, 2.5],
      ],
      { id: 's', name: 'Sheet' },
    )

    const rebuilt = cellValuesToSheet(sheetToCellValues(original), { id: 's', name: 'Sheet' })

    expect(sheetToCellValues(rebuilt)).toEqual(sheetToCellValues(original))
  })
})
