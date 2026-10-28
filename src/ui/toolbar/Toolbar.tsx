import type { ReactNode } from 'react'
import type { CalculationName } from '../../core/calc'
import type { SortDirection } from '../../core/sort'
import type { CleanOperation } from '../../core/clean'
import { useI18n } from '../i18n'

export interface ToolbarProps {
  readonly canUndo: boolean
  readonly canRedo: boolean
  readonly canDeleteRow: boolean
  readonly canDeleteColumn: boolean
  readonly canCalculate: boolean
  readonly canEditSelection: boolean
  readonly canPaste: boolean
  readonly onNew: () => void
  readonly onPrint: () => void
  readonly onCut: () => void
  readonly onCopy: () => void
  readonly onPaste: () => void
  readonly onFind: () => void
  readonly onFilter: () => void
  readonly onPalette: () => void
  readonly onUndo: () => void
  readonly onRedo: () => void
  readonly onImport: () => void
  readonly onExport: () => void
  readonly onImportXlsx: () => void
  readonly onExportXlsx: () => void
  readonly onCalculate: (operation: CalculationName) => void
  readonly onSort: (direction: SortDirection) => void
  readonly onCleanText: (operation: CleanOperation) => void
  readonly onRemoveDuplicates: () => void
  readonly onAddRow: () => void
  readonly onDeleteRow: () => void
  readonly onAddColumn: () => void
  readonly onDeleteColumn: () => void
}

type IconName =
  | 'new'
  | 'print'
  | 'open'
  | 'save'
  | 'download'
  | 'cut'
  | 'copy'
  | 'paste'
  | 'undo'
  | 'redo'
  | 'find'
  | 'sort-asc'
  | 'sort-desc'
  | 'filter'
  | 'dedupe'
  | 'row-add'
  | 'row-delete'
  | 'col-add'
  | 'col-delete'
  | 'trim'
  | 'collapse'
  | 'palette'

function Icon(props: { readonly name: IconName }) {
  const common = {
    width: 17,
    height: 17,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false,
  }

  let body: ReactNode
  switch (props.name) {
    case 'new':
      body = (
        <>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M12 8v8M8 12h8" />
        </>
      )
      break
    case 'print':
      body = (
        <>
          <path d="M7 8V4h10v4" />
          <rect x="4" y="8" width="16" height="8" rx="2" />
          <rect x="7" y="14" width="10" height="6" rx="1" />
        </>
      )
      break
    case 'open':
      body = (
        <>
          <path d="M3 8a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1" />
          <path d="M3 10h18l-2 8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8Z" />
        </>
      )
      break
    case 'save':
      body = (
        <>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M8 4v5h8V4M8 20v-6h8v6" />
        </>
      )
      break
    case 'download':
      body = (
        <>
          <path d="M12 4v10m0 0 4-4m-4 4-4-4" />
          <path d="M4 18v2h16v-2" />
        </>
      )
      break
    case 'cut':
      body = (
        <>
          <circle cx="6" cy="7" r="2" />
          <circle cx="6" cy="17" r="2" />
          <path d="M8 8l12 8M8 16 20 8" />
        </>
      )
      break
    case 'copy':
      body = (
        <>
          <rect x="8" y="8" width="12" height="12" rx="2" />
          <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
        </>
      )
      break
    case 'paste':
      body = (
        <>
          <rect x="6" y="5" width="12" height="16" rx="2" />
          <path d="M9 5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
        </>
      )
      break
    case 'undo':
      body = (
        <>
          <path d="M9 14 4 9l5-5" />
          <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
        </>
      )
      break
    case 'redo':
      body = (
        <>
          <path d="m15 14 5-5-5-5" />
          <path d="M20 9H10a6 6 0 0 0 0 12h3" />
        </>
      )
      break
    case 'find':
      body = (
        <>
          <circle cx="11" cy="11" r="6" />
          <path d="m16 16 4 4" />
        </>
      )
      break
    case 'sort-asc':
      body = (
        <>
          <path d="M7 20V6m0 0 3 3M7 6 4 9" />
          <path d="M14 6h6M14 12h5M14 18h4" />
        </>
      )
      break
    case 'sort-desc':
      body = (
        <>
          <path d="M7 4v14m0 0 3-3m-3 3-3-3" />
          <path d="M14 6h6M14 12h5M14 18h4" />
        </>
      )
      break
    case 'filter':
      body = <path d="M4 5h16l-6 7v6l-4 2v-8L4 5Z" />
      break
    case 'dedupe':
      body = (
        <>
          <rect x="4" y="4" width="9" height="9" rx="1.5" />
          <rect x="11" y="11" width="9" height="9" rx="1.5" />
        </>
      )
      break
    case 'row-add':
      body = (
        <>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M4 10h16M12 14v5M9.5 16.5h5" />
        </>
      )
      break
    case 'row-delete':
      body = (
        <>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M4 10h16M9.5 16.5h5" />
        </>
      )
      break
    case 'col-add':
      body = (
        <>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M10 4v16M14 12h5M16.5 9.5v5" />
        </>
      )
      break
    case 'col-delete':
      body = (
        <>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M10 4v16M14 12h5" />
        </>
      )
      break
    case 'trim':
      body = (
        <>
          <path d="M4 12h16M4 12l3-3M4 12l3 3M20 12l-3-3M20 12l-3 3" />
        </>
      )
      break
    case 'collapse':
      body = (
        <>
          <path d="M4 12h6M4 12l2-2M4 12l2 2M20 12h-6M20 12l-2-2M20 12l-2 2" />
        </>
      )
      break
    case 'palette':
      body = (
        <>
          <circle cx="12" cy="12" r="8" />
          <circle cx="9" cy="9" r="1.2" fill="currentColor" />
          <circle cx="15" cy="9" r="1.2" fill="currentColor" />
          <circle cx="9" cy="15" r="1.2" fill="currentColor" />
          <circle cx="15" cy="15" r="1.2" fill="currentColor" />
        </>
      )
      break
    default:
      body = (
        <>
          <path d="M12 3l1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3Z" />
          <path d="M18.5 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z" />
        </>
      )
  }

  return <svg {...common}>{body}</svg>
}

