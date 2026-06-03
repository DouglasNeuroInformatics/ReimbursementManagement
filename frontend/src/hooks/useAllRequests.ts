import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Request } from '../types'

interface RequestsPage {
  requests: Request[]
  nextCursor: string | null
  hasMore: boolean
}

/**
 * Fetches *every* request in the system by following cursor pagination to
 * exhaustion. The regular `useRequests()` only reads the first page. Intended
 * for the FINANCIAL_ADMIN Finance History view, which lists all states.
 */
export function useAllRequests() {
  return useQuery({
    queryKey: ['requests', 'all'],
    queryFn: async () => {
      const all: Request[] = []
      let cursor: string | null = null
      // Bound the loop defensively so a backend bug can't spin forever.
      for (let guard = 0; guard < 1000; guard++) {
        const qs = new URLSearchParams({ limit: '100' })
        if (cursor) qs.set('cursor', cursor)
        const page: RequestsPage = await api.get<RequestsPage>(`/api/requests?${qs}`)
        all.push(...page.requests)
        if (!page.hasMore || !page.nextCursor) break
        cursor = page.nextCursor
      }
      return all
    },
  })
}
