import i18n from '../i18n'
import { ApiError } from './api'
import type { ValidationIssue } from './errorCodes'

/** Build a localized field label from a Zod issue path like
 * "reimbursement.items.0.amount" → "Item 1 — Amount". */
function fieldLabel(path: string): string {
  const segs = path.split('.')
  const leaf = segs[segs.length - 1] ?? path
  const itemIdx = segs.indexOf('items')
  let prefix = ''
  if (itemIdx >= 0 && segs[itemIdx + 1] != null && /^\d+$/.test(segs[itemIdx + 1])) {
    prefix = `${i18n.t('requests:item', { n: Number(segs[itemIdx + 1]) + 1 })} — `
  }
  const labelKey = `requests:fields.${leaf}`
  const label = i18n.exists(labelKey) ? (i18n.t(labelKey) as string) : leaf
  return prefix + label
}

/** Turn the backend's validation issue list into a readable per-field summary
 * (e.g. "Item 1 — Amount: Required; Title: Required") instead of a bare
 * "Validation error". */
function formatIssues(issues: ValidationIssue[]): string {
  return issues
    .map((iss) => {
      const msg = i18n.exists(`errors:validation.${iss.code}`)
        ? (i18n.t(`errors:validation.${iss.code}`, (iss.meta ?? {}) as Record<string, unknown>) as string)
        : (i18n.t('errors:VALIDATION_ERROR') as string)
      return `${fieldLabel(iss.path)}: ${msg}`
    })
    .join('; ')
}

/**
 * Translate a backend error response into a user-facing string in the current
 * locale. Validation errors are expanded into a per-field summary. Otherwise,
 * if the code is known in errors.json, the translated template is rendered with
 * the details bag; failing that we fall back to the server-sent message and
 * ultimately a generic "Something went wrong".
 *
 * Note: this reads the *current* i18n language each call, so rendering the
 * result inside JSX keeps the message reactive to language switches (#6e).
 */
export function translateApiError(err: unknown): string {
  if (err instanceof ApiError) {
    const issues = (err.details as { issues?: ValidationIssue[] } | undefined)?.issues
    if (err.code === 'VALIDATION_ERROR' && Array.isArray(issues) && issues.length > 0) {
      return formatIssues(issues)
    }
    if (err.code && i18n.exists(`errors:${err.code}`)) {
      return i18n.t(`errors:${err.code}`, (err.details ?? {}) as Record<string, unknown>) as string
    }
    if (err.message) return err.message
  }
  if (err instanceof Error && err.message) return err.message
  return i18n.t('errors:unknown') as string
}
