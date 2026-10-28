import { rowsToSheet } from '../../core/csv'
import { copyRange, pasteBlock } from '../../core/clipboard'
import type { CellBlock } from '../../core/clipboard'
import { calculate } from '../../core/calc'
import type { CalculationName } from '../../core/calc'
import { sortRowsByColumn } from '../../core/sort'
import type { SortDirection } from '../../core/sort'
import type { FilterOperator, FilterSpec } from '../../core/filter'
import { cleanRange } from '../../core/clean'
import type { CleanOperation } from '../../core/clean'
import { findMatches, replaceInCell, replaceInRange } from '../../core/find'
import { removeDuplicateRows } from '../../core/dedupe'
import {
  EMPTY_CELL_STYLE,
  cellStyleKey,
  createRange,
  createSheet,
  deleteColumns,
  deleteRows,
  formatCellValue,
  getCellValue,
  insertColumns,
  insertRows,
  mergeCellStyle,
  parseCellInput,
  setCellValue,
} from '../../core/model'
import type { CellAddress, CellStyle, Range, Sheet } from '../../core/model'
import { createHistory, pushHistory, redoHistory, undoHistory } from './history'
import type { History } from './history'

/**
 * How many sheet snapshots are kept in memory.
 *
 * Snapshots are immutable `Sheet` objects that share unchanged cells, so the
 * cost is one map of references per step plus the changed cells. 100 steps is a
 * conservative cap for an 8GB-RAM machine and covers a practical editing
 * session; tune this constant if sheets grow much larger.
 */
export const HISTORY_LIMIT = 100

/**
 * Removing at least this many duplicate rows asks for confirmation first.
 * Single row/column deletions stay unconfirmed (they are small operations).
 */
export const DEDUPE_CONFIRM_THRESHOLD = 5

/**
 * A non-empty selection: `anchor` is where the selection started and `focus` is
 * the active cell (the one typed into). The selected range is the rectangle
 * between them; a single cell has `anchor === focus`.
 */
export interface CellRangeSelection {
  readonly anchor: CellAddress
  readonly focus: CellAddress
}

export type Selection = CellRangeSelection | null

export interface PendingImport {
  readonly rows: readonly (readonly string[])[]
  readonly filename: string
}

export interface PendingDedupe {
  readonly range: Range
  readonly removedRows: number
}

export interface PendingSheetImport {
  readonly sheet: Sheet
  readonly filename: string
}

/** The result of the last calculation; `value: null` means "no numeric values". */
export interface CalculationDisplay {
  readonly operation: CalculationName
  readonly value: number | null
}

export interface GridState {
  readonly history: History<Sheet>
  readonly savedSheet: Sheet
  readonly sheetStore: ReadonlyMap<string, Sheet>
  readonly sheetOrder: readonly string[]
  readonly stylesBySheet: ReadonlyMap<string, ReadonlyMap<string, CellStyle>>
  readonly workbookDirty: boolean
  readonly selection: Selection
  readonly editing: boolean
  readonly draft: string
  readonly clipboard: CellBlock | null
  readonly calculation: CalculationDisplay | null
  readonly sortNotice: string | null
  readonly cleanNotice: string | null
  readonly findScope: Range | null
  readonly findNotice: string | null
  readonly dedupeNotice: string | null
  readonly aiNotice: string | null
  readonly filter: FilterSpec | null
  readonly pendingImport: PendingImport | null
  readonly pendingDedupe: PendingDedupe | null
  readonly pendingSheetImport: PendingSheetImport | null
  readonly importError: string | null
}

