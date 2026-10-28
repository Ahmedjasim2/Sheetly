import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MenuBar } from './MenuBar'
import type { MenuDefinition } from './MenuBar'

function menus(onNew: () => void): readonly MenuDefinition[] {
  return [
    {
      id: 'file',
      label: 'File',
      items: [
        { id: 'new', label: 'New workbook', onSelect: onNew },
        { id: 'deferred', label: 'Open recent', disabled: true, hint: 'Deferred' },
      ],
    },
    { id: 'help', label: 'Help', items: [{ id: 'about', label: 'About', onSelect: vi.fn() }] },
  ]
}

describe('MenuBar', () => {
  it('opens a menu, runs a command, and closes', () => {
    const onNew = vi.fn()
    render(<MenuBar menus={menus(onNew)} />)

    fireEvent.click(screen.getByRole('button', { name: 'File' }))
    expect(screen.getByRole('menu', { name: 'File' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('menuitem', { name: /New workbook/ }))

    expect(onNew).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('marks deferred items as disabled', () => {
    render(<MenuBar menus={menus(vi.fn())} />)

    fireEvent.click(screen.getByRole('button', { name: 'File' }))

    expect(screen.getByRole('menuitem', { name: /Open recent/ })).toBeDisabled()
  })

  it('closes on Escape', () => {
    render(<MenuBar menus={menus(vi.fn())} />)

    fireEvent.click(screen.getByRole('button', { name: 'File' }))
    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})
