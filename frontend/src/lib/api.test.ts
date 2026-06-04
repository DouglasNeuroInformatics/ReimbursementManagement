import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
import { api, ApiError } from './api'

describe('api wrapper', () => {
  describe('CSRF header', () => {
    it('adds X-Requested-With on mutating requests', async () => {
      let seen: string | null = 'MISSING'
      server.use(
        http.post('/api/requests', ({ request }) => {
          seen = request.headers.get('X-Requested-With')
          return HttpResponse.json({ ok: true })
        }),
      )
      await api.post('/api/requests', { a: 1 })
      expect(seen).toBe('XMLHttpRequest')
    })

    it('omits X-Requested-With on public auth paths', async () => {
      let seen: string | null = 'MISSING'
      server.use(
        http.post('/api/auth/login', ({ request }) => {
          seen = request.headers.get('X-Requested-With')
          return HttpResponse.json({ ok: true })
        }),
      )
      await api.post('/api/auth/login', { email: 'a', password: 'b' })
      expect(seen).toBeNull()
    })
  })

  describe('error handling', () => {
    it('throws ApiError carrying status, code, and details from the body', async () => {
      server.use(
        http.get('/api/requests', () =>
          HttpResponse.json(
            { error: 'Bad input', code: 'VALIDATION_ERROR', details: { field: 'title' } },
            { status: 422 },
          )),
      )
      const err = await api.get('/api/requests').catch((e) => e)
      expect(err).toBeInstanceOf(ApiError)
      expect(err.status).toBe(422)
      expect(err.message).toBe('Bad input')
      expect(err.code).toBe('VALIDATION_ERROR')
      expect(err.details).toEqual({ field: 'title' })
    })

    it('resolves to undefined on 204 No Content', async () => {
      server.use(http.delete('/api/requests/:id', () => new HttpResponse(null, { status: 204 })))
      await expect(api.delete('/api/requests/req-1')).resolves.toBeUndefined()
    })
  })

  describe('401 refresh-and-retry', () => {
    it('refreshes once then retries the original request', async () => {
      let attempts = 0
      let refreshCalls = 0
      server.use(
        http.get('/api/requests', () => {
          attempts += 1
          return attempts === 1
            ? new HttpResponse(null, { status: 401 })
            : HttpResponse.json({ requests: [] })
        }),
        http.post('/api/auth/refresh', () => {
          refreshCalls += 1
          return new HttpResponse(null, { status: 200 })
        }),
      )
      const result = await api.get('/api/requests')
      expect(result).toEqual({ requests: [] })
      expect(refreshCalls).toBe(1)
      expect(attempts).toBe(2)
    })

    it('shares a single refresh across concurrent 401s (mutex)', async () => {
      let refreshCalls = 0
      const seen: Record<string, number> = {}
      const once = (key: string, payload: unknown) =>
        () => {
          seen[key] = (seen[key] ?? 0) + 1
          return seen[key] === 1
            ? new HttpResponse(null, { status: 401 })
            : HttpResponse.json(payload as Record<string, unknown>)
        }
      server.use(
        http.get('/api/a', once('a', { k: 'a' })),
        http.get('/api/b', once('b', { k: 'b' })),
        http.post('/api/auth/refresh', () => {
          refreshCalls += 1
          return new HttpResponse(null, { status: 200 })
        }),
      )
      const [a, b] = await Promise.all([api.get('/api/a'), api.get('/api/b')])
      expect(a).toEqual({ k: 'a' })
      expect(b).toEqual({ k: 'b' })
      expect(refreshCalls).toBe(1)
    })

    it('redirects to /login and throws when the refresh fails', async () => {
      server.use(
        http.get('/api/requests', () => new HttpResponse(null, { status: 401 })),
        http.post('/api/auth/refresh', () => new HttpResponse(null, { status: 401 })),
      )

      const originalLocation = window.location
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: { href: 'http://localhost/', origin: 'http://localhost' },
      })
      try {
        const err = await api.get('/api/requests').catch((e) => e)
        expect(err).toBeInstanceOf(ApiError)
        expect(err.code).toBe('AUTH_REFRESH_TOKEN_EXPIRED')
        expect(window.location.href).toBe('/login')
      } finally {
        Object.defineProperty(window, 'location', {
          configurable: true,
          value: originalLocation,
        })
      }
    })

    it('does not attempt a refresh on a 401 from an auth path', async () => {
      let refreshCalls = 0
      server.use(
        http.post('/api/auth/login', () => new HttpResponse(null, { status: 401 })),
        http.post('/api/auth/refresh', () => {
          refreshCalls += 1
          return new HttpResponse(null, { status: 200 })
        }),
      )
      const err = await api.post('/api/auth/login', {}).catch((e) => e)
      expect(err).toBeInstanceOf(ApiError)
      expect(err.status).toBe(401)
      expect(refreshCalls).toBe(0)
    })
  })
})
