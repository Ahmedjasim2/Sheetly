import { parseActionPlan, validatePlan } from './validation'
import type { AIRequest, AIResponse } from './types'

export * from './types'
export * from './privacy'
export * from './context'
export * from './validation'
export * from './actions'
export * from './provider'

/**
 * Turns a provider's raw text into an `AIResponse`. For `suggest` requests it
 * parses and validates the action plan against the user's selection.
 */
export function interpretResponse(request: AIRequest, text: string): AIResponse {
  if (request.operation !== 'suggest') {
    return { text, plan: null, validationErrors: [] }
  }

  const result = parseActionPlan(text)
  if (!result.ok || result.plan === undefined) {
    return { text, plan: null, validationErrors: [result.error ?? 'The plan is invalid.'] }
  }

  const errors = validatePlan(result.plan, request.context.range)
  if (errors.length > 0) {
    return { text: result.plan.summary, plan: null, validationErrors: errors }
  }

  return { text: result.plan.summary, plan: result.plan, validationErrors: [] }
}
