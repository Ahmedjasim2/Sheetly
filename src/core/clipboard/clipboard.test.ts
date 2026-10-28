import { describe, expect, it } from 'vitest'
import { createSheet, getCellValue, setCellValue } from '../model'
import type { Sheet } from '../model'
import { copyRange, pasteBlock } from './clipboard'

function makeSheet(rowCount = 4, columnCount = 4): Sheet {
  return createSheet({ id: 's', name: 'Sheet', rowCount, columnCount })
}

describe('copyRange', () => {
  it('copies a single cell', () => {
    const sheet = setCellValue(makeSheet(), 1, 2, 'x')

    expect(copyRange(sheet, { start: { row: 1, column: 2 }, end: { row: 1, column: 2 } })).toEqual([
      ['x'],
    ])
  })

  it('copies a rectangle with mixed values and empties', () => {
    let sheet = makeSheet()
    sheet = setCellValue(sheet, 0, 0, 'name')
    sheet = setCellValue(sheet, 0, 1, 42)
    sheet = setCellValue(sheet, 1, 0, true)
    // (1, 1) left empty

    expect(copyRange(sheet, { start: { row: 0, column: 0 }, end: { row: 1, column: 1 } })).toEqual([
      ['name', 42],
      [true, null],
    ])
  })

  it('normalizes reversed corners', () => {
    const sheet = setCellValue(makeSheet(), 1, 1, 'x')

    expect(copyRange(sheet, { start: { row: 1, column: 1 }, end: { row: 0, column: 0 } })).toEqual([
      [null, null],
      [null, 'x'],
    ])
  })
})

describe('pasteBlock', () => {
  it('writes a block at the anchor', () => {
    const sheet = makeSheet()

    const result = pasteBlock(sheet, [['a', 'b'], [1, null]], { row: 0, column: 0 })

    expect(result.writtenRange).toEqual({
      start: { row: 0, column: 0 },
      end: { row: 1, column: 1 },
    })
    expect(getCellValue(result.sheet, 0, 0)).toBe('a')
    expect(getCellValue(result.sheet, 0, 1)).toBe('b')
    expect(getCellValue(result.sheet, 1, 0)).toBe(1)
    expect(getCellValue(result.sheet, 1, 1)).toBeNull()
  })

  it('overwrites existing data', () => {
    let sheet = makeSheet()
    sheet = setCellValue(sheet, 0, 0, 'old')
    sheet = setCellValue(sheet, 0, 1, 'keep')

    const result = pasteBlock(sheet, [['new']], { row: 0, column: 0 })

    expect(getCellValue(result.sheet, 0, 0)).toBe('new')
    expect(getCellValue(result.sheet, 0, 1)).toBe('keep')
  })

  it('clips the block at the right and bottom edges', () => {
    const sheet = makeSheet(2, 2)

    const result = pasteBlock(
      sheet,
      [
        ['a', 'b', 'c'],
        ['d', 'e', 'f'],
        ['g', 'h', 'i'],
      ],
      { row: 1, column: 1 },
    )

    expect(result.writtenRange).toEqual({
      start: { row: 1, column: 1 },
      end: { row: 1, column: 1 },
    })
    expect(getCellValue(result.sheet, 1, 1)).toBe('a')
  })

  it('returns the same sheet and null range when nothing can be written', () => {
    const sheet = makeSheet(2, 2)

    const atEdge = pasteBlock(sheet, [['a']], { row: 2, column: 0 })
    expect(atEdge.sheet).toBe(sheet)
    expect(atEdge.writtenRange).toBeNull()

    const empty = pasteBlock(sheet, [], { row: 0, column: 0 })
    expect(empty.sheet).toBe(sheet)
    expect(empty.writtenRange).toBeNull()
  })

  it('preserves value types and clears on null', () => {
    let sheet = makeSheet()
    sheet = setCellValue(sheet, 0, 0, 'stale')

    const result = pasteBlock(sheet, [[42, true, null]], { row: 0, column: 0 })

    expect(getCellValue(result.sheet, 0, 0)).toBe(42)
    expect(getCellValue(result.sheet, 0, 1)).toBe(true)
    expect(getCellValue(result.sheet, 0, 2)).toBeNull()
  })

  it('round-trips a copied range', () => {
    let sheet = makeSheet()
    sheet = setCellValue(sheet, 0, 0, 'a')
    sheet = setCellValue(sheet, 0, 1, 'b')
    sheet = setCellValue(sheet, 1, 0, 5)

    const block = copyRange(sheet, { start: { row: 0, column: 0 }, end: { row: 1, column: 1 } })
    const pasted = pasteBlock(makeSheet(), block, { row: 1, column: 1 })

    expect(copyRange(pasted.sheet, { start: { row: 1, column: 1 }, end: { row: 2, column: 2 } })).toEqual(
      block,
    )
  })
})
