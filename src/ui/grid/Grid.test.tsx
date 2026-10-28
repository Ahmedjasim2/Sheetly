import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { createSheet, setCellValue } from '../../core/model'
import type { Sheet } from '../../core/model'
import { Grid, type GridProps } from './Grid'

function makeSheet(): Sheet {
  return createSheet({ id: 's', name: 'Sheet', rowCount: 3, columnCount: 3 })
}

function renderGrid(overrides: Partial<GridProps> = {}): GridProps {
  const props: GridProps = {
    sheet: makeSheet(),
    selection: null,
    editing: false,
    draft: '',
    onSelect: vi.fn(),
    onExtendSelection: vi.fn(),
    onStartEditing: vi.fn(),
    onChangeDraft: vi.fn(),
    onCommit: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  }

  render(<Grid {...props} />)

  return props
}

describe('Grid', () => {
  it('renders column and row headers', () => {
    renderGrid()

    const columnHeaders = screen.getAllByRole('columnheader')
    expect(columnHeaders.map((header) => header.textContent)).toEqual(['A', 'B', 'C'])

    const rowHeaders = screen.getAllByRole('rowheader')
    expect(rowHeaders.map((header) => header.textContent)).toEqual(['1', '2', '3'])
  })

  it('renders cell values', () => {
    const sheet = setCellValue(makeSheet(), 0, 0, 'hi')
    renderGrid({ sheet })

    expect(screen.getByText('hi')).toBeInTheDocument()
  })

  it('selects a cell on mouse down', () => {
    const props = renderGrid()

    fireEvent.mouseDown(screen.getAllByRole('gridcell')[0])

    expect(props.onSelect).toHaveBeenCalledWith({ row: 0, column: 0 })
  })

  it('extends the selection while dragging', () => {
    const props = renderGrid()
    const cells = screen.getAllByRole('gridcell')

    fireEvent.mouseDown(cells[0])
    fireEvent.mouseEnter(cells[4])

    expect(props.onExtendSelection).toHaveBeenCalledWith({ row: 1, column: 1 })
  })

  it('extends the selection on shift+click', () => {
    const props = renderGrid()

    fireEvent.mouseDown(screen.getAllByRole('gridcell')[2], { shiftKey: true })

    expect(props.onExtendSelection).toHaveBeenCalledWith({ row: 0, column: 2 })
  })

  it('highlights every cell in the selected range and marks the focus cell', () => {
    renderGrid({ selection: { anchor: { row: 0, column: 0 }, focus: { row: 1, column: 1 } } })

    const cells = screen.getAllByRole('gridcell')
    const selected = cells.filter((cell) => cell.getAttribute('aria-selected') === 'true')

    expect(selected).toHaveLength(4)
    expect(cells[4]).toHaveClass('is-focus')
  })

  it('starts editing on double click', () => {
    const props = renderGrid()

    fireEvent.doubleClick(screen.getAllByRole('gridcell')[0])

    expect(props.onStartEditing).toHaveBeenCalled()
  })

  it('starts editing when Enter is pressed on the grid', () => {
    const props = renderGrid({ selection: { anchor: { row: 0, column: 0 }, focus: { row: 0, column: 0 } } })

    fireEvent.keyDown(screen.getByRole('grid'), { key: 'Enter' })

    expect(props.onStartEditing).toHaveBeenCalled()
  })

  it('moves the selection with arrow keys', () => {
    const props = renderGrid({ selection: { anchor: { row: 0, column: 0 }, focus: { row: 0, column: 0 } } })

    fireEvent.keyDown(screen.getByRole('grid'), { key: 'ArrowDown' })

    expect(props.onSelect).toHaveBeenCalledWith({ row: 1, column: 0 })
  })

  it('extends the selection with shift+arrow', () => {
    const props = renderGrid({ selection: { anchor: { row: 0, column: 0 }, focus: { row: 0, column: 0 } } })

    fireEvent.keyDown(screen.getByRole('grid'), { key: 'ArrowDown', shiftKey: true })

    expect(props.onExtendSelection).toHaveBeenCalledWith({ row: 1, column: 0 })
  })

  it('renders the draft inside the editing cell', () => {
    renderGrid({
      selection: { anchor: { row: 0, column: 0 }, focus: { row: 0, column: 0 } },
      editing: true,
      draft: '42',
    })

    expect(screen.getByRole('textbox', { name: 'Edit cell A1' })).toHaveValue('42')
  })

  it('forwards typing, Enter, and Escape from the editor', () => {
    const props = renderGrid({
      selection: { anchor: { row: 0, column: 0 }, focus: { row: 0, column: 0 } },
      editing: true,
      draft: '',
    })
    const input = screen.getByRole('textbox', { name: 'Edit cell A1' })

    fireEvent.change(input, { target: { value: '99' } })
    expect(props.onChangeDraft).toHaveBeenCalledWith('99')

    fireEvent.keyDown(input, { key: 'Enter' })
    expect(props.onCommit).toHaveBeenCalled()

    fireEvent.keyDown(input, { key: 'Escape' })
    expect(props.onCancel).toHaveBeenCalled()
  })
})
