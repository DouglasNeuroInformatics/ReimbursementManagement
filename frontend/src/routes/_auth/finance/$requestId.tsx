import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useRequest, useFinanceApprove, useFinanceReject, useMarkPaid } from '../../../hooks/useRequests'
import { StatusBadge } from '../../../components/ui/Badge'
import { Card, CardHeader, CardBody } from '../../../components/ui/Card'
import { PageSpinner } from '../../../components/ui/Spinner'
import { FinanceApprovalForm } from '../../../components/forms/ApprovalForm'
import { RequestItemsView } from '../../../components/RequestItemsView'
import { CodeSecondaireCell } from '../../../components/CodeSecondaireCell'
import { ApprovalProgressCard } from '../../../components/ApprovalProgressCard'
import { useAuth } from '../../../hooks/useAuth'

export const Route = createFileRoute('/_auth/finance/$requestId')({ component: FinanceDetailPage })

function FinanceDetailPage() {
  const { requestId } = Route.useParams()
  const { data, isLoading } = useRequest(requestId)
  const request = data?.request
  const requiredFinanceApprovals = data?.requiredFinanceApprovals ?? 0
  const approve = useFinanceApprove(requestId)
  const reject = useFinanceReject(requestId)
  const markPaid = useMarkPaid(requestId)
  const navigate = useNavigate()
  const { user } = useAuth()

  if (isLoading) return <PageSpinner />
  if (!request) return <div className="text-center py-12 text-gray-500">Not found.</div>

  const financeApprovals = (request.approvals ?? []).filter(
    (a) => a.stage === 'FINANCE' && a.action === 'APPROVE',
  )
  const approvalCount = financeApprovals.length
  const alreadySigned = user ? financeApprovals.some((a) => a.actorId === user.id) : false
  const supervisorApproval = request.approvals?.find((a) => a.stage === 'SUPERVISOR' && a.action === 'APPROVE')

  const allItems = [
    ...(request.reimbursement?.items ?? []),
    ...(request.travelAdvance?.items ?? []),
    ...(request.travelReimbursement?.items ?? []),
  ]
  const allClassified = allItems.length === 0 || allItems.every((it) => it.codeSecondaire !== null)

  const isFinanceActionable = request.status === 'SUPERVISOR_APPROVED' || request.status === 'FINANCE_REVIEWING'
  const isFinalSignoff = approvalCount + 1 >= requiredFinanceApprovals

  const onAction = async (fn: () => Promise<unknown>) => {
    await fn()
    navigate({ to: '/finance' })
  }

  return (
    <div className="max-w-5xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{request.title}</h1>
        <div className="flex items-center gap-3 mt-1">
          <StatusBadge status={request.status} />
          <span className="text-sm text-gray-500">{request.type.replace(/_/g, ' ')}</span>
          <span className="text-sm text-gray-500">by {request.user.firstName} {request.user.lastName}</span>
        </div>
      </div>

      {isFinanceActionable && (
        <ApprovalProgressCard
          financeApprovals={financeApprovals}
          required={requiredFinanceApprovals}
          showClassificationWarning={!allClassified && isFinalSignoff}
        />
      )}

      {supervisorApproval?.account && (
        <Card>
          <CardBody>
            <p className="text-sm text-gray-600">Charged to account: <strong>{supervisorApproval.account.accountNumber}</strong> — {supervisorApproval.account.label}</p>
          </CardBody>
        </Card>
      )}

      <RequestItemsView
        request={request}
        requestId={requestId}
        extraColumn={isFinanceActionable ? {
          header: 'Code secondaire',
          render: (item) => (
            <CodeSecondaireCell
              itemId={item.itemId}
              itemType={item.itemType}
              currentCode={item.codeSecondaire}
              requestId={requestId}
            />
          ),
        } : undefined}
      />

      <Card>
        <CardHeader><span className="font-semibold">Finance Action</span></CardHeader>
        <CardBody>
          {isFinanceActionable && (
            <FinanceApprovalForm
              onApprove={(d) => onAction(() => approve.mutateAsync(d))}
              onReject={(d) => onAction(() => reject.mutateAsync(d))}
              approveLoading={approve.isPending}
              rejectLoading={reject.isPending}
              approveDisabled={alreadySigned || (isFinalSignoff && !allClassified)}
              alreadySigned={alreadySigned}
              approvalProgress={{ current: approvalCount, required: requiredFinanceApprovals }}
              allClassified={allClassified}
            />
          )}
          {request.status === 'FINANCE_APPROVED' && (
            <FinanceApprovalForm
              showMarkPaid
              onApprove={() => Promise.resolve()}
              onReject={() => Promise.resolve()}
              onMarkPaid={(d) => onAction(() => markPaid.mutateAsync(d))}
              paidLoading={markPaid.isPending}
            />
          )}
          {!['SUPERVISOR_APPROVED', 'FINANCE_REVIEWING', 'FINANCE_APPROVED'].includes(request.status) && (
            <p className="text-sm text-gray-500">No action available for status: {request.status}</p>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
