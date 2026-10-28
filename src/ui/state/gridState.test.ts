import { describe, expect, it } from 'vitest'
import { createSheet, getCellValue, setCellValue } from '../../core/model'
import type { CellValue, Sheet } from '../../core/model'
import { canRedo, canUndo } from './history'
import {
  createInitialGridState,
  gridReducer,
  HISTORY_LIMIT,
  selectionRange,
  sheetTabs,
  stylesForActiveSheet,
  type GridState,
} from './gridState'

function makeState(rowCount = 3, columnCount = 3): GridState {
  return createInitialGridState(
    createSheet({ id: 's', name: 'Sheet', rowCount, columnCount }),
  )
}

function sheetOf(state: GridState): Sheet {
  return state.history.present
}

function select(state: GridState, row: number, column: number): GridState {
  return gridReducer(state, { type: 'select', cell: { row, column } })
}

function editCell(state: GridState, row: number, column: number, value: string): GridState {
  let next = select(state, row, column)
  next = gridReducer(next, { type: 'start-editing' })
  next = gridReducer(next, { type: 'change-draft', value })
  return gridReducer(next, { type: 'commit-edit' })
}

describe('createInitialGridState', () => {
  it('starts with no selection, clipboard, or history', () => {
    const state = makeState()

    expect(state.selection).toBeNull()
    expect(state.clipboard).toBeNull()
    expect(state.editing).toBe(false)
    expect(state.draft).toBe('')
    expect(canUndo(state.history)).toBe(false)
    expect(canRedo(state.history)).toBe(false)
  })
})

describe('selection', () => {
  it('selects a single cell (anchor === focus)', () => {
    const state = select(makeState(), 1, 2)

    expect(state.selection).toEqual({ anchor: { row: 1, column: 2 }, focus: { row: 1, column: 2 } })
  })

  it('returns the same state for a repeat selection', () => {
    const state = select(makeState(), 1, 2)
    expect(select(state, 1, 2)).toBe(state)
  })

  it('extends into a rectangle while keeping the anchor', () => {
    let state = select(makeState(), 0, 0)
    state = gridReducer(state, { type: 'extend-selection', cell: { row: 2, column: 1 } })

    expect(state.selection).toEqual({
      anchor: { row: 0, column: 0 },
      focus: { row: 2, column: 1 },
    })

    const selection = state.selection
    if (selection === null) {
      throw new Error('expected a selection')
    }
    expect(selectionRange(selection)).toEqual({
      start: { row: 0, column: 0 },
      end: { row: 2, column: 1 },
    })
  })

  it('extend-selection without a prior selection starts a single cell', () => {
    const state = gridReducer(makeState(), { type: 'extend-selection', cell: { row: 1, column: 1 } })

    expect(state.selection).toEqual({ anchor: { row: 1, column: 1 }, focus: { row: 1, column: 1 } })
  })
})

describe('editing', () => {
  it('starts editing with the focus cell value', () => {
    let state = select(makeState(), 0, 0)
    state = gridReducer(state, { type: 'start-editing' })

    expect(state.editing).toBe(true)
    expect(state.draft).toBe('')
  })

  it('does nothing when starting editing without a selection', () => {
    const state = gridReducer(makeState(), { type: 'start-editing' })

    expect(state.editing).toBe(false)
  })

  it('commits a typed value into the focus cell', () => {
    const state = editCell(makeState(), 0, 0, '42')

    expect(state.editing).toBe(false)
    expect(state.draft).toBe('')
    expect(getCellValue(sheetOf(state), 0, 0)).toBe(42)
  })

  it('clears the cell when the committed draft is empty', () => {
    let state = editCell(makeState(), 0, 0, 'value')
    state = editCell(state, 0, 0, '')

    expect(getCellValue(sheetOf(state), 0, 0)).toBeNull()
  })

  it('cancels editing without writing', () => {
    let state = select(makeState(), 0, 0)
    state = gridReducer(state, { type: 'start-editing' })
    state = gridReducer(state, { type: 'change-draft', value: 'nope' })
    state = gridReducer(state, { type: 'cancel-edit' })

    expect(state.editing).toBe(false)
    expect(getCellValue(sheetOf(state), 0, 0)).toBeNull()
  })

  it('ignores draft changes and commits when not editing', () => {
    const changed = gridReducer(makeState(), { type: 'change-draft', value: 'x' })
    expect(changed.draft).toBe('')

    const committed = gridReducer(changed, { type: 'commit-edit' })
    expect(committed).toBe(changed)
  })
})

describe('row operations', () => {
  it('inserts a row above the focus and shifts the selection', () => {
    let state = select(makeState(3, 2), 1, 0)
    state = gridReducer(state, { type: 'insert-row', index: 1 })

    expect(sheetOf(state).rowCount).toBe(4)
    expect(state.selection).toEqual({ anchor: { row: 2, column: 0 }, focus: { row: 2, column: 0 } })
  })

  it('deletes a row and keeps the selection valid', () => {
    let state = select(makeState(4, 2), 2, 0)
    state = gridReducer(state, { type: 'delete-row', index: 2 })

    expect(sheetOf(state).rowCount).toBe(3)
    expect(state.selection).toEqual({ anchor: { row: 2, column: 0 }, focus: { row: 2, column: 0 } })
  })

  it('keeps at least one row', () => {
    const state = makeState(1, 2)
    expect(gridReducer(state, { type: 'delete-row', index: 0 })).toBe(state)
  })

  it('cancels editing on a structural change', () => {
    let state = select(makeState(3, 2), 1, 0)
    state = gridReducer(state, { type: 'start-editing' })
    state = gridReducer(state, { type: 'insert-row', index: 1 })

    expect(state.editing).toBe(false)
    expect(state.draft).toBe('')
  })
})

