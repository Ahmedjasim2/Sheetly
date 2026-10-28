import { describe, expect, it } from 'vitest'
import { createSheet, setCellValue } from '../model'
import { buildSelectionContext, contextToText } from './context'

function makeSheet(): ReturnType<typeof createSheet> {
  let sheet = createSheet({ id: 's', name: 'Sheet', rowCount: 6, columnCount: 4 })
  sheet = setCellValue(sheet, 0, 0, 'Product')
  sheet = setCellValue(sheet, 0, 1, 'Price')
  sheet = setCellValue(sheet, 1, 0, 'Chair')
  sheet = setCellValue(sheet, 1, 1, 120)
  sheet = setCellValue(sheet, 2, 0, 'Desk')
  sheet = setCellValue(sheet, 2, 1, 300)
  return sheet
}

const SELECTION = { start: { row: 0, column: 0 }, end: { row: 2, column: 1 } }

describe('buildSelectionContext', () => {
  it('includes only the selected range with a label and types', () => {
    const context = buildSelectionContext(makeSheet(), SELECTION)

    expect(context.rangeLabel).toBe('A1:B3')
    expect(context.rowCount).toBe(3)
    expect(context.columnCount).toBe(2)
    expect(context.cellCount).toBe(6)
    expect(context.header).toEqual(['Product', 'Price'])
    expect(context.truncated).toBe(false)

    const text = contextToText(context)
    expect(text).toContain('Range: A1:B3')
    expect(text).toContain('Chair')
    expect(text).toContain('[number]')
  })

  it('never includes cells outside the selection', () => {
    let sheet = makeSheet()
    sheet = setCellValue(sheet, 3, 3, 'SECRET')
    const context = buildSelectionContext(sheet, SELECTION)

    expect(contextToText(context)).not.toContain('SECRET')
  })

  it('truncates when the cell limit is exceeded', () => {
    const context = buildSelectionContext(makeSheet(), SELECTION, { maxCells: 3 })

    expect(context.truncated).toBe(true)
    expect(context.warnings.some((warning) => warning.includes('truncated'))).toBe(true)
  })

  it('truncates when the character limit is exceeded', () => {
    const context = buildSelectionContext(makeSheet(), SELECTION, { maxChars: 4 })

    expect(context.truncated).toBe(true)
  })

  it('excludes hidden rows with a warning', () => {
    const context = buildSelectionContext(makeSheet(), SELECTION, { visibleRows: [0] })

    expect(context.warnings.some((warning) => warning.includes('hidden row'))).toBe(true)
    expect(context.rows).toHaveLength(1)
  })
})
