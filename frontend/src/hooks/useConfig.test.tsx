import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { createWrapper, renderHook, waitFor } from '../test/renderWithProviders'
import { server } from '../test/server'
import { useConfig } from './useConfig'

describe('useConfig', () => {
  it('fetches public runtime config', async () => {
    server.use(http.get('/api/config', () => HttpResponse.json({ demoMode: true })))
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => useConfig(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ demoMode: true })
  })
})
