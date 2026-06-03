import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

export interface AppConfig {
  demoMode: boolean
}

// Public runtime config served by GET /api/config (no auth required).
// Used app-wide (e.g. the demo banner), so it stays cached for the session.
export function useConfig() {
  return useQuery({
    queryKey: ['config'],
    queryFn: () => api.get<AppConfig>('/api/config'),
    staleTime: Infinity,
    retry: false,
  })
}
