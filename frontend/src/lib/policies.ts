/**
 * Reimbursement policy structural data.
 *
 * Translated text (title, description, requirements, documentation, notes)
 * lives in `frontend/src/i18n/locales/{en-CA,fr-CA}/policies.json` keyed by
 * the policy id. PolicyDisplay resolves the text via `t('policies:${id}.*')`.
 */

export type ExpenseCategory =
  | 'conference_registration'
  | 'car_rental'
  | 'gas'
  | 'taxi'
  | 'parking'
  | 'mileage'
  | 'airfare'
  | 'bus'
  | 'train'
  | 'accommodations'
  | 'meals'
  | 'other'

export type PerDiemZone = 'CANADA' | 'OUTSIDE_CANADA'

export interface PerDiemRates {
  zone: PerDiemZone
  total: number
  breakfast: number
  lunch: number
  dinner: number
}

export interface PolicyStructure {
  id: string
  category: string
  limits?: { amount?: number; quantity?: number; rate?: number }
}

export interface FormValidationRules {
  maxFileSizeMB: number
  allowedFileTypes: string[]
  receiptRetentionYears: number
  submissionDeadlineDays: number
  allowPersonalExpenses: boolean
  requireItemizedReceipts: boolean
  allowCreditCardSlips: boolean
}

// Per diem rates from policy (numeric data is locale-independent)
export const PER_DIEM_RATES: PerDiemRates[] = [
  { zone: 'CANADA', total: 75.00, breakfast: 14.00, lunch: 21.00, dinner: 40.00 },
  { zone: 'OUTSIDE_CANADA', total: 100.00, breakfast: 16.00, lunch: 28.00, dinner: 56.00 },
]

export const MILEAGE_RATE_KM = 0.640 // CAD per km

// Structural policy data. Strings (title/description/requirements/documentation/notes)
// live in policies.json — keyed by `id`.
export const EXPENSE_POLICIES: PolicyStructure[] = [
  { id: 'equipment', category: 'general_expenses', limits: { amount: 1000 } },
  { id: 'conference_registration', category: 'travel_expenses' },
  { id: 'car_rental', category: 'travel_expenses' },
  { id: 'gas', category: 'travel_expenses' },
  { id: 'mileage', category: 'travel_expenses', limits: { rate: MILEAGE_RATE_KM } },
  { id: 'taxi', category: 'travel_expenses' },
  { id: 'parking', category: 'travel_expenses' },
  { id: 'airfare', category: 'travel_expenses' },
  { id: 'accommodations', category: 'travel_expenses' },
  { id: 'meals', category: 'travel_expenses' },
  { id: 'alcohol', category: 'travel_expenses' },
  { id: 'exchange_rate', category: 'travel_expenses' },
  { id: 'advance_request', category: 'travel_expenses' },
  { id: 'receipts', category: 'all' },
  { id: 'eligibility', category: 'all' },
]

export const FORM_VALIDATION: FormValidationRules = {
  maxFileSizeMB: 50,
  allowedFileTypes: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
  ],
  receiptRetentionYears: 7,
  submissionDeadlineDays: 30,
  allowPersonalExpenses: false,
  requireItemizedReceipts: true,
  allowCreditCardSlips: false,
}

export function getPerDiemRate(zone: PerDiemZone): PerDiemRates {
  return PER_DIEM_RATES.find((r) => r.zone === zone) || PER_DIEM_RATES[0]
}

export function isEquipmentExpense(amount: number): boolean {
  return amount >= 1000
}

export function getMileageReimbursement(km: number): number {
  return km * MILEAGE_RATE_KM
}

// Returns codes instead of pre-rendered strings; callers resolve via
// `t('policies:validation.${code}')` to display the localized message.
export function validateReceiptRequirements(hasItemizedBreakdown: boolean): {
  valid: boolean
  errorCodes: string[]
} {
  const errorCodes: string[] = []
  if (!hasItemizedBreakdown) {
    errorCodes.push('RECEIPT_MISSING_ITEMIZATION')
  }
  return { valid: errorCodes.length === 0, errorCodes }
}
