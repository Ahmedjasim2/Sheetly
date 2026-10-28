import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { FormatBar } from './FormatBar'

describe('FormatBar', () => {
  it('emits style patches for bold, size, alignment, and number format', () => {
    const onApply = vi.fn()
    render(<FormatBar style={{}} canFormat onApply={onApply} />)

    fireEvent.click(screen.getByRole('button', { name: 'Bold' }))
    expect(onApply).toHaveBeenCalledWith({ bold: true })

    fireEvent.change(screen.getByLabelText('Font size'), { target: { value: '16' } })
    expect(onApply).toHaveBeenCalledWith({ fontSize: 16 })

    fireEvent.click(screen.getByRole('button', { name: 'Align center' }))
    expect(onApply).toHaveBeenCalledWith({ align: 'center' })

    fireEvent.change(screen.getByLabelText('Number format'), { target: { value: 'currency' } })
    expect(onApply).toHaveBeenCalledWith({ numberFormat: 'currency' })
  })

  it('reflects the active style and disables everything without a selection', () => {
    const { rerender } = render(
      <FormatBar style={{ bold: true, align: 'right' }} canFormat onApply={vi.fn()} />,
    )

    expect(screen.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Align right' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    rerender(<FormatBar style={{}} canFormat={false} onApply={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Bold' })).toBeDisabled()
    expect(screen.getByLabelText('Font family')).toBeDisabled()
  })
})
