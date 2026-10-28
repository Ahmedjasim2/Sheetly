import { describe, expect, it } from 'vitest'
import { createSheet, getCellValue, setCellValue } from '../model'
import {
  csvFieldToValue,
  parseCsv,
  rowsToSheet,
  sheetToRows,
  stringifyCsv,
} from './csv'

describe('parseCsv', () => {
  it('parses a simple CSV', () => {
    const result = parseCsv('a,b,c\n1,2,3')

    expect(result).toEqual({ ok: true, rows: [['a', 'b', 'c'], ['1', '2', '3']] })
  })

  it('preserves Unicode and Arabic text', () => {
    const result = parseCsv('الاسم,العمر\nعلي,30\nمريم,25')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.rows).toEqual([
        ['الاسم', 'العمر'],
        ['علي', '30'],
        ['مريم', '25'],
      ])
    }
  })

  it('supports commas inside quoted fields', () => {
    const result = parseCsv('"last, first",city\n"Doe, Jane",Amman')

    expect(result).toEqual({ ok: true, rows: [['last, first', 'city'], ['Doe, Jane', 'Amman']] })
  })

  it('supports escaped double quotes inside quoted fields', () => {
    const result = parseCsv('"say ""hi""",plain')

    expect(result).toEqual({ ok: true, rows: [['say "hi"', 'plain']] })
  })

  it('preserves a blank line as a single empty field', () => {
    const result = parseCsv('a,b\n\nc,d\n')

    expect(result).toEqual({ ok: true, rows: [['a', 'b'], [''], ['c', 'd']] })
  })

  it('keeps missing values and short rows', () => {
    const result = parseCsv('a,b,c\n1,,3\n2\n')

    expect(result).toEqual({ ok: true, rows: [['a', 'b', 'c'], ['1', '', '3'], ['2']] })
  })

  it('handles rows of different lengths', () => {
    const result = parseCsv('a,b,c\n1\n2,3,4,5\n')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.rows.map((row) => row.length)).toEqual([3, 1, 4])
    }
  })

  it('reports an unterminated quoted field with its line', () => {
    const result = parseCsv('ok,line\n"unterminated\nx')

    expect(result).toEqual({ ok: false, message: 'Unterminated quoted field', line: 3 })
  })

  it('ignores a leading UTF-8 byte-order mark', () => {
    const result = parseCsv('\uFEFFname,value\na,1')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.rows[0]).toEqual(['name', 'value'])
    }
  })
})

describe('csvFieldToValue', () => {
  it('maps empty fields to null and non-empty fields to strings', () => {
    expect(csvFieldToValue('')).toBeNull()
    expect(csvFieldToValue('0')).toBe('0')
    expect(csvFieldToValue('42')).toBe('42')
    expect(csvFieldToValue(' ')).toBe(' ')
    expect(csvFieldToValue('مرحبا')).toBe('مرحبا')
  })
})

describe('stringifyCsv', () => {
  it('serializes simple rows', () => {
    expect(stringifyCsv([['a', 'b'], ['1', '2']])).toBe('a,b\r\n1,2')
  })

  it('quotes fields with commas, quotes, newlines, or surrounding spaces', () => {
    expect(
      stringifyCsv([
        ['a,b', 'say "hi"', 'line\nbreak', ' padded '],
        ['plain', '', 'x', 'y'],
      ]),
    ).toBe('"a,b","say ""hi""","line\nbreak"," padded "\r\nplain,,x,y')
  })
})

describe('sheet <-> rows', () => {
  it('converts a sheet to a rectangular grid of strings', () => {
    let sheet = createSheet({ id: 's', name: 'Sheet', rowCount: 2, columnCount: 3 })
    sheet = setCellValue(sheet, 0, 0, 'a')
    sheet = setCellValue(sheet, 1, 2, 0)

    expect(sheetToRows(sheet)).toEqual([
      ['a', '', ''],
      ['', '', '0'],
    ])
  })

  it('builds a sheet from ragged rows and keeps values as strings', () => {
    const sheet = rowsToSheet([['name', 'age', 'note'], ['Ali', '30']], {
      id: 's',
      name: 'Sheet',
    })

    expect(sheet.rowCount).toBe(2)
    expect(sheet.columnCount).toBe(3)
    expect(getCellValue(sheet, 0, 0)).toBe('name')
    expect(getCellValue(sheet, 1, 1)).toBe('30')
    expect(getCellValue(sheet, 1, 2)).toBeNull()
  })

  it('round-trips CSV through a sheet', () => {
    const csv = 'الاسم,العمر\n"علي, بن",30\nمريم,25\n'
    const parsed = parseCsv(csv)
    if (!parsed.ok) {
      throw new Error('expected valid CSV')
    }

    const sheet = rowsToSheet(parsed.rows, { id: 's', name: 'Sheet' })
    const exported = stringifyCsv(sheetToRows(sheet))
    const reparsed = parseCsv(exported)

    expect(reparsed.ok).toBe(true)
    if (reparsed.ok) {
      expect(reparsed.rows).toEqual(parsed.rows)
    }
  })
})
