import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useRequests } from '../../../../hooks/useRequests'
import { StatusBadge } from '../../../../components/ui/Badge'
import { Button } from '../../../../components/ui/Button'
import { Card, CardBody } from '../../../../components/ui/Card'
import { PageSpinner } from '../../../../components/ui/Spinner'
import { fmtDate } from '../../../../utils/dates'
import { fmtCurrency, getRequestTotal } from '../../../../utils/currency'

export const Route = createFileRoute('/_auth/dashboard/requests/')({ component: RequestsListPage })

function RequestsListPage() {
  const { data: requests = [], isLoading } = useRequests({ scope: 'own' })
  const navigate = useNavigate()

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Requests</h1>
        <Link to="/dashboard/requests/new">
          <Button size="sm">New Request</Button>
        </Link>
      </div>

      <Card>
        <CardBody className="p-0">
          {requests.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No requests yet.</p>
              <Link to="/dashboard/requests/new" className="text-blue-600 text-sm hover:underline mt-2 inline-block">Create your first request</Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Title</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Type</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-right px-6 py-3 font-medium text-gray-500">Amount</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Submitted</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Docs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {requests.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={(e) => {
                      if (e.target instanceof HTMLAnchorElement) return;
                      navigate({ to: '/dashboard/requests/$requestId', params: { requestId: r.id } });
                    }}
                  >
                    <td className="px-6 py-3">
                      <Link to="/dashboard/requests/$requestId" params={{ requestId: r.id }} className="text-blue-600 hover:underline font-medium">{r.title}</Link>
                    </td>
                    <td className="px-6 py-3 text-gray-600">{r.type.replace(/_/g, ' ')}</td>
                    <td className="px-6 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-6 py-3 text-right font-medium text-gray-900">{(() => { const t = getRequestTotal(r); return t !== null ? fmtCurrency(t) : '—' })()}</td>
                    <td className="px-6 py-3 text-gray-500">{fmtDate(r.submittedAt)}</td>
                    <td className="px-6 py-3 text-gray-500">{r._count?.documents ?? 0}</td>
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
