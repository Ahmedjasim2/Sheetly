import { describe, expect, it } from 'vitest'
import {
  APP_NAME,
  DEFERRED_FORMATS,
  SUPPORTED_IMPORT_FORMATS,
  formatSupportSummary,
} from './app'

describe('app scope', () => {
  it('uses the agreed project name', () => {
    expect(APP_NAME).toBe('sheetly')
  })

  it('supports CSV and values-only XLSX', () => {
    expect(SUPPORTED_IMPORT_FORMATS).toEqual(['csv', 'xlsx'])
    expect(DEFERRED_FORMATS).toEqual([])
    expect(formatSupportSummary()).toBe(
      'CSV and XLSX (values only); multi-sheet and cell styles are not saved',
    )
  })
})
