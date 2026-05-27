import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useRequest, useFinanceApprove, useFinanceReject, useMarkPaid, useClassifyItem, useCodeSecondaire } from '../../../hooks/useRequests'
import { StatusBadge } from '../../../components/ui/Badge'
import { Card, CardHeader, CardBody } from '../../../components/ui/Card'
import { PageSpinner } from '../../../components/ui/Spinner'
import { FinanceApprovalForm } from '../../../components/forms/ApprovalForm'
import { DocumentUpload } from '../../../components/forms/DocumentUpload'
import { fmtDate } from '../../../utils/dates'
import { fmtCurrency, sumAmounts } from '../../../utils/currency'
import { useAuth } from '../../../hooks/useAuth'
import { useState } from 'react'

export const Route = createFileRoute('/_auth/finance/$requestId')({ component: FinanceDetailPage })

function CodeSecondaireCell({ itemId, itemType, currentCode, requestId }: {
  itemId: string
  itemType: 'reimbursement' | 'travel_advance' | 'travel_expense'
  currentCode: string | null
  requestId: string
}) {
  const { data: codes = [] } = useCodeSecondaire()
  const classify = useClassifyItem(requestId)
  const [value, setValue] = useState(currentCode ?? '')

  const handleBlur = () => {
    if (value && value !== currentCode) {
      classify.mutate({ itemId, itemType, codeSecondaire: value })
    }
  }

  return (
    <select
      className="text-xs border border-gray-200 rounded px-1 py-0.5 bg-white max-w-[140px]"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
    >
      <option value="">—</option>
      {codes.map((c) => (
        <option key={c.code} value={c.code}>{c.code} — {c.description}</option>
      ))}
    </select>
  )
}

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
    ...(request.reimbursement?.items ?? []).map((it) => ({ ...it, itemType: 'reimbursement' as const })),
    ...(request.travelAdvance?.items ?? []).map((it) => ({ ...it, itemType: 'travel_advance' as const })),
    ...(request.travelReimbursement?.items ?? []).map((it) => ({ ...it, itemType: 'travel_expense' as const })),
  ]
  const allClassified = allItems.length === 0 || allItems.every((it) => it.codeSecondaire !== null)

  const isFinanceActionable = request.status === 'SUPERVISOR_APPROVED' || request.status === 'FINANCE_REVIEWING'
  const isFinalSignoff = approvalCount + 1 >= requiredFinanceApprovals

  const onAction = async (fn: () => Promise<unknown>) => {
    await fn()
    navigate({ to: '/finance' })
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

      {isFinanceActionable && (
        <Card>
          <CardBody>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Finance approvals: {approvalCount} of {requiredFinanceApprovals}
                </p>
                {financeApprovals.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Signed by: {financeApprovals.map((a) => `${a.actor.firstName} ${a.actor.lastName}`).join(', ')}
                  </p>
                )}
              </div>
              {!allClassified && isFinalSignoff && (
                <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">
                  Classify all items before final approval
                </span>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {supervisorApproval?.account && (
        <Card>
          <CardBody>
            <p className="text-sm text-gray-600">Charged to account: <strong>{supervisorApproval.account.accountNumber}</strong> — {supervisorApproval.account.label}</p>
          </CardBody>
        </Card>
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
                    {isFinanceActionable && (
                      <th className="text-left px-4 py-2 font-medium text-gray-500">Code secondaire</th>
                    )}
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
                      {isFinanceActionable && (
                        <td className="px-4 py-2">
                          <CodeSecondaireCell
                            itemId={it.id}
                            itemType="reimbursement"
                            currentCode={it.codeSecondaire}
                            requestId={requestId}
                          />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-gray-200 bg-gray-50">
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-right font-semibold text-gray-700">Total</td>
                    <td className="px-4 py-2 text-right font-semibold text-gray-900">{fmtCurrency(sumAmounts(request.reimbursement.items))}</td>
                    <td />
                    {isFinanceActionable && <td />}
                  </tr>
                </tfoot>
              </table>
            )}
          </CardBody>
        </Card>
      )}
      {request.travelAdvance && (
        <Card>
          <CardHeader><span className="font-semibold">Travel Advance</span></CardHeader>
          <CardBody>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <dt className="text-gray-500">Destination</dt><dd>{request.travelAdvance.destination}</dd>
              <dt className="text-gray-500">Estimated</dt><dd className="font-medium">{fmtCurrency(request.travelAdvance.estimatedAmount)}</dd>
            </dl>
            {request.travelAdvance.items.length > 0 && (
              <table className="w-full text-sm mt-3">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-gray-500">Category</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-500">Amount</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-500">Notes</th>
                    {isFinanceActionable && (
                      <th className="text-left px-4 py-2 font-medium text-gray-500">Code secondaire</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {request.travelAdvance.items.map((it) => (
                    <tr key={it.id}>
                      <td className="px-4 py-2">{it.category}</td>
                      <td className="px-4 py-2 text-right font-medium">{fmtCurrency(it.amount)}</td>
                      <td className="px-4 py-2 text-gray-500">{it.notes ?? '—'}</td>
                      {isFinanceActionable && (
                        <td className="px-4 py-2">
                          <CodeSecondaireCell
                            itemId={it.id}
                            itemType="travel_advance"
                            currentCode={it.codeSecondaire}
                            requestId={requestId}
                          />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      )}
      {request.travelReimbursement && (
        <Card>
          <CardHeader><span className="font-semibold">Travel Reimbursement</span></CardHeader>
          <CardBody>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <dt className="text-gray-500">Destination</dt><dd>{request.travelReimbursement.destination}</dd>
              <dt className="text-gray-500">Total</dt><dd className="font-medium">{fmtCurrency(request.travelReimbursement.totalAmount)}</dd>
            </dl>
            {request.travelReimbursement.items.length > 0 && (
              <table className="w-full text-sm mt-3">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-gray-500">Date</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-500">Category</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-500">Amount</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-500">Vendor</th>
                    {isFinanceActionable && (
                      <th className="text-left px-4 py-2 font-medium text-gray-500">Code secondaire</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {request.travelReimbursement.items.map((it) => (
                    <tr key={it.id}>
                      <td className="px-4 py-2">{fmtDate(it.date)}</td>
                      <td className="px-4 py-2">{it.category}</td>
                      <td className="px-4 py-2 text-right font-medium">{fmtCurrency(it.amount)}</td>
                      <td className="px-4 py-2 text-gray-500">{it.vendor ?? '—'}</td>
                      {isFinanceActionable && (
                        <td className="px-4 py-2">
                          <CodeSecondaireCell
                            itemId={it.id}
                            itemType="travel_expense"
                            currentCode={it.codeSecondaire}
                            requestId={requestId}
                          />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
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
