import type { Request } from '../types'

const CURRENCY_CODE = (import.meta as any).env?.VITE_CURRENCY || 'CAD'

const formatter = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: CURRENCY_CODE,
})

/** Format a numeric value as a currency string (e.g. CA$1,234.56) */
export function fmtCurrency(value: number | string): string {
  const n = typeof value === 'string' ? parseFloat(value) : value
  if (Number.isNaN(n)) return '—'
  return formatter.format(n)
}

/** Extract the total amount from any request type, or null if unknown. */
export function getRequestTotal(request: Request): number | null {
  if (request.reimbursement) {
    return request.reimbursement.items.reduce((sum, it) => sum + parseFloat(it.amount), 0)
  }
  if (request.travelAdvance) {
    return parseFloat(request.travelAdvance.estimatedAmount)
  }
  if (request.travelReimbursement) {
    return parseFloat(request.travelReimbursement.totalAmount)
  }
  return null
}
