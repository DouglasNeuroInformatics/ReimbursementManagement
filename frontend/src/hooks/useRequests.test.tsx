import { describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { createWrapper, renderHook, waitFor } from '../test/renderWithProviders'
import { server } from '../test/server'
import { mockRequest } from '../test/handlers'
import { useCreateRequest, useRequests, useSupervisorApprove } from './useRequests'

describe('useRequests', () => {
  it('returns the requests array on success', async () => {
    server.use(
      http.get('/api/requests', () => HttpResponse.json({ requests: [mockRequest({ id: 'r1' })] })),
    )
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => useRequests(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data?.[0].id).toBe('r1')
  })

  it('encodes the status filter into the query string', async () => {
    let search = ''
    server.use(
      http.get('/api/requests', ({ request }) => {
        search = new URL(request.url).search
        return HttpResponse.json({ requests: [] })
      }),
    )
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => useRequests({ status: 'SUBMITTED' }), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(search).toBe('?status=SUBMITTED')
  })
})

describe('useCreateRequest', () => {
  it('posts the request and invalidates the requests list', async () => {
    server.use(
      http.post('/api/requests', () => HttpResponse.json({ request: mockRequest() }, { status: 201 })),
    )
    const { wrapper, queryClient } = createWrapper()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useCreateRequest(), { wrapper })
    const created = await result.current.mutateAsync({ type: 'REIMBURSEMENT', title: 'X' })

    expect(created.id).toBe('req-1')
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['requests'] })
  })
})

describe('useSupervisorApprove (shared request-action factory)', () => {
  it('posts the body to the supervisor-approve path and invalidates', async () => {
    let body: unknown
    server.use(
      http.post('/api/requests/req-9/supervisor-approve', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ ok: true })
      }),
    )
    const { wrapper, queryClient } = createWrapper()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useSupervisorApprove('req-9'), { wrapper })
    await result.current.mutateAsync({ accountId: 'acc-1', comment: 'ok' })

    expect(body).toEqual({ accountId: 'acc-1', comment: 'ok' })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['requests', 'req-9'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['requests'] })
  })
})
