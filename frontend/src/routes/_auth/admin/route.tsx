import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import type { User } from '../../../types'

export const Route = createFileRoute('/_auth/admin')({
  beforeLoad: ({ context }) => {
    const { user } = context as { user: User }
    if (!user || user.role !== 'FINANCIAL_ADMIN') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: () => <Outlet />,
})
