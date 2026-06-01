import i18n from '../i18n'

const dateFormatters = new Map<string, Intl.DateTimeFormat>()
const dateTimeFormatters = new Map<string, Intl.DateTimeFormat>()

function activeLocale(): string {
  return i18n.language || 'en-CA'
}

function getDateFormatter(locale: string): Intl.DateTimeFormat {
  let f = dateFormatters.get(locale)
  if (!f) {
    f = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric' })
    dateFormatters.set(locale, f)
  }
  return f
}

function getDateTimeFormatter(locale: string): Intl.DateTimeFormat {
  let f = dateTimeFormatters.get(locale)
  if (!f) {
    f = new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
    dateTimeFormatters.set(locale, f)
  }
  return f
}

/** Format an ISO timestamp as a locale-aware date (e.g. "Mar 5, 2026" / "5 mars 2026"). */
export function fmtDate(iso: string | null | undefined, locale?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return getDateFormatter(locale ?? activeLocale()).format(d)
}

/** Format an ISO timestamp as a locale-aware date + time. */
export function fmtDateTime(iso: string | null | undefined, locale?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return getDateTimeFormatter(locale ?? activeLocale()).format(d)
}

/**
 * Convert a date-picker value (YYYY-MM-DD) to an ISO-8601 datetime string
 * at UTC midnight, preventing any browser-local timezone shift. Wire format
 * — locale-independent.
 */
export function dateInputToISO(value: string): string {
  return value + 'T00:00:00.000Z'
}
