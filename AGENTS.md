# AGENTS.md

This file provides guidance to AI coding assistants when working with code in this repository.

## Development Commands

### Start Development Environment
```bash
# Development mode with hot-reload (frontend Vite HMR, backend Deno --watch)
docker compose -f docker-compose.dev.yml up -d

# Production mode (optimized builds)
docker compose up -d
```

### Backend (Deno)
```bash
# Run backend directly (requires Deno 2.7.1+, .env file)
deno task dev          # Hot-reload development
deno task start        # Production run
deno task test         # Run tests

# Database operations
deno task db:generate  # Generate Prisma client
deno task db:migrate   # Create and apply migration
deno task db:push      # Push schema without migration
deno task db:migrate:deploy  # Deploy migrations (production)
```

### Frontend (Deno)
```bash
cd frontend
deno task dev      # Vite dev server (HMR)
deno task build    # Production build
deno task preview  # Preview production build
```

**Note**: Requires Deno 2.7.1+ with npm registry support for Vite, React, and TanStack libraries.

### Database Access
```bash
# Direct PostgreSQL access
docker compose exec db psql -U app -d reimbursement

# Run SQL directly
docker compose exec db psql -U app -d reimbursement -c "SELECT * FROM \"User\";"
```

## Architecture Overview

This is a **multi-stage approval workflow system** for expense reimbursements and travel requests.

**Stack:**
- **Frontend**: React 19.2.4, TanStack Router (file-based), TanStack Query/Form/Table, Tailwind CSS v4.2.1, Vite, Deno 2.7.1
- **Backend**: Deno 2.7.1, Hono v4.12.5, Prisma v7.4.2, PostgreSQL 16
- **Storage**: RustFS (S3-compatible)
- **Infrastructure**: Docker Compose, Caddy reverse proxy

**Request Flow:**
```
DRAFT → SUBMITTED → SUPERVISOR_APPROVED → FINANCE_APPROVED → PAID
                   ↓ (rejected)        ↓ (rejected)
         SUPERVISOR_REJECTED    FINANCE_REJECTED (can revise & resubmit)
```

**Three user roles:**
- `USER`: Create and manage own requests
- `SUPERVISOR`: Review subordinates' requests, approve with billing account selection
- `FINANCIAL_ADMIN`: Final approval, mark paid, manage users and accounts. Can also perform supervisor-stage approvals/rejections.

## Key Technical Details

### Backend Structure
- **Entry point**: `backend/main.ts` - mounts Hono routes, initializes S3 bucket
- **Routes**: `backend/src/routes/` - auth, requests, approvals, documents, users, accounts
- **Services**: `backend/src/services/` - business logic layer (auth, request, approval, storage, account, user)
- **Middleware**: `backend/src/middleware/auth.ts` - JWT auth, CSRF protection (`X-Requested-With` header required), role gates
- **Lib**: `backend/src/lib/` - Prisma client singleton, S3 client, JWT utilities, env validation

### Frontend Structure
- **File-based routing**: `frontend/src/routes/` using TanStack Router
- **Route guards**: `_auth/` wrapper for authenticated routes, nested `route.tsx` for role-based access
- **Request History**: `_auth/review/history.tsx` - past approved/paid requests visible to SUPERVISOR and FINANCIAL_ADMIN
- **API client**: `frontend/src/lib/api.ts` - fetch wrapper with auto token refresh
- **State management**: TanStack Query (server state), TanStack Form (form state)

### Database Schema (Prisma)
Key models:
- `User`: role-based access, supervisor relationship (self-referential)
- `Request`: polymorphic via 1:1 relations to `ReimbursementDetail`, `TravelAdvanceDetail`, or `TravelReimbursementDetail`
- `SupervisorAccount`: billing accounts that supervisors select when approving
- `Document`: S3 file metadata, can be request-level or per-item (ReimbursementItem)
- `Approval`: audit trail of workflow actions

