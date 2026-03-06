import { createFileRoute } from '@tanstack/react-router'
import { useRequests } from '../../../hooks/useRequests'
import { RequestsTable } from '../../../components/tables/RequestsTable'
import { Card, CardHeader, CardBody } from '../../../components/ui/Card'
import { PageSpinner } from '../../../components/ui/Spinner'

export const Route = createFileRoute('/_auth/finance/')({ component: FinanceQueuePage })

function FinanceQueuePage() {
  const { data: allRequests = [], isLoading } = useRequests()
  const requests = allRequests.filter((r) => r.status === 'SUPERVISOR_APPROVED' || r.status === 'FINANCE_APPROVED')
  if (isLoading) return <PageSpinner />
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Finance Queue</h1>
      <p className="text-sm text-gray-500">{requests.length} request(s) pending finance action.</p>
      <Card>
        <CardHeader><span className="font-semibold">Requests</span></CardHeader>
        <CardBody className="p-0">
          <RequestsTable
            data={requests}
            showUser
            showAccount
            linkTo={(r) => `/finance/${r.id}`}
          />
        </CardBody>
      </Card>
    </div>
  )
}
