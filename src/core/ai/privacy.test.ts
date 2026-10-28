import { describe, expect, it } from 'vitest'
import { isLocalEndpoint, privacyLabel, validateLocalEndpoint, blocksStrictLocal } from './privacy'

describe('isLocalEndpoint', () => {
  it('accepts explicit loopback hosts', () => {
    expect(isLocalEndpoint('http://localhost:11434')).toBe(true)
    expect(isLocalEndpoint('http://127.0.0.1:11434')).toBe(true)
    expect(isLocalEndpoint('http://[::1]:11434')).toBe(true)
    expect(isLocalEndpoint('https://localhost')).toBe(true)
  })

  it('rejects 0.0.0.0', () => {
    expect(isLocalEndpoint('http://0.0.0.0:11434')).toBe(false)
  })

  it('rejects .local and lookalike hostnames', () => {
    expect(isLocalEndpoint('http://mybox.local:11434')).toBe(false)
    expect(isLocalEndpoint('http://example.local:11434')).toBe(false)
    expect(isLocalEndpoint('http://localhost.example.com:11434')).toBe(false)
  })

  it('rejects private network addresses', () => {
    expect(isLocalEndpoint('http://192.168.1.50:11434')).toBe(false)
    expect(isLocalEndpoint('http://10.1.2.3:11434')).toBe(false)
    expect(isLocalEndpoint('http://172.16.5.5:11434')).toBe(false)
  })

  it('rejects external hosts', () => {
    expect(isLocalEndpoint('https://api.example.com')).toBe(false)
  })

  it('rejects invalid URLs and non-http protocols', () => {
    expect(isLocalEndpoint('')).toBe(false)
    expect(isLocalEndpoint('not a url')).toBe(false)
    expect(isLocalEndpoint('localhost:11434')).toBe(false)
    expect(isLocalEndpoint('ftp://localhost:11434')).toBe(false)
  })
})

describe('privacy helpers', () => {
  it('only claims data stays local for confirmed loopback', () => {
    expect(privacyLabel('disabled')).toBe('AI disabled')
    expect(privacyLabel('local', 'http://localhost:11434')).toBe(
      'Local AI — data stays on this device',
    )
    expect(privacyLabel('local', 'http://0.0.0.0:11434')).toBe(
      'Local AI — external endpoint (treated as Cloud)',
    )
    expect(privacyLabel('local', 'http://mybox.local:11434')).toContain('Cloud')
    expect(privacyLabel('local', 'http://192.168.1.50:11434')).toContain('Cloud')
  })

  it('flags non-loopback endpoints for strict local-only mode', () => {
    expect(validateLocalEndpoint('http://localhost:11434')).toBeNull()
    expect(validateLocalEndpoint('https://api.example.com')).not.toBeNull()
    expect(validateLocalEndpoint('http://[::1]:11434')).toBeNull()
    expect(blocksStrictLocal('https://api.example.com')).toBe(true)
    expect(blocksStrictLocal('http://0.0.0.0:11434')).toBe(true)
    expect(blocksStrictLocal('http://mybox.local:11434')).toBe(true)
    expect(blocksStrictLocal('http://localhost:11434')).toBe(false)
  })
})
