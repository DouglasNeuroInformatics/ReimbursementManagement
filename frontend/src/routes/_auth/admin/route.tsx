import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { fetchUser } from '../../../lib/api'

export const Route = createFileRoute('/_auth/admin')({
  beforeLoad: async ({ context: { queryClient } }) => {
    const user = await queryClient.fetchQuery({ queryKey: ['auth', 'me'], queryFn: fetchUser })
    if (!user || user.role !== 'FINANCIAL_ADMIN') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: () => <Outlet />,
})
