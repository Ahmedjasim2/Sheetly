import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from './App'
import { INITIAL_SHEET_COLUMNS, INITIAL_SHEET_ROWS } from './config'

function cellIndex(row: number, column: number): number {
  return row * INITIAL_SHEET_COLUMNS + column
}

function gridCells(): HTMLElement[] {
  return screen.getAllByRole('gridcell')
}

function selectCell(index: number): void {
  fireEvent.mouseDown(screen.getAllByRole('gridcell')[index])
}

function typeIntoSelectedCell(value: string): void {
  fireEvent.keyDown(screen.getByRole('grid'), { key: 'Enter' })
  const input = screen.getByRole('textbox', { name: /^Edit cell / })
  fireEvent.change(input, { target: { value } })
  fireEvent.keyDown(input, { key: 'Enter' })
}

function applyFilter(operator: string, value: string): void {
  fireEvent.change(screen.getByLabelText('Filter condition'), { target: { value: operator } })
  fireEvent.change(screen.getByLabelText('Filter value'), { target: { value } })
  fireEvent.click(screen.getByRole('button', { name: 'Apply filter' }))
}

describe('App', () => {
  it('renders the app identity', () => {
    render(<App />)

    expect(screen.getByRole('heading', { level: 1, name: 'sheetly' })).toBeInTheDocument()
    expect(screen.queryByText(/Click-First Open Source Spreadsheet/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Zero Syntax Required/i)).not.toBeInTheDocument()
  })

  it('keeps unsaved changes when CSV export fails', async () => {
    const originalCreate = URL.createObjectURL
    URL.createObjectURL = vi.fn(() => {
      throw new Error('download unavailable')
    })

    try {
      render(<App />)
      selectCell(0)
      typeIntoSelectedCell('42')

      fireEvent.click(screen.getByRole('button', { name: 'File' }))
      fireEvent.click(screen.getByRole('menuitem', { name: 'Export CSV' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('Export failed')
      expect(screen.getAllByText('Unsaved changes').length).toBeGreaterThan(0)
    } finally {
      URL.createObjectURL = originalCreate
    }
  })

  it('renders the grid and the editing toolbar', () => {
    render(<App />)

    expect(screen.getByRole('grid', { name: 'Spreadsheet grid' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Redo' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Import CSV' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Export CSV' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Import XLSX' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Export XLSX' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save CSV' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save XLSX' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add row' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete row' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add column' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete column' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sort ascending' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sort descending' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Trim spaces' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Collapse spaces' })).toBeInTheDocument()
    expect(screen.getByLabelText('Filter condition')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apply filter' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear filter' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Find and replace' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Find next' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Replace current' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Replace all' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove duplicate rows' })).toBeInTheDocument()
  })

  it('keeps file operations together in the File menu and prints from there', () => {
    const print = vi.fn()
    const originalPrint = window.print
    const inputClick = vi.spyOn(HTMLInputElement.prototype, 'click')
    window.print = print

    try {
      render(<App />)
      fireEvent.click(screen.getByRole('button', { name: 'File' }))

      expect(screen.getByRole('menuitem', { name: 'New' })).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: 'Print' })).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: /Import CSV/ })).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: /Import XLSX/ })).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: 'Export CSV' })).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: /Export XLSX/ })).toBeInTheDocument()

      fireEvent.click(screen.getByRole('menuitem', { name: /Import CSV/ }))
      expect(inputClick).toHaveBeenCalledTimes(1)
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'File' }))
      fireEvent.click(screen.getByRole('menuitem', { name: /Import XLSX/ }))
      expect(inputClick).toHaveBeenCalledTimes(2)
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'File' }))
      fireEvent.click(screen.getByRole('menuitem', { name: 'Print' }))

      expect(print).toHaveBeenCalledTimes(1)
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    } finally {
      window.print = originalPrint
      inputClick.mockRestore()
    }
  })

  it('shows the format scope in the Help panel', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Help' }))
    fireEvent.click(screen.getByRole('menuitem', { name: /About sheetly/ }))

    expect(screen.getByText(/CSV and XLSX \(values only\)/i)).toBeInTheDocument()
  })

  it('selects a single cell and shows its address', () => {
    render(<App />)

    selectCell(0)

    expect(screen.getAllByRole('gridcell')[0]).toHaveAttribute('aria-selected', 'true')
    expect(screen.getAllByText('A1').length).toBeGreaterThan(0)
  })

  it('selects a range and shows its label', () => {
    render(<App />)

    selectCell(0)
    fireEvent.mouseDown(screen.getAllByRole('gridcell')[cellIndex(1, 1)], { shiftKey: true })

    expect(screen.getAllByText('A1:B2').length).toBeGreaterThan(0)
    const selected = screen
      .getAllByRole('gridcell')
      .filter((cell) => cell.getAttribute('aria-selected') === 'true')
    expect(selected).toHaveLength(4)
  })

  it('edits a cell and saves the value', () => {
    render(<App />)

    selectCell(0)
    typeIntoSelectedCell('42')

    expect(gridCells()[0]).toHaveTextContent('42')
  })

  it('adds and deletes a row', () => {
    render(<App />)

    expect(screen.getAllByRole('rowheader')).toHaveLength(INITIAL_SHEET_ROWS)

    fireEvent.click(screen.getByRole('button', { name: 'Add row' }))
    expect(screen.getAllByRole('rowheader')).toHaveLength(INITIAL_SHEET_ROWS + 1)

    fireEvent.click(screen.getByRole('button', { name: 'Delete row' }))
    expect(screen.getAllByRole('rowheader')).toHaveLength(INITIAL_SHEET_ROWS)
  })

  it('adds and deletes a column', () => {
    render(<App />)

    expect(screen.getAllByRole('columnheader')).toHaveLength(INITIAL_SHEET_COLUMNS)

    fireEvent.click(screen.getByRole('button', { name: 'Add column' }))
    expect(screen.getAllByRole('columnheader')).toHaveLength(INITIAL_SHEET_COLUMNS + 1)

    fireEvent.click(screen.getByRole('button', { name: 'Delete column' }))
    expect(screen.getAllByRole('columnheader')).toHaveLength(INITIAL_SHEET_COLUMNS)
  })

  it('copies and pastes with Ctrl+C and Ctrl+V', () => {
    render(<App />)

    selectCell(0)
    typeIntoSelectedCell('42')

    fireEvent.keyDown(window, { key: 'c', ctrlKey: true })
    selectCell(cellIndex(0, 4))
    fireEvent.keyDown(window, { key: 'v', ctrlKey: true })

    expect(gridCells()[0]).toHaveTextContent('42')
    expect(gridCells()[cellIndex(0, 4)]).toHaveTextContent('42')
  })

  it('disables Calculate without a selection and enables it after', () => {
    render(<App />)

    expect(screen.getByRole('button', { name: 'Sum' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Average' })).toBeDisabled()

    selectCell(0)

    expect(screen.getByRole('button', { name: 'Sum' })).toBeEnabled()
  })

  it('calculates the sum of the selected range', () => {
    render(<App />)

    selectCell(0)
    typeIntoSelectedCell('1')
    selectCell(1)
    typeIntoSelectedCell('2')
    selectCell(2)
    typeIntoSelectedCell('3')

    selectCell(0)
    fireEvent.mouseDown(screen.getAllByRole('gridcell')[2], { shiftKey: true })

    fireEvent.click(screen.getByRole('button', { name: 'Sum' }))

    const strip = screen.getByLabelText('Calculation results')
    expect(strip).toHaveTextContent(/Sum.*6/)
  })

  it('shows a clear message when the selection has no numbers', () => {
    render(<App />)

    selectCell(0)
    typeIntoSelectedCell('hello')
    selectCell(0)

    fireEvent.click(screen.getByRole('button', { name: 'Sum' }))

    const strip = screen.getByLabelText('Calculation results')
    expect(strip).toHaveTextContent('No numeric values in selection')
  })

  it('does not change cell values after a calculation', () => {
    render(<App />)

    selectCell(0)
    typeIntoSelectedCell('1')
    selectCell(1)
    typeIntoSelectedCell('2')

    selectCell(0)
    fireEvent.mouseDown(screen.getAllByRole('gridcell')[1], { shiftKey: true })

    fireEvent.click(screen.getByRole('button', { name: 'Sum' }))

    const strip = screen.getByLabelText('Calculation results')
    expect(strip).toHaveTextContent(/Sum.*3/)

    const cells = screen.getAllByRole('gridcell')
    expect(cells[0]).toHaveTextContent('1')
    expect(cells[1]).toHaveTextContent('2')
  })

  it('disables undo and redo when there is no history', () => {
    render(<App />)

    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled()
  })

  it('undoes and redoes a cell edit with the toolbar buttons', () => {
    render(<App />)

    selectCell(0)
    typeIntoSelectedCell('42')
    expect(gridCells()[0]).toHaveTextContent('42')

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))

    expect(gridCells()[0]).not.toHaveTextContent('42')
    expect(screen.getByRole('button', { name: 'Redo' })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: 'Redo' }))

    expect(gridCells()[0]).toHaveTextContent('42')
  })

  it('supports Ctrl+Z and Ctrl+Y keyboard shortcuts', () => {
    render(<App />)

    selectCell(0)
    typeIntoSelectedCell('42')

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    expect(gridCells()[0]).not.toHaveTextContent('42')

    fireEvent.keyDown(window, { key: 'y', ctrlKey: true })
    expect(gridCells()[0]).toHaveTextContent('42')
  })

  it('undoes and redoes a CSV import', async () => {
    render(<App />)

    const file = new File(['name,age\nAli,30\n'], 'people.csv', { type: 'text/csv' })
    fireEvent.change(screen.getByLabelText('Import CSV file'), { target: { files: [file] } })

    await screen.findByText(/Replace the current data with/, {}, { timeout: 5000 })
    fireEvent.click(screen.getByRole('button', { name: 'Replace data' }))

    expect(screen.getByText('Ali')).toBeInTheDocument()
    expect(screen.getAllByRole('rowheader')).toHaveLength(2)

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))

    expect(screen.queryByText('Ali')).not.toBeInTheDocument()
    expect(screen.getAllByRole('rowheader')).toHaveLength(INITIAL_SHEET_ROWS)

    fireEvent.click(screen.getByRole('button', { name: 'Redo' }))

    expect(screen.getByText('Ali')).toBeInTheDocument()
    expect(screen.getAllByRole('rowheader')).toHaveLength(2)
  })

  it('clears redo history when a new edit happens after undo', () => {
    render(<App />)

    selectCell(0)
    typeIntoSelectedCell('42')
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))

    expect(screen.getByRole('button', { name: 'Redo' })).toBeEnabled()

    typeIntoSelectedCell('99')

    expect(screen.getAllByText('99').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled()
  })

  it('imports a CSV file after confirming the replace warning', async () => {
    render(<App />)

    const file = new File(['name,age\nAli,30\n'], 'people.csv', { type: 'text/csv' })
    fireEvent.change(screen.getByLabelText('Import CSV file'), { target: { files: [file] } })

    expect(await screen.findByText(/Replace the current data with/, {}, { timeout: 5000 })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Replace data' }))

    expect(screen.getByText('Ali')).toBeInTheDocument()
    expect(screen.getAllByRole('rowheader')).toHaveLength(2)
  })

  it('shows an error message for an invalid CSV file', async () => {
    render(<App />)

    const file = new File(['"unterminated\nx'], 'bad.csv', { type: 'text/csv' })
    fireEvent.change(screen.getByLabelText('Import CSV file'), { target: { files: [file] } })

    expect(await screen.findByRole('alert', {}, { timeout: 5000 })).toHaveTextContent(
      /Unterminated quoted field/,
    )
  })

  it('sorts a column ascending with the toolbar button', () => {
    render(<App />)

    selectCell(0)
    typeIntoSelectedCell('3')
    selectCell(cellIndex(1, 0))
    typeIntoSelectedCell('1')
    selectCell(cellIndex(2, 0))
    typeIntoSelectedCell('2')

    selectCell(0)
    fireEvent.click(screen.getByRole('button', { name: 'Sort ascending' }))

    const cells = gridCells()
    expect(cells[0]).toHaveTextContent('1')
    expect(cells[cellIndex(1, 0)]).toHaveTextContent('2')
    expect(cells[cellIndex(2, 0)]).toHaveTextContent('3')
  })

  it('shows a message when sorting without a selection', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Sort ascending' }))

    expect(screen.getByRole('status')).toHaveTextContent(/Select a cell or range to sort|Ready/i)
  })

  it('filters rows by the active column', () => {
    render(<App />)

    selectCell(0)
    typeIntoSelectedCell('apple')
    selectCell(cellIndex(1, 0))
    typeIntoSelectedCell('banana')
    selectCell(cellIndex(2, 0))
    typeIntoSelectedCell('apple')

    selectCell(0)
    applyFilter('equals', 'apple')

    expect(screen.getAllByRole('rowheader').map((header) => header.textContent)).toEqual([
      '1',
      '3',
    ])
    expect(screen.getByText(/Filter active:/)).toHaveTextContent(
      `2 of ${INITIAL_SHEET_ROWS} rows`,
    )
  })

  it('clears the filter and restores all rows', () => {
    render(<App />)

    selectCell(0)
    typeIntoSelectedCell('apple')
    selectCell(cellIndex(1, 0))
    typeIntoSelectedCell('banana')
    selectCell(cellIndex(2, 0))
    typeIntoSelectedCell('apple')

    selectCell(0)
    applyFilter('equals', 'apple')
    expect(screen.getAllByRole('rowheader')).toHaveLength(2)

    fireEvent.click(screen.getByRole('button', { name: 'Clear filter' }))

    expect(screen.getAllByRole('rowheader')).toHaveLength(INITIAL_SHEET_ROWS)
    expect(screen.queryByText(/Filter active:/)).not.toBeInTheDocument()
  })

  it('shows no rows when nothing matches', () => {
    render(<App />)

    selectCell(0)
    typeIntoSelectedCell('apple')
    selectCell(0)
    applyFilter('equals', 'zzz')

    expect(screen.queryAllByRole('rowheader')).toHaveLength(0)
    expect(screen.getByText(/Filter active:/)).toHaveTextContent(`0 of ${INITIAL_SHEET_ROWS} rows`)
  })

  it('recomputes visible rows when a filtered cell changes', () => {
    render(<App />)

    selectCell(0)
    typeIntoSelectedCell('apple')
    selectCell(cellIndex(1, 0))
    typeIntoSelectedCell('banana')
    selectCell(cellIndex(2, 0))
    typeIntoSelectedCell('apple')

    selectCell(0)
    applyFilter('equals', 'apple')
    expect(screen.getAllByRole('rowheader')).toHaveLength(2)

    selectCell(0)
    typeIntoSelectedCell('banana')

    expect(screen.getAllByRole('rowheader').map((header) => header.textContent)).toEqual(['3'])
  })

  it('trims spaces in the selected cell', () => {
    render(<App />)

    selectCell(0)
    typeIntoSelectedCell('  hello  ')
    selectCell(0)
    fireEvent.click(screen.getByRole('button', { name: 'Trim spaces' }))

    expect(screen.getByText('hello')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Cleaned 1 cell')
  })

  it('collapses repeated spaces', () => {
    render(<App />)

    selectCell(0)
    typeIntoSelectedCell('a   b')
    selectCell(0)
    fireEvent.click(screen.getByRole('button', { name: 'Collapse spaces' }))

    expect(screen.getByText('a b')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Cleaned 1 cell')
  })

  it('shows zero when there is nothing to clean', () => {
    render(<App />)

    selectCell(0)
    typeIntoSelectedCell('clean')
    selectCell(0)
    fireEvent.click(screen.getByRole('button', { name: 'Trim spaces' }))

    expect(screen.getByRole('status')).toHaveTextContent('Cleaned 0 cells')
  })

  it('finds and replaces the current match', () => {
    render(<App />)

    selectCell(0)
    typeIntoSelectedCell('apple')
    selectCell(cellIndex(1, 0))
    typeIntoSelectedCell('apple pie')

    selectCell(0)
    fireEvent.mouseDown(screen.getAllByRole('gridcell')[cellIndex(1, 0)], { shiftKey: true })

    fireEvent.change(screen.getByLabelText('Find text'), { target: { value: 'apple' } })
    fireEvent.click(screen.getByRole('button', { name: 'Find next' }))
    expect(screen.getByRole('status')).toHaveTextContent('Match 1 of 2')

    fireEvent.change(screen.getByLabelText('Replace text'), { target: { value: 'pear' } })
    fireEvent.click(screen.getByRole('button', { name: 'Replace current' }))

    expect(gridCells()[0]).toHaveTextContent('pear')
    expect(screen.getByRole('status')).toHaveTextContent('Replaced 1 cell')
  })

  it('replaces all matches in the selection', () => {
    render(<App />)

    selectCell(0)
    typeIntoSelectedCell('apple')
    selectCell(cellIndex(1, 0))
    typeIntoSelectedCell('apple pie')
    selectCell(cellIndex(2, 0))
    typeIntoSelectedCell('banana')

    selectCell(0)
    fireEvent.mouseDown(screen.getAllByRole('gridcell')[cellIndex(2, 0)], { shiftKey: true })

    fireEvent.change(screen.getByLabelText('Find text'), { target: { value: 'apple' } })
    fireEvent.change(screen.getByLabelText('Replace text'), { target: { value: 'pear' } })
    fireEvent.click(screen.getByRole('button', { name: 'Replace all' }))

    expect(screen.getByRole('status')).toHaveTextContent('Replaced 2 cells')
    expect(gridCells()[0]).toHaveTextContent('pear')
    expect(gridCells()[cellIndex(1, 0)]).toHaveTextContent('pear')
    expect(gridCells()[cellIndex(2, 0)]).toHaveTextContent('banana')
  })

  it('removes duplicate rows in the selected range', () => {
    render(<App />)

    selectCell(0)
    typeIntoSelectedCell('a')
    selectCell(cellIndex(1, 0))
    typeIntoSelectedCell('a')
    selectCell(cellIndex(2, 0))
    typeIntoSelectedCell('b')

    selectCell(0)
    fireEvent.mouseDown(screen.getAllByRole('gridcell')[cellIndex(2, 0)], { shiftKey: true })

    fireEvent.click(screen.getByRole('button', { name: 'Remove duplicate rows' }))

    expect(screen.getByRole('status')).toHaveTextContent('Removed 1 duplicate row')
    expect(screen.getAllByRole('rowheader')).toHaveLength(INITIAL_SHEET_ROWS - 1)
  })

  it('shows the unsaved-changes indicator and clears it after export', () => {
    const createObjectURL = vi.fn(() => 'blob:mock')
    const revokeObjectURL = vi.fn()
    const originalCreate = URL.createObjectURL
    const originalRevoke = URL.revokeObjectURL
    URL.createObjectURL = createObjectURL
    URL.revokeObjectURL = revokeObjectURL
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    try {
      render(<App />)

      expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument()

      selectCell(0)
      typeIntoSelectedCell('42')
      expect(screen.getAllByText('Unsaved changes').length).toBeGreaterThan(0)

      fireEvent.click(screen.getByRole('button', { name: 'File' }))
      fireEvent.click(screen.getByRole('menuitem', { name: 'Export CSV' }))
      expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument()
    } finally {
      URL.createObjectURL = originalCreate
      URL.revokeObjectURL = originalRevoke
      click.mockRestore()
    }
  })

  it('warns before unloading when there are unsaved changes', () => {
    render(<App />)

    const cleanEvent = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(cleanEvent)
    expect(cleanEvent.defaultPrevented).toBe(false)

    selectCell(0)
    typeIntoSelectedCell('42')

    const dirtyEvent = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(dirtyEvent)
    expect(dirtyEvent.defaultPrevented).toBe(true)
  })

  it('confirms before removing many duplicate rows', () => {
    render(<App />)

    for (let row = 0; row < 6; row += 1) {
      selectCell(row * INITIAL_SHEET_COLUMNS)
      typeIntoSelectedCell('a')
    }

    selectCell(0)
    fireEvent.mouseDown(screen.getAllByRole('gridcell')[cellIndex(5, 0)], { shiftKey: true })
    fireEvent.click(screen.getByRole('button', { name: 'Remove duplicate rows' }))

    expect(screen.getByText(/Remove 5 duplicate rows/)).toBeInTheDocument()
    expect(screen.getAllByRole('rowheader')).toHaveLength(INITIAL_SHEET_ROWS)

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getAllByRole('rowheader')).toHaveLength(INITIAL_SHEET_ROWS)

    fireEvent.click(screen.getByRole('button', { name: 'Remove duplicate rows' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove rows' }))
    expect(screen.getAllByRole('rowheader')).toHaveLength(INITIAL_SHEET_ROWS - 5)
  }, 60000)

  it('applies formatting from the format bar', () => {
    render(<App />)

    selectCell(0)
    fireEvent.click(screen.getByRole('button', { name: 'Bold' }))

    expect(gridCells()[0]).toHaveStyle({ fontWeight: '700' })
  })

  it('edits the active cell from the formula bar', () => {
    render(<App />)

    selectCell(0)
    const input = screen.getByRole('textbox', { name: 'Formula bar' })
    fireEvent.change(input, { target: { value: 'hello' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(gridCells()[0]).toHaveTextContent('hello')
  })

  it('adds and switches sheets from the sheet tabs', () => {
    render(<App />)

    expect(screen.getByRole('tab', { name: 'Quarterly Sales' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Add sheet' }))
    expect(screen.getByRole('tab', { name: 'Sheet 1' })).toHaveAttribute('aria-selected', 'true')

    selectCell(0)
    typeIntoSelectedCell('second')

    fireEvent.click(screen.getByRole('tab', { name: 'Quarterly Sales' }))
    expect(gridCells()[0]).not.toHaveTextContent('second')

    fireEvent.click(screen.getByRole('tab', { name: 'Sheet 1' }))
    expect(gridCells()[0]).toHaveTextContent('second')
  })

  it('does not show automatic calculations in the result strip', () => {
    render(<App />)

    selectCell(0)
    typeIntoSelectedCell('1')
    selectCell(cellIndex(1, 0))
    typeIntoSelectedCell('2')

    selectCell(0)
    fireEvent.mouseDown(gridCells()[cellIndex(1, 0)], { shiftKey: true })

    const strip = screen.getByLabelText('Calculation results')
    expect(strip).not.toHaveTextContent('Count')
    expect(strip).not.toHaveTextContent('Sum')
  })

  it.each([
    ['Sum', '6'],
    ['Average', '2'],
    ['Count', '3'],
    ['Minimum', '1'],
    ['Maximum', '3'],
  ])('shows only the explicitly selected %s result', (operation, result) => {
    render(<App />)

    for (const [index, value] of ['1', '2', '3'].entries()) {
      selectCell(index)
      typeIntoSelectedCell(value)
    }
    selectCell(0)
    fireEvent.mouseDown(gridCells()[2], { shiftKey: true })
    fireEvent.click(screen.getByRole('button', { name: operation }))

    const strip = screen.getByLabelText('Calculation results')
    expect(strip).toHaveTextContent(new RegExp(`${operation}:\\s*${result}`))
    for (const other of ['Sum', 'Average', 'Count', 'Minimum', 'Maximum']) {
      if (other !== operation) {
        expect(strip).not.toHaveTextContent(new RegExp(`${other}:`))
      }
    }
  })

  it('clears a calculation result after the selection or cell data changes', () => {
    render(<App />)

    selectCell(0)
    typeIntoSelectedCell('2')
    selectCell(1)
    typeIntoSelectedCell('3')
    selectCell(0)
    fireEvent.mouseDown(gridCells()[1], { shiftKey: true })
    fireEvent.click(screen.getByRole('button', { name: 'Sum' }))
    expect(screen.getByLabelText('Calculation results')).toHaveTextContent(/Sum:\s*5/)

    selectCell(2)
    expect(screen.getByLabelText('Calculation results')).not.toHaveTextContent('Sum')

    selectCell(0)
    fireEvent.click(screen.getByRole('button', { name: 'Sum' }))
    typeIntoSelectedCell('9')
    expect(screen.getByLabelText('Calculation results')).not.toHaveTextContent('Sum')
  })

  it('clears calculations on sheet changes and keeps them out of the status bar', () => {
    render(<App />)

    selectCell(0)
    typeIntoSelectedCell('8')
    selectCell(0)
    fireEvent.click(screen.getByRole('button', { name: 'Sum' }))
    expect(screen.getByLabelText('Calculation results')).toHaveTextContent(/Sum:\s*8/)
    expect(screen.getByRole('contentinfo')).not.toHaveTextContent(/Sum|Average|Count/)

    fireEvent.click(screen.getByRole('button', { name: 'Add sheet' }))
    expect(screen.queryByLabelText('Calculation results')).not.toBeInTheDocument()
  })

  it('focuses the find bar with Ctrl+F', () => {
    render(<App />)

    selectCell(0)
    fireEvent.keyDown(window, { key: 'f', ctrlKey: true })

    expect(document.activeElement).toBe(screen.getByLabelText('Find text'))
  })

  it('clears the selected cell with Delete', () => {
    render(<App />)

    selectCell(0)
    typeIntoSelectedCell('42')

    fireEvent.keyDown(window, { key: 'Delete' })

    expect(gridCells()[0]).not.toHaveTextContent('42')
  })

  it('zooms the grid with the status bar controls', () => {
    render(<App />)

    expect(screen.getByRole('button', { name: 'Reset zoom' })).toHaveTextContent('100%')

    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    expect(screen.getByRole('button', { name: 'Reset zoom' })).toHaveTextContent('110%')
  })

  it('toggles sidebar and opens Sheetly AI', () => {
    render(<App />)

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Sheetly AI' }))
    expect(screen.getByRole('complementary')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ask' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))

    // Open help via menu
    fireEvent.click(screen.getByRole('button', { name: 'Help' }))
    fireEvent.click(screen.getByRole('menuitem', { name: /About sheetly/i }))

    expect(screen.getByRole('complementary')).toBeInTheDocument()

    // Switch to Sheetly AI panel
    fireEvent.click(screen.getAllByRole('button', { name: 'Sheetly AI' })[1])
    expect(screen.getByRole('button', { name: 'Ask' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Styles' })).not.toBeInTheDocument()

    // Close sidebar
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('exports the sheet as a CSV download', () => {
    const createObjectURL = vi.fn(() => 'blob:mock')
    const revokeObjectURL = vi.fn()
    const originalCreate = URL.createObjectURL
    const originalRevoke = URL.revokeObjectURL
    URL.createObjectURL = createObjectURL
    URL.revokeObjectURL = revokeObjectURL

    let download = ''
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        download = this.download
      })

    try {
      render(<App />)
      fireEvent.click(screen.getByRole('button', { name: 'File' }))
      fireEvent.click(screen.getByRole('menuitem', { name: 'Export CSV' }))

      expect(createObjectURL).toHaveBeenCalledTimes(1)
      expect(click).toHaveBeenCalledTimes(1)
      expect(download).toBe('sheetly.csv')
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock')
    } finally {
      URL.createObjectURL = originalCreate
      URL.revokeObjectURL = originalRevoke
      click.mockRestore()
    }
  })

  it('exports the active sheet as XLSX from the File menu', async () => {
    const createObjectURL = vi.fn(() => 'blob:xlsx')
    const originalCreate = URL.createObjectURL
    const originalRevoke = URL.revokeObjectURL
    URL.createObjectURL = createObjectURL
    URL.revokeObjectURL = vi.fn()

    let download = ''
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        download = this.download
      })

    try {
      render(<App />)
      selectCell(0)
      typeIntoSelectedCell('42')
      expect(screen.getAllByText('Unsaved changes').length).toBeGreaterThan(0)

      fireEvent.click(screen.getByRole('button', { name: 'File' }))
      fireEvent.click(screen.getByRole('menuitem', { name: /Export XLSX/ }))

      await waitFor(() => {
        expect(screen.queryAllByText('Unsaved changes')).toHaveLength(0)
      }, { timeout: 10000 })
      expect(createObjectURL).toHaveBeenCalledTimes(1)
      expect(download).toBe('sheetly.xlsx')
    } finally {
      URL.createObjectURL = originalCreate
      URL.revokeObjectURL = originalRevoke
      click.mockRestore()
    }
  })

  it('switches themes and languages without reloading and sets document direction', () => {
    localStorage.removeItem('sheetly-theme')
    localStorage.removeItem('sheetly-lang')
    render(<App />)

    fireEvent.click(screen.getByTestId('theme-toggle'))
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    fireEvent.click(screen.getByTestId('theme-toggle'))
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')

    fireEvent.click(screen.getByTestId('lang-toggle'))
    expect(document.documentElement).toHaveAttribute('lang', 'ar')
    expect(document.documentElement).toHaveAttribute('dir', 'rtl')
    expect(screen.getByRole('button', { name: 'ذكاء Sheetly الاصطناعي' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'ذكاء Sheetly الاصطناعي' }))
    expect(screen.getByText('الذكاء الاصطناعي المحلي غير جاهز')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'ملف' }))
    expect(screen.getByRole('menuitem', { name: 'طباعة' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'تصدير CSV' })).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('lang-toggle'))
    expect(document.documentElement).toHaveAttribute('lang', 'en')
    expect(document.documentElement).toHaveAttribute('dir', 'ltr')
  })
})
