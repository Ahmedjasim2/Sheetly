import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { FilterBar } from './FilterBar'

describe('FilterBar', () => {
  it('renders the filter controls', () => {
    render(
      <FilterBar
        activeColumn={0}
        filter={null}
        visibleCount={3}
        totalRows={3}
        onApply={vi.fn()}
        onClear={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Filter condition')).toBeInTheDocument()
    expect(screen.getByLabelText('Filter value')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apply filter' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear filter' })).toBeDisabled()
  })

  it('applies the chosen operator and value', () => {
    const onApply = vi.fn()
    render(
      <FilterBar
        activeColumn={1}
        filter={null}
        visibleCount={3}
        totalRows={3}
        onApply={onApply}
        onClear={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByLabelText('Filter condition'), {
      target: { value: 'contains' },
    })
    fireEvent.change(screen.getByLabelText('Filter value'), { target: { value: 'an' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply filter' }))

    expect(onApply).toHaveBeenCalledWith('contains', 'an')
  })

  it('disables the value input for empty operators', () => {
    render(
      <FilterBar
        activeColumn={0}
        filter={null}
        visibleCount={3}
        totalRows={3}
        onApply={vi.fn()}
        onClear={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByLabelText('Filter condition'), {
      target: { value: 'empty' },
    })

    expect(screen.getByLabelText('Filter value')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Apply filter' })).toBeEnabled()
  })

  it('shows the active filter indicator and clears it', () => {
    const onClear = vi.fn()
    render(
      <FilterBar
        activeColumn={0}
        filter={{ column: 0, operator: 'equals', value: 'apple' }}
        visibleCount={2}
        totalRows={10}
        onApply={vi.fn()}
        onClear={onClear}
      />,
    )

    expect(screen.getByText(/Filter active:/)).toHaveTextContent('2 of 10 rows')

    fireEvent.click(screen.getByRole('button', { name: 'Clear filter' }))
    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it('disables Apply when there is no active column', () => {
    render(
      <FilterBar
        activeColumn={null}
        filter={null}
        visibleCount={3}
        totalRows={3}
        onApply={vi.fn()}
        onClear={vi.fn()}
      />,
    )

    expect(screen.getByText('Select a cell to filter')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apply filter' })).toBeDisabled()
  })
})
