import { describe, it, expect } from 'vitest'
import { fmtDate, fmtDateTime, dateInputToISO } from './dates'

describe('fmtDate', () => {
  it('returns dash for null', () => { expect(fmtDate(null)).toBe('—') })
  it('returns dash for undefined', () => { expect(fmtDate(undefined)).toBe('—') })
  it('returns dash for empty string', () => { expect(fmtDate('')).toBe('—') })
  it('returns dash for unparseable input', () => { expect(fmtDate('not-a-date')).toBe('—') })

  // Exact Intl.DateTimeFormat output varies by ICU version — assert shape.
  it('produces an en-CA date with month name and 4-digit year', () => {
    const v = fmtDate('2026-03-05T14:30:00.000Z', 'en-CA')
    expect(v).toMatch(/2026/)
    expect(v).toMatch(/Mar/i)
  })

  it('produces a fr-CA date with French month name', () => {
    const v = fmtDate('2026-03-05T14:30:00.000Z', 'fr-CA')
    expect(v).toMatch(/2026/)
    // March in French abbreviation is "mars"; in en it is "Mar".
    expect(v).toMatch(/mars/i)
    expect(v).not.toMatch(/March/i)
  })

  it('handles a date-only ISO string', () => {
    const v = fmtDate('2026-01-15', 'en-CA')
    expect(v).toMatch(/2026/)
  })
})

describe('fmtDateTime', () => {
  it('returns dash for null', () => { expect(fmtDateTime(null)).toBe('—') })
  it('returns dash for undefined', () => { expect(fmtDateTime(undefined)).toBe('—') })
  it('returns dash for empty string', () => { expect(fmtDateTime('')).toBe('—') })
  it('returns dash for unparseable input', () => { expect(fmtDateTime('not-a-date')).toBe('—') })

  it('produces an en-CA datetime with month name and a time component', () => {
    const v = fmtDateTime('2026-03-05T14:30:00.000Z', 'en-CA')
    expect(v).toMatch(/2026/)
    expect(v).toMatch(/Mar/i)
    // Time component — hour:minute
    expect(v).toMatch(/\d{1,2}:\d{2}/)
  })

  it('produces a fr-CA datetime', () => {
    const v = fmtDateTime('2026-03-05T14:30:00.000Z', 'fr-CA')
    expect(v).toMatch(/2026/)
    expect(v).toMatch(/mars/i)
  })
})

describe('dateInputToISO', () => {
  it('converts date-picker value to UTC midnight ISO string', () => {
    expect(dateInputToISO('2026-03-05')).toBe('2026-03-05T00:00:00.000Z')
  })

  it('works with different dates', () => {
    expect(dateInputToISO('2025-12-31')).toBe('2025-12-31T00:00:00.000Z')
  })
})
