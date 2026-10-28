import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { createSheet, setCellValue } from '../../core/model'
import type { Sheet } from '../../core/model'
import type { AIProvider, ApplyOutcome } from '../../core/ai'
import { AiPanel } from './AiPanel'

function makeSheet(): Sheet {
  let sheet = createSheet({ id: 's', name: 'Sheet', rowCount: 3, columnCount: 1 })
  sheet = setCellValue(sheet, 0, 0, ' apple ')
  sheet = setCellValue(sheet, 1, 0, 'apple')
  return sheet
}

const SELECTION = { start: { row: 0, column: 0 }, end: { row: 2, column: 0 } }

function readyFactory(generate: AIProvider['generate']): () => AIProvider {
  return () => ({
    id: 'mock',
    name: 'Mock',
    testConnection: async () => ({ ok: true, message: 'ok' }),
    listModels: async () => [{ name: 'mock-model' }],
    generate,
  })
}

function renderPanel(options: {
  selection?: typeof SELECTION | null
  generate?: AIProvider['generate']
  ready?: boolean
  onApply?: (outcome: ApplyOutcome) => void
}) {
  const generate = options.generate ?? (async () => ({ text: 'answer', plan: null, validationErrors: [] }))
  const onApply = options.onApply ?? vi.fn()
  const ready = options.ready ?? true
  const factory = ready ? readyFactory(generate) : undefined
  const utils = render(
    <AiPanel
      sheet={makeSheet()}
      selection={options.selection === undefined ? SELECTION : options.selection}
      visibleRows={[0, 1, 2]}
      onApply={onApply}
      providerFactory={factory}
    />,
  )
  return { onApply, ...utils }
}

async function ask(text: string): Promise<void> {
  fireEvent.change(screen.getByLabelText('AI request'), { target: { value: text } })
  fireEvent.click(screen.getByRole('button', { name: 'Ask' }))
}

describe('AiPanel', () => {
  it('shows "Local AI is not ready" and disables Ask when no provider is set up', () => {
    const generate = vi.fn(async () => ({ text: 'x', plan: null, validationErrors: [] }))
    renderPanel({ ready: false, generate })

    expect(screen.getByText('Local AI is not ready')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ask' })).toBeDisabled()
    expect(generate).not.toHaveBeenCalled()
  })

  it('sends a request and shows the result when Local AI is ready', async () => {
    const generate = vi.fn(async () => ({ text: 'the max is 300', plan: null, validationErrors: [] }))
    renderPanel({ generate })

    await ask('What is the max?')

    expect(generate).toHaveBeenCalledTimes(1)
    expect((await screen.findAllByText('the max is 300')).length).toBeGreaterThan(0)
  })

  it('prompts to select a range first', async () => {
    const generate = vi.fn(async () => ({ text: 'x', plan: null, validationErrors: [] }))
    renderPanel({ selection: null, generate })

    await ask('hi')

    expect(generate).not.toHaveBeenCalled()
    expect(screen.getByText('Select a range first, then ask.')).toBeInTheDocument()
  })

  it('exposes no cloud fields (endpoint, model, API key)', () => {
    renderPanel({})

    expect(screen.queryByLabelText('AI endpoint')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Model name')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('API key')).not.toBeInTheDocument()
    expect(screen.queryByText(/Cloud/)).not.toBeInTheDocument()
  })

  it('previews a suggested action and applies it via the callback', async () => {
    const planText = JSON.stringify({
      summary: 'Trim the selected range',
      requiresConfirmation: true,
      actions: [
        {
          action: 'clean_text',
          range: { start: { row: 0, column: 0 }, end: { row: 2, column: 0 } },
          operation: 'trim',
        },
      ],
    })
    const generate = vi.fn(async () => ({ text: planText, plan: null, validationErrors: [] }))
    const { onApply } = renderPanel({ generate })

    fireEvent.change(screen.getByLabelText('AI operation'), { target: { value: 'suggest' } })
    await ask('trim this column')

    expect(await screen.findByText(/Clean text \(trim\)/)).toBeInTheDocument()
    expect(onApply).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(onApply).toHaveBeenCalledTimes(1)
  })

  it('cancels a suggested action without applying', async () => {
    const planText = JSON.stringify({
      summary: 'Sort',
      requiresConfirmation: true,
      actions: [
        {
          action: 'sort',
          range: { start: { row: 0, column: 0 }, end: { row: 2, column: 0 } },
          direction: 'ascending',
        },
      ],
    })
    const generate = vi.fn(async () => ({ text: planText, plan: null, validationErrors: [] }))
    const { onApply } = renderPanel({ generate })

    fireEvent.change(screen.getByLabelText('AI operation'), { target: { value: 'suggest' } })
    await ask('sort')

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }))

    expect(onApply).not.toHaveBeenCalled()
    expect(screen.queryByText(/Sort ascending/)).not.toBeInTheDocument()
  })
})
