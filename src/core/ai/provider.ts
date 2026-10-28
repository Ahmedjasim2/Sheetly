import type {
  AIRequest,
  AIResponse,
  AIConfig,
  ConnectionResult,
  ModelInfo,
} from './types'
import { buildPrompt } from './actions'
import { validateLocalEndpoint } from './privacy'

export type FetchLike = (url: string | URL, init?: RequestInit) => Promise<Response>

export interface AIProvider {
  readonly id: string
  readonly name: string
  testConnection(): Promise<ConnectionResult>
  listModels?(): Promise<ModelInfo[]>
  generate(request: AIRequest): Promise<AIResponse>
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function fetchWithTimeout(
  fetchFn: FetchLike,
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetchFn(url, { ...init, signal: controller.signal })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('The request timed out.')
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

function baseUrl(endpoint: string): string {
  return endpoint.trim().replace(/\/+$/, '')
}

interface OllamaChatResponse {
  readonly message?: { readonly content?: unknown }
  readonly response?: unknown
}

class OllamaProvider implements AIProvider {
  readonly id = 'ollama'
  readonly name = 'Ollama (Local)'

  private readonly config: AIConfig
  private readonly fetchFn: FetchLike

  constructor(config: AIConfig, fetchFn: FetchLike) {
    this.config = config
    this.fetchFn = fetchFn
  }

  async testConnection(): Promise<ConnectionResult> {
    const localError = validateLocalEndpoint(this.config.endpoint)
    if (localError !== null) {
      return { ok: false, message: localError }
    }
    try {
      const response = await fetchWithTimeout(
        this.fetchFn,
        `${baseUrl(this.config.endpoint)}/api/version`,
        { method: 'GET' },
        this.config.timeoutMs,
      )
      if (!response.ok) {
        return { ok: false, message: `Ollama returned HTTP ${response.status}. Is Ollama running?` }
      }
      const models = await this.listModels()
      return { ok: true, message: 'Connected to Ollama.', models }
    } catch (error) {
      return { ok: false, message: `Could not reach Ollama: ${errorMessage(error)}` }
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    const response = await fetchWithTimeout(
      this.fetchFn,
      `${baseUrl(this.config.endpoint)}/api/tags`,
      { method: 'GET' },
      this.config.timeoutMs,
    )
    if (!response.ok) {
      return []
    }
    const data = (await response.json()) as { models?: unknown }
    if (!Array.isArray(data.models)) {
      return []
    }
    return data.models
      .map((model) => {
        if (typeof model === 'object' && model !== null && 'name' in model) {
          const name = (model as { name: unknown }).name
          return { name: typeof name === 'string' ? name : '' }
        }
        return { name: '' }
      })
      .filter((model) => model.name !== '')
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    const localError = validateLocalEndpoint(this.config.endpoint)
    if (localError !== null) {
      throw new Error(localError)
    }
    if (this.config.model === '') {
      throw new Error('No local model selected.')
    }

    const response = await fetchWithTimeout(
      this.fetchFn,
      `${baseUrl(this.config.endpoint)}/api/chat`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model,
          stream: false,
          messages: [{ role: 'user', content: buildPrompt(request) }],
        }),
      },
      this.config.timeoutMs,
    )

    if (!response.ok) {
      throw new Error(`Ollama returned HTTP ${response.status}.`)
    }

    const data = (await response.json()) as OllamaChatResponse
    const text = data.message?.content ?? data.response ?? ''
    if (typeof text !== 'string') {
      throw new Error('Ollama returned an unexpected response.')
    }
    return { text, plan: null, validationErrors: [] }
  }
}

/** Creates the provider for a config. Returns `null` for the disabled mode. */
export function createProvider(
  config: AIConfig,
  fetchFn: FetchLike = (url, init) => fetch(url, init),
): AIProvider | null {
  if (config.mode === 'local') {
    return new OllamaProvider(config, fetchFn)
  }
  return null
}
