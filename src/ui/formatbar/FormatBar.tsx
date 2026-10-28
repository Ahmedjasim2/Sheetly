import type { CellStyle, NumberFormat } from '../../core/model'
import { useI18n } from '../i18n'

export interface FormatBarProps {
  readonly style: CellStyle
  readonly canFormat: boolean
  readonly onApply: (patch: CellStyle) => void
}

const FONT_FAMILIES = [
  'Plus Jakarta Sans',
  'System default',
  'Arial',
  'Georgia',
  'Courier New',
  'Times New Roman',
  'Verdana',
]

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32]

const DEFAULT_FONT = 'Plus Jakarta Sans'

const ALIGN_LINES: Record<
  'left' | 'center' | 'right',
  ReadonlyArray<readonly [number, number, number]>
> = {
  left: [
    [3, 6, 18],
    [3, 12, 11],
    [3, 18, 18],
  ],
  center: [
    [3, 6, 18],
    [6, 12, 12],
    [3, 18, 18],
  ],
  right: [
    [3, 6, 18],
    [10, 12, 11],
    [3, 18, 18],
  ],
}

function AlignIcon(props: { readonly align: 'left' | 'center' | 'right' }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {ALIGN_LINES[props.align].map(([x, y, width]) => (
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width={width}
          height="2"
          rx="1"
          fill="currentColor"
        />
      ))}
    </svg>
  )
}

