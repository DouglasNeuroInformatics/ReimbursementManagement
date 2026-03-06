import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/dashboard/requests/$requestId')({
  component: () => <Outlet />,
})
