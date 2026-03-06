/** Return the date portion of an ISO-8601 string: YYYY-MM-DD */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return iso.slice(0, 10)
}

/**
 * Return an ISO-8601 datetime string trimmed to whole seconds.
 * e.g. 2026-03-05T14:30:00.000Z → 2026-03-05T14:30:00Z
 */
export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return iso.replace(/\.\d+Z$/, 'Z')
}

/**
 * Convert a date-picker value (YYYY-MM-DD) to an ISO-8601 datetime string
 * at UTC midnight, preventing any browser-local timezone shift.
 */
export function dateInputToISO(value: string): string {
  return value + 'T00:00:00.000Z'
}
