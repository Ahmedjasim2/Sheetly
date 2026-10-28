import type { CalculationName } from '../calc'
import type { CleanOperation } from '../clean'
import type { FilterOperator } from '../filter'
import type { SortDirection } from '../sort'
import type { CellValue, Range } from '../model'

export type AIMode = 'disabled' | 'local'

export type AIOperation = 'explain' | 'suggest' | 'ask'

/** The only actions the AI may produce in the first release. */
export type AllowedAction =
  | 'calculate'
  | 'clean_text'
  | 'sort'
  | 'filter'
  | 'find_replace'
  | 'remove_duplicates'

export const DEFAULT_OLLAMA_ENDPOINT = 'http://localhost:11434'
export const DEFAULT_TIMEOUT_MS = 20000

export interface AIConfig {
  readonly mode: AIMode
  readonly endpoint: string
  readonly model: string
  readonly timeoutMs: number
  readonly strictLocalOnly: boolean
}

export function defaultConfig(mode: AIMode): AIConfig {
  return {
    mode,
    endpoint: mode === 'local' ? DEFAULT_OLLAMA_ENDPOINT : '',
    model: '',
    timeoutMs: DEFAULT_TIMEOUT_MS,
    strictLocalOnly: false,
  }
}

export interface ModelInfo {
  readonly name: string
}

export interface ConnectionResult {
  readonly ok: boolean
  readonly message: string
  readonly models?: readonly ModelInfo[]
}

export interface SelectionContext {
  /** Human-readable range label, e.g. `A2:E7`. */
  readonly rangeLabel: string
  /** Normalized range that produced this context (for validation). */
  readonly range: Range
  readonly rowCount: number
  readonly columnCount: number
  readonly cellCount: number
  readonly columns: readonly string[]
  /** Detected header labels, or `null`. */
  readonly header: readonly string[] | null
  readonly rows: readonly (readonly CellValue[])[]
  readonly truncated: boolean
  readonly warnings: readonly string[]
}

export interface AIRequest {
  readonly operation: AIOperation
  readonly userText: string
  readonly context: SelectionContext
  readonly config: AIConfig
}

export interface AIResponse {
  readonly text: string
  readonly plan: ActionPlan | null
  readonly validationErrors: readonly string[]
}

export interface ActionPlan {
  readonly summary: string
  readonly actions: readonly PlanAction[]
  readonly requiresConfirmation: boolean
}

export type PlanAction =
  | { readonly action: 'calculate'; readonly range: Range; readonly operation: CalculationName }
  | { readonly action: 'clean_text'; readonly range: Range; readonly operation: CleanOperation }
  | { readonly action: 'sort'; readonly range: Range; readonly direction: SortDirection }
  | {
      readonly action: 'filter'
      readonly range: Range
      readonly operator: FilterOperator
      readonly value: string
    }
  | {
      readonly action: 'find_replace'
      readonly range: Range
      readonly query: string
      readonly replacement: string
      readonly caseSensitive: boolean
    }
  | { readonly action: 'remove_duplicates'; readonly range: Range }
