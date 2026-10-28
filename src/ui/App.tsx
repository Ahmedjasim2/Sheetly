import { useEffect, useReducer, useRef, useState } from 'react'
import type { CSSProperties, ChangeEvent } from 'react'
import {
  cellStyleKey,
  createRange,
  createSheet,
  formatCellId,
  formatCellValue,
  getCellValue,
  parseCsv,
  readXlsxBuffer,
  sheetToRows,
  stringifyCsv,
  visibleRowIndices,
  writeXlsxBuffer,
} from '../core'
import type { ApplyOutcome, CellStyle, CellValue, Sheet } from '../core'
import { CalcResultStrip } from './calc/CalcResultStrip'
import { ConfirmDialog } from './confirm/ConfirmDialog'
import {
  INITIAL_SHEET_COLUMNS,
  INITIAL_SHEET_NAME,
  INITIAL_SHEET_ROWS,
  INITIAL_WORKBOOK_NAME,
  MAX_ZOOM,
  MIN_ZOOM,
  ZOOM_STEP,
} from './config'
import { DedupePrompt } from './dedupe/DedupePrompt'
import { FilterBar } from './filter/FilterBar'
import { FindBar } from './find/FindBar'
import { FormatBar } from './formatbar/FormatBar'
import { FormulaBar } from './formulabar/FormulaBar'
import { Grid } from './grid/Grid'
import { I18nProvider, translate } from './i18n'
import type { Language } from './i18n'
import { ImportPrompt } from './import/ImportPrompt'
import { MenuBar } from './menubar/MenuBar'
import type { MenuDefinition } from './menubar/MenuBar'
import { applyLanguage, applyTheme, getInitialLanguage, getInitialTheme } from './preferences'
import type { Theme } from './preferences'
import { SheetTabs } from './sheet-tabs/SheetTabs'
import { Sidebar } from './sidebar/Sidebar'
import type { SidebarPanel } from './sidebar/Sidebar'
import { StatusBar } from './statusbar/StatusBar'
import { TitleBar } from './titlebar/TitleBar'
import { Toolbar } from './toolbar/Toolbar'
import { createInitialGridState, gridReducer, sheetTabs, stylesForActiveSheet } from './state/gridState'
import type { Selection } from './state/gridState'
import { canRedo, canUndo } from './state/history'
import './App.css'

const INITIAL_SHEET: Sheet = createSheet({
  id: 'sheet-1',
  name: INITIAL_SHEET_NAME,
  rowCount: INITIAL_SHEET_ROWS,
  columnCount: INITIAL_SHEET_COLUMNS,
})

