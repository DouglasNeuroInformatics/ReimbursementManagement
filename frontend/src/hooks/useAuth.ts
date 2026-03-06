import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, fetchUser } from '../lib/api'
import type { User } from '../types'

export function useAuth() {
  const qc = useQueryClient()
  const { data: user, isLoading, isError } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchUser,
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
  const logout = useMutation({
    mutationFn: () => api.post('/api/auth/logout'),
    onSuccess: () => {
      qc.clear()
      window.location.href = '/login'
    },
  })
  return {
    user: user as User | undefined,
    isLoading,
    isAuthenticated: !isError && !!user,
    logout: () => logout.mutate(),
  }
}
