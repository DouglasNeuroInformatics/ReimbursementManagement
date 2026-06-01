import i18n from '../i18n'
import type { User } from '../types'
import type { ErrorCode, ValidationIssue } from './errorCodes'

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: ErrorCode | string,
    public readonly details?: Record<string, unknown> | { issues?: ValidationIssue[] },
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// Public auth endpoints — backend exempts these from the X-Requested-With check.
// Every other endpoint (including /api/auth/refresh, /api/auth/logout, and
// PATCH /api/auth/me) requires the CSRF header.
const NO_CSRF_PATHS = ['/api/auth/login', '/api/auth/register'] as const

// Endpoints where a 401 should NOT trigger a refresh-and-retry. /api/auth/refresh
// itself would loop; login/register 401s are credential failures, not session expiry.
const NO_REFRESH_RETRY_PATHS = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh'] as const

function _matchesPath(url: string, paths: readonly string[]): boolean {
  const path = url.split('?')[0]
  return paths.includes(path as typeof paths[number])
}

let _refreshPromise: Promise<boolean> | null = null

async function _doRefresh(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      credentials: 'include',
    })
    return res.ok
  } catch {
    return false
  }
}

function _buildHeaders(url: string, init: RequestInit): Record<string, string> {
  const headers: Record<string, string> = {}
  if (!_matchesPath(url, NO_CSRF_PATHS)) {
    headers['X-Requested-With'] = 'XMLHttpRequest'
  }
  if (init.body && typeof init.body === 'string') {
    headers['Content-Type'] = 'application/json'
  }
  // Tell the backend which locale to render fallback messages in.
  headers['Accept-Language'] = i18n.language || 'fr-CA'
  return headers
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = _buildHeaders(url, init)

  const res = await fetch(url, {
    ...init,
    headers: { ...headers, ...(init.headers as Record<string, string> | undefined) },
    credentials: 'include',
  })

  if (!res.ok) {
    if (res.status === 401 && !_matchesPath(url, NO_REFRESH_RETRY_PATHS)) {
      if (!_refreshPromise) {
        _refreshPromise = _doRefresh().finally(() => { _refreshPromise = null })
      }
      const refreshed = await _refreshPromise

      if (refreshed) {
        const retryRes = await fetch(url, {
          ...init,
          headers: { ...headers, ...(init.headers as Record<string, string> | undefined) },
          credentials: 'include',
        })
        if (retryRes.ok) {
          if (retryRes.status === 204) return undefined as T
          return retryRes.json() as Promise<T>
        }
      }
      window.location.href = '/login'
      throw new ApiError(401, 'Session expired', 'AUTH_REFRESH_TOKEN_EXPIRED')
    }
    let message = res.statusText
    let code: string | undefined
    let details: Record<string, unknown> | undefined
    try {
      const body = await res.json() as { error?: string; code?: string; details?: Record<string, unknown> }
      message = body.error ?? message
      code = body.code
      details = body.details
    } catch { /* ignore */ }
    throw new ApiError(res.status, message, code, details)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
  upload: <T>(url: string, formData: FormData) =>
    request<T>(url, { method: 'POST', body: formData }),
}

export function fetchUser(): Promise<User> {
  return api.get<{ user: User }>('/api/auth/me').then((r) => r.user)
}