function ToolButton(props: {
  readonly label: string
  readonly name: IconName
  readonly onClick: () => void
  readonly disabled?: boolean
}) {
  return (
    <button
      type="button"
      className="tool-button"
      aria-label={props.label}
      title={props.label}
      onClick={props.onClick}
      disabled={props.disabled}
    >
      <Icon name={props.name} />
    </button>
  )
}

export function Toolbar(props: ToolbarProps) {
  const { t } = useI18n()

  return (
    <div className="toolbar main-toolbar" role="toolbar" aria-label={t('toolbar.actions')}>
      {/* 1. File actions */}
      <div className="toolbar-group" role="group" aria-label="File">
        <ToolButton label={t('toolbar.new')} name="new" onClick={props.onNew} />
        <ToolButton label={t('toolbar.print')} name="print" onClick={props.onPrint} />
        <ToolButton label={t('toolbar.importCsv')} name="open" onClick={props.onImport} />
        <ToolButton label={t('toolbar.exportCsv')} name="save" onClick={props.onExport} />
        <ToolButton label={t('toolbar.importXlsx')} name="open" onClick={props.onImportXlsx} />
        <ToolButton label={t('toolbar.exportXlsx')} name="download" onClick={props.onExportXlsx} />
      </div>

      <span className="toolbar-divider" aria-hidden="true" />

      {/* 2. Clipboard actions */}
      <div className="toolbar-group" role="group" aria-label="Clipboard">
        <ToolButton
          label={t('toolbar.cut')}
          name="cut"
          onClick={props.onCut}
          disabled={!props.canEditSelection}
        />
        <ToolButton
          label={t('toolbar.copy')}
          name="copy"
          onClick={props.onCopy}
          disabled={!props.canEditSelection}
        />
        <ToolButton
          label={t('toolbar.paste')}
          name="paste"
          onClick={props.onPaste}
          disabled={!props.canPaste}
        />
      </div>

      <span className="toolbar-divider" aria-hidden="true" />

      {/* 3. Undo and redo */}
      <div className="toolbar-group" role="group" aria-label="History">
        <ToolButton
          label={t('toolbar.undo')}
          name="undo"
          onClick={props.onUndo}
          disabled={!props.canUndo}
        />
        <ToolButton
          label={t('toolbar.redo')}
          name="redo"
          onClick={props.onRedo}
          disabled={!props.canRedo}
        />
      </div>

      <span className="toolbar-divider" aria-hidden="true" />

      {/* 4. Search/filter/data actions */}
      <div className="toolbar-group" role="group" aria-label="Data">
        <ToolButton label={t('toolbar.find')} name="find" onClick={props.onFind} />
        <ToolButton label={t('toolbar.filter')} name="filter" onClick={props.onFilter} />
        <ToolButton
          label={t('toolbar.sortAsc')}
          name="sort-asc"
          onClick={() => props.onSort('ascending')}
          disabled={!props.canEditSelection}
        />
        <ToolButton
          label={t('toolbar.sortDesc')}
          name="sort-desc"
          onClick={() => props.onSort('descending')}
          disabled={!props.canEditSelection}
        />
        <ToolButton
          label={t('toolbar.dedupe')}
          name="dedupe"
          onClick={props.onRemoveDuplicates}
          disabled={!props.canEditSelection}
        />
        <ToolButton
          label={t('toolbar.trim')}
          name="trim"
          onClick={() => props.onCleanText('trim')}
          disabled={!props.canEditSelection}
        />
        <ToolButton
          label={t('toolbar.collapse')}
          name="collapse"
          onClick={() => props.onCleanText('collapse')}
          disabled={!props.canEditSelection}
        />
      </div>

      <span className="toolbar-divider" aria-hidden="true" />

      {/* 5. Row and column actions */}
      <div className="toolbar-group" role="group" aria-label="Rows and columns">
        <ToolButton label={t('toolbar.addRow')} name="row-add" onClick={props.onAddRow} />
        <ToolButton
          label={t('toolbar.deleteRow')}
          name="row-delete"
          onClick={props.onDeleteRow}
          disabled={!props.canDeleteRow}
        />
        <ToolButton label={t('toolbar.addColumn')} name="col-add" onClick={props.onAddColumn} />
        <ToolButton
          label={t('toolbar.deleteColumn')}
          name="col-delete"
          onClick={props.onDeleteColumn}
          disabled={!props.canDeleteColumn}
        />
      </div>

      <span className="toolbar-divider" aria-hidden="true" />

      {/* 6. Calculate actions */}
      <div className="toolbar-group calc-toolbar-group" role="group" aria-label={t('toolbar.calculate')}>
        <button
          type="button"
          className="tool-calc-button calc-button"
          aria-label={t('calc.sum')}
          title={t('calc.sum')}
          disabled={!props.canCalculate}
          onClick={() => props.onCalculate('sum')}
        >
          {t('calc.sum')}
        </button>
        <button
          type="button"
          className="tool-calc-button calc-button"
          aria-label={t('calc.average')}
          title={t('calc.average')}
          disabled={!props.canCalculate}
          onClick={() => props.onCalculate('average')}
        >
          {t('calc.average')}
        </button>
        <button
          type="button"
          className="tool-calc-button calc-button"
          aria-label={t('calc.minimum')}
          title={t('calc.minimum')}
          disabled={!props.canCalculate}
          onClick={() => props.onCalculate('minimum')}
        >
          {t('calc.minimum')}
        </button>
        <button
          type="button"
          className="tool-calc-button calc-button"
          aria-label={t('calc.maximum')}
          title={t('calc.maximum')}
          disabled={!props.canCalculate}
          onClick={() => props.onCalculate('maximum')}
        >
          {t('calc.maximum')}
        </button>
        <button
          type="button"
          className="tool-calc-button calc-button"
          aria-label={t('calc.count')}
          title={t('calc.count')}
          disabled={!props.canCalculate}
          onClick={() => props.onCalculate('count')}
        >
          {t('calc.count')}
        </button>
      </div>

      <span className="toolbar-divider" aria-hidden="true" />

      {/* 7. Optional style/sidebar action */}
      <div className="toolbar-group" role="group" aria-label="Styles">
        <ToolButton
          label={t('toolbar.stylesPanel')}
          name="palette"
          onClick={props.onPalette}
        />
      </div>
    </div>
  )
}
