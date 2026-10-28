import { formatCellId, formatCellValue, getCellValue } from '../model'
import type { Cell, CellId, CellValue, Sheet } from '../model'

export interface CsvParseSuccess {
  readonly ok: true
  readonly rows: string[][]
}

export interface CsvParseFailure {
  readonly ok: false
  readonly message: string
  readonly line: number
}

export type CsvParseResult = CsvParseSuccess | CsvParseFailure

/**
 * Parses CSV text into rows of fields.
 *
 * - Supports `\r\n`, `\n`, and `\r` line endings.
 * - Supports quoted fields with embedded commas, quotes (`""`), and newlines.
 * - A leading UTF-8 byte-order mark is ignored.
 * - A blank line becomes a single empty field.
 * - An unterminated quoted field is reported as an error with its 1-based line.
 */
export function parseCsv(text: string): CsvParseResult {
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1)
  }

  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let line = 1
  let i = 0

  function endField(): void {
    row.push(field)
    field = ''
  }

  function endRow(): void {
    endField()
    rows.push(row)
    row = []
  }

  while (i < text.length) {
    const ch = text[i]

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 2
        } else {
          inQuotes = false
          i += 1
        }
      } else {
        field += ch
        i += 1
        if (ch === '\n') {
          line += 1
        }
      }
      continue
    }

    if (ch === '"') {
      if (field === '') {
        inQuotes = true
        i += 1
      } else {
        // Lenient: a quote in the middle of an unquoted field is literal.
        field += ch
        i += 1
      }
    } else if (ch === ',') {
      endField()
      i += 1
    } else if (ch === '\r') {
      if (text[i + 1] === '\n') {
        endRow()
        i += 2
      } else {
        endRow()
        i += 1
      }
      line += 1
    } else if (ch === '\n') {
      endRow()
      i += 1
      line += 1
    } else {
      field += ch
      i += 1
    }
  }

  if (inQuotes) {
    return { ok: false, message: 'Unterminated quoted field', line }
  }

  if (field !== '' || row.length > 0) {
    endRow()
  }

  return { ok: true, rows }
}

function escapeField(field: string): string {
  if (field === '') {
    return ''
  }

  if (/[",\r\n]/.test(field) || field !== field.trim()) {
    return `"${field.replace(/"/g, '""')}"`
  }

  return field
}

/** Serializes rows to CSV text with CRLF line endings. */
export function stringifyCsv(rows: readonly (readonly string[])[]): string {
  return rows.map((row) => row.map(escapeField).join(',')).join('\r\n')
}

/**
 * Converts a single CSV field to a `CellValue`.
 *
 * Definition: a non-empty field is stored verbatim as a string (no type
 * inference); an empty or missing field becomes an empty cell (`null`).
 */
export function csvFieldToValue(field: string): CellValue {
  return field === '' ? null : field
}

/** Renders a sheet as a rectangular grid of CSV-ready strings. */
export function sheetToRows(sheet: Sheet): string[][] {
  const rows: string[][] = []

  for (let row = 0; row < sheet.rowCount; row += 1) {
    const values: string[] = []
    for (let column = 0; column < sheet.columnCount; column += 1) {
      values.push(formatCellValue(getCellValue(sheet, row, column)))
    }
    rows.push(values)
  }

  return rows
}

export interface RowsToSheetOptions {
  readonly id: string
  readonly name: string
}

/**
 * Builds a sheet from CSV rows.
 *
 * The sheet is sized to the number of rows and the widest row. Empty fields are
 * not stored (they read back as `null`), and non-empty fields are stored as
 * strings exactly as parsed.
 */
export function rowsToSheet(
  rows: readonly (readonly string[])[],
  options: RowsToSheetOptions,
): Sheet {
  const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0)
  const cells = new Map<CellId, Cell>()

  for (let row = 0; row < rows.length; row += 1) {
    const fields = rows[row]
    for (let column = 0; column < fields.length; column += 1) {
      const value = csvFieldToValue(fields[column])
      if (value !== null) {
        cells.set(formatCellId(row, column), { row, column, value })
      }
    }
  }

  return { id: options.id, name: options.name, rowCount: rows.length, columnCount, cells }
}