interface ConfirmState {
  readonly title: string
  readonly message: string
  readonly confirmLabel: string
  readonly onConfirm: () => void
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

function downloadTextFile(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function downloadArrayBuffer(filename: string, buffer: ArrayBuffer): void {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function selectionLabel(selection: Selection): string {
  if (selection === null) {
    return ''
  }

  const anchor = formatCellId(selection.anchor.row, selection.anchor.column)
  const focus = formatCellId(selection.focus.row, selection.focus.column)
  return anchor === focus ? anchor : `${anchor}:${focus}`
}

function valueType(
  value: CellValue,
  t: (key: string) => string,
): string {
  if (value === null) {
    return t('sidebar.valueType.empty')
  }
  if (typeof value === 'boolean') {
    return t('sidebar.valueType.boolean')
  }
  if (typeof value === 'number') {
    return t('sidebar.valueType.number')
  }
  return t('sidebar.valueType.text')
}

function clampZoom(zoom: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom))
}

function translateStatusMessage(
  message: string,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  const exactMessages: Record<string, string> = {
    'Select a cell or range to sort': 'status.notice.sort.select',
    'Select a range to search': 'status.notice.find.selectRangeSearch',
    'No results': 'status.notice.find.noResults',
    'Select a cell to replace': 'status.notice.find.selectCellReplace',
    'No match to replace': 'status.notice.find.noMatchReplace',
    'Select a range to replace': 'status.notice.find.selectRangeReplace',
    'No matches to replace': 'status.notice.find.noMatchesReplace',
    'Select a range to remove duplicates': 'status.notice.dedupe.selectRange',
    'Clear the filter before removing duplicates': 'status.notice.dedupe.clearFilter',
    'Select more than one row to remove duplicates': 'status.notice.dedupe.selectRows',
    'No duplicate rows found': 'status.notice.dedupe.noDuplicates',
    'AI: filter applied': 'status.notice.ai.filterApplied',
  }
  const key = exactMessages[message]
  if (key !== undefined) {
    return t(key)
  }

  const cleanMatch = /^Cleaned (\d+) cells?$/.exec(message)
  if (cleanMatch) {
    return t('status.notice.clean.cleaned', { count: Number(cleanMatch[1]) })
  }

  const findMatch = /^Match (\d+) of (\d+)$/.exec(message)
  if (findMatch) {
    return t('status.notice.find.match', {
      position: Number(findMatch[1]),
      total: Number(findMatch[2]),
    })
  }

  const replacedMatch = /^Replaced (\d+) cells?$/.exec(message)
  if (replacedMatch) {
    return t('status.notice.find.replaced', { count: Number(replacedMatch[1]) })
  }

  const dedupeMatch = /^Removed (\d+) duplicate rows?$/.exec(message)
  if (dedupeMatch) {
    return t('status.notice.dedupe.removed', { count: Number(dedupeMatch[1]) })
  }

  return message
}

function App() {
  const [state, dispatch] = useReducer(gridReducer, INITIAL_SHEET, createInitialGridState)
  const sheet = state.history.present
  const selection = state.selection
  const styles = stylesForActiveSheet(state)
  const tabs = sheetTabs(state)
  const dirty = state.workbookDirty
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileInputXlsxRef = useRef<HTMLInputElement>(null)

  const [zoom, setZoom] = useState(100)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarPanel, setSidebarPanel] = useState<SidebarPanel>('ai')
  const [importingCsv, setImportingCsv] = useState(false)
  const [importingXlsx, setImportingXlsx] = useState(false)
  const [exportingXlsx, setExportingXlsx] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [findOpen, setFindOpen] = useState(false)
  const [findToken, setFindToken] = useState(0)
  const [filterToken, setFilterToken] = useState(0)
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null)
  const [lang, setLang] = useState<Language>(getInitialLanguage)
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const t = (key: string, params?: Record<string, string | number>) =>
    translate(lang, key, params)

  useEffect(() => {
    applyLanguage(lang)
  }, [lang])

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const statusNotice =
    state.sortNotice ?? state.cleanNotice ?? state.findNotice ?? state.dedupeNotice ?? state.aiNotice
  const statusText = statusNotice === null ? '' : translateStatusMessage(statusNotice, t)

  const visibleRows = visibleRowIndices(sheet, state.filter)
  const label = selectionLabel(selection)
  const focus = selection === null ? null : selection.focus
  const activeCellValue: CellValue = focus === null ? null : getCellValue(sheet, focus.row, focus.column)
  const formulaValue = state.editing ? state.draft : formatCellValue(activeCellValue)
  const activeStyle: CellStyle =
    focus === null ? {} : (styles.get(cellStyleKey(focus.row, focus.column)) ?? {})

  const range = selection === null ? null : createRange(selection.anchor, selection.focus)
  const cellCount =
    range === null
      ? 0
      : (range.end.row - range.start.row + 1) * (range.end.column - range.start.column + 1)
  const supportText = t('sidebar.formatScope')
  const sheetIndex = Math.max(0, tabs.findIndex((tab) => tab.id === sheet.id)) + 1

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      const target = event.target
      if (
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return
      }

      if (event.ctrlKey || event.metaKey) {
        const key = event.key.toLowerCase()
        if (key === 'z' && !event.shiftKey) {
          event.preventDefault()
          dispatch({ type: 'undo' })
        } else if (key === 'y' || (key === 'z' && event.shiftKey)) {
          event.preventDefault()
          dispatch({ type: 'redo' })
        } else if (key === 'c' && !event.shiftKey) {
          event.preventDefault()
          dispatch({ type: 'copy' })
        } else if (key === 'v' && !event.shiftKey) {
          event.preventDefault()
          dispatch({ type: 'paste' })
        } else if (key === 'x' && !event.shiftKey) {
          event.preventDefault()
          dispatch({ type: 'cut' })
        } else if (key === 'f' && !event.shiftKey) {
          event.preventDefault()
          setFindOpen(true)
          setFindToken((token) => token + 1)
        }
        return
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        dispatch({ type: 'clear-cells' })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dispatch])

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent): void {
      if (dirty) {
        // Modern browsers show their own standard prompt; we only request it.
        event.preventDefault()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [dirty])

  function startNewWorkbook(): void {
    dispatch({
      type: 'new-workbook',
      sheet: createSheet({
        id: 'sheet-1',
        name: INITIAL_SHEET_NAME,
        rowCount: INITIAL_SHEET_ROWS,
        columnCount: INITIAL_SHEET_COLUMNS,
      }),
    })
    setZoom(100)
    setConfirmState(null)
  }

  function requestNewWorkbook(): void {
    if (!dirty) {
      startNewWorkbook()
      return
    }
    setConfirmState({
      title: t('dialog.newWorkbook.title'),
      message: t('dialog.newWorkbook.message'),
      confirmLabel: t('common.discardAndStart'),
      onConfirm: startNewWorkbook,
    })
  }

  function addSheet(): void {
    dispatch({ type: 'add-sheet' })
  }

  function duplicateActiveSheet(): void {
    dispatch({ type: 'duplicate-sheet', sheetId: sheet.id })
  }

  function requestDeleteActiveSheet(): void {
    if (tabs.length <= 1) {
      return
    }
    setConfirmState({
      title: t('dialog.deleteSheet.title'),
      message: t('dialog.deleteSheet.message', { name: sheet.name }),
      confirmLabel: t('dialog.deleteSheet.confirm'),
      onConfirm: () => {
        dispatch({ type: 'delete-sheet', sheetId: sheet.id })
        setConfirmState(null)
      },
    })
  }

  function handlePrint(): void {
    window.print()
  }

  async function handleToggleFullscreen(): Promise<void> {
    try {
      if (document.fullscreenElement !== null) {
        if (typeof document.exitFullscreen === 'function') {
          await document.exitFullscreen()
        }
      } else if (typeof document.documentElement.requestFullscreen === 'function') {
        await document.documentElement.requestFullscreen()
      }
    } catch {
      return
    }
  }

  function zoomIn(): void {
    setZoom((current) => clampZoom(current + ZOOM_STEP))
  }

  function zoomOut(): void {
    setZoom((current) => clampZoom(current - ZOOM_STEP))
  }

  function zoomReset(): void {
    setZoom(100)
  }

  function openFind(): void {
    setFindOpen(true)
    setFindToken((token) => token + 1)
  }

  function openFilter(): void {
    setFilterOpen(true)
    setFilterToken((token) => token + 1)
  }

  function applyStyle(patch: CellStyle): void {
    dispatch({ type: 'apply-style', patch })
  }

  function handleApplyAI(outcome: ApplyOutcome): void {
    if (outcome.kind === 'sheet') {
      dispatch({ type: 'apply-ai-sheet', sheet: outcome.sheet, notice: outcome.notice })
    } else if (outcome.kind === 'calculate') {
      dispatch({ type: 'calculate', operation: outcome.operation })
    } else {
      dispatch({
        type: 'apply-ai-filter',
        column: outcome.column,
        operator: outcome.operator,
        value: outcome.value,
      })
    }
  }

  function addRow(): void {
    dispatch({ type: 'insert-row', index: selection ? selection.focus.row : sheet.rowCount })
  }

  function deleteRow(): void {
    dispatch({ type: 'delete-row', index: selection ? selection.focus.row : sheet.rowCount - 1 })
  }

  function addColumn(): void {
    dispatch({ type: 'insert-column', index: selection ? selection.focus.column : sheet.columnCount })
  }

  function deleteColumn(): void {
    dispatch({
      type: 'delete-column',
      index: selection ? selection.focus.column : sheet.columnCount - 1,
    })
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    setImportingCsv(true)
    try {
      const text = await readFileAsText(file)
      const result = parseCsv(text)

      if (result.ok) {
        dispatch({ type: 'request-import', rows: result.rows, filename: file.name })
      } else {
        dispatch({
          type: 'set-import-error',
          message: `${t('file.importError')}: ${file.name}: ${result.message} (line ${result.line})`,
        })
      }
    } catch (error) {
      dispatch({
        type: 'set-import-error',
        message: `${t('file.importError')}: ${file.name}: ${errorMessage(error)}`,
      })
    } finally {
      setImportingCsv(false)
    }
  }

  function handleExport(): void {
    try {
      downloadTextFile('sheetly.csv', stringifyCsv(sheetToRows(sheet)))
      dispatch({ type: 'mark-saved' })
    } catch (error) {
      dispatch({
        type: 'set-import-error',
        message: `${t('file.exportError')}: ${errorMessage(error)}`,
      })
    }
  }

  async function handleXlsxFileChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    setImportingXlsx(true)
    try {
      const buffer = await file.arrayBuffer()
      const imported = await readXlsxBuffer(buffer, { id: sheet.id, name: sheet.name })
      dispatch({ type: 'request-sheet-import', sheet: imported, filename: file.name })
    } catch (error) {
      dispatch({
        type: 'set-import-error',
        message: `${t('file.importError')}: ${file.name}: ${errorMessage(error)}`,
      })
    } finally {
      setImportingXlsx(false)
    }
  }

  async function handleExportXlsx(): Promise<void> {
    setExportingXlsx(true)
    try {
      const buffer = await writeXlsxBuffer(sheet)
      downloadArrayBuffer('sheetly.xlsx', buffer)
      dispatch({ type: 'mark-saved' })
    } catch (error) {
      dispatch({
        type: 'set-import-error',
        message: `${t('file.exportError')}: ${errorMessage(error)}`,
      })
    } finally {
      setExportingXlsx(false)
    }
  }

  const menus: readonly MenuDefinition[] = [
    {
      id: 'file',
      label: t('menu.file'),
      items: [
        { id: 'new', label: t('menu.file.new'), onSelect: requestNewWorkbook },
        { id: 'print', label: t('menu.file.print'), onSelect: handlePrint },
        {
          id: 'import-csv',
          label: importingCsv ? t('menu.file.importingCsv') : t('menu.file.importCsv'),
          onSelect: () => fileInputRef.current?.click(),
          disabled: importingCsv,
        },
        {
          id: 'import-xlsx',
          label: importingXlsx ? t('menu.file.importingXlsx') : t('menu.file.importXlsx'),
          onSelect: () => fileInputXlsxRef.current?.click(),
          disabled: importingXlsx,
        },
        { id: 'export-csv', label: t('menu.file.exportCsv'), onSelect: handleExport },
        {
          id: 'export-xlsx',
          label: exportingXlsx ? t('menu.file.exportingXlsx') : t('menu.file.exportXlsx'),
          onSelect: handleExportXlsx,
          disabled: exportingXlsx,
        },
      ],
    },
    {
      id: 'edit',
      label: t('menu.edit'),
      items: [
        { id: 'undo', label: t('menu.edit.undo'), onSelect: () => dispatch({ type: 'undo' }), disabled: !canUndo(state.history) },
        { id: 'redo', label: t('menu.edit.redo'), onSelect: () => dispatch({ type: 'redo' }), disabled: !canRedo(state.history) },
        { id: 'cut', label: t('menu.edit.cut'), onSelect: () => dispatch({ type: 'cut' }), disabled: selection === null },
        { id: 'copy', label: t('menu.edit.copy'), onSelect: () => dispatch({ type: 'copy' }), disabled: selection === null },
        { id: 'paste', label: t('menu.edit.paste'), onSelect: () => dispatch({ type: 'paste' }), disabled: state.clipboard === null },
        { id: 'find', label: t('menu.edit.find'), onSelect: openFind },
        { id: 'clear', label: t('menu.edit.clear'), onSelect: () => dispatch({ type: 'clear-cells' }), disabled: selection === null },
      ],
    },
    {
      id: 'view',
      label: t('menu.view'),
      items: [
        { id: 'zoom-in', label: t('menu.view.zoomIn'), onSelect: zoomIn },
        { id: 'zoom-out', label: t('menu.view.zoomOut'), onSelect: zoomOut },
        { id: 'zoom-reset', label: t('menu.view.zoomReset'), onSelect: zoomReset },
        { id: 'sidebar', label: t('menu.view.toggleSidebar'), onSelect: () => setSidebarOpen((open) => !open) },
        { id: 'find-bar', label: findOpen ? t('menu.view.hideFind') : t('menu.view.showFind'), onSelect: () => setFindOpen((open) => !open) },
        { id: 'filter-bar', label: filterOpen ? t('menu.view.hideFilter') : t('menu.view.showFilter'), onSelect: () => setFilterOpen((open) => !open) },
        { id: 'fullscreen', label: t('menu.view.toggleFullscreen'), onSelect: handleToggleFullscreen },
      ],
    },
    {
      id: 'insert',
      label: t('menu.insert'),
      items: [
        { id: 'insert-row', label: t('menu.insert.row'), onSelect: addRow, disabled: selection === null },
        { id: 'insert-column', label: t('menu.insert.column'), onSelect: addColumn, disabled: selection === null },
        { id: 'insert-sheet', label: t('menu.insert.sheet'), onSelect: addSheet },
      ],
    },
    {
      id: 'sheet',
      label: t('menu.sheet'),
      items: [
        { id: 'sheet-add', label: t('menu.sheet.add'), onSelect: addSheet },
        { id: 'sheet-rename', label: t('menu.sheet.rename'), disabled: true, hint: t('menu.sheet.renameHint') },
        { id: 'sheet-duplicate', label: t('menu.sheet.duplicate'), onSelect: duplicateActiveSheet },
        { id: 'sheet-delete', label: t('menu.sheet.delete'), onSelect: requestDeleteActiveSheet, disabled: tabs.length <= 1 },
      ],
    },
    {
      id: 'data',
      label: t('menu.data'),
      items: [
        { id: 'sort-asc', label: t('menu.data.sortAsc'), onSelect: () => dispatch({ type: 'sort', direction: 'ascending' }), disabled: selection === null },
        { id: 'sort-desc', label: t('menu.data.sortDesc'), onSelect: () => dispatch({ type: 'sort', direction: 'descending' }), disabled: selection === null },
        { id: 'filter', label: t('menu.data.filter'), onSelect: openFilter },
        { id: 'dedupe', label: t('menu.data.dedupe'), onSelect: () => dispatch({ type: 'remove-duplicates' }), disabled: selection === null },
        { id: 'clean-trim', label: t('menu.data.cleanTrim'), onSelect: () => dispatch({ type: 'clean-text', operation: 'trim' }), disabled: selection === null },
        { id: 'clean-collapse', label: t('menu.data.cleanCollapse'), onSelect: () => dispatch({ type: 'clean-text', operation: 'collapse' }), disabled: selection === null },
      ],
    },
    {
      id: 'calculate',
      label: t('menu.calculate'),
      items: [
        { id: 'calc-sum', label: t('menu.calculate.sum'), onSelect: () => dispatch({ type: 'calculate', operation: 'sum' }), disabled: selection === null },
        { id: 'calc-average', label: t('menu.calculate.average'), onSelect: () => dispatch({ type: 'calculate', operation: 'average' }), disabled: selection === null },
        { id: 'calc-min', label: t('menu.calculate.minimum'), onSelect: () => dispatch({ type: 'calculate', operation: 'minimum' }), disabled: selection === null },
        { id: 'calc-max', label: t('menu.calculate.maximum'), onSelect: () => dispatch({ type: 'calculate', operation: 'maximum' }), disabled: selection === null },
        { id: 'calc-count', label: t('menu.calculate.count'), onSelect: () => dispatch({ type: 'calculate', operation: 'count' }), disabled: selection === null },
        { id: 'calc-formulas', label: t('menu.calculate.formulas'), disabled: true, hint: t('menu.deferred') },
      ],
    },
    {
      id: 'help',
      label: t('menu.help'),
      items: [
        {
          id: 'help-about',
          label: t('menu.help.about'),
          onSelect: () => {
            setSidebarOpen(true)
            setSidebarPanel('help')
          },
        },
        {
          id: 'help-shortcuts',
          label: t('menu.help.shortcuts'),
          onSelect: () => {
            setSidebarOpen(true)
            setSidebarPanel('help')
          },
        },
        { id: 'help-charts', label: t('menu.help.charts'), disabled: true, hint: t('menu.deferred') },
      ],
    },
  ]

  return (
    <I18nProvider lang={lang}>
      <div className="app">
      <TitleBar
        workbookName={INITIAL_WORKBOOK_NAME}
        sheetName={sheet.name}
        dirty={dirty}
        theme={theme}
        lang={lang}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        onToggleLang={() => setLang((l) => (l === 'en' ? 'ar' : 'en'))}
      />

      <MenuBar menus={menus} />

      <Toolbar
        canUndo={canUndo(state.history)}
        canRedo={canRedo(state.history)}
        canDeleteRow={sheet.rowCount > 1}
        canDeleteColumn={sheet.columnCount > 1}
        canCalculate={selection !== null}
        canEditSelection={selection !== null}
        canPaste={state.clipboard !== null}
        onCut={() => dispatch({ type: 'cut' })}
        onCopy={() => dispatch({ type: 'copy' })}
        onPaste={() => dispatch({ type: 'paste' })}
        onFind={openFind}
        onFilter={openFilter}
        onOpenAI={() => {
          setSidebarOpen(true)
          setSidebarPanel('ai')
        }}
        onUndo={() => dispatch({ type: 'undo' })}
        onRedo={() => dispatch({ type: 'redo' })}
        onCalculate={(operation) => dispatch({ type: 'calculate', operation })}
        onSort={(direction) => dispatch({ type: 'sort', direction })}
        onCleanText={(operation) => dispatch({ type: 'clean-text', operation })}
        onRemoveDuplicates={() => dispatch({ type: 'remove-duplicates' })}
        onAddRow={addRow}
        onDeleteRow={deleteRow}
        onAddColumn={addColumn}
        onDeleteColumn={deleteColumn}
      />

      <FormatBar style={activeStyle} canFormat={selection !== null} onApply={applyStyle} />

      <FormulaBar
        key={`${label}|${formulaValue}`}
        selectionLabel={label}
        value={formulaValue}
        onCommit={(value) => dispatch({ type: 'set-cell-value', value })}
        onCancel={() => dispatch({ type: 'cancel-edit' })}
      />

      <CalcResultStrip
        selectionLabel={label}
        calculation={state.calculation}
      />

      <div className="app-body">
        <main className="workspace">
          <div className={`bar-slot${filterOpen ? '' : ' is-collapsed'}`}>
            <FilterBar
              activeColumn={selection ? selection.focus.column : null}
              filter={state.filter}
              visibleCount={visibleRows.length}
              totalRows={sheet.rowCount}
              focusToken={filterToken}
              onApply={(operator, value) => dispatch({ type: 'apply-filter', operator, value })}
              onClear={() => dispatch({ type: 'clear-filter' })}
            />
          </div>

          <div className={`bar-slot${findOpen ? '' : ' is-collapsed'}`}>
            <FindBar
              focusToken={findToken}
              onFindNext={(query, caseSensitive) => dispatch({ type: 'find-next', query, caseSensitive })}
              onReplaceCurrent={(query, replacement, caseSensitive) =>
                dispatch({ type: 'replace-current', query, replacement, caseSensitive })
              }
              onReplaceAll={(query, replacement, caseSensitive) =>
                dispatch({ type: 'replace-all', query, replacement, caseSensitive })
              }
            />
          </div>

          {state.pendingImport !== null && (
            <ImportPrompt
              filename={state.pendingImport.filename}
              onConfirm={() => dispatch({ type: 'confirm-import' })}
              onCancel={() => dispatch({ type: 'cancel-import' })}
            />
          )}

          {state.pendingSheetImport !== null && (
            <ImportPrompt
              filename={state.pendingSheetImport.filename}
              onConfirm={() => dispatch({ type: 'confirm-sheet-import' })}
              onCancel={() => dispatch({ type: 'cancel-sheet-import' })}
            />
          )}

          {state.pendingDedupe !== null && (
            <DedupePrompt
              removedRows={state.pendingDedupe.removedRows}
              onConfirm={() => dispatch({ type: 'confirm-dedupe' })}
              onCancel={() => dispatch({ type: 'cancel-dedupe' })}
            />
          )}

          {state.importError !== null && (
            <div className="import-error" role="alert">
              {state.importError}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            aria-label={t('import.csvFile')}
            className="visually-hidden"
            onChange={handleFileChange}
          />

          <input
            ref={fileInputXlsxRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            aria-label={t('import.xlsxFile')}
            className="visually-hidden"
            onChange={handleXlsxFileChange}
          />

          <div className="grid-zoom" style={{ zoom: zoom / 100 } as CSSProperties}>
            <Grid
              sheet={sheet}
              selection={selection}
              editing={state.editing}
              draft={state.draft}
              styles={styles}
              visibleRows={visibleRows}
              onSelect={(cell) => dispatch({ type: 'select', cell })}
              onExtendSelection={(cell) => dispatch({ type: 'extend-selection', cell })}
              onStartEditing={() => dispatch({ type: 'start-editing' })}
              onChangeDraft={(value) => dispatch({ type: 'change-draft', value })}
              onCommit={() => dispatch({ type: 'commit-edit' })}
              onCancel={() => dispatch({ type: 'cancel-edit' })}
            />
          </div>
        </main>

        {sidebarOpen && (
          <Sidebar
            panel={sidebarPanel}
            onSelectPanel={setSidebarPanel}
            onClose={() => setSidebarOpen(false)}
            sheet={sheet}
            selection={range}
            visibleRows={visibleRows}
            selectionLabel={label}
            activeValue={formulaValue}
            activeType={valueType(activeCellValue, t)}
            supportText={supportText}
            onApplyAI={handleApplyAI}
            onFocusFind={openFind}
            onFocusFilter={openFilter}
          />
        )}
      </div>

      <SheetTabs
        sheets={tabs}
        activeId={sheet.id}
        onSelect={(sheetId) => dispatch({ type: 'select-sheet', sheetId })}
        onAdd={addSheet}
        onRename={(sheetId, name) => dispatch({ type: 'rename-sheet', sheetId, name })}
      />

      <StatusBar
        sheetIndex={sheetIndex}
        sheetCount={tabs.length}
        selectionLabel={label}
        cellCount={cellCount}
        dirty={dirty}
        message={statusText ?? ''}
        zoom={zoom}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onZoomReset={zoomReset}
        onZoomChange={(value) => setZoom(clampZoom(value))}
      />

      {confirmState !== null && (
        <ConfirmDialog
          title={confirmState.title}
          message={confirmState.message}
          confirmLabel={confirmState.confirmLabel}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </div>
    </I18nProvider>
  )
}

export default App
