import { describe, it, expect } from 'vitest'
import { sumAmounts } from './currency'

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