describe('column operations', () => {
  it('inserts and deletes columns, shifting the selection', () => {
    let state = select(makeState(2, 3), 0, 1)
    state = gridReducer(state, { type: 'insert-column', index: 1 })

    expect(sheetOf(state).columnCount).toBe(4)
    expect(state.selection).toEqual({ anchor: { row: 0, column: 2 }, focus: { row: 0, column: 2 } })

    state = gridReducer(state, { type: 'delete-column', index: 2 })

    expect(sheetOf(state).columnCount).toBe(3)
    expect(state.selection).toEqual({ anchor: { row: 0, column: 2 }, focus: { row: 0, column: 2 } })
  })

  it('keeps at least one column', () => {
    const state = makeState(2, 1)
    expect(gridReducer(state, { type: 'delete-column', index: 0 })).toBe(state)
  })
})

describe('copy and paste', () => {
  it('copies a cell without recording history', () => {
    let state = editCell(makeState(), 0, 0, '42')
    state = select(state, 0, 0)
    const before = canUndo(state.history)

    state = gridReducer(state, { type: 'copy' })

    expect(state.clipboard).toEqual([[42]])
    expect(canUndo(state.history)).toBe(before)
  })

  it('copies a multi-cell rectangle with mixed and empty values', () => {
    let state = makeState(3, 3)
    state = editCell(state, 0, 0, 'a')
    state = editCell(state, 0, 1, 'b')
    state = editCell(state, 1, 0, '1')

    state = select(state, 0, 0)
    state = gridReducer(state, { type: 'extend-selection', cell: { row: 1, column: 1 } })
    state = gridReducer(state, { type: 'copy' })

    expect(state.clipboard).toEqual([
      ['a', 'b'],
      [1, null],
    ])
  })

  it('pastes a copied cell into a new position and records history', () => {
    let state = editCell(makeState(), 0, 0, '42')
    state = select(state, 0, 0)
    state = gridReducer(state, { type: 'copy' })
    state = select(state, 2, 2)
    state = gridReducer(state, { type: 'paste' })

    expect(getCellValue(sheetOf(state), 2, 2)).toBe(42)
    expect(state.selection).toEqual({ anchor: { row: 2, column: 2 }, focus: { row: 2, column: 2 } })
    expect(canUndo(state.history)).toBe(true)
  })

  it('pastes a multi-cell range', () => {
    let state = makeState(3, 3)
    state = editCell(state, 0, 0, 'a')
    state = editCell(state, 0, 1, 'b')
    state = editCell(state, 1, 0, 'c')

    state = select(state, 0, 0)
    state = gridReducer(state, { type: 'extend-selection', cell: { row: 1, column: 1 } })
    state = gridReducer(state, { type: 'copy' })
    state = select(state, 1, 1)
    state = gridReducer(state, { type: 'paste' })

    expect(getCellValue(sheetOf(state), 1, 1)).toBe('a')
    expect(getCellValue(sheetOf(state), 1, 2)).toBe('b')
    expect(getCellValue(sheetOf(state), 2, 1)).toBe('c')
    expect(getCellValue(sheetOf(state), 2, 2)).toBeNull()
  })

  it('pastes a small block into a larger selection at its top-left', () => {
    let state = editCell(makeState(3, 3), 0, 0, 'x')
    state = select(state, 0, 0)
    state = gridReducer(state, { type: 'copy' })

    state = select(state, 1, 0)
    state = gridReducer(state, { type: 'extend-selection', cell: { row: 2, column: 1 } })
    state = gridReducer(state, { type: 'paste' })

    expect(getCellValue(sheetOf(state), 1, 0)).toBe('x')
    expect(getCellValue(sheetOf(state), 1, 1)).toBeNull()
    expect(getCellValue(sheetOf(state), 2, 0)).toBeNull()
    expect(getCellValue(sheetOf(state), 2, 1)).toBeNull()
    expect(state.selection).toEqual({ anchor: { row: 1, column: 0 }, focus: { row: 1, column: 0 } })
  })

  it('clips a paste that overflows the sheet', () => {
    let state = makeState(3, 3)
    state = editCell(state, 0, 0, 'a')
    state = editCell(state, 0, 1, 'b')
    state = editCell(state, 1, 0, 'c')

    state = select(state, 0, 0)
    state = gridReducer(state, { type: 'extend-selection', cell: { row: 1, column: 1 } })
    state = gridReducer(state, { type: 'copy' })
    state = select(state, 2, 2)
    state = gridReducer(state, { type: 'paste' })

    expect(getCellValue(sheetOf(state), 2, 2)).toBe('a')
    expect(state.selection).toEqual({ anchor: { row: 2, column: 2 }, focus: { row: 2, column: 2 } })
  })

  it('overwrites existing data and undoes the paste', () => {
    let state = editCell(makeState(), 0, 0, 'src')
    state = select(state, 0, 0)
    state = gridReducer(state, { type: 'copy' })

    state = editCell(state, 1, 1, 'old')
    state = select(state, 1, 1)
    state = gridReducer(state, { type: 'paste' })

    expect(getCellValue(sheetOf(state), 1, 1)).toBe('src')

    state = gridReducer(state, { type: 'undo' })
    expect(getCellValue(sheetOf(state), 1, 1)).toBe('old')
    expect(getCellValue(sheetOf(state), 0, 0)).toBe('src')

    state = gridReducer(state, { type: 'redo' })
    expect(getCellValue(sheetOf(state), 1, 1)).toBe('src')
  })

  it('does nothing when copying or pasting without a selection or clipboard', () => {
    const noSelection = makeState()
    expect(gridReducer(noSelection, { type: 'copy' })).toBe(noSelection)
    expect(gridReducer(noSelection, { type: 'paste' })).toBe(noSelection)

    const selected = select(makeState(), 0, 0)
    expect(gridReducer(selected, { type: 'paste' })).toBe(selected)
  })
})

