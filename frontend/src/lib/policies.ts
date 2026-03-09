/**
 * Reimbursement Policies and Guidelines
 * 
 * Extracted from DRC-Expense-Form-EN_mai-2025.pdf
 * 
 * These policies govern expense reimbursement for research-related expenses.
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

export interface Policy {
  id: string
  title: string
  category: string
  description: string
  requirements: string[]
  limits?: {
    amount?: number
    quantity?: number
    rate?: number
  }
  documentation: string[]
  notes?: string
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

// Per diem rates from policy
export const PER_DIEM_RATES: PerDiemRates[] = [
  {
    zone: 'CANADA',
    total: 75.00,
    breakfast: 14.00,
    lunch: 21.00,
    dinner: 40.00,
  },
  {
    zone: 'OUTSIDE_CANADA',
    total: 100.00,
    breakfast: 16.00,
    lunch: 28.00,
    dinner: 56.00,
  },
]

// Mileage rate
export const MILEAGE_RATE_KM = 0.640 // CAD per km

// Expense policies
export const EXPENSE_POLICIES: Policy[] = [
  {
    id: 'equipment',
    title: 'Equipment Purchase',
    category: 'general_expenses',
    description: 'Equipment purchases over $1,000 require additional approval',
    requirements: ['Complete A1 form required for equipment over $1,000'],
    limits: { amount: 1000 },
    documentation: ['A1 form', 'Detailed receipt'],
    notes: 'Contact division.admin.comtl@ssss.gouv.qc.ca for questions about equipment reimbursement',
  },
  {
    id: 'conference_registration',
    title: 'Conference Registration',
    category: 'travel_expenses',
    description: 'Conference registration fees',
    requirements: ['Names and titles of all registered individuals must be indicated'],
    documentation: ['Receipt with names and titles'],
  },
  {
    id: 'car_rental',
    title: 'Car Rental',
    category: 'travel_expenses',
    description: 'Car rental and insurance costs',
    requirements: ['Insurance must be purchased'],
    documentation: ['Rental agreement', 'Insurance proof', 'Detailed receipt'],
    notes: 'Charges for damages when insurance has not been purchased will not be reimbursed',
  },
  {
    id: 'gas',
    title: 'Gas/Fuel',
    category: 'travel_expenses',
    description: 'Fuel for rental car only',
    requirements: ['Car rental must be documented'],
    documentation: ['Detailed receipt', 'Rental agreement'],
    notes: 'Gas for personal vehicles is not eligible; use mileage rate instead',
  },
  {
    id: 'mileage',
    title: 'Personal Vehicle Mileage',
    category: 'travel_expenses',
    description: 'Use of personal vehicle for travel',
    requirements: ['Google map of route taken required'],
    limits: { rate: MILEAGE_RATE_KM },
    documentation: ['Google map showing route', 'Detailed receipt'],
    notes: 'Rate: $0.640/km CAD',
  },
  {
    id: 'taxi',
    title: 'Taxi/Transportation',
    category: 'travel_expenses',
    description: 'Taxi and local transportation',
    requirements: ['Detailed receipt required'],
    documentation: [
      'Date of service',
      'Vendor name and contact details',
      'Breakdown of charges',
      'Total amount paid',
    ],
  },
  {
    id: 'parking',
    title: 'Parking',
    category: 'travel_expenses',
    description: 'Parking fees during business travel',
    requirements: ['Detailed receipt required'],
    documentation: [
      'Date of service',
      'Vendor name and contact details',
      'Breakdown of charges',
      'Total amount paid',
    ],
  },
  {
    id: 'airfare',
    title: 'Airfare/Bus/Train',
    category: 'travel_expenses',
    description: 'Transportation fares',
    requirements: [
      'Lowest fare required for tri-council grants',
      'Boarding passes required',
      'Details for any change/baggage fees required',
    ],
    documentation: ['Boarding passes', 'Receipt with fare breakdown', 'Seat selection proof if applicable'],
    notes: 'Cost of fare, seat selection, and change fees are eligible',
  },
  {
    id: 'accommodations',
    title: 'Accommodations',
    category: 'travel_expenses',
    description: 'Hotel/motel/rental accommodations',
    requirements: ['Standard rooms in publicly available, registered business'],
    documentation: ['Detailed receipts', 'Itemized bill'],
    notes: 'For private stays with family/friends/colleagues: $30.00/night (provide written details of location and nights)',
  },
  {
    id: 'meals',
    title: 'Meals',
    category: 'travel_expenses',
    description: 'Food expenses during business travel',
    requirements: [
      'Itemized receipts required (standalone credit/debit slips not accepted)',
      'Per diem may be claimed in lieu of itemized receipts',
      'Per diem should be adjusted if meals provided at event',
    ],
    documentation: ['Itemized receipt with breakdown of charges, fees, and taxes'],
    notes: 'Alcohol is not eligible for reimbursement from grant funds. May only be reimbursed on exception basis with Director approval.',
  },
  {
    id: 'alcohol',
    title: 'Alcohol',
    category: 'travel_expenses',
    description: 'Alcohol expenses',
    requirements: ['Director approval required', 'Exception basis only'],
    documentation: ['Director approval documentation'],
    notes: 'Not eligible from grant funds. May be reimbursed based on eligible funding source in keeping with McGill hospitality policy',
  },
  {
    id: 'exchange_rate',
    title: 'Foreign Currency Exchange',
    category: 'travel_expenses',
    description: 'Expenses in foreign currency',
    requirements: [
      'Documentation indicating amount paid in CAD required',
      'Or use Bank of Canada rates on day of purchase',
    ],
    documentation: ['Bank/credit card statement showing CAD amount', 'OR Bank of Canada exchange rate proof'],
    notes: 'For exact amounts, documentation showing CAD equivalent required. Otherwise, Bank of Canada rates on purchase date will be used.',
  },
  {
    id: 'advance_request',
    title: 'Advance Request',
    category: 'travel_expenses',
    description: 'Request for funds advance before travel',
    requirements: ['Must be indicated in Comments column as advance'],
    documentation: ['Completed expense claim form'],
    notes: 'Use "Other" category in travel expense section and indicate amount is for advance in Comments',
  },
  {
    id: 'receipts',
    title: 'Receipt Requirements',
    category: 'all',
    description: 'All receipts must meet these requirements',
    requirements: [
      'Tape 1 receipt per page',
      'Issued in name of claimant',
      'Include itemized breakdown of all charges, fees and taxes',
      'Indicate payment, date of service and complete vendor information',
    ],
    documentation: ['Electronic copies acceptable if they meet requirements', 'Original receipts must be kept for 7 years'],
    notes: 'Credit card/debit slips alone are not accepted as receipts',
  },
  {
    id: 'eligibility',
    title: 'Eligible Expenses',
    category: 'all',
    description: 'Only eligible expenses will be reimbursed',
    requirements: [
      'Expenses must be for researchers or eligible staff/students only',
      'Not for personal reasons or family/personal contacts',
      'Direct cost of research for which funds were awarded',
      'Benefits directly attributable to the grant',
      'Effective and economical',
      'Not result in personal gain for research team members',
    ],
    documentation: ['Proof of eligibility for all claimants'],
    notes: 'Reimbursements may be adjusted based on granting agency and organizational policies',
  },
]

// Form validation rules
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

// Policy helper functions
export function getPerDiemRate(zone: PerDiemZone): PerDiemRates {
  return PER_DIEM_RATES.find((r) => r.zone === zone) || PER_DIEM_RATES[0]
}

export function isEquipmentExpense(amount: number): boolean {
  return amount >= 1000
}

export function getMileageReimbursement(km: number): number {
  return km * MILEAGE_RATE_KM
}

export function validateReceiptRequirements(hasItemizedBreakdown: boolean): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!hasItemizedBreakdown) {
    errors.push('Receipt must include itemized breakdown of all charges, fees, and taxes')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
