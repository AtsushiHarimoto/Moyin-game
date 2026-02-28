// ---------------------------------------------------------------------------
// @moyin/net-client — Fetch-based HTTP client (framework-agnostic)
// ---------------------------------------------------------------------------

import type { HttpMethod, NetClientConfig } from './types'
import { NetHttpError, NetTimeoutError, normalizeToNetError } from './errors'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DEFAULT_TIMEOUT_MS = 15_000

let config: NetClientConfig = {}

export function configure(c: NetClientConfig): void {
  config = { ...config, ...c }
}

export function getConfig(): Readonly<NetClientConfig> {
  return config
}

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------

export interface FetchOptions {
  method: HttpMethod
  url: string
  headers?: Record<string, string>
  body?: unknown
  params?: Record<string, unknown>
  timeoutMs?: number
  signal?: AbortSignal
  onDownloadProgress?: (loaded: number, total?: number) => void
}

export interface FetchResult<T = unknown> {
  ok: boolean
  status: number
  data: T
  headers: Headers
}

export async function fetchRequest<T = unknown>(opts: FetchOptions): Promise<FetchResult<T>> {
  const {
    method,
    url,
    headers = {},
    body,
    params,
    timeoutMs = config.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS,
    signal: externalSignal,
  } = opts

  // Build URL (guard empty base for Node.js/SSR)
  const base = config.baseUrl || (typeof window !== 'undefined' ? window.location.origin : '')
  const fullUrl = base ? new URL(url, base) : new URL(url)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value != null) fullUrl.searchParams.set(key, String(value))
    }
  }

  // Headers — only set Content-Type when there is a body
  const mergedHeaders: Record<string, string> = {
    ...config.defaultHeaders,
    ...headers,
  }
  if (body !== undefined && method !== 'GET') {
    mergedHeaders['Content-Type'] = mergedHeaders['Content-Type'] ?? 'application/json'
  }
  if (config.getAuthToken) {
    const token = await Promise.resolve(config.getAuthToken())
    if (token) mergedHeaders['Authorization'] = `Bearer ${token}`
  }

  // Timeout via AbortController
  const controller = new AbortController()
  let timedOut = false
  const timeoutId = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)

  // Merge external signal
  const onExternalAbort = (): void => controller.abort()
  if (externalSignal) {
    if (externalSignal.aborted) { controller.abort(); clearTimeout(timeoutId) }
    else externalSignal.addEventListener('abort', onExternalAbort)
  }

  const fetchInit: RequestInit = {
    method,
    headers: mergedHeaders,
    signal: controller.signal,
  }

  if (body !== undefined && method !== 'GET') {
    fetchInit.body = JSON.stringify(body)
  }

  let response: Response
  try {
    response = await fetch(fullUrl.toString(), fetchInit)
  } catch (err) {
    if (timedOut) throw new NetTimeoutError()
    throw normalizeToNetError(err)
  } finally {
    clearTimeout(timeoutId)
    externalSignal?.removeEventListener('abort', onExternalAbort)
  }

  let data: unknown
  try {
    const contentType = response.headers.get('content-type') ?? ''
    data = contentType.includes('application/json')
      ? await response.json()
      : await response.text()
  } catch {
    data = response.statusText
  }

  if (!response.ok) {
    throw new NetHttpError(
      typeof data === 'string' ? data : (data as Record<string, string>).message ?? response.statusText,
      response.status,
    )
  }

  return { ok: true, status: response.status, data: data as T, headers: response.headers }
}

// ---------------------------------------------------------------------------
// Convenience methods
// ---------------------------------------------------------------------------

export function get<T = unknown>(url: string, params?: Record<string, string>, opts?: Partial<FetchOptions>) {
  return fetchRequest<T>({ ...opts, method: 'GET', url, params })
}

export function post<T = unknown>(url: string, body?: unknown, opts?: Partial<FetchOptions>) {
  return fetchRequest<T>({ ...opts, method: 'POST', url, body })
}

export function put<T = unknown>(url: string, body?: unknown, opts?: Partial<FetchOptions>) {
  return fetchRequest<T>({ ...opts, method: 'PUT', url, body })
}

export function patch<T = unknown>(url: string, body?: unknown, opts?: Partial<FetchOptions>) {
  return fetchRequest<T>({ ...opts, method: 'PATCH', url, body })
}

export function del<T = unknown>(url: string, opts?: Partial<FetchOptions>) {
  return fetchRequest<T>({ ...opts, method: 'DELETE', url })
}
