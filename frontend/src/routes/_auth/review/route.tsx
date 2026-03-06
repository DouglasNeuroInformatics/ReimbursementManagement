import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import type { User } from '../../../types'

export const Route = createFileRoute('/_auth/review')({
  beforeLoad: ({ context }) => {
    const { user } = context as { user: User }
    if (!user || !['SUPERVISOR', 'FINANCIAL_ADMIN'].includes(user.role)) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: () => <Outlet />,
})