export type GridAction =
  | { readonly type: 'select'; readonly cell: CellAddress }
  | { readonly type: 'extend-selection'; readonly cell: CellAddress }
  | { readonly type: 'start-editing' }
  | { readonly type: 'change-draft'; readonly value: string }
  | { readonly type: 'commit-edit' }
  | { readonly type: 'cancel-edit' }
  | { readonly type: 'copy' }
  | { readonly type: 'paste' }
  | { readonly type: 'calculate'; readonly operation: CalculationName }
  | { readonly type: 'sort'; readonly direction: SortDirection }
  | { readonly type: 'apply-filter'; readonly operator: FilterOperator; readonly value: string }
  | { readonly type: 'clear-filter' }
  | { readonly type: 'clean-text'; readonly operation: CleanOperation }
  | { readonly type: 'find-next'; readonly query: string; readonly caseSensitive: boolean }
  | { readonly type: 'replace-current'; readonly query: string; readonly replacement: string; readonly caseSensitive: boolean }
  | { readonly type: 'replace-all'; readonly query: string; readonly replacement: string; readonly caseSensitive: boolean }
  | { readonly type: 'remove-duplicates' }
  | { readonly type: 'mark-saved' }
  | { readonly type: 'confirm-dedupe' }
  | { readonly type: 'cancel-dedupe' }
  | { readonly type: 'select-sheet'; readonly sheetId: string }
  | { readonly type: 'add-sheet' }
  | { readonly type: 'rename-sheet'; readonly sheetId: string; readonly name: string }
  | { readonly type: 'delete-sheet'; readonly sheetId: string }
  | { readonly type: 'duplicate-sheet'; readonly sheetId: string }
  | { readonly type: 'new-workbook'; readonly sheet: Sheet }
  | { readonly type: 'set-cell-value'; readonly value: string }
  | { readonly type: 'clear-cells' }
  | { readonly type: 'cut' }
  | { readonly type: 'apply-style'; readonly patch: CellStyle }
  | { readonly type: 'apply-ai-sheet'; readonly sheet: Sheet; readonly notice: string }
  | {
      readonly type: 'apply-ai-filter'
      readonly column: number
      readonly operator: FilterOperator
      readonly value: string
    }
  | { readonly type: 'request-sheet-import'; readonly sheet: Sheet; readonly filename: string }
  | { readonly type: 'confirm-sheet-import' }
  | { readonly type: 'cancel-sheet-import' }
  | { readonly type: 'undo' }
  | { readonly type: 'redo' }
  | { readonly type: 'insert-row'; readonly index: number }
  | { readonly type: 'delete-row'; readonly index: number }
  | { readonly type: 'insert-column'; readonly index: number }
  | { readonly type: 'delete-column'; readonly index: number }
  | { readonly type: 'request-import'; readonly rows: readonly (readonly string[])[]; readonly filename: string }
  | { readonly type: 'confirm-import' }
  | { readonly type: 'cancel-import' }
  | { readonly type: 'set-import-error'; readonly message: string }

export function createInitialGridState(sheet: Sheet): GridState {
  return {
    history: createHistory(sheet, HISTORY_LIMIT),
    savedSheet: sheet,
    sheetStore: new Map([[sheet.id, sheet]]),
    sheetOrder: [sheet.id],
    stylesBySheet: new Map(),
    workbookDirty: false,
    selection: null,
    editing: false,
    draft: '',
    clipboard: null,
    calculation: null,
    sortNotice: null,
    cleanNotice: null,
    findScope: null,
    findNotice: null,
    dedupeNotice: null,
    aiNotice: null,
    filter: null,
    pendingImport: null,
    pendingDedupe: null,
    pendingSheetImport: null,
    importError: null,
  }
}

export function selectionRange(selection: CellRangeSelection): Range {
  return createRange(selection.anchor, selection.focus)
}

function sameSelection(a: Selection, b: CellRangeSelection): boolean {
  return (
    a !== null &&
    a.anchor.row === b.anchor.row &&
    a.anchor.column === b.anchor.column &&
    a.focus.row === b.focus.row &&
    a.focus.column === b.focus.column
  )
}

function clampAddress(address: CellAddress, sheet: Sheet): CellAddress | null {
  if (sheet.rowCount === 0 || sheet.columnCount === 0) {
    return null
  }

  return {
    row: Math.min(Math.max(address.row, 0), sheet.rowCount - 1),
    column: Math.min(Math.max(address.column, 0), sheet.columnCount - 1),
  }
}

function clampSelection(selection: Selection, sheet: Sheet): Selection {
  if (selection === null) {
    return null
  }

  const anchor = clampAddress(selection.anchor, sheet)
  const focus = clampAddress(selection.focus, sheet)

  if (anchor === null || focus === null) {
    return null
  }

  return { anchor, focus }
}

