export type Role = 'USER' | 'SUPERVISOR' | 'FINANCIAL_ADMIN'
export type RequestType = 'REIMBURSEMENT' | 'TRAVEL_ADVANCE' | 'TRAVEL_REIMBURSEMENT'
export type RequestStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'SUPERVISOR_APPROVED'
  | 'SUPERVISOR_REJECTED'
  | 'FINANCE_APPROVED'
  | 'FINANCE_REJECTED'
  | 'PAID'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: Role
  supervisorId: string | null
  supervisor?: { id: string; firstName: string; lastName: string; email: string } | null
  jobPosition: string | null
  phone: string | null
  extension: string | null
  address: string | null
  createdAt: string
}

export interface Document {
  id: string
  requestId: string
  filename: string
  contentType: string
  sizeBytes: number
  uploadedAt: string
  uploadedBy: string
  s3Key: string
  reimbursementItemId: string | null
}

export interface Approval {
  id: string
  actorId: string
  actor: { id: string; firstName: string; lastName: string }
  action: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'PAID'
  stage: 'SUPERVISOR' | 'FINANCE'
  comment: string | null
  accountId: string | null
  account: { id: string; accountNumber: string; label: string } | null
  createdAt: string
}

export interface ReimbursementItem {
  id: string
  description: string
  amount: string
  date: string
  vendor: string | null
  notes: string | null
  documents: Document[]
}

export interface ReimbursementDetail {
  id: string
  items: ReimbursementItem[]
}

export interface TravelAdvanceItem {
  id: string
  category: string
  amount: string
  notes: string | null
}

export interface TravelAdvanceDetail {
  id: string
  destination: string
  purpose: string
  departureDate: string
  returnDate: string
  estimatedAmount: string
  items: TravelAdvanceItem[]
}

export interface TravelExpenseItem {
  id: string
  date: string
  category: string
  amount: string
  vendor: string | null
  notes: string | null
}

export interface TravelReimbursementDetail {
  id: string
  destination: string
  purpose: string
  departureDate: string
  returnDate: string
  totalAmount: string
  advanceRequestId: string | null
  items: TravelExpenseItem[]
}

export interface Request {
  id: string
  userId: string
  user: { id: string; firstName: string; lastName: string; email: string; supervisorId?: string | null }
  type: RequestType
  status: RequestStatus
  title: string
  description: string | null
  submittedAt: string | null
  createdAt: string
  updatedAt: string
  reimbursement: ReimbursementDetail | null
  travelAdvance: TravelAdvanceDetail | null
  travelReimbursement: TravelReimbursementDetail | null
  documents?: Document[]
  approvals?: Approval[]
  _count?: { documents: number }
}

export interface SupervisorAccount {
  id: string
  supervisorId: string
  accountNumber: string
  label: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}