describe('import', () => {
  it('stores a pending import and confirms it, replacing the sheet', () => {
    let state = makeState(2, 2)
    state = gridReducer(state, {
      type: 'request-import',
      rows: [
        ['a', 'b'],
        ['1', ''],
      ],
      filename: 'x.csv',
    })

    expect(state.pendingImport).toEqual({ rows: [['a', 'b'], ['1', '']], filename: 'x.csv' })

    state = gridReducer(state, { type: 'confirm-import' })

    expect(state.pendingImport).toBeNull()
    expect(sheetOf(state).rowCount).toBe(2)
    expect(sheetOf(state).columnCount).toBe(2)
    expect(getCellValue(sheetOf(state), 0, 0)).toBe('a')
    expect(getCellValue(sheetOf(state), 1, 0)).toBe('1')
    expect(state.selection).toBeNull()
  })

  it('cancels a pending import without changing the sheet', () => {
    let state = makeState(2, 2)
    state = gridReducer(state, { type: 'request-import', rows: [['a']], filename: 'x.csv' })
    state = gridReducer(state, { type: 'cancel-import' })

    expect(state.pendingImport).toBeNull()
    expect(sheetOf(state).rowCount).toBe(2)
  })

  it('sets and shows an import error', () => {
    const state = gridReducer(makeState(), { type: 'set-import-error', message: 'bad file' })

    expect(state.importError).toBe('bad file')
    expect(state.pendingImport).toBeNull()
  })

  it('confirm-import is a no-op without a pending import', () => {
    const state = makeState(2, 2)

    expect(gridReducer(state, { type: 'confirm-import' })).toBe(state)
  })
})

describe('undo and redo', () => {
  it('undoes and redoes a cell edit', () => {
    let state = editCell(makeState(), 0, 0, '42')

    state = gridReducer(state, { type: 'undo' })
    expect(getCellValue(sheetOf(state), 0, 0)).toBeNull()
    expect(canRedo(state.history)).toBe(true)

    state = gridReducer(state, { type: 'redo' })
    expect(getCellValue(sheetOf(state), 0, 0)).toBe(42)
  })

  it('undoes and redoes several edits in order', () => {
    let state = makeState()
    state = editCell(state, 0, 0, 'a')
    state = editCell(state, 0, 0, 'b')
    state = editCell(state, 0, 0, 'c')

    state = gridReducer(state, { type: 'undo' })
    expect(getCellValue(sheetOf(state), 0, 0)).toBe('b')
    state = gridReducer(state, { type: 'undo' })
    expect(getCellValue(sheetOf(state), 0, 0)).toBe('a')
    state = gridReducer(state, { type: 'undo' })
    expect(getCellValue(sheetOf(state), 0, 0)).toBeNull()

    state = gridReducer(state, { type: 'redo' })
    expect(getCellValue(sheetOf(state), 0, 0)).toBe('a')
    state = gridReducer(state, { type: 'redo' })
    expect(getCellValue(sheetOf(state), 0, 0)).toBe('b')
    state = gridReducer(state, { type: 'redo' })
    expect(getCellValue(sheetOf(state), 0, 0)).toBe('c')
  })

  it('undoes and redoes a CSV import', () => {
    let state = editCell(makeState(4, 3), 0, 0, 'old')
    state = gridReducer(state, {
      type: 'request-import',
      rows: [['new', 'x']],
      filename: 'x.csv',
    })
    state = gridReducer(state, { type: 'confirm-import' })

    expect(getCellValue(sheetOf(state), 0, 0)).toBe('new')

    state = gridReducer(state, { type: 'undo' })
    expect(sheetOf(state).rowCount).toBe(4)
    expect(getCellValue(sheetOf(state), 0, 0)).toBe('old')

    state = gridReducer(state, { type: 'redo' })
    expect(getCellValue(sheetOf(state), 0, 0)).toBe('new')
  })

  it('clears redo history when a new change happens after undo', () => {
    let state = editCell(makeState(), 0, 0, 'a')
    state = gridReducer(state, { type: 'undo' })
    expect(canRedo(state.history)).toBe(true)

    state = editCell(state, 0, 0, 'b')
    expect(canRedo(state.history)).toBe(false)
    expect(gridReducer(state, { type: 'redo' })).toBe(state)
  })

  it('does not record no-op edits', () => {
    let state = editCell(makeState(), 0, 0, 'same')
    state = editCell(state, 0, 0, 'same')
    state = gridReducer(state, { type: 'undo' })

    expect(getCellValue(sheetOf(state), 0, 0)).toBeNull()
    expect(canUndo(state.history)).toBe(false)
  })

  it('does nothing when there is nothing to undo or redo', () => {
    const state = makeState()

    expect(gridReducer(state, { type: 'undo' })).toBe(state)
    expect(gridReducer(state, { type: 'redo' })).toBe(state)
  })

  it('caps the history at HISTORY_LIMIT entries', () => {
    let state = makeState()
    for (let index = 0; index < HISTORY_LIMIT + 5; index += 1) {
      state = editCell(state, 0, 0, String(index))
    }

    expect(state.history.past.length).toBe(HISTORY_LIMIT)
  })
})

