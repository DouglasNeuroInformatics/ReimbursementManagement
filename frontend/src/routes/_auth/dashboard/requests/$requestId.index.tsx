import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useRequest, useSubmitRequest, useReviseRequest, useDeleteRequest } from '../../../../hooks/useRequests'
import { useAuth } from '../../../../hooks/useAuth'
import { StatusBadge } from '../../../../components/ui/Badge'
import { Button } from '../../../../components/ui/Button'
import { Card, CardHeader, CardBody } from '../../../../components/ui/Card'
import { PageSpinner } from '../../../../components/ui/Spinner'
import { DocumentUpload } from '../../../../components/forms/DocumentUpload'
import { fmtDate, fmtDateTime } from '../../../../utils/dates'
import { fmtCurrency } from '../../../../utils/currency'

export const Route = createFileRoute('/_auth/dashboard/requests/$requestId/')({ component: RequestDetailPage })

function RequestDetailPage() {
  const { requestId } = Route.useParams()
  const { user } = useAuth()
  const { data: request, isLoading } = useRequest(requestId)
  const submitReq = useSubmitRequest()
  const reviseReq = useReviseRequest()
  const deleteReq = useDeleteRequest()
  const navigate = useNavigate()

  if (isLoading) return <PageSpinner />
  if (!request) return <div className="text-center py-12 text-gray-500">Request not found.</div>

  const isOwner = user?.id === request.userId
  const canEdit = isOwner && (request.status === 'DRAFT' || request.status === 'SUPERVISOR_REJECTED' || request.status === 'FINANCE_REJECTED')
  const canSubmit = isOwner && request.status === 'DRAFT'
  const canRevise = isOwner && (request.status === 'SUPERVISOR_REJECTED' || request.status === 'FINANCE_REJECTED')
  const canDelete = isOwner && request.status === 'DRAFT'

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{request.title}</h1>
          <div className="flex items-center gap-3 mt-1">
            <StatusBadge status={request.status} />
            <span className="text-sm text-gray-500">{request.type.replace(/_/g, ' ')}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Link to="/dashboard/requests/$requestId/edit" params={{ requestId }}>
              <Button size="sm" variant="secondary">Edit</Button>
            </Link>
          )}
          {canSubmit && (
            <Button size="sm" loading={submitReq.isPending} onClick={() => submitReq.mutate(request.id)}>Submit</Button>
          )}
          {canRevise && (
            <Button size="sm" variant="secondary" loading={reviseReq.isPending} onClick={() => reviseReq.mutate(request.id)}>Revise (Back to Draft)</Button>
          )}
          {canDelete && (
            <Button size="sm" variant="danger" loading={deleteReq.isPending} onClick={async () => { await deleteReq.mutateAsync(request.id); navigate({ to: '/dashboard/requests' }) }}>Delete</Button>
          )}
        </div>
      </div>

      {request.description && (
        <Card><CardBody><p className="text-sm text-gray-700">{request.description}</p></CardBody></Card>
      )}

      {request.reimbursement && (
        <Card>
          <CardHeader>
            <span className="font-semibold">Reimbursement Items</span>
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
                <tfoot className="border-t border-gray-200 bg-gray-50">
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-right font-semibold text-gray-700">Total</td>
                    <td className="px-4 py-2 text-right font-semibold text-gray-900">{fmtCurrency(request.reimbursement.items.reduce((sum, it) => sum + parseFloat(it.amount), 0))}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            )}
          </CardBody>
        </Card>
      )}

      {request.travelAdvance && (
        <Card>
          <CardHeader><span className="font-semibold">Travel Advance Details</span></CardHeader>
          <CardBody className="space-y-3">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <dt className="text-gray-500">Destination</dt><dd>{request.travelAdvance.destination}</dd>
              <dt className="text-gray-500">Purpose</dt><dd>{request.travelAdvance.purpose}</dd>
              <dt className="text-gray-500">Departure</dt><dd>{fmtDate(request.travelAdvance.departureDate)}</dd>
              <dt className="text-gray-500">Return</dt><dd>{fmtDate(request.travelAdvance.returnDate)}</dd>
              <dt className="text-gray-500">Estimated Amount</dt><dd className="font-medium">{fmtCurrency(request.travelAdvance.estimatedAmount)}</dd>
            </dl>
            {request.travelAdvance.items.length > 0 && (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100">
                  <th className="text-left py-1 text-gray-500 font-medium">Category</th>
                  <th className="text-right py-1 text-gray-500 font-medium">Amount</th>
                  <th className="text-left py-1 pl-4 text-gray-500 font-medium">Notes</th>
                </tr></thead>
                <tbody>{request.travelAdvance.items.map((it) => (
                  <tr key={it.id} className="border-b border-gray-50">
                    <td className="py-1.5">{it.category}</td>
                    <td className="py-1.5 text-right">{fmtCurrency(it.amount)}</td>
                    <td className="py-1.5 pl-4 text-gray-500">{it.notes ?? '—'}</td>
                  </tr>
                ))}</tbody>
                <tfoot className="border-t border-gray-200 bg-gray-50">
                  <tr>
                    <td className="py-1.5 text-right font-semibold text-gray-700">Total</td>
                    <td className="py-1.5 text-right font-semibold text-gray-900">{fmtCurrency(request.travelAdvance.items.reduce((sum, it) => sum + parseFloat(it.amount), 0))}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            )}
          </CardBody>
        </Card>
      )}

      {request.travelReimbursement && (
        <Card>
          <CardHeader><span className="font-semibold">Travel Reimbursement Details</span></CardHeader>
          <CardBody className="space-y-3">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <dt className="text-gray-500">Destination</dt><dd>{request.travelReimbursement.destination}</dd>
              <dt className="text-gray-500">Purpose</dt><dd>{request.travelReimbursement.purpose}</dd>
              <dt className="text-gray-500">Total Amount</dt><dd className="font-medium">{fmtCurrency(request.travelReimbursement.totalAmount)}</dd>
            </dl>
            {request.travelReimbursement.items.length > 0 && (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100">
                  <th className="text-left py-1 text-gray-500 font-medium">Date</th>
                  <th className="text-left py-1 text-gray-500 font-medium">Category</th>
                  <th className="text-right py-1 text-gray-500 font-medium">Amount</th>
                </tr></thead>
                <tbody>{request.travelReimbursement.items.map((it) => (
                  <tr key={it.id} className="border-b border-gray-50">
                    <td className="py-1.5">{fmtDate(it.date)}</td>
                    <td className="py-1.5">{it.category}</td>
                    <td className="py-1.5 text-right">{fmtCurrency(it.amount)}</td>
                  </tr>
                ))}</tbody>
                <tfoot className="border-t border-gray-200 bg-gray-50">
                  <tr>
                    <td colSpan={2} className="py-1.5 text-right font-semibold text-gray-700">Total</td>
                    <td className="py-1.5 text-right font-semibold text-gray-900">{fmtCurrency(request.travelReimbursement.items.reduce((sum, it) => sum + parseFloat(it.amount), 0))}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </CardBody>
        </Card>
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

      {(request.approvals?.length ?? 0) > 0 && (
        <Card>
          <CardHeader><span className="font-semibold">Approval History</span></CardHeader>
          <CardBody>
            <div className="space-y-3">
              {request.approvals!.map((a) => (
                <div key={a.id} className="flex gap-3 text-sm">
                  <div className="w-2 h-2 mt-1.5 rounded-full shrink-0" style={{ background: (a.action === 'APPROVE' || a.action === 'PAID') ? '#22c55e' : '#ef4444' }} />
                  <div>
                    <span className="font-medium">{a.actor.firstName} {a.actor.lastName}</span>
                    <span className="text-gray-500 ml-1">— {a.stage} {a.action}</span>
                    {a.account && <span className="ml-2 text-gray-500">· Account: {a.account.accountNumber} ({a.account.label})</span>}
                    {a.comment && <p className="text-gray-600 mt-0.5">{a.comment}</p>}
                    <p className="text-gray-400 text-xs mt-0.5">{fmtDateTime(a.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
