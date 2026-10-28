import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { createSheet } from '../../core/model'
import { SheetTabs } from './SheetTabs'

const SHEETS = [
  createSheet({ id: 's1', name: 'Sheet 1', rowCount: 3, columnCount: 2 }),
  createSheet({ id: 's2', name: 'Sheet 2', rowCount: 3, columnCount: 2 }),
]

function renderTabs(overrides: Partial<Parameters<typeof SheetTabs>[0]> = {}) {
  const props = {
    sheets: SHEETS,
    activeId: 's1',
    onSelect: vi.fn(),
    onAdd: vi.fn(),
    onRename: vi.fn(),
    ...overrides,
  }
  return { props, ...render(<SheetTabs {...props} />) }
}

describe('SheetTabs', () => {
  it('renders tabs, selects a sheet, and adds a sheet', () => {
    const { props } = renderTabs()

    expect(screen.getByRole('tab', { name: 'Sheet 1' })).toHaveAttribute('aria-selected', 'true')

    fireEvent.click(screen.getByRole('tab', { name: 'Sheet 2' }))
    expect(props.onSelect).toHaveBeenCalledWith('s2')

    fireEvent.click(screen.getByRole('button', { name: 'Add sheet' }))
    expect(props.onAdd).toHaveBeenCalledTimes(1)
  })

  it('navigates between sheets', () => {
    const { props, rerender } = renderTabs()

    expect(screen.getByRole('button', { name: 'First sheet' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Previous sheet' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Next sheet' }))
    expect(props.onSelect).toHaveBeenCalledWith('s2')

    fireEvent.click(screen.getByRole('button', { name: 'Last sheet' }))
    expect(props.onSelect).toHaveBeenCalledWith('s2')

    rerender(<SheetTabs {...props} activeId="s2" />)

    expect(screen.getByRole('button', { name: 'Next sheet' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Previous sheet' })).toBeEnabled()
  })

  it('renames a tab on double-click and Enter', () => {
    const { props } = renderTabs()

    fireEvent.doubleClick(screen.getByRole('tab', { name: 'Sheet 1' }))
    const input = screen.getByRole('textbox', { name: 'Rename Sheet 1' })

    fireEvent.change(input, { target: { value: 'Budget' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(props.onRename).toHaveBeenCalledWith('s1', 'Budget')
  })
})
