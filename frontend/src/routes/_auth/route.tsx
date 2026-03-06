import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { fetchUser } from '../../lib/api'
import { AppShell } from '../../components/layout/AppShell'
import type { User } from '../../types'

export const Route = createFileRoute('/_auth')({
  beforeLoad: async ({ context: { queryClient } }) => {
    try {
      const user = await queryClient.ensureQueryData({
        queryKey: ['auth', 'me'],
        queryFn: fetchUser,
        staleTime: 5 * 60 * 1000,
      })
      return { user }
    } catch {
      throw redirect({ to: '/login' })
    }
  },
  component: AuthLayout,
})

function AuthLayout() {
  const { user } = Route.useRouteContext() as { user: User }
  return (
    <AppShell user={user}>
      <Outlet />
    </AppShell>
  )
}
