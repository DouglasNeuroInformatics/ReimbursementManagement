import type { User } from '../types'

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

let _refreshPromise: Promise<boolean> | null = null

async function _doRefresh(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })
    return res.ok
  } catch {
    return false
  }
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {}
  
  // Don't send CSRF header on auth endpoints (login/register/refresh)
  if (!url.includes('/api/auth/') && !url.includes('/api/auth')) {
    headers['X-Requested-With'] = 'XMLHttpRequest'
  }
  
  if (init.body && typeof init.body === 'string') {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(url, {
    ...init,
    headers: { ...headers, ...(init.headers as Record<string, string> | undefined) },
    credentials: 'include',
  })

  if (!res.ok) {
    if (res.status === 401 && !url.includes('/api/auth/')) {
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
      throw new ApiError(401, 'Session expired')
    }
    let message = res.statusText
    try {
      const body = await res.json()
      message = (body as { error?: string }).error ?? message
    } catch { /* ignore */ }
    throw new ApiError(res.status, message)
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
