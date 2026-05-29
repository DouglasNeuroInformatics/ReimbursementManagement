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
      api.get<{ request: Request; requiredFinanceApprovals: number }>(`/api/requests/${id}`).then((r) => ({
        request: r.request,
        requiredFinanceApprovals: r.requiredFinanceApprovals,
      })),
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

function useRequestAction<TBody>(requestId: string, path: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: TBody) => api.post(`/api/requests/${requestId}/${path}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requests', requestId] })
      qc.invalidateQueries({ queryKey: ['requests'] })
    },
  })
}

export const useSupervisorApprove = (requestId: string) =>
  useRequestAction<{ accountId: string; comment?: string }>(requestId, 'supervisor-approve')

export const useSupervisorReject = (requestId: string) =>
  useRequestAction<{ comment?: string }>(requestId, 'supervisor-reject')

export const useFinanceApprove = (requestId: string) =>
  useRequestAction<{ comment?: string }>(requestId, 'finance-approve')

export const useFinanceReject = (requestId: string) =>
  useRequestAction<{ comment?: string }>(requestId, 'finance-reject')

export const useMarkPaid = (requestId: string) =>
  useRequestAction<{ comment?: string }>(requestId, 'mark-paid')

export function useClassifyItem(requestId: string, itemId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['classify-item', requestId, itemId],
    mutationFn: (data: { itemId: string; itemType: 'reimbursement' | 'travel_advance' | 'travel_expense'; codeSecondaire: string }) =>
      api.patch(`/api/requests/${requestId}/classify-item`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requests', requestId] })
    },
  })
}

export function useCodeSecondaire() {
  return useQuery({
    queryKey: ['code-secondaire'],
    queryFn: () =>
      api.get<{ codes: Array<{ code: string; description: string }> }>('/api/code-secondaire').then((r) => r.codes),
    staleTime: Infinity,
  })
}
