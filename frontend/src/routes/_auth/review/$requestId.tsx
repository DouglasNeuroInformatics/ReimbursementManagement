import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useRequest, useSupervisorApprove, useSupervisorReject } from '../../../hooks/useRequests'
import { useAuth } from '../../../hooks/useAuth'
import { StatusBadge } from '../../../components/ui/Badge'
import { Card, CardHeader, CardBody } from '../../../components/ui/Card'
import { PageSpinner } from '../../../components/ui/Spinner'
import { SupervisorApprovalForm } from '../../../components/forms/ApprovalForm'
import { RequestItemsView } from '../../../components/RequestItemsView'

export const Route = createFileRoute('/_auth/review/$requestId')({ component: ReviewDetailPage })

function ReviewDetailPage() {
  const { requestId } = Route.useParams()
  const { user } = useAuth()
  const { data, isLoading } = useRequest(requestId)
  const request = data?.request
  const approve = useSupervisorApprove(requestId)
  const reject = useSupervisorReject(requestId)
  const navigate = useNavigate()

  if (isLoading) return <PageSpinner />
  if (!request) return <div className="text-center py-12 text-gray-500">Not found.</div>

  const onApprove = async (data: { accountId: string; comment?: string }) => {
    await approve.mutateAsync(data)
    navigate({ to: '/review' })
  }
  const onReject = async (data: { comment?: string }) => {
    await reject.mutateAsync(data)
    navigate({ to: '/review' })
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{request.title}</h1>
        <div className="flex items-center gap-3 mt-1">
          <StatusBadge status={request.status} />
          <span className="text-sm text-gray-500">{request.type.replace(/_/g, ' ')}</span>
          <span className="text-sm text-gray-500">by {request.user.firstName} {request.user.lastName}</span>
        </div>
      </div>

      <RequestItemsView request={request} requestId={requestId} />

      {request.status === 'SUBMITTED' && user && (
        <Card>
          <CardHeader><span className="font-semibold">Your Decision</span></CardHeader>
          <CardBody>
            <SupervisorApprovalForm
              supervisorId={user.id}
              onApprove={onApprove}
              onReject={onReject}
              approveLoading={approve.isPending}
              rejectLoading={reject.isPending}
            />
          </CardBody>
        </Card>
      )}
    </div>
  )
}
