import { createFileRoute, Link } from '@tanstack/react-router'
import { useRequests } from '../../../hooks/useRequests'
import { useAuth } from '../../../hooks/useAuth'
import { StatusBadge } from '../../../components/ui/Badge'
import { PageSpinner } from '../../../components/ui/Spinner'
import { Card, CardHeader, CardBody } from '../../../components/ui/Card'
import type { RequestStatus } from '../../../types'
import { fmtDate } from '../../../utils/dates'

export const Route = createFileRoute('/_auth/dashboard/')({ component: DashboardPage })

const STATUS_ORDER: RequestStatus[] = ['DRAFT', 'SUBMITTED', 'SUPERVISOR_APPROVED', 'SUPERVISOR_REJECTED', 'FINANCE_APPROVED', 'FINANCE_REJECTED', 'PAID']

function DashboardPage() {
  const { user } = useAuth()
  const { data: requests = [], isLoading } = useRequests({ scope: 'own' })

  const counts = requests.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1
    return acc
  }, {})

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back, {user?.firstName}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(['DRAFT', 'SUBMITTED', 'SUPERVISOR_APPROVED', 'PAID'] as RequestStatus[]).map((s) => (
          <Card key={s}>
            <CardBody className="py-4">
              <div className="text-2xl font-bold text-gray-900">{counts[s] ?? 0}</div>
              <StatusBadge status={s} />
            </CardBody>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Requests</h2>
            <Link to="/dashboard/requests/new" className="text-sm text-blue-600 hover:underline">New request</Link>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {requests.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No requests yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Title</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Type</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {requests.slice(0, 5).map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3">
                      <Link to="/dashboard/requests/$requestId" params={{ requestId: r.id }} className="text-blue-600 hover:underline font-medium">{r.title}</Link>
                    </td>
                    <td className="px-6 py-3 text-gray-600">{r.type.replace('_', ' ')}</td>
                    <td className="px-6 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-6 py-3 text-gray-500">{fmtDate(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
