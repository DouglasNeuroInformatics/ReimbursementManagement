import { describe, expect, it } from 'vitest'
import { isValidIsoDate, validateExpenseItems } from './validateExpenseItems'

const REIMB = { labelRequiredKey: 'forms:validation.descriptionRequired', requireDate: true }
const ADVANCE = { labelRequiredKey: 'forms:validation.categoryRequired', requireDate: false }

describe('isValidIsoDate', () => {
  it('accepts a real ISO date', () => {
    expect(isValidIsoDate('2026-06-03')).toBe(true)
  })

  it('rejects malformed and overflow dates', () => {
    expect(isValidIsoDate('2026-6-3')).toBe(false)
    expect(isValidIsoDate('06/03/2026')).toBe(false)
    expect(isValidIsoDate('2026-02-30')).toBe(false)
    expect(isValidIsoDate('')).toBe(false)
    expect(isValidIsoDate('not-a-date')).toBe(false)
  })
})

describe('validateExpenseItems', () => {
  it('ignores entirely-empty rows', () => {
    const { itemErrors, hasErrors } = validateExpenseItems(
      [{ label: '', amount: '', date: '' }],
      REIMB,
    )
    expect(hasErrors).toBe(false)
    expect(itemErrors).toEqual({})
  })

  it('flags a missing label with the supplied key', () => {
    const { itemErrors } = validateExpenseItems(
      [{ label: '', amount: '10', date: '2026-06-03' }],
      REIMB,
    )
    expect(itemErrors[0].label).toBe('forms:validation.descriptionRequired')
  })

  it('uses the category key for the travel-advance label', () => {
    const { itemErrors } = validateExpenseItems(
      [{ label: '', amount: '10', date: '' }],
      ADVANCE,
    )
    expect(itemErrors[0].label).toBe('forms:validation.categoryRequired')
  })

  it('distinguishes missing, non-numeric, and non-positive amounts', () => {
    const { itemErrors } = validateExpenseItems(
      [
        { label: 'a', amount: '', date: '2026-06-03' },
        { label: 'b', amount: 'foo', date: '2026-06-03' },
        { label: 'c', amount: '-5', date: '2026-06-03' },
        { label: 'd', amount: '0', date: '2026-06-03' },
      ],
      REIMB,
    )
    expect(itemErrors[0].amount).toBe('forms:validation.amountRequired')
    expect(itemErrors[1].amount).toBe('forms:validation.amountInvalid')
    expect(itemErrors[2].amount).toBe('forms:validation.amountPositive')
    expect(itemErrors[3].amount).toBe('forms:validation.amountPositive')
  })

  it('requires a valid date when requireDate is on', () => {
    const { itemErrors } = validateExpenseItems(
      [
        { label: 'a', amount: '10', date: '' },
        { label: 'b', amount: '10', date: '2026-13-40' },
      ],
      REIMB,
    )
    expect(itemErrors[0].date).toBe('forms:validation.dateRequired')
    expect(itemErrors[1].date).toBe('forms:validation.dateInvalid')
  })

  it('does not require a date when requireDate is off, but still rejects a bad one', () => {
    const ok = validateExpenseItems([{ label: 'a', amount: '10', date: '' }], ADVANCE)
    expect(ok.hasErrors).toBe(false)

    const bad = validateExpenseItems([{ label: 'a', amount: '10', date: '2026-13-40' }], ADVANCE)
    expect(bad.itemErrors[0].date).toBe('forms:validation.dateInvalid')
  })

  it('treats a row with only an attached file as non-empty (needs label/amount/date)', () => {
    const { itemErrors } = validateExpenseItems(
      [{ label: '', amount: '', date: '', files: [new File(['x'], 'r.pdf')] }],
      REIMB,
    )
    expect(itemErrors[0].label).toBe('forms:validation.descriptionRequired')
    expect(itemErrors[0].amount).toBe('forms:validation.amountRequired')
    expect(itemErrors[0].date).toBe('forms:validation.dateRequired')
  })

  it('passes a fully valid row', () => {
    const { hasErrors } = validateExpenseItems(
      [{ label: 'Taxi', amount: '42.50', date: '2026-06-03' }],
      REIMB,
    )
    expect(hasErrors).toBe(false)
  })

  it('keys errors by original row index, skipping empty rows', () => {
    const { itemErrors } = validateExpenseItems(
      [
        { label: 'Taxi', amount: '10', date: '2026-06-03' },
        { label: '', amount: '', date: '' },
        { label: '', amount: '10', date: '2026-06-03' },
      ],
      REIMB,
    )
    expect(itemErrors[0]).toBeUndefined()
    expect(itemErrors[1]).toBeUndefined()
    expect(itemErrors[2].label).toBe('forms:validation.descriptionRequired')
  })
})