describe('calculations', () => {
  it('calculates a sum without changing data, history, or selection', () => {
    let state = makeState(3, 3)
    state = editCell(state, 0, 0, '1')
    state = editCell(state, 0, 1, '2')
    state = editCell(state, 0, 2, '3')

    state = select(state, 0, 0)
    state = gridReducer(state, { type: 'extend-selection', cell: { row: 0, column: 2 } })

    const undoableBefore = canUndo(state.history)
    state = gridReducer(state, { type: 'calculate', operation: 'sum' })

    expect(state.calculation).toEqual({ operation: 'sum', value: 6 })
    expect(canUndo(state.history)).toBe(undoableBefore)
    expect(getCellValue(sheetOf(state), 0, 0)).toBe(1)
    expect(getCellValue(sheetOf(state), 0, 2)).toBe(3)
    expect(state.selection).toEqual({
      anchor: { row: 0, column: 0 },
      focus: { row: 0, column: 2 },
    })
  })

  it('calculates average, minimum, maximum, and count', () => {
    let state = makeState(3, 3)
    state = editCell(state, 0, 0, '10')
    state = editCell(state, 0, 1, '-5')
    state = editCell(state, 0, 2, '2.5')

    state = select(state, 0, 0)
    state = gridReducer(state, { type: 'extend-selection', cell: { row: 0, column: 2 } })

    state = gridReducer(state, { type: 'calculate', operation: 'average' })
    expect(state.calculation).toEqual({ operation: 'average', value: 2.5 })

    state = gridReducer(state, { type: 'calculate', operation: 'minimum' })
    expect(state.calculation).toEqual({ operation: 'minimum', value: -5 })

    state = gridReducer(state, { type: 'calculate', operation: 'maximum' })
    expect(state.calculation).toEqual({ operation: 'maximum', value: 10 })

    state = gridReducer(state, { type: 'calculate', operation: 'count' })
    expect(state.calculation).toEqual({ operation: 'count', value: 3 })
  })

  it('returns null for sum and 0 for count when there are no numbers', () => {
    let state = editCell(makeState(), 0, 0, 'text')
    state = select(state, 0, 0)

    state = gridReducer(state, { type: 'calculate', operation: 'sum' })
    expect(state.calculation).toEqual({ operation: 'sum', value: null })

    state = gridReducer(state, { type: 'calculate', operation: 'count' })
    expect(state.calculation).toEqual({ operation: 'count', value: 0 })
  })

  it('does nothing without a selection', () => {
    const state = gridReducer(makeState(), { type: 'calculate', operation: 'sum' })

    expect(state.calculation).toBeNull()
  })

  it('clears the result when the selection changes', () => {
    let state = editCell(makeState(), 0, 0, '5')
    state = select(state, 0, 0)
    state = gridReducer(state, { type: 'calculate', operation: 'sum' })
    expect(state.calculation).not.toBeNull()

    state = select(state, 1, 1)
    expect(state.calculation).toBeNull()
  })

  it('clears the result when data changes', () => {
    let state = editCell(makeState(), 0, 0, '5')
    state = select(state, 0, 0)
    state = gridReducer(state, { type: 'calculate', operation: 'sum' })
    expect(state.calculation).not.toBeNull()

    state = editCell(state, 0, 0, '9')
    expect(state.calculation).toBeNull()
  })
})

describe('sort', () => {
  function fillColumn(state: GridState, column: number, values: readonly string[]): GridState {
    let next = state
    values.forEach((value, row) => {
      next = editCell(next, row, column, value)
    })
    return next
  }

  function readColumn(state: GridState, column: number): CellValue[] {
    const sheet = sheetOf(state)
    const values: CellValue[] = []
    for (let row = 0; row < sheet.rowCount; row += 1) {
      values.push(getCellValue(sheet, row, column))
    }
    return values
  }

  it('sorts the whole column when a single cell is selected', () => {
    let state = makeState(3, 2)
    state = fillColumn(state, 0, ['3', '1', '2'])
    state = select(state, 0, 0)

    state = gridReducer(state, { type: 'sort', direction: 'ascending' })

    expect(readColumn(state, 0)).toEqual([1, 2, 3])
  })

  it('sorts only the selected range rows', () => {
    let state = makeState(4, 2)
    state = fillColumn(state, 0, ['4', '3', '2', '1'])
    state = select(state, 1, 0)
    state = gridReducer(state, { type: 'extend-selection', cell: { row: 2, column: 0 } })

    state = gridReducer(state, { type: 'sort', direction: 'ascending' })

    expect(readColumn(state, 0)).toEqual([4, 2, 3, 1])
  })

  it('records sort in undo/redo', () => {
    let state = makeState(3, 2)
    state = fillColumn(state, 0, ['3', '1', '2'])
    state = select(state, 0, 0)
    state = gridReducer(state, { type: 'sort', direction: 'ascending' })
    expect(readColumn(state, 0)).toEqual([1, 2, 3])

    state = gridReducer(state, { type: 'undo' })
    expect(readColumn(state, 0)).toEqual([3, 1, 2])

    state = gridReducer(state, { type: 'redo' })
    expect(readColumn(state, 0)).toEqual([1, 2, 3])
  })

  it('sets a notice when there is no selection', () => {
    const state = gridReducer(makeState(), { type: 'sort', direction: 'ascending' })

    expect(state.sortNotice).toBe('Select a cell or range to sort')
  })

  it('does not record history when already sorted', () => {
    let state = makeState(3, 2)
    state = fillColumn(state, 0, ['1', '2', '3'])
    state = select(state, 0, 0)
    const pastBefore = state.history.past.length

    state = gridReducer(state, { type: 'sort', direction: 'ascending' })

    expect(state.history.past.length).toBe(pastBefore)
  })

  it('does not change row or column counts', () => {
    let state = makeState(3, 2)
    state = fillColumn(state, 0, ['3', '1', '2'])
    state = select(state, 0, 0)

    state = gridReducer(state, { type: 'sort', direction: 'descending' })

    expect(sheetOf(state).rowCount).toBe(3)
    expect(sheetOf(state).columnCount).toBe(2)
  })
})

describe('filter', () => {
  it('applies a filter to the focus column without changing data or history', () => {
    let state = makeState(4, 3)
    state = editCell(state, 0, 1, 'a')
    state = editCell(state, 1, 1, 'b')
    state = select(state, 0, 1)
    const pastBefore = state.history.past.length

    state = gridReducer(state, { type: 'apply-filter', operator: 'equals', value: 'a' })

    expect(state.filter).toEqual({ column: 1, operator: 'equals', value: 'a' })
    expect(state.history.past.length).toBe(pastBefore)
    expect(getCellValue(sheetOf(state), 1, 1)).toBe('b')
    expect(state.selection).toEqual({
      anchor: { row: 0, column: 1 },
      focus: { row: 0, column: 1 },
    })
  })

  it('does nothing without a selection', () => {
    const state = gridReducer(makeState(), {
      type: 'apply-filter',
      operator: 'equals',
      value: 'a',
    })

    expect(state.filter).toBeNull()
  })

  it('clears the filter', () => {
    let state = select(makeState(), 0, 0)
    state = gridReducer(state, { type: 'apply-filter', operator: 'empty', value: '' })
    state = gridReducer(state, { type: 'clear-filter' })

    expect(state.filter).toBeNull()
  })

  it('keeps the filter when the selection moves', () => {
    let state = select(makeState(3, 3), 0, 0)
    state = gridReducer(state, { type: 'apply-filter', operator: 'equals', value: 'x' })
    state = select(state, 1, 2)

    expect(state.filter).toEqual({ column: 0, operator: 'equals', value: 'x' })
  })

  it('keeps the filter when data changes', () => {
    let state = editCell(makeState(3, 2), 0, 0, 'a')
    state = select(state, 0, 0)
    state = gridReducer(state, { type: 'apply-filter', operator: 'equals', value: 'a' })
    state = editCell(state, 0, 0, 'b')

    expect(state.filter).not.toBeNull()
  })

  it('clears the filter when columns change', () => {
    let state = select(makeState(3, 3), 0, 1)
    state = gridReducer(state, { type: 'apply-filter', operator: 'equals', value: 'x' })
    state = gridReducer(state, { type: 'insert-column', index: 0 })

    expect(state.filter).toBeNull()
  })

  it('keeps the filter across undo when its column still exists', () => {
    let state = editCell(makeState(3, 2), 0, 0, 'a')
    state = select(state, 0, 0)
    state = gridReducer(state, { type: 'apply-filter', operator: 'equals', value: 'a' })
    state = gridReducer(state, { type: 'undo' })

    expect(state.filter).toEqual({ column: 0, operator: 'equals', value: 'a' })
  })
})

