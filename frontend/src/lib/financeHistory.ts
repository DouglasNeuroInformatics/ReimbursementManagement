// Mirrors the JSON returned by `GET /api/finance/history`
// (backend/src/services/finance-history.service.ts). FINANCIAL_ADMIN only.

interface SubmissionContext {
  requestId: string
  title: string
  type: string
  status: string
  submittedAt: string | null
  createdAt: string
  requesterFirstName: string
  requesterLastName: string
  requesterEmail: string
  employeeNumber: string | null
  department: string | null
  supervisorFirstName: string | null
  supervisorLastName: string | null
  accountNumber: string | null
  accountLabel: string | null
  fund: string | null
  primaryCode: string | null
}

export interface FinanceHistoryLineItem extends SubmissionContext {
  itemId: string
  itemType: 'reimbursement' | 'travel_advance' | 'travel_expense'
  description: string
  category: string | null
  date: string | null
  vendor: string | null
  amount: number
  notes: string | null
  codeSecondaire: string | null
  codeSecondaireLabel: string | null
}

export interface FinanceHistorySummary extends SubmissionContext {
  itemCount: number
  total: number
  destination: string | null
  purpose: string | null
  departureDate: string | null
  returnDate: string | null
}

export interface FinanceHistory {
  generatedAt: string
  lineItems: FinanceHistoryLineItem[]
  summaries: FinanceHistorySummary[]
}
