import type { AIMode } from './types'

/**
 * Endpoints that are guaranteed to be loopback. Anything else (including
 * `0.0.0.0`, private network ranges, and `.local`/`.localhost` names) is
 * treated as external so the UI never over-claims that data stays local.
 */
const LOOPBACK_HOSTS: ReadonlySet<string> = new Set(['localhost', '127.0.0.1', '::1'])

function parseHttpUrl(endpoint: string): URL | null {
  const trimmed = endpoint.trim()
  if (trimmed === '') {
    return null
  }

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return null
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return null
  }

  return url
}

/**
 * True only for explicit loopback endpoints:
 * `localhost`, `127.0.0.1`, or `::1` (including `http://[::1]:port`).
 */
export function isLocalEndpoint(endpoint: string): boolean {
  const url = parseHttpUrl(endpoint)
  if (url === null) {
    return false
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  return LOOPBACK_HOSTS.has(hostname)
}

/** Returns an error message when a Local AI endpoint is not actually loopback. */
export function validateLocalEndpoint(endpoint: string): string | null {
  if (isLocalEndpoint(endpoint)) {
    return null
  }
  return `The endpoint "${endpoint}" is not a loopback address (localhost, 127.0.0.1, or ::1); treat it as a Cloud/External provider.`
}

/** Short privacy indicator shown in the UI, avoiding absolute claims. */
export function privacyLabel(mode: AIMode, endpoint = ''): string {
  if (mode === 'local') {
    return isLocalEndpoint(endpoint)
      ? 'Local AI — data stays on this device'
      : 'Local AI — external endpoint (treated as Cloud)'
  }
  return 'AI disabled'
}

/** True when a strict local-only mode must block a non-loopback endpoint. */
export function blocksStrictLocal(endpoint: string): boolean {
  return !isLocalEndpoint(endpoint)
}
