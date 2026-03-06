import { createFileRoute, redirect } from '@tanstack/react-router'
import { fetchUser } from '../lib/api'

export const Route = createFileRoute('/')({
  beforeLoad: async ({ context: { queryClient } }) => {
    try {
      await queryClient.ensureQueryData({
        queryKey: ['auth', 'me'],
        queryFn: fetchUser,
        staleTime: 5 * 60 * 1000,
      })
      throw redirect({ to: '/dashboard' })
    } catch (err) {
      if ((err as { isRedirect?: boolean }).isRedirect) throw err
      throw redirect({ to: '/login' })
    }
  },
  component: () => null,
})
