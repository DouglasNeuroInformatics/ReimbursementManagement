import i18n from '../i18n'
import type { Request } from '../types'

const CURRENCY_CODE = (import.meta as any).env?.VITE_CURRENCY || 'CAD'

// Memoize one formatter per BCP 47 locale tag so component re-renders are
// cheap and stable across the app lifetime.
const formatters = new Map<string, Intl.NumberFormat>()

function getFormatter(locale: string): Intl.NumberFormat {
  let f = formatters.get(locale)
  if (!f) {
    f = new Intl.NumberFormat(locale, { style: 'currency', currency: CURRENCY_CODE })
    formatters.set(locale, f)
  }
  return f
}

function activeLocale(): string {
  // i18n.language is a BCP 47 tag at runtime; fall back if i18n isn't ready
  // (e.g. unit tests that don't import the side-effect module).
  return i18n.language || 'en-CA'
}

/**
 * Format a numeric value as a currency string in the given locale.
 * Defaults to the current i18next language so call sites can stay terse.
 *
 * - en-CA → "CA$1,234.56"
 * - fr-CA → "1 234,56 $"
 */
export function fmtCurrency(value: number | string, locale?: string): string {
  const n = typeof value === 'string' ? parseFloat(value) : value
  if (Number.isNaN(n)) return '—'
  return getFormatter(locale ?? activeLocale()).format(n)
}

/** Sum amounts as integer cents to avoid IEEE-754 accumulation error. */
export function sumAmounts(items: ReadonlyArray<{ amount: string | number }>): number {
  let cents = 0
  for (const it of items) {
    const n = typeof it.amount === 'string' ? parseFloat(it.amount) : it.amount
    if (!Number.isNaN(n)) cents += Math.round(n * 100)
  }
  return cents / 100
}

/** Extract the total amount from any request type, or null if unknown. */
export function getRequestTotal(request: Request): number | null {
  if (request.reimbursement) {
    return sumAmounts(request.reimbursement.items)
  }
  if (request.travelAdvance) {
    return parseFloat(request.travelAdvance.estimatedAmount)
  }
  if (request.travelReimbursement) {
    return parseFloat(request.travelReimbursement.totalAmount)
  }
  return null
}
