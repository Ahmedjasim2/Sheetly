/**
 * Pure, framework-agnostic application metadata and scope.
 *
 * This module must not import React, touch the DOM, or depend on browser APIs.
 * The spreadsheet data model (workbook, sheet, cells) arrives in a later phase.
 */

export const APP_NAME = 'sheetly'

export const APP_TAGLINE = 'Click-First Open Source Spreadsheet \u00B7 Zero Syntax Required'

/** File formats the app can import in the current phase. */
export const SUPPORTED_IMPORT_FORMATS = ['csv', 'xlsx'] as const

/** Formats intentionally postponed (multi-sheet XLSX and cell formatting). */
export const DEFERRED_FORMATS = [] as const

export type SupportedImportFormat = (typeof SUPPORTED_IMPORT_FORMATS)[number]

/** Human-readable summary of the current format scope. */
export function formatSupportSummary(): string {
  return 'CSV and XLSX (values only); multi-sheet and cell styles are not saved'
}
