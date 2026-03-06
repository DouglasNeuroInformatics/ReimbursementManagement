import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Document } from '../types'

export function useUploadDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, file, itemId }: { requestId: string; file: File; itemId?: string }) => {
      const fd = new FormData()
      fd.append('file', file)
      if (itemId) fd.append('itemId', itemId)
      return api.upload<{ document: Document }>(`/api/requests/${requestId}/documents`, fd)
    },
    onSuccess: (_, { requestId }) => qc.invalidateQueries({ queryKey: ['requests', requestId] }),
  })
}

export function useDeleteDocument(requestId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (docId: string) =>
      api.delete(`/api/requests/${requestId}/documents/${docId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['requests', requestId] }),
  })
}

export function useGetDocumentUrl(requestId: string) {
  return useMutation({
    mutationFn: (docId: string) =>
      api
        .get<{ url: string }>(`/api/requests/${requestId}/documents/${docId}/url`)
        .then((r) => r.url),
  })
}