describe('clean text', () => {
  it('trims the selected range and records one undo step', () => {
    let state = makeState(3, 3)
    state = editCell(state, 0, 0, '  a  ')
    state = editCell(state, 0, 1, '  b  ')
    state = select(state, 0, 0)
    state = gridReducer(state, { type: 'extend-selection', cell: { row: 0, column: 1 } })
    const pastBefore = state.history.past.length

    state = gridReducer(state, { type: 'clean-text', operation: 'trim' })

    expect(getCellValue(sheetOf(state), 0, 0)).toBe('a')
    expect(getCellValue(sheetOf(state), 0, 1)).toBe('b')
    expect(state.history.past.length).toBe(pastBefore + 1)
    expect(state.cleanNotice).toBe('Cleaned 2 cells')
  })

  it('preserves the selection after cleaning', () => {
    let state = editCell(makeState(2, 2), 0, 0, '  x  ')
    state = select(state, 0, 0)
    state = gridReducer(state, { type: 'clean-text', operation: 'trim' })

    expect(state.selection).toEqual({
      anchor: { row: 0, column: 0 },
      focus: { row: 0, column: 0 },
    })
  })

  it('does not record a no-op clean', () => {
    let state = editCell(makeState(2, 2), 0, 0, 'clean')
    state = select(state, 0, 0)
    const pastBefore = state.history.past.length

    state = gridReducer(state, { type: 'clean-text', operation: 'trim' })

    expect(state.history.past.length).toBe(pastBefore)
    expect(state.cleanNotice).toBe('Cleaned 0 cells')
  })

  it('cleans only the selected range and keeps the filter', () => {
    let state = makeState(4, 2)
    state = editCell(state, 0, 0, '  a  ')
    state = editCell(state, 3, 0, '  b  ')
    state = select(state, 0, 0)
    state = gridReducer(state, { type: 'apply-filter', operator: 'not-empty', value: '' })

    state = gridReducer(state, { type: 'clean-text', operation: 'trim' })

    expect(getCellValue(sheetOf(state), 0, 0)).toBe('a')
    expect(getCellValue(sheetOf(state), 3, 0)).toBe('  b  ')
    expect(state.filter).not.toBeNull()
  })

  it('undoes and redoes a clean', () => {
    let state = editCell(makeState(2, 2), 0, 0, '  a  ')
    state = select(state, 0, 0)
    state = gridReducer(state, { type: 'clean-text', operation: 'trim' })
    expect(getCellValue(sheetOf(state), 0, 0)).toBe('a')

    state = gridReducer(state, { type: 'undo' })
    expect(getCellValue(sheetOf(state), 0, 0)).toBe('  a  ')

    state = gridReducer(state, { type: 'redo' })
    expect(getCellValue(sheetOf(state), 0, 0)).toBe('a')
  })

  it('does nothing without a selection', () => {
    const state = gridReducer(makeState(), { type: 'clean-text', operation: 'trim' })

    expect(state.cleanNotice).toBeNull()
  })
})