function sanitizeFilter(filter: FilterSpec | null, sheet: Sheet): FilterSpec | null {
  if (filter === null) {
    return null
  }

  return filter.column >= 0 && filter.column < sheet.columnCount ? filter : null
}

function moveAddressAfterInsert(
  address: CellAddress,
  index: number,
  axis: 'row' | 'column',
): CellAddress {
  if (axis === 'row' && address.row >= index) {
    return { row: address.row + 1, column: address.column }
  }
  if (axis === 'column' && address.column >= index) {
    return { row: address.row, column: address.column + 1 }
  }
  return address
}

function moveAddressAfterDelete(
  address: CellAddress,
  index: number,
  oldSize: number,
  axis: 'row' | 'column',
): CellAddress {
  const coordinate = axis === 'row' ? address.row : address.column
  const other = axis === 'row' ? address.column : address.row

  if (coordinate > index) {
    const moved = coordinate - 1
    return axis === 'row' ? { row: moved, column: other } : { row: other, column: moved }
  }

  if (coordinate === index) {
    const clamped = Math.min(index, oldSize - 2)
    return axis === 'row' ? { row: clamped, column: other } : { row: other, column: clamped }
  }

  return address
}

function moveSelectionAfterInsert(
  selection: Selection,
  index: number,
  axis: 'row' | 'column',
): Selection {
  if (selection === null) {
    return null
  }

  return {
    anchor: moveAddressAfterInsert(selection.anchor, index, axis),
    focus: moveAddressAfterInsert(selection.focus, index, axis),
  }
}

function moveSelectionAfterDelete(
  selection: Selection,
  index: number,
  oldSize: number,
  axis: 'row' | 'column',
): Selection {
  if (selection === null) {
    return null
  }

  return {
    anchor: moveAddressAfterDelete(selection.anchor, index, oldSize, axis),
    focus: moveAddressAfterDelete(selection.focus, index, oldSize, axis),
  }
}

function mapSelectionAfterDedupe(
  selection: Selection,
  range: Range,
  keptRows: readonly number[],
  removedRows: number,
): Selection {
  if (selection === null) {
    return null
  }

  const startRow = range.start.row
  const endRow = range.end.row
  const keptPosition = new Map<number, number>()
  keptRows.forEach((row, index) => keptPosition.set(row, startRow + index))

  function mapRow(row: number): number {
    if (row < startRow) {
      return row
    }
    if (row > endRow) {
      return row - removedRows
    }
    const position = keptPosition.get(row)
    if (position !== undefined) {
      return position
    }

    let bestIndex = 0
    let bestDistance = Math.abs(keptRows[0] - row)
    for (let index = 1; index < keptRows.length; index += 1) {
      const distance = Math.abs(keptRows[index] - row)
      if (distance < bestDistance) {
        bestIndex = index
        bestDistance = distance
      }
    }
    return startRow + bestIndex
  }

  return {
    anchor: { ...selection.anchor, row: mapRow(selection.anchor.row) },
    focus: { ...selection.focus, row: mapRow(selection.focus.row) },
  }
}

function uniqueSheetId(state: GridState, prefix: string): string {
  let index = 1
  let id = `${prefix}-${index}`
  while (state.sheetStore.has(id)) {
    index += 1
    id = `${prefix}-${index}`
  }
  return id
}

function usedSheetNames(state: GridState): Set<string> {
  const names = new Set<string>()
  state.sheetStore.forEach((sheet) => names.add(sheet.name))
  names.add(state.history.present.name)
  return names
}

function nextSheetName(state: GridState): string {
  const used = usedSheetNames(state)
  let index = 1
  while (used.has(`Sheet ${index}`)) {
    index += 1
  }
  return `Sheet ${index}`
}

function uniqueSheetName(state: GridState, base: string): string {
  const used = usedSheetNames(state)
  if (!used.has(base)) {
    return base
  }
  let index = 2
  while (used.has(`${base} ${index}`)) {
    index += 1
  }
  return `${base} ${index}`
}

