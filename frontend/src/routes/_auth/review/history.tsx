import { createFileRoute } from '@tanstack/react-router'
import { useRequests } from '../../../hooks/useRequests'
import { RequestsTable } from '../../../components/tables/RequestsTable'
import { Card, CardHeader, CardBody } from '../../../components/ui/Card'
import { PageSpinner } from '../../../components/ui/Spinner'

export const Route = createFileRoute('/_auth/review/history')({ component: RequestHistoryPage })

const HISTORY_STATUSES = ['SUPERVISOR_APPROVED', 'FINANCE_APPROVED', 'FINANCE_REJECTED', 'PAID']

function RequestHistoryPage() {
  const { data: allRequests = [], isLoading } = useRequests()
  const requests = allRequests.filter((r) => HISTORY_STATUSES.includes(r.status))

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Request History</h1>
      <p className="text-sm text-gray-500">{requests.length} completed or processed request(s).</p>
      <Card>
        <CardHeader><span className="font-semibold">Past Requests</span></CardHeader>
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
