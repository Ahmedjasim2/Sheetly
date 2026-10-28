import { describe, expect, it } from 'vitest'
import { formatCellValue, parseCellInput } from './input'

describe('formatCellValue', () => {
  it('formats null as an empty string', () => {
    expect(formatCellValue(null)).toBe('')
  })

  it('formats booleans as words', () => {
    expect(formatCellValue(true)).toBe('true')
    expect(formatCellValue(false)).toBe('false')
  })

  it('formats numbers and strings plainly', () => {
    expect(formatCellValue(0)).toBe('0')
    expect(formatCellValue(42)).toBe('42')
    expect(formatCellValue('')).toBe('')
    expect(formatCellValue('hello')).toBe('hello')
  })
})

describe('parseCellInput', () => {
  it('clears the cell for empty or whitespace-only input', () => {
    expect(parseCellInput('')).toBeNull()
    expect(parseCellInput('   ')).toBeNull()
  })

  it('parses finite decimal numbers', () => {
    expect(parseCellInput('42')).toBe(42)
    expect(parseCellInput('-3.5')).toBe(-3.5)
    expect(parseCellInput('1e3')).toBe(1000)
    expect(parseCellInput('0')).toBe(0)
    expect(parseCellInput('.5')).toBe(0.5)
  })

  it('keeps non-numeric input as the original string', () => {
    expect(parseCellInput('hello')).toBe('hello')
    expect(parseCellInput('12abc')).toBe('12abc')
    expect(parseCellInput('0x10')).toBe('0x10')
    expect(parseCellInput('true')).toBe('true')
    expect(parseCellInput('  keep spaces  ')).toBe('  keep spaces  ')
  })
})
