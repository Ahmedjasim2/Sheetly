import { createRange } from '../model'
import type { Range } from '../model'
import type { ActionPlan, AllowedAction, PlanAction } from './types'

export interface ParseResult {
  readonly ok: boolean
  readonly plan?: ActionPlan
  readonly error?: string
}

const CALC_OPERATIONS = new Set(['sum', 'average', 'minimum', 'maximum', 'count'])
const CLEAN_OPERATIONS = new Set(['trim', 'collapse'])
const SORT_DIRECTIONS = new Set(['ascending', 'descending'])
const FILTER_OPERATORS = new Set([
  'equals',
  'not-equals',
  'contains',
  'not-contains',
  'empty',
  'not-empty',
  'greater-than',
  'greater-than-or-equal',
  'less-than',
  'less-than-or-equal',
])
const ALLOWED_ACTIONS = new Set<AllowedAction>([
  'calculate',
  'clean_text',
  'sort',
  'filter',
  'find_replace',
  'remove_duplicates',
])

const FORBIDDEN_PATTERN =
  /\b(fetch|curl|wget|XMLHttpRequest|eval|exec|spawn|child_process|require|import|http:\/\/|https:\/\/|\.then\s*\()\b/i

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasForbiddenIntent(value: string): boolean {
  return FORBIDDEN_PATTERN.test(value)
}

function parseIntPair(value: unknown): { row: number; column: number } | null {
  if (!isRecord(value)) {
    return null
  }
  const { row, column } = value
  if (typeof row !== 'number' || typeof column !== 'number') {
    return null
  }
  if (!Number.isInteger(row) || !Number.isInteger(column) || row < 0 || column < 0) {
    return null
  }
  return { row, column }
}

function parseRange(value: unknown): Range | null {
  if (!isRecord(value)) {
    return null
  }
  const start = parseIntPair(value.start)
  const end = parseIntPair(value.end)
  if (start === null || end === null) {
    return null
  }
  return createRange({ row: start.row, column: start.column }, { row: end.row, column: end.column })
}

function parseAction(value: unknown): { ok: boolean; action?: PlanAction; error?: string } {
  if (!isRecord(value)) {
    return { ok: false, error: 'Each action must be a JSON object.' }
  }

  const action = value.action
  if (typeof action !== 'string' || !ALLOWED_ACTIONS.has(action as AllowedAction)) {
    return { ok: false, error: `Unknown or missing action type: ${String(action)}.` }
  }

  const range = parseRange(value.range)
  if (range === null) {
    return { ok: false, error: `Action "${action}" has an invalid range.` }
  }

  switch (action as AllowedAction) {
    case 'calculate': {
      const operation = value.operation
      if (typeof operation !== 'string' || !CALC_OPERATIONS.has(operation)) {
        return { ok: false, error: 'calculate needs a valid "operation" (sum/average/minimum/maximum/count).' }
      }
      return { ok: true, action: { action: 'calculate', range, operation: operation as never } }
    }
    case 'clean_text': {
      const operation = value.operation
      if (typeof operation !== 'string' || !CLEAN_OPERATIONS.has(operation)) {
        return { ok: false, error: 'clean_text needs operation "trim" or "collapse".' }
      }
      return { ok: true, action: { action: 'clean_text', range, operation: operation as never } }
    }
    case 'sort': {
      const direction = value.direction
      if (typeof direction !== 'string' || !SORT_DIRECTIONS.has(direction)) {
        return { ok: false, error: 'sort needs direction "ascending" or "descending".' }
      }
      return { ok: true, action: { action: 'sort', range, direction: direction as never } }
    }
    case 'filter': {
      const operator = value.operator
      const filterValue = value.value
      if (typeof operator !== 'string' || !FILTER_OPERATORS.has(operator)) {
        return { ok: false, error: 'filter has an unknown operator.' }
      }
      if (typeof filterValue !== 'string') {
        return { ok: false, error: 'filter needs a string "value".' }
      }
      if (hasForbiddenIntent(filterValue)) {
        return { ok: false, error: 'filter value contains a forbidden network/command intent.' }
      }
      return {
        ok: true,
        action: { action: 'filter', range, operator: operator as never, value: filterValue },
      }
    }
    case 'find_replace': {
      const query = value.query
      const replacement = value.replacement
      const caseSensitive = value.caseSensitive
      if (typeof query !== 'string' || typeof replacement !== 'string') {
        return { ok: false, error: 'find_replace needs string "query" and "replacement".' }
      }
      if (typeof caseSensitive !== 'boolean') {
        return { ok: false, error: 'find_replace needs a boolean "caseSensitive".' }
      }
      return {
        ok: true,
        action: { action: 'find_replace', range, query, replacement, caseSensitive },
      }
    }
    case 'remove_duplicates':
      return { ok: true, action: { action: 'remove_duplicates', range } }
    default:
      return { ok: false, error: `Unknown action: ${String(action)}.` }
  }
}

/**
 * Parses the model's raw text into a validated `ActionPlan`. Rejects invalid
 * JSON, unknown actions, bad ranges, and any network/command intent.
 */
export function parseActionPlan(text: string): ParseResult {
  const trimmed = text.trim()
  let jsonText = trimmed
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  if (fence !== null) {
    jsonText = fence[1].trim()
  }

  let data: unknown
  try {
    data = JSON.parse(jsonText)
  } catch {
    return { ok: false, error: 'The model returned invalid JSON.' }
  }

  if (!isRecord(data)) {
    return { ok: false, error: 'The model response must be a JSON object.' }
  }

  const summary = typeof data.summary === 'string' ? data.summary : ''
  if (hasForbiddenIntent(summary)) {
    return { ok: false, error: 'The plan summary contains a forbidden network/command intent.' }
  }

  if (!Array.isArray(data.actions)) {
    return { ok: false, error: 'The plan has no "actions" array.' }
  }

  const actions: PlanAction[] = []
  for (const raw of data.actions) {
    const result = parseAction(raw)
    if (!result.ok || result.action === undefined) {
      return { ok: false, error: result.error ?? 'Invalid action.' }
    }
    actions.push(result.action)
  }

  if (actions.length === 0) {
    return { ok: false, error: 'The plan has no actions.' }
  }

  return {
    ok: true,
    plan: {
      summary,
      actions,
      requiresConfirmation: data.requiresConfirmation !== false,
    },
  }
}

function rangeWithin(inner: Range, outer: Range): boolean {
  return (
    inner.start.row >= outer.start.row &&
    inner.end.row <= outer.end.row &&
    inner.start.column >= outer.start.column &&
    inner.end.column <= outer.end.column
  )
}

/** Validates every action's range against the user's selection. */
export function validatePlan(plan: ActionPlan, selection: Range): readonly string[] {
  const errors: string[] = []
  for (const action of plan.actions) {
    if (!rangeWithin(action.range, selection)) {
      errors.push(
        `Action "${action.action}" targets ${rangeLabel(action.range)} which is outside the selected range.`,
      )
    }
  }
  return errors
}

function rangeLabel(range: Range): string {
  return `${range.start.row + 1}:${range.start.column + 1}..${range.end.row + 1}:${range.end.column + 1}`
}
