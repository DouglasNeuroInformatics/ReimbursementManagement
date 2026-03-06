import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { User } from '../types'

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      jobPosition?: string | null
      phone?: string | null
      extension?: string | null
      address?: string | null
    }) => api.patch<{ user: User }>('/api/auth/me', data).then((r) => r.user),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auth', 'me'] }),
  })
}
