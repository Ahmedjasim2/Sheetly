import { useEffect, useReducer, useRef, useState } from 'react'
import type { CSSProperties, ChangeEvent } from 'react'
import {
  averageRange,
  cellStyleKey,
  countNumeric,
  createRange,
  createSheet,
  formatCellId,
  formatCellValue,
  formatSupportSummary,
  getCellValue,
  maximumRange,
  minimumRange,
  parseCsv,
  readXlsxBuffer,
  sheetToRows,
  stringifyCsv,
  sumRange,
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
import { I18nProvider } from './i18n'
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

function valueType(value: CellValue): string {
  if (value === null) {
    return 'Empty'
  }
  if (typeof value === 'boolean') {
    return 'Boolean'
  }
  if (typeof value === 'number') {
    return 'Number'
  }
  return 'Text'
}

function clampZoom(zoom: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom))
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
  const [filterOpen, setFilterOpen] = useState(false)
  const [findOpen, setFindOpen] = useState(false)
  const [findToken, setFindToken] = useState(0)
  const [filterToken, setFilterToken] = useState(0)
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null)
  const [lang, setLang] = useState<Language>(getInitialLanguage)
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    applyLanguage(lang)
  }, [lang])

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const statusText =
    state.sortNotice ?? state.cleanNotice ?? state.findNotice ?? state.dedupeNotice ?? state.aiNotice

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
  const stats =
    selection === null || range === null
      ? null
      : (() => {
          const count = countNumeric(sheet, range)
          return {
            count,
            sum: count > 0 ? sumRange(sheet, range) : null,
            average: count > 0 ? averageRange(sheet, range) : null,
            minimum: count > 0 ? minimumRange(sheet, range) : null,
            maximum: count > 0 ? maximumRange(sheet, range) : null,
          }
        })()

  const supportText = formatSupportSummary()
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
      title: 'New workbook',
      message: 'Discard unsaved changes and start a new workbook?',
      confirmLabel: 'Discard and start new',
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
      title: 'Delete sheet',
      message: `Delete "${sheet.name}"? Its data and formatting are removed.`,
      confirmLabel: 'Delete sheet',
      onConfirm: () => {
        dispatch({ type: 'delete-sheet', sheetId: sheet.id })
        setConfirmState(null)
      },
    })
  }

  function handlePrint(): void {
    if (typeof window.print === 'function') {
      window.print()
    }
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

    const text = await readFileAsText(file)
    const result = parseCsv(text)

    if (result.ok) {
      dispatch({ type: 'request-import', rows: result.rows, filename: file.name })
    } else {
      dispatch({
        type: 'set-import-error',
        message: `${file.name}: ${result.message} (line ${result.line})`,
      })
    }
  }

  function handleExport(): void {
    downloadTextFile('sheetly.csv', stringifyCsv(sheetToRows(sheet)))
    dispatch({ type: 'mark-saved' })
  }

  async function handleXlsxFileChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    try {
      const buffer = await file.arrayBuffer()
      const imported = await readXlsxBuffer(buffer, { id: sheet.id, name: sheet.name })
      dispatch({ type: 'request-sheet-import', sheet: imported, filename: file.name })
    } catch (error) {
      dispatch({ type: 'set-import-error', message: `${file.name}: ${errorMessage(error)}` })
    }
  }

  async function handleExportXlsx(): Promise<void> {
    const buffer = await writeXlsxBuffer(sheet)
    downloadArrayBuffer('sheetly.xlsx', buffer)
    dispatch({ type: 'mark-saved' })
  }

  const menus: readonly MenuDefinition[] = [
    {
      id: 'file',
      label: 'File',
      items: [
        { id: 'new', label: 'New workbook', onSelect: requestNewWorkbook },
        { id: 'import-csv', label: 'Import CSV…', onSelect: () => fileInputRef.current?.click() },
        { id: 'save-csv', label: 'Save CSV', onSelect: handleExport },
        {
          id: 'import-xlsx',
          label: 'Import XLSX… (first sheet, values)',
          onSelect: () => fileInputXlsxRef.current?.click(),
        },
        { id: 'save-xlsx', label: 'Save XLSX (values only)', onSelect: handleExportXlsx },
        { id: 'print', label: 'Print', onSelect: handlePrint },
      ],
    },
    {
      id: 'edit',
      label: 'Edit',
      items: [
        { id: 'undo', label: 'Undo', onSelect: () => dispatch({ type: 'undo' }), disabled: !canUndo(state.history) },
        { id: 'redo', label: 'Redo', onSelect: () => dispatch({ type: 'redo' }), disabled: !canRedo(state.history) },
        { id: 'cut', label: 'Cut', onSelect: () => dispatch({ type: 'cut' }), disabled: selection === null },
        { id: 'copy', label: 'Copy', onSelect: () => dispatch({ type: 'copy' }), disabled: selection === null },
        { id: 'paste', label: 'Paste', onSelect: () => dispatch({ type: 'paste' }), disabled: state.clipboard === null },
        { id: 'find', label: 'Find and replace', onSelect: openFind },
        { id: 'clear', label: 'Clear cell contents', onSelect: () => dispatch({ type: 'clear-cells' }), disabled: selection === null },
      ],
    },
    {
      id: 'view',
      label: 'View',
      items: [
        { id: 'zoom-in', label: 'Zoom in', onSelect: zoomIn },
        { id: 'zoom-out', label: 'Zoom out', onSelect: zoomOut },
        { id: 'zoom-reset', label: 'Reset zoom (100%)', onSelect: zoomReset },
        { id: 'sidebar', label: 'Toggle sidebar', onSelect: () => setSidebarOpen((open) => !open) },
        { id: 'find-bar', label: findOpen ? 'Hide find bar' : 'Show find bar', onSelect: () => setFindOpen((open) => !open) },
        { id: 'filter-bar', label: filterOpen ? 'Hide filter bar' : 'Show filter bar', onSelect: () => setFilterOpen((open) => !open) },
        { id: 'fullscreen', label: 'Toggle fullscreen', onSelect: handleToggleFullscreen },
      ],
    },
    {
      id: 'insert',
      label: 'Insert',
      items: [
        { id: 'insert-row', label: 'Row at active cell', onSelect: addRow, disabled: selection === null },
        { id: 'insert-column', label: 'Column at active cell', onSelect: addColumn, disabled: selection === null },
        { id: 'insert-sheet', label: 'New sheet', onSelect: addSheet },
      ],
    },
    {
      id: 'sheet',
      label: 'Sheet',
      items: [
        { id: 'sheet-add', label: 'Add sheet', onSelect: addSheet },
        { id: 'sheet-rename', label: 'Rename sheet', disabled: true, hint: 'Double-click a tab' },
        { id: 'sheet-duplicate', label: 'Duplicate active sheet', onSelect: duplicateActiveSheet },
        { id: 'sheet-delete', label: 'Delete active sheet', onSelect: requestDeleteActiveSheet, disabled: tabs.length <= 1 },
      ],
    },
    {
      id: 'data',
      label: 'Data',
      items: [
        { id: 'sort-asc', label: 'Sort ascending', onSelect: () => dispatch({ type: 'sort', direction: 'ascending' }), disabled: selection === null },
        { id: 'sort-desc', label: 'Sort descending', onSelect: () => dispatch({ type: 'sort', direction: 'descending' }), disabled: selection === null },
        { id: 'filter', label: 'Filter…', onSelect: openFilter },
        { id: 'dedupe', label: 'Remove duplicate rows', onSelect: () => dispatch({ type: 'remove-duplicates' }), disabled: selection === null },
        { id: 'clean-trim', label: 'Clean text: trim', onSelect: () => dispatch({ type: 'clean-text', operation: 'trim' }), disabled: selection === null },
        { id: 'clean-collapse', label: 'Clean text: collapse spaces', onSelect: () => dispatch({ type: 'clean-text', operation: 'collapse' }), disabled: selection === null },
      ],
    },
    {
      id: 'calculate',
      label: 'Calculate',
      items: [
        { id: 'calc-sum', label: 'Sum', onSelect: () => dispatch({ type: 'calculate', operation: 'sum' }), disabled: selection === null },
        { id: 'calc-average', label: 'Average', onSelect: () => dispatch({ type: 'calculate', operation: 'average' }), disabled: selection === null },
        { id: 'calc-min', label: 'Minimum', onSelect: () => dispatch({ type: 'calculate', operation: 'minimum' }), disabled: selection === null },
        { id: 'calc-max', label: 'Maximum', onSelect: () => dispatch({ type: 'calculate', operation: 'maximum' }), disabled: selection === null },
        { id: 'calc-count', label: 'Count', onSelect: () => dispatch({ type: 'calculate', operation: 'count' }), disabled: selection === null },
        { id: 'calc-formulas', label: 'Formula engine', disabled: true, hint: 'Deferred' },
      ],
    },
    {
      id: 'help',
      label: 'Help',
      items: [
        {
          id: 'help-about',
          label: 'About sheetly (limits & version)',
          onSelect: () => {
            setSidebarOpen(true)
            setSidebarPanel('help')
          },
        },
        {
          id: 'help-shortcuts',
          label: 'Keyboard shortcuts',
          onSelect: () => {
            setSidebarOpen(true)
            setSidebarPanel('help')
          },
        },
        { id: 'help-charts', label: 'Charts and images', disabled: true, hint: 'Deferred' },
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
        onSaveCsv={handleExport}
        onSaveXlsx={handleExportXlsx}
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
        onNew={requestNewWorkbook}
        onPrint={handlePrint}
        onCut={() => dispatch({ type: 'cut' })}
        onCopy={() => dispatch({ type: 'copy' })}
        onPaste={() => dispatch({ type: 'paste' })}
        onFind={openFind}
        onFilter={openFilter}
        onPalette={() => {
          setSidebarOpen(true)
          setSidebarPanel('styles')
        }}
        onUndo={() => dispatch({ type: 'undo' })}
        onRedo={() => dispatch({ type: 'redo' })}
        onImport={() => fileInputRef.current?.click()}
        onExport={handleExport}
        onImportXlsx={() => fileInputXlsxRef.current?.click()}
        onExportXlsx={handleExportXlsx}
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
        count={stats?.count ?? 0}
        sum={stats?.sum ?? null}
        average={stats?.average ?? null}
        minimum={stats?.minimum ?? null}
        maximum={stats?.maximum ?? null}
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
            aria-label="Import CSV file"
            className="visually-hidden"
            onChange={handleFileChange}
          />

          <input
            ref={fileInputXlsxRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            aria-label="Import XLSX file"
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
            activeType={valueType(activeCellValue)}
            style={activeStyle}
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
