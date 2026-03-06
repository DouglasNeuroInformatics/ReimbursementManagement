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
}

export function FinanceApprovalForm({ onApprove, onReject, onMarkPaid, showMarkPaid, approveLoading, rejectLoading, paidLoading }: FinanceFormProps) {
  const [comment, setComment] = useState('')
  return (
    <div className="space-y-4">
      <Textarea label="Comment (optional)" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a note..." />
      <div className="flex gap-3">
        {!showMarkPaid && (
          <>
            <Button onClick={() => onApprove({ comment: comment || undefined })} loading={approveLoading}>Approve</Button>
            <Button variant="danger" onClick={() => onReject({ comment: comment || undefined })} loading={rejectLoading}>Reject</Button>
          </>
        )}
        {showMarkPaid && onMarkPaid && (
          <Button onClick={() => onMarkPaid({ comment: comment || undefined })} loading={paidLoading} variant="primary">Mark as Paid</Button>
        )}
      </div>
    </div>
  )
}