function resetSheetView(): Partial<GridState> {
  return {
    selection: null,
    editing: false,
    draft: '',
    calculation: null,
    sortNotice: null,
    cleanNotice: null,
    findScope: null,
    findNotice: null,
    dedupeNotice: null,
    aiNotice: null,
    filter: null,
    pendingImport: null,
    pendingDedupe: null,
    pendingSheetImport: null,
    importError: null,
  }
}

const EMPTY_STYLES: ReadonlyMap<string, CellStyle> = new Map()

/** Current sheet's cell styles (empty when nothing has been formatted). */
export function stylesForActiveSheet(state: GridState): ReadonlyMap<string, CellStyle> {
  return state.stylesBySheet.get(state.history.present.id) ?? EMPTY_STYLES
}

/** Sheets in tab order, including the active one. */
export function sheetTabs(state: GridState): readonly Sheet[] {
  const tabs: Sheet[] = []
  for (const id of state.sheetOrder) {
    const sheet = state.sheetStore.get(id)
    if (sheet) {
      tabs.push(sheet)
    }
  }
  return tabs
}

function innerGridReducer(state: GridState, action: GridAction): GridState {
  switch (action.type) {
    case 'select': {
      const selection = { anchor: action.cell, focus: action.cell }
      if (sameSelection(state.selection, selection)) {
        return state
      }
      return {
        ...state,
        selection,
        calculation: null,
        sortNotice: null,
        cleanNotice: null,
        findScope: null,
        findNotice: null,
        dedupeNotice: null,
        pendingDedupe: null,
        editing: false,
        draft: '',
      }
    }

    case 'extend-selection': {
      if (state.selection === null) {
        return {
          ...state,
          selection: { anchor: action.cell, focus: action.cell },
          calculation: null,
          sortNotice: null,
          cleanNotice: null,
          findScope: null,
          findNotice: null,
          dedupeNotice: null,
          pendingDedupe: null,
          editing: false,
          draft: '',
        }
      }

      if (
        state.selection.focus.row === action.cell.row &&
        state.selection.focus.column === action.cell.column
      ) {
        return state
      }

      return {
        ...state,
        selection: { ...state.selection, focus: action.cell },
        calculation: null,
        sortNotice: null,
        cleanNotice: null,
        findScope: null,
        findNotice: null,
        dedupeNotice: null,
        pendingDedupe: null,
        editing: false,
        draft: '',
      }
    }

    case 'start-editing':
      if (state.selection === null || state.editing) {
        return state
      }
      return {
        ...state,
        editing: true,
        draft: formatCellValue(
          getCellValue(state.history.present, state.selection.focus.row, state.selection.focus.column),
        ),
      }

    case 'change-draft':
      if (!state.editing) {
        return state
      }
      return { ...state, draft: action.value }

    case 'commit-edit': {
      if (!state.editing || state.selection === null) {
        return state
      }

      const sheet = setCellValue(
        state.history.present,
        state.selection.focus.row,
        state.selection.focus.column,
        parseCellInput(state.draft),
      )

      return {
        ...state,
        history: pushHistory(state.history, sheet),
        calculation: null,
        editing: false,
        draft: '',
      }
    }

    case 'cancel-edit':
      if (!state.editing) {
        return state
      }
      return { ...state, editing: false, draft: '' }

    case 'copy':
      if (state.selection === null) {
        return state
      }
      return {
        ...state,
        clipboard: copyRange(state.history.present, selectionRange(state.selection)),
      }

    case 'paste': {
      if (state.clipboard === null || state.selection === null) {
        return state
      }

      const anchor = selectionRange(state.selection).start
      const result = pasteBlock(state.history.present, state.clipboard, anchor)

      const selection =
        result.writtenRange !== null
          ? { anchor: result.writtenRange.start, focus: result.writtenRange.end }
          : state.selection

      return {
        ...state,
        history: pushHistory(state.history, result.sheet),
        selection,
        calculation: null,
        editing: false,
        draft: '',
      }
    }

    case 'calculate': {
      if (state.selection === null) {
        return state
      }

      const value = calculate(
        action.operation,
        state.history.present,
        selectionRange(state.selection),
      )

      return { ...state, calculation: { operation: action.operation, value } }
    }

    case 'sort': {
      if (state.selection === null) {
        return { ...state, sortNotice: 'Select a cell or range to sort' }
      }

      const range = selectionRange(state.selection)
      const isRange =
        state.selection.anchor.row !== state.selection.focus.row ||
        state.selection.anchor.column !== state.selection.focus.column
      const startRow = isRange ? range.start.row : 0
      const endRow = isRange ? range.end.row : state.history.present.rowCount - 1

      const sheet = sortRowsByColumn(
        state.history.present,
        state.selection.focus.column,
        startRow,
        endRow,
        action.direction,
      )

      return {
        ...state,
        history: pushHistory(state.history, sheet),
        calculation: null,
        sortNotice: null,
        editing: false,
        draft: '',
      }
    }

    case 'apply-filter': {
      if (state.selection === null) {
        return state
      }

      return {
        ...state,
        filter: {
          column: state.selection.focus.column,
          operator: action.operator,
          value: action.value,
        },
      }
    }

    case 'clear-filter':
      if (state.filter === null) {
        return state
      }
      return { ...state, filter: null }

    case 'clean-text': {
      if (state.selection === null) {
        return state
      }

      const result = cleanRange(
        state.history.present,
        selectionRange(state.selection),
        action.operation,
      )
      const cleanNotice = `Cleaned ${result.changedCells} cell${result.changedCells === 1 ? '' : 's'}`

      return {
        ...state,
        history: pushHistory(state.history, result.sheet),
        calculation: null,
        cleanNotice,
        editing: false,
        draft: '',
      }
    }

    case 'find-next': {
      if (state.selection === null) {
        return { ...state, findNotice: 'Select a range to search' }
      }

      const scope = state.findScope ?? selectionRange(state.selection)
      const matches = findMatches(
        state.history.present,
        scope,
        action.query,
        action.caseSensitive,
      )

      if (matches.length === 0) {
        return { ...state, findScope: scope, findNotice: 'No results' }
      }

      const focus = state.selection.focus
      let index = matches.findIndex(
        (match) => match.row > focus.row || (match.row === focus.row && match.column > focus.column),
      )
      if (index === -1) {
        index = 0
      }

      const match = matches[index]
      return {
        ...state,
        findScope: scope,
        selection: { anchor: match, focus: match },
        findNotice: `Match ${index + 1} of ${matches.length}`,
        editing: false,
        draft: '',
      }
    }

    case 'replace-current': {
      if (state.selection === null) {
        return { ...state, findNotice: 'Select a cell to replace' }
      }

      const focus = state.selection.focus
      const result = replaceInCell(
        state.history.present,
        focus.row,
        focus.column,
        action.query,
        action.replacement,
        action.caseSensitive,
        false,
      )

      if (!result.changed) {
        return { ...state, findNotice: 'No match to replace' }
      }

      return {
        ...state,
        history: pushHistory(state.history, result.sheet),
        calculation: null,
        findNotice: 'Replaced 1 cell',
        editing: false,
        draft: '',
      }
    }

    case 'replace-all': {
      if (state.selection === null) {
        return { ...state, findNotice: 'Select a range to replace' }
      }

      const scope = state.findScope ?? selectionRange(state.selection)
      const result = replaceInRange(
        state.history.present,
        scope,
        action.query,
        action.replacement,
        action.caseSensitive,
        true,
      )

      if (result.changedCells === 0) {
        return { ...state, findNotice: 'No matches to replace' }
      }

      return {
        ...state,
        history: pushHistory(state.history, result.sheet),
        calculation: null,
        findNotice: `Replaced ${result.changedCells} cell${result.changedCells === 1 ? '' : 's'}`,
        editing: false,
        draft: '',
      }
    }

    case 'remove-duplicates': {
      if (state.selection === null) {
        return { ...state, dedupeNotice: 'Select a range to remove duplicates' }
      }
      if (state.filter !== null) {
        return { ...state, dedupeNotice: 'Clear the filter before removing duplicates' }
      }

      const range = selectionRange(state.selection)
      if (range.start.row === range.end.row) {
        return { ...state, dedupeNotice: 'Select more than one row to remove duplicates' }
      }

      const result = removeDuplicateRows(state.history.present, range)
      if (result.removedRows === 0) {
        return { ...state, dedupeNotice: 'No duplicate rows found' }
      }

      if (result.removedRows >= DEDUPE_CONFIRM_THRESHOLD) {
        return { ...state, pendingDedupe: { range, removedRows: result.removedRows } }
      }

      return {
        ...state,
        history: pushHistory(state.history, result.sheet),
        selection: mapSelectionAfterDedupe(state.selection, range, result.keptRows, result.removedRows),
        calculation: null,
        dedupeNotice: `Removed ${result.removedRows} duplicate row${result.removedRows === 1 ? '' : 's'}`,
        editing: false,
        draft: '',
      }
    }

    case 'confirm-dedupe': {
      if (state.pendingDedupe === null) {
        return state
      }

      const result = removeDuplicateRows(state.history.present, state.pendingDedupe.range)

      return {
        ...state,
        history: pushHistory(state.history, result.sheet),
        selection: mapSelectionAfterDedupe(
          state.selection,
          state.pendingDedupe.range,
          result.keptRows,
          result.removedRows,
        ),
        calculation: null,
        pendingDedupe: null,
        dedupeNotice: `Removed ${result.removedRows} duplicate row${result.removedRows === 1 ? '' : 's'}`,
        editing: false,
        draft: '',
      }
    }

    case 'cancel-dedupe':
      return { ...state, pendingDedupe: null }

    case 'mark-saved':
      return { ...state, savedSheet: state.history.present, workbookDirty: false }

    case 'request-sheet-import':
      return {
        ...state,
        pendingSheetImport: { sheet: action.sheet, filename: action.filename },
        importError: null,
        editing: false,
        draft: '',
      }

    case 'confirm-sheet-import': {
      if (state.pendingSheetImport === null) {
        return state
      }

      const sheet = {
        ...state.pendingSheetImport.sheet,
        id: state.history.present.id,
        name: state.history.present.name,
      }

      return {
        ...state,
        history: pushHistory(state.history, sheet),
        pendingSheetImport: null,
        importError: null,
        selection: null,
        calculation: null,
        filter: null,
        editing: false,
        draft: '',
      }
    }

    case 'cancel-sheet-import':
      return { ...state, pendingSheetImport: null }

    case 'select-sheet': {
      if (action.sheetId === state.history.present.id) {
        return state
      }

      const target = state.sheetStore.get(action.sheetId)
      if (!target) {
        return state
      }

      const sheetStore = new Map(state.sheetStore)
      sheetStore.set(state.history.present.id, state.history.present)

      return {
        ...state,
        ...resetSheetView(),
        sheetStore,
        history: createHistory(target, HISTORY_LIMIT),
        savedSheet: target,
      }
    }

    case 'add-sheet': {
      const active = state.history.present
      const id = uniqueSheetId(state, 'sheet')
      const name = nextSheetName(state)
      const newSheet = createSheet({
        id,
        name,
        rowCount: active.rowCount,
        columnCount: active.columnCount,
      })
      const sheetStore = new Map(state.sheetStore)
      sheetStore.set(active.id, active)
      sheetStore.set(id, newSheet)

      return {
        ...state,
        ...resetSheetView(),
        sheetStore,
        sheetOrder: [...state.sheetOrder, id],
        history: createHistory(newSheet, HISTORY_LIMIT),
        savedSheet: newSheet,
        workbookDirty: true,
      }
    }

    case 'rename-sheet': {
      const name = action.name.trim()
      if (name === '') {
        return state
      }

      if (action.sheetId === state.history.present.id) {
        if (state.history.present.name === name) {
          return state
        }
        return { ...state, history: pushHistory(state.history, { ...state.history.present, name }) }
      }

      const target = state.sheetStore.get(action.sheetId)
      if (!target || target.name === name) {
        return state
      }

      const sheetStore = new Map(state.sheetStore)
      sheetStore.set(action.sheetId, { ...target, name })
      return { ...state, sheetStore, workbookDirty: true }
    }

    case 'delete-sheet': {
      if (state.sheetOrder.length <= 1) {
        return state
      }

      const index = state.sheetOrder.indexOf(action.sheetId)
      if (index === -1) {
        return state
      }

      const sheetStore = new Map(state.sheetStore)
      sheetStore.delete(action.sheetId)
      const sheetOrder = state.sheetOrder.filter((id) => id !== action.sheetId)
      const stylesBySheet = new Map(state.stylesBySheet)
      stylesBySheet.delete(action.sheetId)

      if (action.sheetId !== state.history.present.id) {
        return { ...state, sheetStore, sheetOrder, stylesBySheet, workbookDirty: true }
      }

      const neighborId = sheetOrder[Math.min(index, sheetOrder.length - 1)]
      const target = sheetStore.get(neighborId)
      if (!target) {
        return state
      }

      return {
        ...state,
        ...resetSheetView(),
        sheetStore,
        sheetOrder,
        stylesBySheet,
        history: createHistory(target, HISTORY_LIMIT),
        savedSheet: target,
        workbookDirty: true,
      }
    }

    case 'duplicate-sheet': {
      const source =
        action.sheetId === state.history.present.id
          ? state.history.present
          : state.sheetStore.get(action.sheetId)
      if (!source) {
        return state
      }

      const id = uniqueSheetId(state, 'sheet')
      const name = uniqueSheetName(state, `Copy of ${source.name}`)
      const copy: Sheet = { ...source, id, name }
      const sheetStore = new Map(state.sheetStore)
      sheetStore.set(state.history.present.id, state.history.present)
      sheetStore.set(id, copy)

      const sourceIndex = state.sheetOrder.indexOf(action.sheetId)
      const sheetOrder = [...state.sheetOrder]
      sheetOrder.splice(sourceIndex + 1, 0, id)

      const stylesBySheet = new Map(state.stylesBySheet)
      const sourceStyles = state.stylesBySheet.get(action.sheetId)
      if (sourceStyles) {
        stylesBySheet.set(id, new Map(sourceStyles))
      }

      return {
        ...state,
        ...resetSheetView(),
        sheetStore,
        sheetOrder,
        stylesBySheet,
        history: createHistory(copy, HISTORY_LIMIT),
        savedSheet: copy,
        workbookDirty: true,
      }
    }

    case 'new-workbook':
      return createInitialGridState(action.sheet)

    case 'set-cell-value': {
      if (state.selection === null) {
        return state
      }

      const focus = state.selection.focus
      const sheet = setCellValue(
        state.history.present,
        focus.row,
        focus.column,
        parseCellInput(action.value),
      )

      return {
        ...state,
        history: pushHistory(state.history, sheet),
        calculation: null,
        editing: false,
        draft: '',
      }
    }

    case 'clear-cells': {
      if (state.selection === null) {
        return state
      }

      const range = selectionRange(state.selection)
      let sheet = state.history.present
      for (let row = range.start.row; row <= range.end.row; row += 1) {
        for (let column = range.start.column; column <= range.end.column; column += 1) {
          sheet = setCellValue(sheet, row, column, null)
        }
      }

      return {
        ...state,
        history: pushHistory(state.history, sheet),
        calculation: null,
        editing: false,
        draft: '',
      }
    }

    case 'cut': {
      if (state.selection === null) {
        return state
      }

      const range = selectionRange(state.selection)
      const clipboard = copyRange(state.history.present, range)
      let sheet = state.history.present
      for (let row = range.start.row; row <= range.end.row; row += 1) {
        for (let column = range.start.column; column <= range.end.column; column += 1) {
          sheet = setCellValue(sheet, row, column, null)
        }
      }

      return {
        ...state,
        clipboard,
        history: pushHistory(state.history, sheet),
        calculation: null,
        editing: false,
        draft: '',
      }
    }

    case 'apply-style': {
      if (state.selection === null) {
        return state
      }

      const activeId = state.history.present.id
      const range = selectionRange(state.selection)
      const current = state.stylesBySheet.get(activeId) ?? new Map<string, CellStyle>()
      const next = new Map(current)

      for (let row = range.start.row; row <= range.end.row; row += 1) {
        for (let column = range.start.column; column <= range.end.column; column += 1) {
          const key = cellStyleKey(row, column)
          next.set(key, mergeCellStyle(next.get(key) ?? EMPTY_CELL_STYLE, action.patch))
        }
      }

      const stylesBySheet = new Map(state.stylesBySheet)
      stylesBySheet.set(activeId, next)
      return { ...state, stylesBySheet }
    }

    case 'apply-ai-sheet':
      return {
        ...state,
        history: pushHistory(state.history, action.sheet),
        aiNotice: action.notice,
        calculation: null,
        editing: false,
        draft: '',
      }

    case 'apply-ai-filter':
      return {
        ...state,
        filter: { column: action.column, operator: action.operator, value: action.value },
        aiNotice: 'AI: filter applied',
        editing: false,
        draft: '',
      }

    case 'undo': {
      const history = undoHistory(state.history)
      if (history === state.history) {
        return state
      }

      return {
        ...state,
        history,
        selection: clampSelection(state.selection, history.present),
        calculation: null,
        filter: sanitizeFilter(state.filter, history.present),
        editing: false,
        draft: '',
      }
    }

    case 'redo': {
      const history = redoHistory(state.history)
      if (history === state.history) {
        return state
      }

      return {
        ...state,
        history,
        selection: clampSelection(state.selection, history.present),
        calculation: null,
        filter: sanitizeFilter(state.filter, history.present),
        editing: false,
        draft: '',
      }
    }

    case 'insert-row': {
      const sheet = insertRows(state.history.present, action.index)
      return {
        ...state,
        history: pushHistory(state.history, sheet),
        selection: moveSelectionAfterInsert(state.selection, action.index, 'row'),
        calculation: null,
        editing: false,
        draft: '',
      }
    }

    case 'delete-row': {
      const current = state.history.present
      // The UI keeps at least one row so the grid always has a reference cell;
      // the data model itself allows deleting down to zero.
      if (current.rowCount <= 1) {
        return state
      }

      const sheet = deleteRows(current, action.index)
      return {
        ...state,
        history: pushHistory(state.history, sheet),
        selection: moveSelectionAfterDelete(state.selection, action.index, current.rowCount, 'row'),
        calculation: null,
        editing: false,
        draft: '',
      }
    }

    case 'insert-column': {
      const sheet = insertColumns(state.history.present, action.index)
      return {
        ...state,
        history: pushHistory(state.history, sheet),
        selection: moveSelectionAfterInsert(state.selection, action.index, 'column'),
        calculation: null,
        filter: null,
        editing: false,
        draft: '',
      }
    }

    case 'delete-column': {
      const current = state.history.present
      if (current.columnCount <= 1) {
        return state
      }

      const sheet = deleteColumns(current, action.index)
      return {
        ...state,
        history: pushHistory(state.history, sheet),
        selection: moveSelectionAfterDelete(
          state.selection,
          action.index,
          current.columnCount,
          'column',
        ),
        calculation: null,
        filter: null,
        editing: false,
        draft: '',
      }
    }

    case 'request-import':
      return {
        ...state,
        pendingImport: { rows: action.rows, filename: action.filename },
        importError: null,
        editing: false,
        draft: '',
      }

    case 'confirm-import': {
      if (state.pendingImport === null) {
        return state
      }

      const current = state.history.present
      const sheet = rowsToSheet(state.pendingImport.rows, {
        id: current.id,
        name: current.name,
      })

      return {
        ...state,
        history: pushHistory(state.history, sheet),
        pendingImport: null,
        importError: null,
        selection: null,
        calculation: null,
        filter: null,
        editing: false,
        draft: '',
      }
    }

    case 'cancel-import':
      return { ...state, pendingImport: null }

    case 'set-import-error':
      return { ...state, importError: action.message, pendingImport: null, editing: false }
  }
}

/**
 * Public reducer: runs the sheet reducer and then keeps the multi-sheet store in
 * sync with the active sheet (the history's present snapshot), and tracks
 * workbook-level unsaved changes.
 */
export function gridReducer(state: GridState, action: GridAction): GridState {
  const next = innerGridReducer(state, action)

  if (next.history.present === state.history.present) {
    return next
  }

  const sheetStore = new Map(next.sheetStore)
  sheetStore.set(next.history.present.id, next.history.present)
  const keepDirty = action.type === 'select-sheet' || action.type === 'new-workbook'

  return {
    ...next,
    sheetStore,
    workbookDirty: keepDirty ? next.workbookDirty : true,
  }
}
