import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Request } from '../types'

export function useRequests(filters?: { status?: string; type?: string; scope?: 'own' }) {
  const params = new URLSearchParams()
  if (filters?.status) params.set('status', filters.status)
  if (filters?.type) params.set('type', filters.type)
  if (filters?.scope) params.set('scope', filters.scope)
  const qs = params.toString() ? `?${params}` : ''
  return useQuery({
    queryKey: ['requests', filters ?? null],
    queryFn: () =>
      api.get<{ requests: Request[] }>(`/api/requests${qs}`).then((r) => r.requests),
  })
}

export function useRequest(id: string | undefined) {
  return useQuery({
    queryKey: ['requests', id],
    queryFn: () =>
      api.get<{ request: Request }>(`/api/requests/${id}`).then((r) => r.request),
    enabled: !!id,
  })
}

export function useCreateRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { type: string; title: string; description?: string }) =>
      api.post<{ request: Request }>('/api/requests', data).then((r) => r.request),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['requests'] }),
  })
}

export function useUpdateRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.patch<{ request: Request }>(`/api/requests/${id}`, data).then((r) => r.request),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['requests', id] })
      qc.invalidateQueries({ queryKey: ['requests'] })
    },
  })
}

export function useSubmitRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ request: Request }>(`/api/requests/${id}/submit`).then((r) => r.request),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['requests', id] })
      qc.invalidateQueries({ queryKey: ['requests'] })
    },
  })
}

export function useReviseRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ request: Request }>(`/api/requests/${id}/revise`).then((r) => r.request),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['requests', id] })
      qc.invalidateQueries({ queryKey: ['requests'] })
    },
  })
}

export function useDeleteRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/requests/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['requests'] }),
  })
}

export function useSupervisorApprove(requestId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { accountId: string; comment?: string }) =>
      api.post(`/api/requests/${requestId}/supervisor-approve`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requests', requestId] })
      qc.invalidateQueries({ queryKey: ['requests'] })
    },
  })
}

export function useSupervisorReject(requestId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { comment?: string }) =>
      api.post(`/api/requests/${requestId}/supervisor-reject`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requests', requestId] })
      qc.invalidateQueries({ queryKey: ['requests'] })
    },
  })
}

export function useFinanceApprove(requestId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { comment?: string }) =>
      api.post(`/api/requests/${requestId}/finance-approve`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requests', requestId] })
      qc.invalidateQueries({ queryKey: ['requests'] })
    },
  })
}

export function useFinanceReject(requestId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { comment?: string }) =>
      api.post(`/api/requests/${requestId}/finance-reject`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requests', requestId] })
      qc.invalidateQueries({ queryKey: ['requests'] })
    },
  })
}

export function useMarkPaid(requestId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { comment?: string }) =>
      api.post(`/api/requests/${requestId}/mark-paid`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requests', requestId] })
      qc.invalidateQueries({ queryKey: ['requests'] })
    },
  })
}
