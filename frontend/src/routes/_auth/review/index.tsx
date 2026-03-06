import { createFileRoute } from '@tanstack/react-router'
import { useRequests } from '../../../hooks/useRequests'
import { RequestsTable } from '../../../components/tables/RequestsTable'
import { Card, CardHeader, CardBody } from '../../../components/ui/Card'
import { PageSpinner } from '../../../components/ui/Spinner'

export const Route = createFileRoute('/_auth/review/')({ component: ReviewQueuePage })

function ReviewQueuePage() {
  const { data: requests = [], isLoading } = useRequests({ status: 'SUBMITTED' })
  if (isLoading) return <PageSpinner />
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Review Queue</h1>
      <p className="text-sm text-gray-500">{requests.length} request(s) awaiting your review.</p>
      <Card>
        <CardHeader><span className="font-semibold">Submitted Requests</span></CardHeader>
        <CardBody className="p-0">
          <RequestsTable
            data={requests}
            showUser
            linkTo={(r) => `/review/${r.id}`}
          />
        </CardBody>
      </Card>
    </div>
  )
}
