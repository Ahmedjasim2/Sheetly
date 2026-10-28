import type { CalculationName } from '../calc'
import { cleanRange } from '../clean'
import type { CleanOperation } from '../clean'
import { replaceInRange } from '../find'
import { removeDuplicateRows } from '../dedupe'
import { sortRowsByColumn } from '../sort'
import type { SortDirection } from '../sort'
import type { FilterOperator } from '../filter'
import { createRange, columnLabel } from '../model'
import type { Sheet } from '../model'
import type { AIRequest, PlanAction } from './types'
import { contextToText } from './context'

export type ApplyOutcome =
  | { readonly kind: 'sheet'; readonly sheet: Sheet; readonly notice: string }
  | { readonly kind: 'calculate'; readonly operation: CalculationName; readonly notice: string }
  | {
      readonly kind: 'filter'
      readonly column: number
      readonly operator: FilterOperator
      readonly value: string
      readonly notice: string
    }

/** Composes the model prompt from the operation, user request, and context. */
export function buildPrompt(request: AIRequest): string {
  const data = contextToText(request.context)

  let instruction: string
  switch (request.operation) {
    case 'explain':
      instruction =
        'Explain the following selection of spreadsheet data in plain, simple language. Do not modify anything.'
      break
    case 'suggest':
      instruction =
        'Suggest an action plan for the user request below. Respond with ONLY a JSON object of the form ' +
        '{"summary": string, "requiresConfirmation": true, "actions": [...]}. ' +
        'Each action must use exactly one of these types with these fields:\n' +
        '- {"action":"calculate","range":{"start":{"row":0,"column":0},"end":{"row":0,"column":0}},"operation":"sum"}\n' +
        '- {"action":"clean_text","range":{...},"operation":"trim"}\n' +
        '- {"action":"sort","range":{...},"direction":"ascending"}\n' +
        '- {"action":"filter","range":{...},"operator":"equals","value":"x"}\n' +
        '- {"action":"find_replace","range":{...},"query":"x","replacement":"y","caseSensitive":false}\n' +
        '- {"action":"remove_duplicates","range":{...}}\n' +
        'Ranges are zero-based and must stay inside the selection. Do not output anything except JSON.'
      break
    default:
      instruction =
        'Answer the user question below using ONLY the provided data. If the data is insufficient, say so. ' +
        'State that this is an assistive analysis and not a guarantee of correctness.'
  }

  return `${instruction}\n\nUser request: ${request.userText}\n\nSelected data:\n${data}`
}

/** Applies one validated plan action using existing core operations only. */
export function applyPlanAction(sheet: Sheet, action: PlanAction): ApplyOutcome {
  switch (action.action) {
    case 'clean_text': {
      const result = cleanRange(sheet, action.range, action.operation)
      return {
        kind: 'sheet',
        sheet: result.sheet,
        notice: `AI: cleaned ${result.changedCells} cell(s)`,
      }
    }
    case 'sort': {
      const range = createRange(action.range.start, action.range.end)
      const next = sortRowsByColumn(
        sheet,
        range.start.column,
        range.start.row,
        range.end.row,
        action.direction,
      )
      return {
        kind: 'sheet',
        sheet: next,
        notice: `AI: sorted rows ${range.start.row + 1}..${range.end.row + 1} by column ${columnLabel(range.start.column)}`,
      }
    }
    case 'remove_duplicates': {
      const result = removeDuplicateRows(sheet, action.range)
      return {
        kind: 'sheet',
        sheet: result.sheet,
        notice: `AI: removed ${result.removedRows} duplicate row(s)`,
      }
    }
    case 'find_replace': {
      const result = replaceInRange(
        sheet,
        action.range,
        action.query,
        action.replacement,
        action.caseSensitive,
        true,
      )
      return {
        kind: 'sheet',
        sheet: result.sheet,
        notice: `AI: replaced in ${result.changedCells} cell(s)`,
      }
    }
    case 'calculate':
      return { kind: 'calculate', operation: action.operation, notice: '' }
    case 'filter': {
      const range = createRange(action.range.start, action.range.end)
      return {
        kind: 'filter',
        column: range.start.column,
        operator: action.operator,
        value: action.value,
        notice: 'AI: filter applied',
      }
    }
  }
}

/** Human-readable summary of an action, used by the preview. */
export function describeAction(action: PlanAction): string {
  const label = (range: PlanAction['range']): string => {
    const a = `${columnLabel(range.start.column)}${range.start.row + 1}`
    const b = `${columnLabel(range.end.column)}${range.end.row + 1}`
    return a === b ? a : `${a}:${b}`
  }

  switch (action.action) {
    case 'calculate':
      return `Calculate ${action.operation} on ${label(action.range)}`
    case 'clean_text':
      return `Clean text (${action.operation}) on ${label(action.range)}`
    case 'sort':
      return `Sort ${action.direction} on ${label(action.range)}`
    case 'filter':
      return `Filter ${label(action.range)} by ${action.operator} "${action.value}"`
    case 'find_replace':
      return `Replace "${action.query}" → "${action.replacement}" on ${label(action.range)}`
    case 'remove_duplicates':
      return `Remove duplicate rows on ${label(action.range)}`
  }
}

export type { CleanOperation, SortDirection }
