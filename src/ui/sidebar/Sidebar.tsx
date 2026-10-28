import type { CellStyle, Range, Sheet } from '../../core/model'
import type { ApplyOutcome } from '../../core/ai'
import { APP_VERSION } from '../config'
import { useI18n } from '../i18n'
import { AiPanel } from '../ai/AiPanel'

export type SidebarPanel = 'ai' | 'properties' | 'styles' | 'help'

export interface SidebarProps {
  readonly panel: SidebarPanel
  readonly onSelectPanel: (panel: SidebarPanel) => void
  readonly onClose: () => void
  readonly sheet: Sheet
  readonly selection: Range | null
  readonly visibleRows: readonly number[]
  readonly selectionLabel: string
  readonly activeValue: string
  readonly activeType: string
  readonly style: CellStyle
  readonly supportText: string
  readonly onApplyAI: (outcome: ApplyOutcome) => void
  readonly onFocusFind: () => void
  readonly onFocusFilter: () => void
}

function PanelIcon(props: { readonly name: 'grid' | 'columns' | 'search' | 'filter' | 'sparkle' | 'close' }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false,
  }

  switch (props.name) {
    case 'grid':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
        </svg>
      )
    case 'columns':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="3" />
          <path d="M9 4v16M15 4v16" />
        </svg>
      )
    case 'search':
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="6" />
          <path d="m16 16 4 4" />
        </svg>
      )
    case 'filter':
      return (
        <svg {...common}>
          <path d="M4 5h16l-6 7v6l-4 2v-8L4 5Z" />
        </svg>
      )
    case 'sparkle':
      return (
        <svg {...common}>
          <path d="M12 3l1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3Z" />
          <path d="M18.5 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z" />
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      )
  }
}

function styleSummary(style: CellStyle): string {
  const parts: string[] = []
  if (style.bold) parts.push('Bold')
  if (style.italic) parts.push('Italic')
  if (style.underline) parts.push('Underline')
  if (style.strikethrough) parts.push('Strikethrough')
  if (style.fontFamily) parts.push(style.fontFamily)
  if (style.fontSize) parts.push(`${style.fontSize}pt`)
  if (style.align) parts.push(`Align ${style.align}`)
  if (style.wrap) parts.push('Wrap')
  if (style.numberFormat && style.numberFormat !== 'general') parts.push(style.numberFormat)
  return parts.length === 0 ? 'Default formatting' : parts.join(' \u00B7 ')
}

export function Sidebar(props: SidebarProps) {
  const { t } = useI18n()

  return (
    <aside className="sidebar" aria-label="Sidebar">
      <div className="sidebar-head">
        <button
          type="button"
          className={`sidebar-icon${props.panel === 'ai' ? ' is-active' : ''}`}
          aria-label={t('Sheetly AI')}
          title={t('Sheetly AI')}
          onClick={() => props.onSelectPanel('ai')}
        >
          <PanelIcon name="sparkle" />
        </button>
        <button
          type="button"
          className={`sidebar-icon${props.panel === 'properties' ? ' is-active' : ''}`}
          aria-label={t('Properties')}
          title={t('Properties')}
          onClick={() => props.onSelectPanel('properties')}
        >
          <PanelIcon name="grid" />
        </button>
        <button
          type="button"
          className={`sidebar-icon${props.panel === 'styles' ? ' is-active' : ''}`}
          aria-label={t('Styles')}
          title={t('Styles')}
          onClick={() => props.onSelectPanel('styles')}
        >
          <PanelIcon name="columns" />
        </button>
        <button
          type="button"
          className="sidebar-icon"
          aria-label={t('Find')}
          title={t('Find')}
          onClick={props.onFocusFind}
        >
          <PanelIcon name="search" />
        </button>
        <button
          type="button"
          className="sidebar-icon"
          aria-label={t('Filter')}
          title={t('Filter')}
          onClick={props.onFocusFilter}
        >
          <PanelIcon name="filter" />
        </button>
        <button
          type="button"
          className="sidebar-icon sidebar-close"
          aria-label={t('Close')}
          title={t('Close')}
          onClick={props.onClose}
        >
          <PanelIcon name="close" />
        </button>
      </div>

      <div className="sidebar-content">
        {props.panel === 'ai' && (
          <AiPanel
            sheet={props.sheet}
            selection={props.selection}
            visibleRows={props.visibleRows}
            onApply={props.onApplyAI}
          />
        )}

        {props.panel === 'properties' && (
          <dl className="property-list">
            <dt>Sheet</dt>
            <dd>{props.sheet.name}</dd>
            <dt>Selection</dt>
            <dd>{props.selectionLabel === '' ? '\u2014' : props.selectionLabel}</dd>
            <dt>Value</dt>
            <dd className="property-value">{props.activeValue === '' ? 'Empty' : props.activeValue}</dd>
            <dt>Type</dt>
            <dd>{props.activeType}</dd>
            <dt>Size</dt>
            <dd>
              {props.sheet.rowCount} {'\u00D7'} {props.sheet.columnCount}
            </dd>
          </dl>
        )}

        {props.panel === 'styles' && (
          <div className="sidebar-section">
            <p className="sidebar-note">Current cell formatting:</p>
            <p className="sidebar-strong">{styleSummary(props.style)}</p>
            <p className="sidebar-note">
              Use the formatting bar above the grid to change fonts, colors, alignment, number
              formats, and borders. Formatting is session-only and is not saved to CSV or XLSX.
            </p>
          </div>
        )}

        {props.panel === 'help' && (
          <div className="sidebar-section">
            <p className="sidebar-strong">sheetly {APP_VERSION}</p>
            <p className="sidebar-note">A standalone spreadsheet app. It is not Excel or LibreOffice.</p>
            <p className="sidebar-note">{props.supportText}</p>
            <p className="sidebar-note">
              Formulas are not evaluated. Macros, charts, images, merges, and frozen panes are not
              supported.
            </p>
            <p className="sidebar-note">
              Shortcuts: Ctrl+C / Ctrl+V / Ctrl+X / Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z / Ctrl+F, arrows,
              Shift+arrows, Enter, Escape, Delete (clears the selection).
            </p>
          </div>
        )}
      </div>
    </aside>
  )
}
