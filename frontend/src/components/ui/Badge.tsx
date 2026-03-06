import { clsx } from 'clsx'
import type { RequestStatus } from '../../types'

const STATUS_STYLES: Record<RequestStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  SUPERVISOR_APPROVED: 'bg-indigo-100 text-indigo-700',
  SUPERVISOR_REJECTED: 'bg-orange-100 text-orange-700',
  FINANCE_APPROVED: 'bg-green-100 text-green-700',
  FINANCE_REJECTED: 'bg-red-100 text-red-700',
  PAID: 'bg-emerald-100 text-emerald-700',
}

const STATUS_LABELS: Record<RequestStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  SUPERVISOR_APPROVED: 'Supervisor Approved',
  SUPERVISOR_REJECTED: 'Supervisor Rejected',
  FINANCE_APPROVED: 'Finance Approved',
  FINANCE_REJECTED: 'Finance Rejected',
  PAID: 'Paid',
}

export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', STATUS_STYLES[status])}>
      {STATUS_LABELS[status]}
    </span>
  )
}

export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700', className)}>
      {children}
    </span>
  )
}
