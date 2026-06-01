import { describe, it, expect } from 'vitest'
import {
  getPerDiemRate,
  isEquipmentExpense,
  getMileageReimbursement,
  validateReceiptRequirements,
  MILEAGE_RATE_KM,
  EXPENSE_POLICIES,
  FORM_VALIDATION,
} from './policies'
import enPolicies from '../i18n/locales/en-CA/policies.json'
import frPolicies from '../i18n/locales/fr-CA/policies.json'

describe('getPerDiemRate', () => {
  it('returns Canada rates', () => {
    const rate = getPerDiemRate('CANADA')
    expect(rate.zone).toBe('CANADA')
    expect(rate.total).toBe(75.00)
    expect(rate.breakfast).toBe(14.00)
    expect(rate.lunch).toBe(21.00)
    expect(rate.dinner).toBe(40.00)
  })

  it('returns Outside Canada rates', () => {
    const rate = getPerDiemRate('OUTSIDE_CANADA')
    expect(rate.zone).toBe('OUTSIDE_CANADA')
    expect(rate.total).toBe(100.00)
    expect(rate.breakfast).toBe(16.00)
    expect(rate.lunch).toBe(28.00)
    expect(rate.dinner).toBe(56.00)
  })

  it('per diem meal components sum to total for Canada', () => {
    const rate = getPerDiemRate('CANADA')
    expect(rate.breakfast + rate.lunch + rate.dinner).toBe(rate.total)
  })

  it('per diem meal components sum to total for Outside Canada', () => {
    const rate = getPerDiemRate('OUTSIDE_CANADA')
    expect(rate.breakfast + rate.lunch + rate.dinner).toBe(rate.total)
  })
})

describe('isEquipmentExpense', () => {
  it('returns true at threshold', () => { expect(isEquipmentExpense(1000)).toBe(true) })
  it('returns true above threshold', () => { expect(isEquipmentExpense(1500)).toBe(true) })
  it('returns false below threshold', () => { expect(isEquipmentExpense(999.99)).toBe(false) })
  it('returns false for zero', () => { expect(isEquipmentExpense(0)).toBe(false) })
})

describe('getMileageReimbursement', () => {
  it('calculates for given distance', () => { expect(getMileageReimbursement(100)).toBeCloseTo(64.00) })
  it('returns 0 for 0 km', () => { expect(getMileageReimbursement(0)).toBe(0) })
  it('handles fractional km', () => { expect(getMileageReimbursement(1.5)).toBeCloseTo(0.96) })
  it('uses correct rate constant', () => { expect(MILEAGE_RATE_KM).toBe(0.640) })
})

describe('validateReceiptRequirements', () => {
  it('valid when itemized breakdown present', () => {
    const r = validateReceiptRequirements(true)
    expect(r.valid).toBe(true)
    expect(r.errorCodes).toHaveLength(0)
  })

  it('invalid when itemized breakdown missing — returns code', () => {
    const r = validateReceiptRequirements(false)
    expect(r.valid).toBe(false)
    expect(r.errorCodes).toEqual(['RECEIPT_MISSING_ITEMIZATION'])
  })
})

describe('EXPENSE_POLICIES (structural)', () => {
  it('has all expected policy ids', () => {
    const ids = EXPENSE_POLICIES.map((p) => p.id)
    expect(ids).toContain('equipment')
    expect(ids).toContain('conference_registration')
    expect(ids).toContain('car_rental')
    expect(ids).toContain('mileage')
    expect(ids).toContain('meals')
    expect(ids).toContain('receipts')
    expect(ids).toContain('eligibility')
  })

  it('every structural policy has id and category', () => {
    for (const p of EXPENSE_POLICIES) {
      expect(p.id).toBeTruthy()
      expect(p.category).toBeTruthy()
    }
  })
})

// Each policy must have matching content in both locale JSON files.
type PolicyEntry = {
  title?: string
  description?: string
  requirements?: string[]
  documentation?: string[]
  notes?: string
}
const enLocale = enPolicies as unknown as Record<string, PolicyEntry>
const frLocale = frPolicies as unknown as Record<string, PolicyEntry>

describe('policies.json content parity', () => {
  for (const policy of EXPENSE_POLICIES) {
    it(`policy "${policy.id}" has title + description in both locales`, () => {
      const en = enLocale[policy.id]
      const fr = frLocale[policy.id]
      expect(en).toBeDefined()
      expect(fr).toBeDefined()
      expect(en.title).toBeTruthy()
      expect(en.description).toBeTruthy()
      expect(fr.title).toBeTruthy()
      expect(fr.description).toBeTruthy()
    })

    it(`policy "${policy.id}" has matching requirements/documentation array lengths across locales`, () => {
      const en = enLocale[policy.id]
      const fr = frLocale[policy.id]
      expect(en.requirements?.length).toBe(fr.requirements?.length)
      expect(en.documentation?.length).toBe(fr.documentation?.length)
    })
  }
})

describe('FORM_VALIDATION', () => {
  it('has correct file size limit', () => { expect(FORM_VALIDATION.maxFileSizeMB).toBe(50) })
  it('includes common file types', () => {
    expect(FORM_VALIDATION.allowedFileTypes).toContain('application/pdf')
    expect(FORM_VALIDATION.allowedFileTypes).toContain('image/jpeg')
    expect(FORM_VALIDATION.allowedFileTypes).toContain('image/png')
    expect(FORM_VALIDATION.allowedFileTypes).toContain('text/plain')
  })
  it('does not allow personal expenses', () => { expect(FORM_VALIDATION.allowPersonalExpenses).toBe(false) })
  it('requires itemized receipts', () => { expect(FORM_VALIDATION.requireItemizedReceipts).toBe(true) })
  it('does not accept credit card slips alone', () => { expect(FORM_VALIDATION.allowCreditCardSlips).toBe(false) })
  it('requires 7-year receipt retention', () => { expect(FORM_VALIDATION.receiptRetentionYears).toBe(7) })
})
