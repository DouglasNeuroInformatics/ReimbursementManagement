import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation(['requests', 'enums'])

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('myRequests')}</h1>
        <Link to="/dashboard/requests/new">
          <Button size="sm">{t('newRequest')}</Button>
        </Link>
      </div>

      <Card>
        <CardBody className="p-0">
          {requests.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">{t('none')}</p>
              <Link to="/dashboard/requests/new" className="text-blue-600 text-sm hover:underline mt-2 inline-block">{t('createFirst')}</Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">{t('columns.title')}</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">{t('columns.type')}</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">{t('columns.status')}</th>
                  <th className="text-right px-6 py-3 font-medium text-gray-500">{t('columns.amount')}</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">{t('columns.submitted')}</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">{t('columns.documents')}</th>
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
                    <td className="px-6 py-3 text-gray-600">{t(`requestType.${r.type}`, { ns: 'enums' }) as string}</td>
                    <td className="px-6 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-6 py-3 text-right font-medium text-gray-900">{(() => { const tot = getRequestTotal(r); return tot !== null ? fmtCurrency(tot) : '—' })()}</td>
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
