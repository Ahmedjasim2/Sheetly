import { describe, expect, it } from 'vitest'
import { parseActionPlan, validatePlan } from './validation'

const SELECTION = { start: { row: 0, column: 0 }, end: { row: 9, column: 4 } }

function planFor(text: string): ReturnType<typeof parseActionPlan> {
  return parseActionPlan(text)
}

describe('parseActionPlan', () => {
  it('parses a valid action plan', () => {
    const result = planFor(
      JSON.stringify({
        summary: 'Trim the selected range',
        requiresConfirmation: true,
        actions: [
          { action: 'clean_text', range: { start: { row: 0, column: 0 }, end: { row: 9, column: 0 } }, operation: 'trim' },
        ],
      }),
    )

    expect(result.ok).toBe(true)
    expect(result.plan?.actions).toHaveLength(1)
  })

  it('accepts a fenced JSON response', () => {
    const result = planFor(
      '```json\n' +
        JSON.stringify({
          summary: 'sort',
          actions: [{ action: 'sort', range: { start: { row: 0, column: 0 }, end: { row: 9, column: 0 } }, direction: 'ascending' }],
        }) +
        '\n```',
    )

    expect(result.ok).toBe(true)
  })

  it('rejects invalid JSON', () => {
    expect(planFor('not json').ok).toBe(false)
  })

  it('rejects an unknown action type', () => {
    const result = planFor(
      JSON.stringify({
        summary: 'x',
        actions: [{ action: 'run_code', range: { start: { row: 0, column: 0 }, end: { row: 1, column: 1 } } }],
      }),
    )

    expect(result.ok).toBe(false)
    expect(result.error).toContain('Unknown')
  })

  it('rejects a network/command intent in parameters', () => {
    const result = planFor(
      JSON.stringify({
        summary: 'x',
        actions: [{ action: 'filter', range: { start: { row: 0, column: 0 }, end: { row: 1, column: 0 } }, operator: 'equals', value: 'http://evil' }],
      }),
    )

    expect(result.ok).toBe(false)
  })

  it('allows plain data in find_replace even with a URL-like query', () => {
    const result = planFor(
      JSON.stringify({
        summary: 'x',
        actions: [{ action: 'find_replace', range: { start: { row: 0, column: 0 }, end: { row: 1, column: 0 } }, query: 'http://a', replacement: 'b', caseSensitive: false }],
      }),
    )

    expect(result.ok).toBe(true)
  })
})

describe('validatePlan', () => {
  it('rejects an action range outside the selection', () => {
    const parsed = parseActionPlan(
      JSON.stringify({
        summary: 'x',
        actions: [{ action: 'clean_text', range: { start: { row: 100, column: 0 }, end: { row: 101, column: 0 } }, operation: 'trim' }],
      }),
    )
    expect(parsed.ok).toBe(true)
    if (parsed.ok && parsed.plan) {
      expect(validatePlan(parsed.plan, SELECTION)).toHaveLength(1)
    }
  })

  it('accepts an action inside the selection', () => {
    const parsed = parseActionPlan(
      JSON.stringify({
        summary: 'x',
        actions: [{ action: 'sort', range: { start: { row: 1, column: 1 }, end: { row: 3, column: 1 } }, direction: 'ascending' }],
      }),
    )
    if (parsed.ok && parsed.plan) {
      expect(validatePlan(parsed.plan, SELECTION)).toHaveLength(0)
    }
  })
})
