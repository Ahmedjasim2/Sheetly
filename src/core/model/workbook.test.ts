import { describe, expect, it } from 'vitest'
import { createSheet, getCellValue, setCellValue } from './sheet'
import { addSheet, createWorkbook, getSheet, replaceSheet } from './workbook'

function sheet(id: string, name: string) {
  return createSheet({ id, name, rowCount: 2, columnCount: 2 })
}

describe('createWorkbook', () => {
  it('stores its sheets', () => {
    const first = sheet('one', 'One')
    const workbook = createWorkbook({ id: 'wb', name: 'Workbook', sheets: [first] })

    expect(workbook.id).toBe('wb')
    expect(workbook.name).toBe('Workbook')
    expect(workbook.sheets).toHaveLength(1)
    expect(getSheet(workbook, 'one')).toBe(first)
  })

  it('rejects duplicate sheet ids', () => {
    expect(() =>
      createWorkbook({
        id: 'wb',
        name: 'Workbook',
        sheets: [sheet('same', 'One'), sheet('same', 'Two')],
      }),
    ).toThrow(/Duplicate sheet id/)
  })

  it('rejects blank workbook ids and names', () => {
    expect(() => createWorkbook({ id: '', name: 'Workbook' })).toThrow(TypeError)
    expect(() => createWorkbook({ id: 'wb', name: ' ' })).toThrow(TypeError)
  })
})

describe('addSheet', () => {
  it('appends a sheet without mutating the workbook', () => {
    const workbook = createWorkbook({ id: 'wb', name: 'Workbook' })
    const next = addSheet(workbook, sheet('one', 'One'))

    expect(workbook.sheets).toHaveLength(0)
    expect(next.sheets).toHaveLength(1)
    expect(getSheet(next, 'one')?.name).toBe('One')
  })

  it('rejects a duplicate id', () => {
    const workbook = addSheet(createWorkbook({ id: 'wb', name: 'Workbook' }), sheet('one', 'One'))

    expect(() => addSheet(workbook, sheet('one', 'Duplicate'))).toThrow(/Duplicate sheet id/)
  })
})

describe('getSheet', () => {
  it('returns undefined for an unknown id', () => {
    const workbook = createWorkbook({ id: 'wb', name: 'Workbook' })

    expect(getSheet(workbook, 'missing')).toBeUndefined()
  })
})

describe('replaceSheet', () => {
  it('replaces an existing sheet and keeps other sheets', () => {
    const first = sheet('one', 'One')
    const second = sheet('two', 'Two')
    const workbook = createWorkbook({ id: 'wb', name: 'Workbook', sheets: [first, second] })
    const updated = setCellValue(first, 0, 0, 'updated')

    const next = replaceSheet(workbook, updated)

    expect(getSheet(next, 'one')).toBe(updated)
    expect(getSheet(next, 'two')).toBe(second)
    expect(getSheet(workbook, 'one')).toBe(first)

    const replaced = getSheet(next, 'one')
    if (replaced === undefined) {
      throw new Error('expected the replaced sheet to exist')
    }
    expect(getCellValue(replaced, 0, 0)).toBe('updated')
  })

  it('rejects an unknown sheet id', () => {
    const workbook = createWorkbook({ id: 'wb', name: 'Workbook' })

    expect(() => replaceSheet(workbook, sheet('missing', 'Missing'))).toThrow(/Unknown sheet id/)
  })
})