All monetary fields are `Decimal(12,2)`.

### Authentication
- Passwords hashed with Argon2
- JWT access tokens (15 min) + refresh tokens (7 days) in HTTP-only cookies
- CSRF protection via `X-Requested-With` header requirement on mutating requests
- Rate limiting: 15 req/min on auth endpoints

### File Storage
- S3-compatible (RustFS) via presigned URLs
- Upload: multipart form data to `/api/requests/:id/documents`
- Download: 5-minute TTL presigned URLs from `/api/requests/:id/documents/:docId/url`
- 50MB file size limit, validated content types

## Development Notes

### Seeded Test Users (dev mode only)
- `admin@test.com` / `Test1234!` - FINANCIAL_ADMIN
- `supervisor@test.com` / `Test1234!` - SUPERVISOR (reports to admin)
- `user@test.com` / `Test1234!` - USER (reports to supervisor)

### Port Mapping
- 3000: Caddy (frontend SPA + API proxy)
- 8000: Hono API
- 5432: PostgreSQL
- 9000: RustFS S3
- 9001: RustFS console

### Request Type Specifics
- **General Reimbursement**: Multiple line items, documents attached per-item
- **Travel Advance**: Estimated expense categories, request-level documents
- **Travel Reimbursement**: Actual expense items, optional link to prior Travel Advance

### Important Validation
- Requests editable only when DRAFT, SUPERVISOR_REJECTED, or FINANCE_REJECTED
- Only owners can edit/delete their requests
- Supervisors can only approve requests from their subordinates (or anyone if no supervisor assigned)
- Supervisor approval requires selecting a billing account

### Environment Variables
- `NODE_ENV`: Controls secure cookie flag (`secure: true` when `production`). Validated via Zod in `backend/src/lib/env.ts`.

### Security & Quality Measures

**Authentication & Session Security:**
- Rate limit store has periodic cleanup of expired entries (prevents memory leaks)
- Client IP detection uses `X-Real-IP` header with `X-Forwarded-For` fallback (`_getClientIp()` in auth middleware)
- Cookies use `secure: true` in production via `cookieOptions()` helper (controlled by `NODE_ENV`)
- Token refresh on the frontend uses a shared-promise mutex to prevent parallel refresh races (`frontend/src/lib/api.ts`)
- Email addresses are normalized (`.toLowerCase().trim()`) on both registration and login

**Authorization:**
- `FINANCIAL_ADMIN` role can perform supervisor-stage approvals and rejections (added to `requireRole()` gates on supervisor routes)
- `AuthUser.role` is typed as the Prisma `Role` enum throughout the backend (not a plain string)
- Document uploads are server-side validated to only allow uploads when the request is in an editable status

**Data Integrity:**
- Request updates (`PATCH /api/requests/:id`) are wrapped in a Prisma `$transaction` for atomicity
- Request deletion cleans up S3 objects before removing the database record
- S3 document uploads use compensating deletes: if the `prisma.document.create()` fails after a successful S3 upload, the S3 object is deleted to prevent orphans
- Query parameters on request listing are validated with Zod (`listQuerySchema`)

**Database Indexes:**
Performance indexes are defined in `schema.prisma`:
- `Request`: `@@index([userId])`, `@@index([status])`, `@@index([supervisorId])`
- `Document`: `@@index([requestId])`, `@@index([reimbursementItemId])`
- `Approval`: `@@index([requestId])`
- `Session`: `@@index([userId])`, `@@index([expiresAt])`

**Frontend Quality:**
- Dynamic form lists use stable UUID keys (`crypto.randomUUID()`) instead of array index keys
- Form labels have proper `htmlFor`/`id` associations for accessibility
- Document upload drop zone has `role="button"`, `tabIndex={0}`, `aria-label`, and keyboard event handler for accessibility
- Route guards use safe type checks instead of unsafe `as` assertions

**Infrastructure:**
- Caddy serves security headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`
