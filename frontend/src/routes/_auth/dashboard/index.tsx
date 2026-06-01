import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useRequests } from '../../../hooks/useRequests'
import { useAuth } from '../../../hooks/useAuth'
import { StatusBadge } from '../../../components/ui/Badge'
import { PageSpinner } from '../../../components/ui/Spinner'
import { Card, CardHeader, CardBody } from '../../../components/ui/Card'
import type { RequestStatus } from '../../../types'
import { fmtDate } from '../../../utils/dates'
import { fmtCurrency, getRequestTotal } from '../../../utils/currency'

export const Route = createFileRoute('/_auth/dashboard/')({ component: DashboardPage })

function DashboardPage() {
  const { user } = useAuth()
  const { data: requests = [], isLoading } = useRequests({ scope: 'own' })
  const navigate = useNavigate()
  const { t } = useTranslation(['requests', 'enums'])

  const counts = requests.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1
    return acc
  }, {})

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('dashboardTitle')}</h1>
        <p className="text-gray-500 text-sm mt-1">{t('welcome', { name: user?.firstName ?? '' })}</p>
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
            <h2 className="font-semibold text-gray-900">{t('recent')}</h2>
            <Link to="/dashboard/requests/new" className="text-sm text-blue-600 hover:underline">{t('new')}</Link>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {requests.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">{t('none')}</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">{t('columns.title')}</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">{t('columns.type')}</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">{t('columns.status')}</th>
                  <th className="text-right px-6 py-3 font-medium text-gray-500">{t('columns.amount')}</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">{t('columns.date')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {requests.slice(0, 5).map((r) => (
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
                    <td className="px-6 py-3 text-gray-600">{t(`requestType.${r.type}`, { ns: 'enums' }) as string}</td>
                    <td className="px-6 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-6 py-3 text-right font-medium text-gray-900">{(() => { const tot = getRequestTotal(r); return tot !== null ? fmtCurrency(tot) : '—' })()}</td>
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
