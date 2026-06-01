import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation(['review'])
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', supervisorId, 'mine'],
    queryFn: () =>
      api.get<{ accounts: SupervisorAccount[] }>(`/api/supervisors/${supervisorId}/accounts/mine`)
        .then((r) => r.accounts),
  })

  return (
    <div className="space-y-4">
      <Select
        label={t('chargeAccount') as string}
        options={accounts.map((a) => ({ value: a.id, label: `${a.accountNumber} — ${a.label}` }))}
        placeholder={t('chargeAccountPlaceholder') as string}
        value={accountId}
        onChange={(e) => setAccountId(e.target.value)}
      />
      <Textarea
        label={t('commentOptional') as string}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={t('commentNotePlaceholder') as string}
      />
      <div className="flex gap-3">
        <Button
          onClick={() => onApprove({ accountId, comment: comment || undefined })}
          disabled={!accountId}
          loading={approveLoading}
        >
          {t('approve')}
        </Button>
        <Button
          variant="danger"
          onClick={() => onReject({ comment: comment || undefined })}
          loading={rejectLoading}
        >
          {t('reject')}
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
  const { t } = useTranslation(['finance', 'review'])
  return (
    <div className="space-y-4">
      {approvalProgress && (
        <p className="text-sm text-gray-600">
          {t('approvalProgress', { current: approvalProgress.current, required: approvalProgress.required })}
        </p>
      )}
      {alreadySigned && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          {t('alreadySigned')}
        </p>
      )}
      <Textarea label={t('review:commentOptional') as string} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t('commentPlaceholder') as string} />
      <div className="flex gap-3">
        {!showMarkPaid && (
          <>
            <Button
              onClick={() => onApprove({ comment: comment || undefined })}
              loading={approveLoading}
              disabled={approveDisabled}
            >
              {t('approveFinance')}
            </Button>
            <Button variant="danger" onClick={() => onReject({ comment: comment || undefined })} loading={rejectLoading}>{t('rejectFinance')}</Button>
          </>
        )}
        {showMarkPaid && onMarkPaid && (
          <Button onClick={() => onMarkPaid({ comment: comment || undefined })} loading={paidLoading} variant="primary">{t('markPaid')}</Button>
        )}
      </div>
      {!showMarkPaid && !allClassified && approvalProgress && approvalProgress.current + 1 >= approvalProgress.required && (
        <p className="text-xs text-amber-700">{t('classifyBeforeFinal')}</p>
      )}
    </div>
  )
}
