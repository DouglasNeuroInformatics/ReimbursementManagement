import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/Textarea'
import { Select } from '../ui/Select'
import type { SupervisorAccount } from '../../types'

interface SupervisorApprovalFormProps {
  supervisorId: string
  onApprove: (data: { accountId: string; comment?: string }) => void
  onReject: (data: { comment?: string }) => void
  approveLoading?: boolean
  rejectLoading?: boolean
}

export function SupervisorApprovalForm({ supervisorId, onApprove, onReject, approveLoading, rejectLoading }: SupervisorApprovalFormProps) {
  const [accountId, setAccountId] = useState('')
  const [comment, setComment] = useState('')
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', supervisorId, 'mine'],
    queryFn: () =>
      api.get<{ accounts: SupervisorAccount[] }>(`/api/supervisors/${supervisorId}/accounts/mine`)
        .then((r) => r.accounts),
  })

  return (
    <div className="space-y-4">
      <Select
        label="Charge to Account"
        options={accounts.map((a) => ({ value: a.id, label: `${a.accountNumber} — ${a.label}` }))}
        placeholder="Select account..."
        value={accountId}
        onChange={(e) => setAccountId(e.target.value)}
      />
      <Textarea
        label="Comment (optional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Add a note for the requester..."
      />
      <div className="flex gap-3">
        <Button
          onClick={() => onApprove({ accountId, comment: comment || undefined })}
          disabled={!accountId}
          loading={approveLoading}
        >
          Approve
        </Button>
        <Button
          variant="danger"
          onClick={() => onReject({ comment: comment || undefined })}
          loading={rejectLoading}
        >
          Reject
        </Button>
      </div>
    </div>
  )
}

interface FinanceFormProps {
  onApprove: (data: { comment?: string }) => void
  onReject: (data: { comment?: string }) => void
  onMarkPaid?: (data: { comment?: string }) => void
  showMarkPaid?: boolean
  approveLoading?: boolean
  rejectLoading?: boolean
  paidLoading?: boolean
  approveDisabled?: boolean
  alreadySigned?: boolean
  approvalProgress?: { current: number; required: number }
  allClassified?: boolean
}

export function FinanceApprovalForm({
  onApprove,
  onReject,
  onMarkPaid,
  showMarkPaid,
  approveLoading,
  rejectLoading,
  paidLoading,
  approveDisabled,
  alreadySigned,
  approvalProgress,
  allClassified,
}: FinanceFormProps) {
  const [comment, setComment] = useState('')
  return (
    <div className="space-y-4">
      {approvalProgress && (
        <p className="text-sm text-gray-600">
          Finance approvals: {approvalProgress.current} of {approvalProgress.required} received
        </p>
      )}
      {alreadySigned && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          You have already signed off on this request.
        </p>
      )}
      <Textarea label="Comment (optional)" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a note..." />
      <div className="flex gap-3">
        {!showMarkPaid && (
          <>
            <Button
              onClick={() => onApprove({ comment: comment || undefined })}
              loading={approveLoading}
              disabled={approveDisabled}
            >
              Approve
            </Button>
            <Button variant="danger" onClick={() => onReject({ comment: comment || undefined })} loading={rejectLoading}>Reject</Button>
          </>
        )}
        {showMarkPaid && onMarkPaid && (
          <Button onClick={() => onMarkPaid({ comment: comment || undefined })} loading={paidLoading} variant="primary">Mark as Paid</Button>
        )}
      </div>
      {!showMarkPaid && !allClassified && approvalProgress && approvalProgress.current + 1 >= approvalProgress.required && (
        <p className="text-xs text-amber-700">All items must have a code secondaire before the final approval can be given.</p>
      )}
    </div>
  )
}
