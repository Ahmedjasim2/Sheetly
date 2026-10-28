import { describe, expect, it } from 'vitest'
import type { AIRequest, AIConfig } from './types'
import { createProvider } from './provider'
import type { FetchLike } from './provider'

function config(overrides: Partial<AIConfig>): AIConfig {
  return {
    mode: 'local',
    endpoint: 'http://localhost:11434',
    model: 'llama3',
    timeoutMs: 5000,
    strictLocalOnly: false,
    ...overrides,
  }
}

function request(): AIRequest {
  return {
    operation: 'ask',
    userText: 'What is the max?',
    config: config({}),
    context: {
      rangeLabel: 'A1:A3',
      range: { start: { row: 0, column: 0 }, end: { row: 2, column: 0 } },
      rowCount: 3,
      columnCount: 1,
      cellCount: 3,
      columns: ['A'],
      header: null,
      rows: [['x'], ['y'], ['z']],
      truncated: false,
      warnings: [],
    },
  }
}

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response
}

describe('OllamaProvider', () => {
  it('generates via the local /api/chat endpoint', async () => {
    const calls: { url: string; init?: RequestInit }[] = []
    const fetchFn: FetchLike = async (url, init) => {
      calls.push({ url: String(url), init })
      return jsonResponse({ message: { content: 'The maximum is z.' } })
    }

    const provider = createProvider(config({}), fetchFn)!
    const response = await provider.generate(request())

    expect(response.text).toBe('The maximum is z.')
    expect(calls[0]?.url).toBe('http://localhost:11434/api/chat')
  })

  it('testConnection returns a clear message when Ollama is not running', async () => {
    const fetchFn: FetchLike = async () => {
      throw new Error('ECONNREFUSED')
    }

    const provider = createProvider(config({}), fetchFn)!
    const result = await provider.testConnection()

    expect(result.ok).toBe(false)
    expect(result.message).toContain('Could not reach Ollama')
  })

  it('times out with a clear error', async () => {
    const fetchFn: FetchLike = async () => {
      const error = new Error('aborted') as Error & { name: string }
      error.name = 'AbortError'
      throw error
    }

    const provider = createProvider(config({}), fetchFn)!
    await expect(provider.generate(request())).rejects.toThrow('timed out')
  })

  it('blocks a non-local endpoint', async () => {
    const provider = createProvider(config({ endpoint: 'https://api.example.com' }), async () =>
      jsonResponse({}),
    )!

    await expect(provider.generate(request())).rejects.toThrow('not a loopback address')
  })
})
