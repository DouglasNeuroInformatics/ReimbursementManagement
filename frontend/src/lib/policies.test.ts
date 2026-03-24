import { describe, it, expect } from 'vitest'
import {
  getPerDiemRate,
  isEquipmentExpense,
  getMileageReimbursement,
  validateReceiptRequirements,
  PER_DIEM_RATES,
  MILEAGE_RATE_KM,
  EXPENSE_POLICIES,
  FORM_VALIDATION,
} from './policies'

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
  it('returns true for amount at threshold', () => {
    expect(isEquipmentExpense(1000)).toBe(true)
  })

  it('returns true for amount above threshold', () => {
    expect(isEquipmentExpense(1500)).toBe(true)
  })

  it('returns false for amount below threshold', () => {
    expect(isEquipmentExpense(999.99)).toBe(false)
  })

  it('returns false for zero', () => {
    expect(isEquipmentExpense(0)).toBe(false)
  })
})

describe('getMileageReimbursement', () => {
  it('calculates reimbursement for given distance', () => {
    expect(getMileageReimbursement(100)).toBeCloseTo(64.00)
  })

  it('returns 0 for 0 km', () => {
    expect(getMileageReimbursement(0)).toBe(0)
  })

  it('handles fractional km', () => {
    expect(getMileageReimbursement(1.5)).toBeCloseTo(0.96)
  })

  it('uses correct rate constant', () => {
    expect(MILEAGE_RATE_KM).toBe(0.640)
  })
})

describe('validateReceiptRequirements', () => {
  it('returns valid when itemized breakdown present', () => {
    const result = validateReceiptRequirements(true)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('returns invalid when itemized breakdown missing', () => {
    const result = validateReceiptRequirements(false)
    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain('itemized breakdown')
  })
})

describe('EXPENSE_POLICIES', () => {
  it('has all expected policy IDs', () => {
    const ids = EXPENSE_POLICIES.map((p) => p.id)
    expect(ids).toContain('equipment')
    expect(ids).toContain('conference_registration')
    expect(ids).toContain('car_rental')
    expect(ids).toContain('mileage')
    expect(ids).toContain('meals')
    expect(ids).toContain('receipts')
    expect(ids).toContain('eligibility')
  })

  it('every policy has required fields', () => {
    for (const policy of EXPENSE_POLICIES) {
      expect(policy.id).toBeTruthy()
      expect(policy.title).toBeTruthy()
      expect(policy.category).toBeTruthy()
      expect(policy.description).toBeTruthy()
      expect(policy.requirements.length).toBeGreaterThan(0)
      expect(policy.documentation.length).toBeGreaterThan(0)
    }
  })
})

describe('FORM_VALIDATION', () => {
  it('has correct file size limit', () => {
    expect(FORM_VALIDATION.maxFileSizeMB).toBe(50)
  })

  it('includes common file types', () => {
    expect(FORM_VALIDATION.allowedFileTypes).toContain('application/pdf')
    expect(FORM_VALIDATION.allowedFileTypes).toContain('image/jpeg')
    expect(FORM_VALIDATION.allowedFileTypes).toContain('image/png')
    expect(FORM_VALIDATION.allowedFileTypes).toContain('text/plain')
  })

  it('does not allow personal expenses', () => {
    expect(FORM_VALIDATION.allowPersonalExpenses).toBe(false)
  })

  it('requires itemized receipts', () => {
    expect(FORM_VALIDATION.requireItemizedReceipts).toBe(true)
  })

  it('does not accept credit card slips alone', () => {
    expect(FORM_VALIDATION.allowCreditCardSlips).toBe(false)
  })

  it('requires 7-year receipt retention', () => {
    expect(FORM_VALIDATION.receiptRetentionYears).toBe(7)
  })
})
