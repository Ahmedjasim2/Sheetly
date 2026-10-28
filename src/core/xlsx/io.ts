import { cellValuesToSheet, excelCellToValue, sheetToCellValues } from './convert'
import type { CellValue, Sheet } from '../model'

/**
 * Reads the first worksheet of an XLSX file into a `Sheet`.
 *
 * Only the first worksheet is read. Cell values become string/number/boolean/
 * null; dates become ISO strings and formulas become their text (never run).
 */
export async function readXlsxBuffer(
  buffer: ArrayBuffer,
  options: { readonly id: string; readonly name: string },
): Promise<Sheet> {
  const ExcelJS = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const worksheet = workbook.worksheets[0]
  if (!worksheet) {
    throw new Error('The XLSX file has no worksheet')
  }

  const rowCount = worksheet.rowCount
  const columnCount = worksheet.columnCount
  const rows: CellValue[][] = []

  for (let row = 1; row <= rowCount; row += 1) {
    const values: CellValue[] = []
    for (let column = 1; column <= columnCount; column += 1) {
      values.push(excelCellToValue(worksheet.getCell(row, column).value))
    }
    rows.push(values)
  }

  return cellValuesToSheet(rows, options)
}

/** Writes a `Sheet` to a single XLSX worksheet and returns its bytes. */
export async function writeXlsxBuffer(sheet: Sheet): Promise<ArrayBuffer> {
  const ExcelJS = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(sheet.name)

  for (const row of sheetToCellValues(sheet)) {
    worksheet.addRow(row)
  }

  return (await workbook.xlsx.writeBuffer()) as unknown as ArrayBuffer
}
