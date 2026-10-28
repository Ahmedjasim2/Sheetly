import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { FormulaBar } from './FormulaBar'

describe('FormulaBar', () => {
  it('shows the selection label and commits on Enter', () => {
    const onCommit = vi.fn()
    render(<FormulaBar selectionLabel="A1" value="42" onCommit={onCommit} onCancel={vi.fn()} />)

    expect(screen.getByText('A1')).toBeInTheDocument()

    const input = screen.getByRole('textbox', { name: 'Formula bar' })
    expect(input).toHaveValue('42')

    fireEvent.change(input, { target: { value: '99' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onCommit).toHaveBeenCalledWith('99')
  })

  it('reverts on Escape and calls cancel', () => {
    const onCommit = vi.fn()
    const onCancel = vi.fn()
    render(
      <FormulaBar selectionLabel="B2" value="hello" onCommit={onCommit} onCancel={onCancel} />,
    )

    const input = screen.getByRole('textbox', { name: 'Formula bar' })
    fireEvent.change(input, { target: { value: 'changed' } })
    fireEvent.keyDown(input, { key: 'Escape' })

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(input).toHaveValue('hello')
    expect(onCommit).not.toHaveBeenCalled()
  })
})
