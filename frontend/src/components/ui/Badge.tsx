import { clsx } from 'clsx'
import { useTranslation } from 'react-i18next'
import type { RequestStatus } from '../../types'

const STATUS_STYLES: Record<RequestStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 ring-1 ring-slate-400/20',
  SUBMITTED: 'bg-blue-50 text-blue-700 ring-1 ring-blue-400/20',
  SUPERVISOR_APPROVED: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-400/20',
  SUPERVISOR_REJECTED: 'bg-orange-50 text-orange-700 ring-1 ring-orange-400/20',
  FINANCE_REVIEWING: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-400/20',
  FINANCE_APPROVED: 'bg-primary-50 text-primary-700 ring-1 ring-primary-400/20',
  FINANCE_REJECTED: 'bg-red-50 text-red-700 ring-1 ring-red-400/20',
  PAID: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-400/20',
}

export function StatusBadge({ status }: { status: RequestStatus }) {
  const { t } = useTranslation('enums')
  return (
    <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', STATUS_STYLES[status])}>
      {t(`status.${status}`) as string}
    </span>
  )
}

export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-400/20', className)}>
      {children}
    </span>
  )
}