export function FormatBar(props: FormatBarProps) {
  const { style, canFormat, onApply } = props
  const { t } = useI18n()

  const numberFormats: ReadonlyArray<{ readonly value: NumberFormat; readonly label: string }> = [
    { value: 'general', label: t('format.numberFormatGeneral') },
    { value: 'number', label: t('format.numberFormatNumber') },
    { value: 'percent', label: t('format.numberFormatPercent') },
    { value: 'currency', label: t('format.numberFormatCurrency') },
  ]

  const isLight =
    typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light'
  const defaultTextColor = isLight ? '#1f2937' : '#e7e8ea'
  const defaultBgColor = isLight ? '#ffffff' : '#202124'

  return (
    <div className="format-bar" role="toolbar" aria-label={t('format.toolbar')}>
      <select
        className="format-select format-font"
        aria-label={t('format.fontFamily')}
        value={style.fontFamily ?? DEFAULT_FONT}
        disabled={!canFormat}
        onChange={(event) =>
          onApply({
            fontFamily:
              event.target.value === DEFAULT_FONT || event.target.value === 'System default'
                ? undefined
                : event.target.value,
          })
        }
      >
        {FONT_FAMILIES.map((family) => (
          <option key={family} value={family}>
            {family}
          </option>
        ))}
      </select>

      <select
        className="format-select format-size"
        aria-label={t('format.fontSize')}
        value={String(style.fontSize ?? 11)}
        disabled={!canFormat}
        onChange={(event) => onApply({ fontSize: Number(event.target.value) })}
      >
        {FONT_SIZES.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>

      <span className="format-divider" aria-hidden="true" />

      <button
        type="button"
        className="format-toggle format-bold"
        aria-label={t('format.bold')}
        title={t('format.bold')}
        aria-pressed={style.bold === true}
        disabled={!canFormat}
        onClick={() => onApply({ bold: !(style.bold ?? false) })}
      >
        B
      </button>
      <button
        type="button"
        className="format-toggle format-italic"
        aria-label={t('format.italic')}
        title={t('format.italic')}
        aria-pressed={style.italic === true}
        disabled={!canFormat}
        onClick={() => onApply({ italic: !(style.italic ?? false) })}
      >
        I
      </button>
      <button
        type="button"
        className="format-toggle format-underline"
        aria-label={t('format.underline')}
        title={t('format.underline')}
        aria-pressed={style.underline === true}
        disabled={!canFormat}
        onClick={() => onApply({ underline: !(style.underline ?? false) })}
      >
        U
      </button>
      <button
        type="button"
        className="format-toggle format-strike"
        aria-label={t('format.strike')}
        title={t('format.strike')}
        aria-pressed={style.strikethrough === true}
        disabled={!canFormat}
        onClick={() => onApply({ strikethrough: !(style.strikethrough ?? false) })}
      >
        S
      </button>

      <span className="format-divider" aria-hidden="true" />

      <label className="format-color format-text-color" title={t('format.textColor')}>
        <span className="format-color-label" aria-hidden="true">
          A
        </span>
        <span className="format-color-swatch" aria-hidden="true" />
        <input
          type="color"
          aria-label={t('format.textColor')}
          value={style.textColor ?? defaultTextColor}
          disabled={!canFormat}
          onChange={(event) => onApply({ textColor: event.target.value })}
        />
      </label>
      <label className="format-color format-fill-color" title={t('format.fillColor')}>
        <span className="format-color-label" aria-hidden="true">
          {'\u25A7'}
        </span>
        <span className="format-color-swatch" aria-hidden="true" />
        <input
          type="color"
          aria-label={t('format.backgroundColor')}
          value={style.backgroundColor ?? defaultBgColor}
          disabled={!canFormat}
          onChange={(event) => onApply({ backgroundColor: event.target.value })}
        />
      </label>

      <span className="format-divider" aria-hidden="true" />

      <button
        type="button"
        className="format-toggle"
        aria-label={t('format.alignLeft')}
        title={t('format.alignLeft')}
        aria-pressed={style.align === 'left'}
        disabled={!canFormat}
        onClick={() => onApply({ align: 'left' })}
      >
        <AlignIcon align="left" />
      </button>
      <button
        type="button"
        className="format-toggle"
        aria-label={t('format.alignCenter')}
        title={t('format.alignCenter')}
        aria-pressed={style.align === 'center'}
        disabled={!canFormat}
        onClick={() => onApply({ align: 'center' })}
      >
        <AlignIcon align="center" />
      </button>
      <button
        type="button"
        className="format-toggle"
        aria-label={t('format.alignRight')}
        title={t('format.alignRight')}
        aria-pressed={style.align === 'right'}
        disabled={!canFormat}
        onClick={() => onApply({ align: 'right' })}
      >
        <AlignIcon align="right" />
      </button>

      <span className="format-divider" aria-hidden="true" />

      <select
        className="format-select format-number"
        aria-label={t('format.numberFormat')}
        value={style.numberFormat ?? 'general'}
        disabled={!canFormat}
        onChange={(event) => onApply({ numberFormat: event.target.value as NumberFormat })}
      >
        {numberFormats.map((format) => (
          <option key={format.value} value={format.value}>
            {format.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        className="format-toggle format-number-button"
        aria-label={t('format.numberFormatButton')}
        title={t('format.numberFormat')}
        aria-pressed={style.numberFormat === 'number'}
        disabled={!canFormat}
        onClick={() => onApply({ numberFormat: 'number', decimals: style.decimals ?? 2 })}
      >
        #
      </button>
      <button
        type="button"
        className="format-toggle format-number-button"
        aria-label={t('format.currencyButton')}
        title={t('format.currencyButton')}
        aria-pressed={style.numberFormat === 'currency'}
        disabled={!canFormat}
        onClick={() => onApply({ numberFormat: 'currency', decimals: style.decimals ?? 2 })}
      >
        $
      </button>
      <button
        type="button"
        className="format-toggle format-number-button"
        aria-label={t('format.percentButton')}
        title={t('format.percentButton')}
        aria-pressed={style.numberFormat === 'percent'}
        disabled={!canFormat}
        onClick={() => onApply({ numberFormat: 'percent', decimals: style.decimals ?? 0 })}
      >
        %
      </button>
      <button
        type="button"
        className="format-toggle format-number-button"
        aria-label={t('format.dateButton')}
        title={t('format.dateDeferred')}
        disabled
      >
        {'\u{1F4C5}'}
      </button>

      <span className="format-divider" aria-hidden="true" />

      <button
        type="button"
        className="format-toggle"
        aria-label={t('format.allBorders')}
        title={t('format.allBorders')}
        aria-pressed={style.border === 'all'}
        disabled={!canFormat}
        onClick={() => onApply({ border: 'all' })}
      >
        {'\u25A6'}
      </button>
      <button
        type="button"
        className="format-toggle"
        aria-label={t('format.noBorders')}
        title={t('format.noBorders')}
        aria-pressed={style.border === 'none'}
        disabled={!canFormat}
        onClick={() => onApply({ border: 'none' })}
      >
        {'\u25A1'}
      </button>
      <button
        type="button"
        className="format-toggle"
        aria-label={t('format.mergeCells')}
        title={t('format.mergeDeferred')}
        disabled
      >
        {'\u229E'}
      </button>
    </div>
  )
}
