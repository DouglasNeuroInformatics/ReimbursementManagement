import { describe, it, expect } from 'vitest'
import { sumAmounts, fmtCurrency } from './currency'

describe('sumAmounts', () => {
  it('returns 0 for empty array', () => {
    expect(sumAmounts([])).toBe(0)
  })

  it('avoids IEEE-754 drift on values that bite naive reduce', () => {
    expect(sumAmounts([{ amount: '0.1' }, { amount: '0.2' }])).toBe(0.3)
  })

  it('sums many small amounts to an exact 2-decimal total', () => {
    const items = Array.from({ length: 10 }, () => ({ amount: '0.15' }))
    expect(sumAmounts(items)).toBe(1.5)
  })

  it('accepts numeric amounts', () => {
    expect(sumAmounts([{ amount: 1.25 }, { amount: 2.75 }])).toBe(4)
  })

  it('mixes string and numeric amounts', () => {
    expect(sumAmounts([{ amount: '1.99' }, { amount: 2.01 }])).toBe(4)
  })

  it('skips NaN amounts (e.g., empty strings) without polluting the total', () => {
    expect(sumAmounts([{ amount: '' }, { amount: '5.00' }])).toBe(5)
  })
})

// Intl.NumberFormat output varies slightly across ICU versions (CA$ vs $,
// NBSP vs U+202F narrow NBSP, etc.). The assertions below match the *shape*
// of the localized output rather than an exact string, so the tests stay
// stable across Node updates.
describe('fmtCurrency', () => {
  it('returns "—" for NaN-coercible input', () => {
    expect(fmtCurrency('not-a-number')).toBe('—')
  })

  it('formats en-CA with period decimal and comma group separator', () => {
    const v = fmtCurrency(1234.56, 'en-CA')
    expect(v).toMatch(/1,234\.56/)
    expect(v).toContain('$')
  })

  it('formats fr-CA with comma decimal and trailing $ symbol', () => {
    const v = fmtCurrency(1234.56, 'fr-CA')
    // Either NBSP (U+00A0) or narrow NBSP (U+202F) is acceptable as the
    // group separator, depending on ICU version.
    expect(v).toMatch(/1[  ]234,56/)
    expect(v).toContain('$')
  })

  it('accepts numeric and string inputs equivalently for the same locale', () => {
    expect(fmtCurrency('99.99', 'en-CA')).toBe(fmtCurrency(99.99, 'en-CA'))
  })

  it('memoizes formatters per locale (smoke test)', () => {
    // Repeated calls must not throw; results stable for same input.
    const a = fmtCurrency(10, 'en-CA')
    const b = fmtCurrency(10, 'en-CA')
    expect(a).toBe(b)
  })
})