describe('find and replace', () => {
  it('find-next moves the focus to the first match', () => {
    let state = makeState(3, 2)
    state = editCell(state, 0, 0, 'apple')
    state = editCell(state, 1, 0, 'banana')
    state = editCell(state, 2, 0, 'apple pie')
    state = select(state, 0, 0)
    state = gridReducer(state, { type: 'extend-selection', cell: { row: 2, column: 0 } })

    state = gridReducer(state, { type: 'find-next', query: 'apple', caseSensitive: true })

    expect(state.selection).toEqual({ anchor: { row: 0, column: 0 }, focus: { row: 0, column: 0 } })
    expect(state.findNotice).toBe('Match 1 of 2')
  })

  it('find-next reports no results', () => {
    let state = select(makeState(3, 2), 0, 0)
    state = gridReducer(state, { type: 'extend-selection', cell: { row: 2, column: 0 } })
    state = gridReducer(state, { type: 'find-next', query: 'zzz', caseSensitive: true })

    expect(state.findNotice).toBe('No results')
  })

  it('replace-current replaces the focused cell and records one undo step', () => {
    let state = makeState(3, 2)
    state = editCell(state, 0, 0, 'apple')
    state = editCell(state, 1, 0, 'banana')
    state = select(state, 0, 0)
    const pastBefore = state.history.past.length

    state = gridReducer(state, {
      type: 'replace-current',
      query: 'apple',
      replacement: 'pear',
      caseSensitive: true,
    })

    expect(getCellValue(sheetOf(state), 0, 0)).toBe('pear')
    expect(getCellValue(sheetOf(state), 1, 0)).toBe('banana')
    expect(state.history.past.length).toBe(pastBefore + 1)
    expect(state.findNotice).toBe('Replaced 1 cell')
  })

  it('replace-current no-op does not record history', () => {
    let state = editCell(makeState(2, 2), 0, 0, 'apple')
    state = select(state, 0, 0)
    const pastBefore = state.history.past.length

    state = gridReducer(state, {
      type: 'replace-current',
      query: 'zzz',
      replacement: 'x',
      caseSensitive: true,
    })

    expect(state.history.past.length).toBe(pastBefore)
    expect(state.findNotice).toBe('No match to replace')
  })

  it('replace-all replaces every match with one undo step', () => {
    let state = makeState(3, 2)
    state = editCell(state, 0, 0, 'apple')
    state = editCell(state, 1, 0, 'apple pie')
    state = editCell(state, 2, 0, 'banana')
    state = select(state, 0, 0)
    state = gridReducer(state, { type: 'extend-selection', cell: { row: 2, column: 0 } })
    const pastBefore = state.history.past.length

    state = gridReducer(state, {
      type: 'replace-all',
      query: 'apple',
      replacement: 'pear',
      caseSensitive: true,
    })

    expect(getCellValue(sheetOf(state), 0, 0)).toBe('pear')
    expect(getCellValue(sheetOf(state), 1, 0)).toBe('pear pie')
    expect(getCellValue(sheetOf(state), 2, 0)).toBe('banana')
    expect(state.history.past.length).toBe(pastBefore + 1)
    expect(state.findNotice).toBe('Replaced 2 cells')
  })

  it('replace-all no-op does not record history', () => {
    let state = editCell(makeState(2, 2), 0, 0, 'apple')
    state = select(state, 0, 0)
    const pastBefore = state.history.past.length

    state = gridReducer(state, {
      type: 'replace-all',
      query: 'zzz',
      replacement: 'x',
      caseSensitive: true,
    })

    expect(state.history.past.length).toBe(pastBefore)
    expect(state.findNotice).toBe('No matches to replace')
  })

  it('undoes and redoes a replace-all', () => {
    let state = makeState(2, 2)
    state = editCell(state, 0, 0, 'apple')
    state = editCell(state, 1, 0, 'apple')
    state = select(state, 0, 0)
    state = gridReducer(state, { type: 'extend-selection', cell: { row: 1, column: 0 } })

    state = gridReducer(state, {
      type: 'replace-all',
      query: 'apple',
      replacement: 'pear',
      caseSensitive: true,
    })
    expect(getCellValue(sheetOf(state), 0, 0)).toBe('pear')

    state = gridReducer(state, { type: 'undo' })
    expect(getCellValue(sheetOf(state), 0, 0)).toBe('apple')

    state = gridReducer(state, { type: 'redo' })
    expect(getCellValue(sheetOf(state), 0, 0)).toBe('pear')
  })

  it('keeps the filter active across find and replace', () => {
    let state = makeState(3, 2)
    state = editCell(state, 0, 0, 'apple')
    state = editCell(state, 1, 0, 'apple')
    state = select(state, 0, 0)
    state = gridReducer(state, { type: 'apply-filter', operator: 'not-empty', value: '' })
    state = gridReducer(state, { type: 'extend-selection', cell: { row: 1, column: 0 } })

    state = gridReducer(state, {
      type: 'replace-all',
      query: 'apple',
      replacement: 'pear',
      caseSensitive: true,
    })

    expect(state.filter).not.toBeNull()
    expect(getCellValue(sheetOf(state), 0, 0)).toBe('pear')
    expect(getCellValue(sheetOf(state), 1, 0)).toBe('pear')
  })
})

describe('remove duplicates', () => {
  it('removes duplicate rows and records one undo step', () => {
    let state = makeState(4, 2)
    state = editCell(state, 0, 0, 'a')
    state = editCell(state, 1, 0, 'a')
    state = editCell(state, 2, 0, 'b')
    state = select(state, 0, 0)
    state = gridReducer(state, { type: 'extend-selection', cell: { row: 2, column: 0 } })
    const pastBefore = state.history.past.length

    state = gridReducer(state, { type: 'remove-duplicates' })

    expect(sheetOf(state).rowCount).toBe(3)
    expect(getCellValue(sheetOf(state), 0, 0)).toBe('a')
    expect(getCellValue(sheetOf(state), 1, 0)).toBe('b')
    expect(state.history.past.length).toBe(pastBefore + 1)
    expect(state.dedupeNotice).toBe('Removed 1 duplicate row')
  })

  it('does not record history when there are no duplicates', () => {
    let state = makeState(3, 2)
    state = editCell(state, 0, 0, 'a')
    state = editCell(state, 1, 0, 'b')
    state = select(state, 0, 0)
    state = gridReducer(state, { type: 'extend-selection', cell: { row: 1, column: 0 } })
    const pastBefore = state.history.past.length

    state = gridReducer(state, { type: 'remove-duplicates' })

    expect(state.history.past.length).toBe(pastBefore)
    expect(state.dedupeNotice).toBe('No duplicate rows found')
  })

  it('shows a message for a single-row range', () => {
    const state = gridReducer(select(makeState(3, 2), 0, 0), { type: 'remove-duplicates' })

    expect(state.dedupeNotice).toBe('Select more than one row to remove duplicates')
  })

  it('shows a message when there is no selection', () => {
    const state = gridReducer(makeState(), { type: 'remove-duplicates' })

    expect(state.dedupeNotice).toBe('Select a range to remove duplicates')
  })

  it('blocks while a filter is active', () => {
    let state = makeState(3, 2)
    state = editCell(state, 0, 0, 'a')
    state = editCell(state, 1, 0, 'a')
    state = select(state, 0, 0)
    state = gridReducer(state, { type: 'apply-filter', operator: 'not-empty', value: '' })
    state = gridReducer(state, { type: 'extend-selection', cell: { row: 1, column: 0 } })
    const rowCount = sheetOf(state).rowCount

    state = gridReducer(state, { type: 'remove-duplicates' })

    expect(sheetOf(state).rowCount).toBe(rowCount)
    expect(state.dedupeNotice).toBe('Clear the filter before removing duplicates')
  })

  it('undoes and redoes the removal', () => {
    let state = makeState(3, 2)
    state = editCell(state, 0, 0, 'a')
    state = editCell(state, 1, 0, 'a')
    state = select(state, 0, 0)
    state = gridReducer(state, { type: 'extend-selection', cell: { row: 1, column: 0 } })

    state = gridReducer(state, { type: 'remove-duplicates' })
    expect(sheetOf(state).rowCount).toBe(2)

    state = gridReducer(state, { type: 'undo' })
    expect(sheetOf(state).rowCount).toBe(3)
    expect(getCellValue(sheetOf(state), 1, 0)).toBe('a')

    state = gridReducer(state, { type: 'redo' })
    expect(sheetOf(state).rowCount).toBe(2)
  })
})

