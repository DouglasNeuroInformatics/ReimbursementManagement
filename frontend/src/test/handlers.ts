import { http, HttpResponse } from 'msw'
import type {
  Document,
  ReimbursementItem,
  Request,
  User,
} from '../types'

// ---------------------------------------------------------------------------
// Fixture factories — small, typed, override-friendly. Keep these aligned with
// the shapes in src/types.ts so a type change surfaces here at compile time.
// ---------------------------------------------------------------------------

export function mockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'user@test.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'USER',
    preferredLocale: 'en-CA',
    supervisorId: 'sup-1',
    supervisor: null,
    jobPosition: null,
    phone: null,
    extension: null,
    address: null,
    employeeNumber: null,
    department: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

export function mockReimbursementItem(
  overrides: Partial<ReimbursementItem> = {},
): ReimbursementItem {
  return {
    id: 'item-1',
    description: 'Conference registration',
    amount: '100.00',
    date: '2026-01-15T00:00:00.000Z',
    vendor: null,
    notes: null,
    codeSecondaire: null,
    documents: [],
    ...overrides,
  }
}

export function mockDocument(overrides: Partial<Document> = {}): Document {
  return {
    id: 'doc-1',
    requestId: 'req-1',
    filename: 'receipt.pdf',
    contentType: 'application/pdf',
    sizeBytes: 1024,
    uploadedAt: '2026-01-15T00:00:00.000Z',
    uploadedBy: 'user-1',
    s3Key: 'requests/req-1/receipt.pdf',
    reimbursementItemId: null,
    ...overrides,
  }
}

export function mockRequest(overrides: Partial<Request> = {}): Request {
  return {
    id: 'req-1',
    userId: 'user-1',
    user: { id: 'user-1', firstName: 'Test', lastName: 'User', email: 'user@test.com' },
    type: 'REIMBURSEMENT',
    status: 'DRAFT',
    title: 'Test request',
    description: null,
    submittedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    reimbursement: { id: 'rd-1', items: [mockReimbursementItem()] },
    travelAdvance: null,
    travelReimbursement: null,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Default happy-path handlers. Individual tests override these per-case with
// `server.use(...)`. setupTests.ts runs the server with onUnhandledRequest:
// 'error', so any endpoint a test exercises must be covered here or overridden.
// ---------------------------------------------------------------------------

export const handlers = [
  http.get('/api/auth/me', () => HttpResponse.json({ user: mockUser() })),
  http.post('/api/auth/refresh', () => new HttpResponse(null, { status: 200 })),
  http.get('/api/config', () => HttpResponse.json({ demoMode: false })),

  http.get('/api/requests', () => HttpResponse.json({ requests: [mockRequest()] })),
  http.get('/api/requests/:id', ({ params }) =>
    HttpResponse.json({
      request: mockRequest({ id: String(params.id) }),
      requiredFinanceApprovals: 1,
    })),
  http.post('/api/requests', () =>
    HttpResponse.json({ request: mockRequest() }, { status: 201 })),
  http.patch('/api/requests/:id', ({ params }) =>
    HttpResponse.json({ request: mockRequest({ id: String(params.id) }) })),
  http.delete('/api/requests/:id', () => new HttpResponse(null, { status: 204 })),
]
