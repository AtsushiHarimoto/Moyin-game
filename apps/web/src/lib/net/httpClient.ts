// ---------------------------------------------------------------------------
// HTTP Client — lightweight fetch wrapper for use with React Query
// ---------------------------------------------------------------------------

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface RequestOptions {
  method?: HttpMethod
  headers?: Record<string, string>
  body?: unknown
  params?: Record<string, string>
  timeoutMs?: number
  signal?: AbortSignal
}

interface HttpResponse<T> {
  ok: boolean
  status: number
  data: T
}

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

export class HttpError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'HttpError'
    this.status = status
  }
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const TOKEN_STORAGE_KEY = 'moyin_api_token'
const DEFAULT_TIMEOUT_MS = 15_000

let baseUrl = ''

export function setBaseUrl(url: string): void {
  baseUrl = url.replace(/\/+$/, '')
}

// ---------------------------------------------------------------------------
// Core request function
// ---------------------------------------------------------------------------

export async function request<T = unknown>(
  url: string,
  options: RequestOptions = {},
): Promise<HttpResponse<T>> {
  const {
    method = 'GET',
    headers = {},
    body,
    params,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal: externalSignal,
  } = options

  // Build URL with query params
  const fullUrl = new URL(url, baseUrl || window.location.origin)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      fullUrl.searchParams.set(key, value)
    }
  }

  // Auth header
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)
  const mergedHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  }
  if (token) {
    mergedHeaders['Authorization'] = `Bearer ${token}`
  }

  // Timeout via AbortController
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  // Merge external signal
  const onExternalAbort = (): void => controller.abort()
  if (externalSignal) {
    externalSignal.addEventListener('abort', onExternalAbort)
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
  } finally {
    clearTimeout(timeoutId)
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort)
    }
  }

  const contentType = response.headers.get('content-type') ?? ''
  const data = contentType.includes('application/json')
    ? await response.json()
    : await response.text()

  if (!response.ok) {
    throw new HttpError(
      typeof data === 'string' ? data : (data as Record<string, string>).message ?? response.statusText,
      response.status,
    )
  }

  return { ok: true, status: response.status, data: data as T }
}

// ---------------------------------------------------------------------------
// Convenience methods
// ---------------------------------------------------------------------------

export function get<T = unknown>(url: string, params?: Record<string, string>, options?: RequestOptions): Promise<HttpResponse<T>> {
  return request<T>(url, { ...options, method: 'GET', params })
}

export function post<T = unknown>(url: string, body?: unknown, options?: RequestOptions): Promise<HttpResponse<T>> {
  return request<T>(url, { ...options, method: 'POST', body })
}

export function put<T = unknown>(url: string, body?: unknown, options?: RequestOptions): Promise<HttpResponse<T>> {
  return request<T>(url, { ...options, method: 'PUT', body })
}

export function patch<T = unknown>(url: string, body?: unknown, options?: RequestOptions): Promise<HttpResponse<T>> {
  return request<T>(url, { ...options, method: 'PATCH', body })
}

export function del<T = unknown>(url: string, options?: RequestOptions): Promise<HttpResponse<T>> {
  return request<T>(url, { ...options, method: 'DELETE' })
}
