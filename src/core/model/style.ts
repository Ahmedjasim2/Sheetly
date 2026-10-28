import { formatCellValue } from './input'
import type { CellValue } from './types'

export type NumberFormat = 'general' | 'number' | 'percent' | 'currency'
export type HorizontalAlign = 'left' | 'center' | 'right'
export type VerticalAlign = 'top' | 'middle' | 'bottom'
export type BorderStyle = 'none' | 'all'

/**
 * Presentation-only cell formatting. It is deliberately separate from
 * `CellValue`: formatting never changes the stored value and is not saved to
 * CSV or XLSX yet.
 */
export interface CellStyle {
  readonly fontFamily?: string
  readonly fontSize?: number
  readonly bold?: boolean
  readonly italic?: boolean
  readonly underline?: boolean
  readonly strikethrough?: boolean
  readonly textColor?: string
  readonly backgroundColor?: string
  readonly align?: HorizontalAlign
  readonly verticalAlign?: VerticalAlign
  readonly wrap?: boolean
  readonly numberFormat?: NumberFormat
  readonly decimals?: number
  readonly border?: BorderStyle
}

export const EMPTY_CELL_STYLE: CellStyle = {}

/** Stable style-map key for a zero-based cell coordinate. */
export function cellStyleKey(row: number, column: number): string {
  return `${row}:${column}`
}

export function mergeCellStyle(base: CellStyle, patch: CellStyle): CellStyle {
  return { ...base, ...patch }
}

function clampDecimals(decimals: number): number {
  return Math.max(0, Math.min(10, Math.round(decimals)))
}

function formatNumber(value: number, decimals: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Formats a value for display using the cell's number format. This affects the
 * rendered text only; stored values never change.
 */
export function formatDisplayValue(value: CellValue, style: CellStyle | undefined): string {
  if (value === null) {
    return ''
  }

  const format = style?.numberFormat ?? 'general'
  if (typeof value !== 'number' || format === 'general') {
    return formatCellValue(value)
  }

  const decimals = clampDecimals(style?.decimals ?? 2)

  switch (format) {
    case 'number':
      return formatNumber(value, decimals)
    case 'percent':
      return `${formatNumber(value * 100, decimals)}%`
    case 'currency':
      return `$${formatNumber(value, decimals)}`
    default:
      return formatCellValue(value)
  }
}
