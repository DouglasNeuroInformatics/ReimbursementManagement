import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useRequests } from '../../../hooks/useRequests'
import { RequestsTable } from '../../../components/tables/RequestsTable'
import { Card, CardHeader, CardBody } from '../../../components/ui/Card'
import { PageSpinner } from '../../../components/ui/Spinner'

export const Route = createFileRoute('/_auth/review/history')({ component: RequestHistoryPage })

const HISTORY_STATUSES = ['SUPERVISOR_APPROVED', 'FINANCE_REVIEWING', 'FINANCE_APPROVED', 'FINANCE_REJECTED', 'PAID']

function RequestHistoryPage() {
  const { data: allRequests = [], isLoading } = useRequests()
  const requests = allRequests.filter((r) => HISTORY_STATUSES.includes(r.status))
  const { t } = useTranslation(['review', 'requests'])

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">{t('history')}</h1>
      <p className="text-sm text-gray-500">{t('requests:awaiting.history', { count: requests.length })}</p>
      <Card>
        <CardHeader><span className="font-semibold">{t('requests:subSections.history')}</span></CardHeader>
        <CardBody className="p-0">
          <RequestsTable
            data={requests}
            showUser
            showAccount
            linkTo={(r) => `/review/${r.id}`}
          />
        </CardBody>
      </Card>
    </div>
  )
}
