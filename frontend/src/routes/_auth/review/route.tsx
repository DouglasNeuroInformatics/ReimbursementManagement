import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { fetchUser } from '../../../lib/api'

export const Route = createFileRoute('/_auth/review')({
  beforeLoad: async ({ context: { queryClient } }) => {
    const user = await queryClient.fetchQuery({ queryKey: ['auth', 'me'], queryFn: fetchUser })
    if (!user || !['SUPERVISOR', 'FINANCIAL_ADMIN'].includes(user.role)) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: () => <Outlet />,
})
