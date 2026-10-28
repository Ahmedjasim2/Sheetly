import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { DedupePrompt } from './DedupePrompt'

describe('DedupePrompt', () => {
  it('shows the count and calls confirm/cancel handlers', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()

    render(<DedupePrompt removedRows={5} onConfirm={onConfirm} onCancel={onCancel} />)

    expect(screen.getByText(/Remove 5 duplicate rows/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Remove rows' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