describe('dirty state', () => {
  const isDirty = (state: GridState) => state.history.present !== state.savedSheet

  it('is clean initially and becomes dirty after a cell edit', () => {
    let state = makeState()
    expect(isDirty(state)).toBe(false)

    state = editCell(state, 0, 0, '42')
    expect(isDirty(state)).toBe(true)
  })

  it('becomes dirty after paste', () => {
    let state = editCell(makeState(), 0, 0, 'x')
    state = gridReducer(state, { type: 'mark-saved' })
    state = select(state, 0, 0)
    state = gridReducer(state, { type: 'copy' })
    state = select(state, 1, 1)
    state = gridReducer(state, { type: 'paste' })

    expect(isDirty(state)).toBe(true)
  })

  it('becomes dirty after a CSV import', () => {
    let state = makeState()
    state = gridReducer(state, { type: 'request-import', rows: [['a']], filename: 'x.csv' })
    state = gridReducer(state, { type: 'confirm-import' })

    expect(isDirty(state)).toBe(true)
  })

  it('becomes dirty after sort', () => {
    let state = makeState(3, 2)
    state = editCell(state, 0, 0, 'b')
    state = editCell(state, 1, 0, 'a')
    state = select(state, 0, 0)
    state = gridReducer(state, { type: 'sort', direction: 'ascending' })

    expect(isDirty(state)).toBe(true)
  })

  it('stays clean for selection, filter, and calculation', () => {
    let state = makeState(3, 2)
    state = editCell(state, 0, 0, '5')
    state = gridReducer(state, { type: 'mark-saved' })
    state = select(state, 1, 1)
    state = gridReducer(state, { type: 'apply-filter', operator: 'empty', value: '' })
    state = gridReducer(state, { type: 'calculate', operation: 'sum' })

    expect(isDirty(state)).toBe(false)
  })

  it('mark-saved resets the dirty state', () => {
    let state = editCell(makeState(), 0, 0, '42')
    expect(isDirty(state)).toBe(true)

    state = gridReducer(state, { type: 'mark-saved' })
    expect(isDirty(state)).toBe(false)
  })

  it('cancelling an import does not mark the sheet dirty', () => {
    let state = makeState()
    state = gridReducer(state, { type: 'request-import', rows: [['a']], filename: 'x.csv' })
    state = gridReducer(state, { type: 'cancel-import' })

    expect(isDirty(state)).toBe(false)
  })

  it('still records undo/redo steps', () => {
    let state = editCell(makeState(), 0, 0, '42')
    expect(canUndo(state.history)).toBe(true)

    state = gridReducer(state, { type: 'undo' })
    expect(getCellValue(sheetOf(state), 0, 0)).toBeNull()
  })
})

describe('dedupe confirmation', () => {
  function fillColumn(state: GridState, rows: number): GridState {
    let next = state
    for (let row = 0; row < rows; row += 1) {
      next = editCell(next, row, 0, 'a')
    }
    return next
  }

  it('asks for confirmation before removing many duplicates', () => {
    let state = fillColumn(makeState(6, 2), 6)
    state = select(state, 0, 0)
    state = gridReducer(state, { type: 'extend-selection', cell: { row: 5, column: 0 } })

    state = gridReducer(state, { type: 'remove-duplicates' })

    expect(state.pendingDedupe).toEqual({
      range: { start: { row: 0, column: 0 }, end: { row: 5, column: 0 } },
      removedRows: 5,
    })
    expect(sheetOf(state).rowCount).toBe(6)
  })

  it('cancel keeps the data and confirm applies the removal', () => {
    let state = fillColumn(makeState(6, 2), 6)
    state = select(state, 0, 0)
    state = gridReducer(state, { type: 'extend-selection', cell: { row: 5, column: 0 } })
    state = gridReducer(state, { type: 'remove-duplicates' })

    state = gridReducer(state, { type: 'cancel-dedupe' })
    expect(state.pendingDedupe).toBeNull()
    expect(sheetOf(state).rowCount).toBe(6)

    state = gridReducer(state, { type: 'remove-duplicates' })
    state = gridReducer(state, { type: 'confirm-dedupe' })
    expect(state.pendingDedupe).toBeNull()
    expect(sheetOf(state).rowCount).toBe(1)
  })

  it('removes without confirmation below the threshold', () => {
    let state = fillColumn(makeState(4, 2), 4)
    state = select(state, 0, 0)
    state = gridReducer(state, { type: 'extend-selection', cell: { row: 3, column: 0 } })

    state = gridReducer(state, { type: 'remove-duplicates' })

    expect(state.pendingDedupe).toBeNull()
    expect(sheetOf(state).rowCount).toBe(1)
  })
})

describe('xlsx sheet import', () => {
  it('confirms a sheet import, preserves id/name, and marks the sheet dirty', () => {
    let state = makeState(3, 2)
    const imported = createSheet({ id: 'x', name: 'X', rowCount: 1, columnCount: 1 })

    state = gridReducer(state, {
      type: 'request-sheet-import',
      sheet: imported,
      filename: 'data.xlsx',
    })
    expect(state.pendingSheetImport).not.toBeNull()

    state = gridReducer(state, { type: 'confirm-sheet-import' })

    expect(state.pendingSheetImport).toBeNull()
    expect(sheetOf(state).rowCount).toBe(1)
    expect(sheetOf(state).id).toBe('s')
    expect(sheetOf(state).name).toBe('Sheet')
    expect(state.history.present !== state.savedSheet).toBe(true)
  })

  it('cancels a sheet import without changing data', () => {
    let state = makeState(3, 2)
    state = gridReducer(state, {
      type: 'request-sheet-import',
      sheet: createSheet({ id: 'x', name: 'X', rowCount: 1, columnCount: 1 }),
      filename: 'data.xlsx',
    })
    state = gridReducer(state, { type: 'cancel-sheet-import' })

    expect(state.pendingSheetImport).toBeNull()
    expect(sheetOf(state).rowCount).toBe(3)
    expect(state.history.present === state.savedSheet).toBe(true)
  })

  it('records the import in undo/redo', () => {
    let state = makeState(3, 2)
    state = gridReducer(state, {
      type: 'request-sheet-import',
      sheet: createSheet({ id: 'x', name: 'X', rowCount: 1, columnCount: 1 }),
      filename: 'data.xlsx',
    })
    state = gridReducer(state, { type: 'confirm-sheet-import' })
    expect(sheetOf(state).rowCount).toBe(1)

    state = gridReducer(state, { type: 'undo' })
    expect(sheetOf(state).rowCount).toBe(3)

    state = gridReducer(state, { type: 'redo' })
    expect(sheetOf(state).rowCount).toBe(1)
  })
})

