import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ImportPrompt } from './ImportPrompt'

describe('ImportPrompt', () => {
  it('shows the replace warning and filename', () => {
    render(<ImportPrompt filename="people.csv" onConfirm={vi.fn()} onCancel={vi.fn()} />)

    expect(screen.getByText(/Replace the current data with/)).toBeInTheDocument()
    expect(screen.getByText(/people\.csv/)).toBeInTheDocument()
  })

  it('calls the confirm and cancel handlers', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()

    render(<ImportPrompt filename="people.csv" onConfirm={onConfirm} onCancel={onCancel} />)

    fireEvent.click(screen.getByRole('button', { name: 'Replace data' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
