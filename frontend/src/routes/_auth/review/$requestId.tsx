import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useRequest, useSupervisorApprove, useSupervisorReject } from '../../../hooks/useRequests'
import { useAuth } from '../../../hooks/useAuth'
import { StatusBadge } from '../../../components/ui/Badge'
import { Card, CardHeader, CardBody } from '../../../components/ui/Card'
import { PageSpinner } from '../../../components/ui/Spinner'
import { SupervisorApprovalForm } from '../../../components/forms/ApprovalForm'
import { DocumentUpload } from '../../../components/forms/DocumentUpload'
import { fmtDate } from '../../../utils/dates'
import { fmtCurrency } from '../../../utils/currency'

export const Route = createFileRoute('/_auth/review/$requestId')({ component: ReviewDetailPage })

function ReviewDetailPage() {
  const { requestId } = Route.useParams()
  const { user } = useAuth()
  const { data: request, isLoading } = useRequest(requestId)
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

      {request.reimbursement && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="font-semibold">Reimbursement Items</span>
              <span className="text-sm text-gray-500 font-medium">
                Total: {fmtCurrency(request.reimbursement.items
                  .reduce((sum, it) => sum + parseFloat(it.amount), 0))}
              </span>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {request.reimbursement.items.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">No items.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-gray-500">Description</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-500">Date</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-500">Vendor</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-500">Amount</th>
                    <th className="text-center px-4 py-2 font-medium text-gray-500">Docs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {request.reimbursement.items.map((it) => (
                    <tr key={it.id}>
                      <td className="px-4 py-2">{it.description}</td>
                      <td className="px-4 py-2">{fmtDate(it.date)}</td>
                      <td className="px-4 py-2 text-gray-500">{it.vendor ?? '—'}</td>
                      <td className="px-4 py-2 text-right font-medium">{fmtCurrency(it.amount)}</td>
                      <td className="px-4 py-2 text-center">
                        {(it.documents?.length ?? 0) > 0 ? (
                          <span className="text-xs text-blue-600">{it.documents.length} file(s)</span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      )}
      {request.travelAdvance && (
        <Card><CardHeader><span className="font-semibold">Travel Advance</span></CardHeader>
          <CardBody><dl className="grid grid-cols-2 gap-3 text-sm">
            <dt className="text-gray-500">Destination</dt><dd>{request.travelAdvance.destination}</dd>
            <dt className="text-gray-500">Estimated</dt><dd className="font-medium">{fmtCurrency(request.travelAdvance.estimatedAmount)}</dd>
            <dt className="text-gray-500">Dates</dt><dd>{fmtDate(request.travelAdvance.departureDate)} – {fmtDate(request.travelAdvance.returnDate)}</dd>
          </dl></CardBody></Card>
      )}
      {request.travelReimbursement && (
        <Card><CardHeader><span className="font-semibold">Travel Reimbursement</span></CardHeader>
          <CardBody><dl className="grid grid-cols-2 gap-3 text-sm">
            <dt className="text-gray-500">Destination</dt><dd>{request.travelReimbursement.destination}</dd>
            <dt className="text-gray-500">Total</dt><dd className="font-medium">{fmtCurrency(request.travelReimbursement.totalAmount)}</dd>
          </dl></CardBody></Card>
      )}

      {request.reimbursement && request.reimbursement.items.some((it) => (it.documents?.length ?? 0) > 0) && (
        <Card>
          <CardHeader><span className="font-semibold">Item Documents</span></CardHeader>
          <CardBody className="space-y-3">
            {request.reimbursement.items.filter((it) => (it.documents?.length ?? 0) > 0).map((it) => (
              <div key={it.id}>
                <p className="text-sm font-medium text-gray-700 mb-1">{it.description}</p>
                <DocumentUpload files={[]} onChange={() => {}} requestId={requestId} existingDocs={it.documents} readOnly />
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {(() => {
        const unlinkedDocs = request.documents?.filter((d) => !d.reimbursementItemId) ?? []
        return unlinkedDocs.length > 0 ? (
          <Card>
            <CardHeader><span className="font-semibold">Documents</span></CardHeader>
            <CardBody>
              <DocumentUpload files={[]} onChange={() => {}} requestId={requestId} existingDocs={unlinkedDocs} readOnly />
            </CardBody>
          </Card>
        ) : null
      })()}

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
