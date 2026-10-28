import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { FindBar } from './FindBar'

function renderFindBar() {
  const props = {
    onFindNext: vi.fn(),
    onReplaceCurrent: vi.fn(),
    onReplaceAll: vi.fn(),
  }
  render(<FindBar {...props} />)
  return props
}

describe('FindBar', () => {
  it('renders the controls and disables buttons for an empty query', () => {
    renderFindBar()

    expect(screen.getByLabelText('Find text')).toBeInTheDocument()
    expect(screen.getByLabelText('Replace text')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Case sensitive' })).toBeChecked()
    expect(screen.getByRole('button', { name: 'Find next' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Replace current' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Replace all' })).toBeDisabled()
  })

  it('calls find next with the query and case sensitivity', () => {
    const props = renderFindBar()

    fireEvent.change(screen.getByLabelText('Find text'), { target: { value: 'apple' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Case sensitive' }))
    fireEvent.click(screen.getByRole('button', { name: 'Find next' }))

    expect(props.onFindNext).toHaveBeenCalledWith('apple', false)
  })

  it('calls replace current and replace all with replacement', () => {
    const props = renderFindBar()

    fireEvent.change(screen.getByLabelText('Find text'), { target: { value: 'apple' } })
    fireEvent.change(screen.getByLabelText('Replace text'), { target: { value: 'pear' } })

    fireEvent.click(screen.getByRole('button', { name: 'Replace current' }))
    expect(props.onReplaceCurrent).toHaveBeenCalledWith('apple', 'pear', true)

    fireEvent.click(screen.getByRole('button', { name: 'Replace all' }))
    expect(props.onReplaceAll).toHaveBeenCalledWith('apple', 'pear', true)
  })
})
