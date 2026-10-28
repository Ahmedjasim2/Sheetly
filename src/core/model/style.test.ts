import { describe, expect, it } from 'vitest'
import { cellStyleKey, formatDisplayValue, mergeCellStyle } from './style'

describe('formatDisplayValue', () => {
  it('formats general values as before', () => {
    expect(formatDisplayValue('hello', undefined)).toBe('hello')
    expect(formatDisplayValue(42, undefined)).toBe('42')
    expect(formatDisplayValue(42, { numberFormat: 'general' })).toBe('42')
    expect(formatDisplayValue(null, { numberFormat: 'number' })).toBe('')
    expect(formatDisplayValue('text', { numberFormat: 'number' })).toBe('text')
  })

  it('formats numbers with decimals and grouping', () => {
    expect(formatDisplayValue(1234.5, { numberFormat: 'number', decimals: 2 })).toBe('1,234.50')
    expect(formatDisplayValue(1234.5, { numberFormat: 'number', decimals: 0 })).toBe('1,235')
  })

  it('formats percentages and currency', () => {
    expect(formatDisplayValue(0.25, { numberFormat: 'percent', decimals: 0 })).toBe('25%')
    expect(formatDisplayValue(12.5, { numberFormat: 'currency', decimals: 2 })).toBe('$12.50')
  })
})

describe('mergeCellStyle', () => {
  it('merges patches without mutating the base', () => {
    const base = { bold: true, align: 'left' as const }
    expect(mergeCellStyle(base, { italic: true })).toEqual({
      bold: true,
      align: 'left',
      italic: true,
    })
    expect(base).toEqual({ bold: true, align: 'left' })
  })
})

describe('cellStyleKey', () => {
  it('builds a stable key', () => {
    expect(cellStyleKey(0, 0)).toBe('0:0')
    expect(cellStyleKey(3, 5)).toBe('3:5')
  })
})
