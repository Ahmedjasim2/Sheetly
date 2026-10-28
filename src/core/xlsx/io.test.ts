// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createSheet, getCellValue, setCellValue } from '../model'
import type { Sheet } from '../model'
import { readXlsxBuffer, writeXlsxBuffer } from './io'

function buildSheet(): Sheet {
  let sheet = createSheet({ id: 's', name: 'Sheet', rowCount: 4, columnCount: 5 })
  sheet = setCellValue(sheet, 0, 0, 'مرحبا')
  sheet = setCellValue(sheet, 0, 1, 42)
  sheet = setCellValue(sheet, 0, 2, 3.5)
  sheet = setCellValue(sheet, 0, 3, -7)
  sheet = setCellValue(sheet, 0, 4, true)
  sheet = setCellValue(sheet, 1, 0, false)
  sheet = setCellValue(sheet, 2, 0, 0)
  sheet = setCellValue(sheet, 3, 0, '')
  return sheet
}

async function roundTrip(sheet: Sheet): Promise<Sheet> {
  const buffer = await writeXlsxBuffer(sheet)
  return readXlsxBuffer(buffer, { id: sheet.id, name: sheet.name })
}

async function buildWorkbook(build: (workbook: any) => void): Promise<ArrayBuffer> {
  const ExcelJS = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  build(workbook)
  return (await workbook.xlsx.writeBuffer()) as unknown as ArrayBuffer
}

describe('xlsx round-trip', () => {
  it('preserves values and types', async () => {
    const sheet = buildSheet()
    const result = await roundTrip(sheet)

    expect(result.rowCount).toBe(sheet.rowCount)
    expect(result.columnCount).toBe(sheet.columnCount)
    expect(getCellValue(result, 0, 0)).toBe('مرحبا')
    expect(getCellValue(result, 0, 1)).toBe(42)
    expect(getCellValue(result, 0, 2)).toBe(3.5)
    expect(getCellValue(result, 0, 3)).toBe(-7)
    expect(getCellValue(result, 0, 4)).toBe(true)
    expect(getCellValue(result, 1, 0)).toBe(false)
    expect(getCellValue(result, 2, 0)).toBe(0)
    expect(getCellValue(result, 3, 0)).toBe('')
    expect(getCellValue(result, 1, 1)).toBeNull()
  })

  it('imports only the first worksheet of a multi-sheet file', async () => {
    const buffer = await buildWorkbook((workbook) => {
      const first = workbook.addWorksheet('First')
      first.addRow(['kept', 1])
      const second = workbook.addWorksheet('Second')
      second.addRow(['ignored', 999])
    })

    const result = await readXlsxBuffer(buffer, { id: 's', name: 'Sheet' })

    expect(getCellValue(result, 0, 0)).toBe('kept')
    expect(getCellValue(result, 0, 1)).toBe(1)
    expect(result.rowCount).toBe(1)
    expect(result.columnCount).toBe(2)
  })

  it('imports dates as ISO strings', async () => {
    const buffer = await buildWorkbook((workbook) => {
      const sheet = workbook.addWorksheet('Dates')
      const cell = sheet.getCell('A1')
      cell.value = new Date('2026-01-15T00:00:00.000Z')
      cell.numFmt = 'yyyy-mm-dd'
    })

    const result = await readXlsxBuffer(buffer, { id: 's', name: 'Sheet' })

    expect(getCellValue(result, 0, 0)).toBe('2026-01-15T00:00:00.000Z')
  })

  it('imports formulas as text without evaluating them', async () => {
    const buffer = await buildWorkbook((workbook) => {
      const sheet = workbook.addWorksheet('Formulas')
      sheet.getCell('A1').value = 2
      sheet.getCell('B1').value = 3
      sheet.getCell('C1').value = { formula: 'A1+B1', result: 5 }
    })

    const result = await readXlsxBuffer(buffer, { id: 's', name: 'Sheet' })

    expect(getCellValue(result, 0, 2)).toBe('A1+B1')
  })

  it('rejects a corrupt file', async () => {
    await expect(readXlsxBuffer(new ArrayBuffer(16), { id: 's', name: 'Sheet' })).rejects.toThrow()
  })

  it('handles a medium-sized sheet', async () => {
    let sheet = createSheet({ id: 's', name: 'Sheet', rowCount: 150, columnCount: 8 })
    for (let row = 0; row < 150; row += 1) {
      sheet = setCellValue(sheet, row, 0, `row-${row}`)
      sheet = setCellValue(sheet, row, 1, row)
      sheet = setCellValue(sheet, row, 2, row * 0.5)
      sheet = setCellValue(sheet, row, 3, row % 2 === 0)
    }

    const result = await roundTrip(sheet)

    expect(result.rowCount).toBe(150)
    // Trailing empty columns (4-7) are not stored by XLSX.
    expect(result.columnCount).toBe(4)
    expect(getCellValue(result, 149, 0)).toBe('row-149')
    expect(getCellValue(result, 149, 1)).toBe(149)
    expect(getCellValue(result, 149, 2)).toBe(74.5)
    expect(getCellValue(result, 149, 3)).toBe(false)
  })
})