describe('workbook and sheet management', () => {
  it('adds, selects, renames, duplicates, and deletes sheets', () => {
    let state = makeState()
    expect(sheetTabs(state)).toHaveLength(1)

    state = gridReducer(state, { type: 'add-sheet' })
    expect(sheetTabs(state)).toHaveLength(2)
    expect(sheetOf(state).name).toBe('Sheet 1')
    expect(state.workbookDirty).toBe(true)

    state = gridReducer(state, { type: 'select-sheet', sheetId: 's' })
    expect(sheetOf(state).id).toBe('s')
    expect(sheetOf(state).name).toBe('Sheet')

    state = gridReducer(state, { type: 'rename-sheet', sheetId: 's', name: 'Budget' })
    expect(sheetOf(state).name).toBe('Budget')

    state = gridReducer(state, { type: 'duplicate-sheet', sheetId: state.history.present.id })
    expect(sheetTabs(state)).toHaveLength(3)
    expect(sheetOf(state).name).toContain('Budget')

    state = gridReducer(state, { type: 'delete-sheet', sheetId: state.history.present.id })
    expect(sheetTabs(state)).toHaveLength(2)
  })

  it('keeps at least one sheet', () => {
    let state = makeState()
    state = gridReducer(state, { type: 'delete-sheet', sheetId: state.history.present.id })
    expect(sheetTabs(state)).toHaveLength(1)
  })

  it('preserves each sheet content while switching', () => {
    let state = makeState()
    state = editCell(state, 0, 0, 'first')
    state = gridReducer(state, { type: 'add-sheet' })
    expect(getCellValue(sheetOf(state), 0, 0)).toBeNull()

    state = editCell(state, 0, 0, 'second')
    state = gridReducer(state, { type: 'select-sheet', sheetId: 's' })
    expect(getCellValue(sheetOf(state), 0, 0)).toBe('first')
  })

  it('resets the workbook with new-workbook', () => {
    let state = makeState()
    state = editCell(state, 0, 0, 'x')
    const fresh = createSheet({ id: 'sheet-1', name: 'Sheet 1', rowCount: 5, columnCount: 4 })

    state = gridReducer(state, { type: 'new-workbook', sheet: fresh })

    expect(state.workbookDirty).toBe(false)
    expect(sheetTabs(state)).toHaveLength(1)
    expect(getCellValue(sheetOf(state), 0, 0)).toBeNull()
  })
})

describe('formula bar, clearing, cutting, and styles', () => {
  it('sets the active cell value from the formula bar with one history step', () => {
    let state = select(makeState(), 1, 1)
    state = gridReducer(state, { type: 'set-cell-value', value: '42' })

    expect(getCellValue(sheetOf(state), 1, 1)).toBe(42)
    expect(state.workbookDirty).toBe(true)

    state = gridReducer(state, { type: 'undo' })
    expect(getCellValue(sheetOf(state), 1, 1)).toBeNull()
  })

  it('clears the selected range', () => {
    let state = editCell(makeState(), 0, 0, 'x')
    state = editCell(state, 1, 1, 'y')
    state = select(state, 0, 0)
    state = gridReducer(state, { type: 'extend-selection', cell: { row: 1, column: 1 } })

    state = gridReducer(state, { type: 'clear-cells' })

    expect(getCellValue(sheetOf(state), 0, 0)).toBeNull()
    expect(getCellValue(sheetOf(state), 1, 1)).toBeNull()
  })

  it('cuts a range into the clipboard and clears it', () => {
    let state = editCell(makeState(), 0, 0, 'x')

    state = gridReducer(state, { type: 'cut' })

    expect(state.clipboard).not.toBeNull()
    expect(getCellValue(sheetOf(state), 0, 0)).toBeNull()
  })

  it('applies styles to the selection without changing values', () => {
    let state = editCell(makeState(), 0, 0, 'x')

    state = gridReducer(state, { type: 'apply-style', patch: { bold: true, align: 'center' } })

    expect(stylesForActiveSheet(state).get('0:0')).toEqual({ bold: true, align: 'center' })
    expect(getCellValue(sheetOf(state), 0, 0)).toBe('x')
  })
})

describe('AI applied actions', () => {
  it('apply-ai-sheet records exactly one undo step', () => {
    let state = editCell(makeState(), 0, 0, 'x')
    const after = setCellValue(sheetOf(state), 0, 0, 'y')

    state = gridReducer(state, { type: 'apply-ai-sheet', sheet: after, notice: 'AI: cleaned 1 cell' })

    expect(getCellValue(sheetOf(state), 0, 0)).toBe('y')
    expect(state.aiNotice).toBe('AI: cleaned 1 cell')

    state = gridReducer(state, { type: 'undo' })
    expect(getCellValue(sheetOf(state), 0, 0)).toBe('x')
  })

  it('apply-ai-filter sets the filter without changing data', () => {
    let state = editCell(makeState(), 0, 0, 'apple')

    state = gridReducer(state, {
      type: 'apply-ai-filter',
      column: 0,
      operator: 'equals',
      value: 'apple',
    })

    expect(state.filter).toEqual({ column: 0, operator: 'equals', value: 'apple' })
    expect(getCellValue(sheetOf(state), 0, 0)).toBe('apple')
  })
})
