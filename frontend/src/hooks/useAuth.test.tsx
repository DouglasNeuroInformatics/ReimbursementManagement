import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { createWrapper, renderHook, waitFor } from '../test/renderWithProviders'
import { server } from '../test/server'
import { mockUser } from '../test/handlers'
import { useAuth } from './useAuth'

// useAuth reads window.location during logout / failed-session redirects.
// Each test that touches it installs a stub and this restores the original.
let restoreLocation: (() => void) | null = null

function stubLocation() {
  const original = window.location
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { href: 'http://localhost/', origin: 'http://localhost' },
  })
  restoreLocation = () =>
    Object.defineProperty(window, 'location', { configurable: true, value: original })
}

afterEach(() => {
  restoreLocation?.()
  restoreLocation = null
})

describe('useAuth', () => {
  it('reports authenticated when /api/auth/me returns a user', async () => {
    server.use(http.get('/api/auth/me', () => HttpResponse.json({ user: mockUser({ id: 'u9' }) })))
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => expect(result.current.isAuthenticated).toBe(true))
    expect(result.current.user?.id).toBe('u9')
  })

  it('reports unauthenticated when the session cannot be established', async () => {
    // 401 on /api/auth/me triggers the api wrapper's refresh-and-retry; with
    // refresh also failing the query rejects and the wrapper redirects.
    stubLocation()
    server.use(
      http.get('/api/auth/me', () => new HttpResponse(null, { status: 401 })),
      http.post('/api/auth/refresh', () => new HttpResponse(null, { status: 401 })),
    )
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeUndefined()
  })

  it('logout clears the query cache and redirects to /login', async () => {
    stubLocation()
    server.use(
      http.get('/api/auth/me', () => HttpResponse.json({ user: mockUser() })),
      http.post('/api/auth/logout', () => new HttpResponse(null, { status: 204 })),
    )
    const { wrapper, queryClient } = createWrapper()
    const clearSpy = vi.spyOn(queryClient, 'clear')

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true))

    result.current.logout()

    await waitFor(() => expect(clearSpy).toHaveBeenCalled())
    expect(window.location.href).toBe('/login')
  })
})
