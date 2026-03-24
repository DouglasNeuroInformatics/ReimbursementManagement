import { describe, it, expect } from 'vitest'
import { fmtDate, fmtDateTime, dateInputToISO } from './dates'

describe('fmtDate', () => {
  it('extracts date portion from ISO string', () => {
    expect(fmtDate('2026-03-05T14:30:00.000Z')).toBe('2026-03-05')
  })

  it('handles ISO string without time', () => {
    expect(fmtDate('2026-01-15')).toBe('2026-01-15')
  })

  it('returns dash for null', () => {
    expect(fmtDate(null)).toBe('—')
  })

  it('returns dash for undefined', () => {
    expect(fmtDate(undefined)).toBe('—')
  })

  it('returns dash for empty string', () => {
    expect(fmtDate('')).toBe('—')
  })
})

describe('fmtDateTime', () => {
  it('trims milliseconds from ISO string', () => {
    expect(fmtDateTime('2026-03-05T14:30:00.000Z')).toBe('2026-03-05T14:30:00Z')
  })

  it('handles ISO string without milliseconds', () => {
    expect(fmtDateTime('2026-03-05T14:30:00Z')).toBe('2026-03-05T14:30:00Z')
  })

  it('trims varying precision milliseconds', () => {
    expect(fmtDateTime('2026-03-05T14:30:00.123456Z')).toBe('2026-03-05T14:30:00Z')
  })

  it('returns dash for null', () => {
    expect(fmtDateTime(null)).toBe('—')
  })

  it('returns dash for undefined', () => {
    expect(fmtDateTime(undefined)).toBe('—')
  })

  it('returns dash for empty string', () => {
    expect(fmtDateTime('')).toBe('—')
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
