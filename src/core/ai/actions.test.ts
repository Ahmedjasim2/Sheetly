import { describe, expect, it } from 'vitest'
import { createSheet, getCellValue, setCellValue } from '../model'
import type { Sheet } from '../model'
import { applyPlanAction, describeAction } from './actions'

function makeSheet(): Sheet {
  let sheet = createSheet({ id: 's', name: 'Sheet', rowCount: 4, columnCount: 2 })
  sheet = setCellValue(sheet, 0, 0, 'b')
  sheet = setCellValue(sheet, 1, 0, 'a')
  sheet = setCellValue(sheet, 2, 0, 'b')
  sheet = setCellValue(sheet, 0, 1, '  padded  ')
  return sheet
}

const RANGE = { start: { row: 0, column: 0 }, end: { row: 2, column: 0 } }

describe('applyPlanAction', () => {
  it('sorts via the core sort operation', () => {
    const outcome = applyPlanAction(makeSheet(), { action: 'sort', range: RANGE, direction: 'ascending' })

    expect(outcome.kind).toBe('sheet')
    if (outcome.kind === 'sheet') {
      expect(getCellValue(outcome.sheet, 0, 0)).toBe('a')
      expect(getCellValue(outcome.sheet, 1, 0)).toBe('b')
    }
  })

  it('removes duplicates via the core dedupe operation', () => {
    const outcome = applyPlanAction(makeSheet(), { action: 'remove_duplicates', range: RANGE })

    expect(outcome.kind).toBe('sheet')
    if (outcome.kind === 'sheet') {
      expect(outcome.sheet.rowCount).toBe(3)
    }
  })

  it('cleans text via the core clean operation', () => {
    const outcome = applyPlanAction(makeSheet(), {
      action: 'clean_text',
      range: { start: { row: 0, column: 1 }, end: { row: 0, column: 1 } },
      operation: 'trim',
    })

    expect(outcome.kind).toBe('sheet')
    if (outcome.kind === 'sheet') {
      expect(getCellValue(outcome.sheet, 0, 1)).toBe('padded')
    }
  })

  it('replaces text via the core find/replace operation', () => {
    let sheet = makeSheet()
    sheet = setCellValue(sheet, 0, 0, 'apple pie')
    const outcome = applyPlanAction(sheet, {
      action: 'find_replace',
      range: RANGE,
      query: 'apple',
      replacement: 'pear',
      caseSensitive: false,
    })

    expect(outcome.kind).toBe('sheet')
    if (outcome.kind === 'sheet') {
      expect(getCellValue(outcome.sheet, 0, 0)).toBe('pear pie')
    }
  })

  it('returns a calculate outcome without changing the sheet', () => {
    const outcome = applyPlanAction(makeSheet(), { action: 'calculate', range: RANGE, operation: 'sum' })

    expect(outcome.kind).toBe('calculate')
  })

  it('returns a filter outcome without changing the sheet', () => {
    const outcome = applyPlanAction(makeSheet(), {
      action: 'filter',
      range: RANGE,
      operator: 'equals',
      value: 'a',
    })

    expect(outcome.kind).toBe('filter')
  })
})

describe('describeAction', () => {
  it('summarizes an action for the preview', () => {
    expect(describeAction({ action: 'clean_text', range: RANGE, operation: 'trim' })).toBe(
      'Clean text (trim) on A1:A3',
    )
  })
})
