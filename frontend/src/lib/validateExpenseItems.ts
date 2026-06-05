/**
 * Client-side validation for expense line items, shared by the reimbursement
 * and travel forms. Returns i18n *keys* (not translated strings) so that error
 * messages re-render in the active language when the user switches locale
 * mid-form (issue #6e). Translate with `t(key)` at render time.
 */

export interface ExpenseItemInput {
  /** Description (reimbursement) or category (travel) — the item's label field. */
  label: string
  amount: string
  /** Empty string when the form has no per-item date (e.g. travel advance). */
  date: string
  files?: File[]
}

export interface ExpenseItemErrors {
  label?: string
  amount?: string
  date?: string
}

export interface ExpenseValidationOptions {
  /** i18n key used when the label field is empty (description vs. category). */
  labelRequiredKey: string
  /** Whether each item requires a date (false for travel advance). */
  requireDate?: boolean
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** True only for a real calendar date in strict YYYY-MM-DD form. */
export function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false
  const d = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(d.getTime())) return false
  // Reject overflow like 2026-02-30 that Date silently rolls forward.
  return d.toISOString().slice(0, 10) === value
}

/** A row counts as "has data" if any user-entered field is filled. */
function hasData(item: ExpenseItemInput): boolean {
  return Boolean(
    item.label.trim() || item.amount || item.date || (item.files?.length ?? 0) > 0,
  )
}

/**
 * Validate the rows that contain any data. Entirely-empty rows are ignored
 * (they are dropped before submit), matching the existing form behaviour.
 * Returns errors keyed by the row's index.
 */
export function validateExpenseItems(
  items: ExpenseItemInput[],
  opts: ExpenseValidationOptions,
): { itemErrors: Record<number, ExpenseItemErrors>; hasErrors: boolean } {
  const itemErrors: Record<number, ExpenseItemErrors> = {}

  items.forEach((item, index) => {
    if (!hasData(item)) return
    const errs: ExpenseItemErrors = {}

    if (!item.label.trim()) errs.label = opts.labelRequiredKey

    if (!item.amount) {
      errs.amount = 'forms:validation.amountRequired'
    } else {
      const n = Number(item.amount)
      if (!Number.isFinite(n)) errs.amount = 'forms:validation.amountInvalid'
      else if (n <= 0) errs.amount = 'forms:validation.amountPositive'
    }

    if (opts.requireDate !== false) {
      if (!item.date) errs.date = 'forms:validation.dateRequired'
      else if (!isValidIsoDate(item.date)) errs.date = 'forms:validation.dateInvalid'
    } else if (item.date && !isValidIsoDate(item.date)) {
      errs.date = 'forms:validation.dateInvalid'
    }

    if (Object.keys(errs).length > 0) itemErrors[index] = errs
  })

  return { itemErrors, hasErrors: Object.keys(itemErrors).length > 0 }
}
