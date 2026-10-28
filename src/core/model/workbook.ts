import type { Sheet, Workbook } from './types'
import { assertNonEmptyString } from './validation'

export interface CreateWorkbookOptions {
  readonly id: string
  readonly name: string
  readonly sheets?: readonly Sheet[]
}

function assertUniqueSheetIds(sheets: readonly Sheet[]): void {
  const ids = new Set<string>()

  for (const sheet of sheets) {
    if (ids.has(sheet.id)) {
      throw new Error(`Duplicate sheet id: ${sheet.id}`)
    }
    ids.add(sheet.id)
  }
}

/** Creates a workbook. Sheet ids must be unique. */
export function createWorkbook(options: CreateWorkbookOptions): Workbook {
  assertNonEmptyString(options.id, 'workbook id')
  assertNonEmptyString(options.name, 'workbook name')

  const sheets = options.sheets ?? []
  assertUniqueSheetIds(sheets)

  return {
    id: options.id,
    name: options.name,
    sheets: [...sheets],
  }
}

export function getSheet(workbook: Workbook, sheetId: string): Sheet | undefined {
  return workbook.sheets.find((sheet) => sheet.id === sheetId)
}

/** Appends a sheet and returns a new workbook. */
export function addSheet(workbook: Workbook, sheet: Sheet): Workbook {
  if (getSheet(workbook, sheet.id) !== undefined) {
    throw new Error(`Duplicate sheet id: ${sheet.id}`)
  }

  return { ...workbook, sheets: [...workbook.sheets, sheet] }
}

/** Replaces the sheet with the same id and returns a new workbook. */
export function replaceSheet(workbook: Workbook, sheet: Sheet): Workbook {
  if (getSheet(workbook, sheet.id) === undefined) {
    throw new Error(`Unknown sheet id: ${sheet.id}`)
  }

  return {
    ...workbook,
    sheets: workbook.sheets.map((current) => (current.id === sheet.id ? sheet : current)),
  }
}
