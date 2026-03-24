# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Docker Compose (preferred for full-stack dev)
```bash
docker compose -f docker-compose.dev.yml up -d     # Dev mode: Vite HMR + Deno --watch
docker compose up -d                                 # Production mode
```

### Backend (Deno 2.7.1+, from repo root)
```bash
cd backend
deno task dev                    # Hot-reload dev server
deno task test                   # Run backend tests (needs .env.test, DB + S3 running)
deno task db:generate            # Regenerate Prisma client after schema changes
deno task db:migrate             # Create + apply migration (dev)
deno task db:push                # Push schema without creating migration file
deno task db:migrate:deploy      # Deploy migrations (production)
```

### Frontend (Deno 2.7.1+, from repo root)
```bash
cd frontend
deno task dev                    # Vite dev server with HMR
deno task build                  # Production build
deno task test                   # Vitest (happy-dom, no infra needed)
```

### Running All Tests
```bash
./run-tests.sh    # Starts DB+S3 containers, creates test DB, runs backend then frontend tests, cleans up
```

### Running a Single Backend Test File
```bash
cd backend
deno test -A --env-file=.env.test tests/auth.test.ts
```

### Database Access
```bash
docker compose -f docker-compose.dev.yml exec db psql -U app -d reimbursement
```

## Architecture

**Monorepo** with two Deno-based apps sharing a Docker Compose infrastructure:

- **backend/** — Deno + Hono REST API, Prisma ORM (v7), PostgreSQL 16, S3-compatible storage (RustFS)
- **frontend/** — React 19 SPA with TanStack Router (file-based), TanStack Query/Form/Table, Tailwind CSS v4, Vite
- **gateway/** — Caddy reverse proxy serving the SPA and proxying `/api/*` to Hono (port 8000)

**Runtime**: Deno 2.7.1 for both backend and frontend tooling. Both use `nodeModulesDir: "auto"` in deno.json for npm compatibility.

### Port Mapping (dev mode)
- 8080: Caddy gateway (frontend SPA + API proxy) — externally accessible
- 8000: Hono API (direct access)
- 3000: Vite dev server (internal)
- 5432: PostgreSQL
- 9000: RustFS S3 API
- 9001: RustFS admin console

### Request Approval Workflow
```
DRAFT -> SUBMITTED -> SUPERVISOR_APPROVED -> FINANCE_APPROVED -> PAID
                   \-> SUPERVISOR_REJECTED   \-> FINANCE_REJECTED
                       (can revise & resubmit)    (can revise & resubmit)
```

Three roles: `USER`, `SUPERVISOR`, `FINANCIAL_ADMIN`. Financial admins can also perform supervisor-stage actions.

### Request Types
- **General Reimbursement** (`REIMBURSEMENT`): Multiple line items, documents attached per-item
- **Travel Advance** (`TRAVEL_ADVANCE`): Estimated expense categories, request-level documents
- **Travel Reimbursement** (`TRAVEL_REIMBURSEMENT`): Actual expense items, optional link to prior Travel Advance

### Backend Layering
- **Entry point**: `backend/main.ts` — mounts Hono routes, initializes S3 bucket
- **Routes** (`backend/src/routes/`) — Hono route handlers, validation
- **Services** (`backend/src/services/`) — Business logic, Prisma queries
- **Lib** (`backend/src/lib/`) — Singletons: Prisma client, S3 client, JWT helpers, env validation (Zod)
- **Middleware** (`backend/src/middleware/`) — JWT auth extraction, CSRF, role gates, rate limiting

All routes mount under `/api` via `main.ts`. The Hono app is exported as default for test imports.

**Middleware ordering in main.ts** (order matters):
1. Logger (global)
2. Error handler (global)
3. `/healthz` health check (unprotected)
4. Auth routes (`/api/auth/*`) — no CSRF, has rate limiting (15 req/min per IP)
5. Supervisor account routes (`/api/supervisors/*`) — no CSRF
6. CSRF middleware — requires `X-Requested-With: XMLHttpRequest` for POST/PUT/PATCH/DELETE
7. All other protected routes (requests, approvals, documents, users)

### Authentication & Security
- Passwords: Argon2 hashing
- JWT access tokens (15 min) + refresh tokens (7 days) stored in `Session` table
- Tokens stored in httpOnly cookies (`access_token`, `refresh_token`), `secure: true` in production
- CSRF: `X-Requested-With: XMLHttpRequest` header required on mutating requests (auth routes exempt)
- Rate limiting: 15 req/min on auth endpoints, in-memory store with auto-cleanup

### S3 Storage
- Two S3 client instances: internal (`S3_ENDPOINT` for uploads) and public (`S3_PUBLIC_ENDPOINT` for presigned download URLs)
- In dev, Caddy proxies `/s3/*` to RustFS so presigned URLs work from the browser
- Presigned download URLs: 5-minute TTL
- Upload: multipart form data, 50MB limit, validated content types
- **Test mode**: All S3 operations are no-ops when `NODE_ENV=test`
- Init retry: 10 attempts with 2-second delay for bucket creation on startup

### Frontend Routing
TanStack Router with file-based routes in `frontend/src/routes/`:
- `_auth/` layout wrapper enforces authentication
- `_auth/admin/route.tsx` and `_auth/finance/route.tsx` enforce role-based access
- Route tree auto-generated to `frontend/src/routeTree.gen.ts` (do not edit manually)

### Frontend API Layer
`frontend/src/lib/api.ts` — fetch wrapper that:
- Adds `X-Requested-With: XMLHttpRequest` for CSRF (skipped for `/api/auth/` paths)
- Auto-refreshes JWT on 401 using a shared-promise mutex (prevents parallel refresh races)
- Redirects to `/login` if refresh fails
- All API hooks in `frontend/src/hooks/` use TanStack Query

### Frontend Policies
`frontend/src/lib/policies.ts` has hardcoded business rules:
- Per diem rates: Canada $75/day ($14/$21/$40 for breakfast/lunch/dinner), outside Canada $100/day
- Mileage: $0.640 CAD/km
- Expense categories: conference registration, car rental, gas, taxi, parking, mileage, airfare, bus, train, accommodations, meals, other

### Database Schema
Prisma schema at `backend/prisma/schema.prisma`. Key patterns:
- `Request` is polymorphic: 1:1 relations to `ReimbursementDetail`, `TravelAdvanceDetail`, or `TravelReimbursementDetail`
- `User` has a self-referential supervisor relationship (cascade delete on subordinates)
- `Document` can attach to a Request or to a specific `ReimbursementItem`
- `SupervisorAccount` has `@@unique([supervisorId, accountNumber])`
- All monetary fields: `Decimal(12,2)`
- Generated client outputs to `backend/src/generated/prisma/` (gitignored)

### Key Validation Rules
- Requests editable only when DRAFT, SUPERVISOR_REJECTED, or FINANCE_REJECTED
- Only owners can edit/delete their requests
- Supervisors can only approve requests from their subordinates
- Supervisor approval requires selecting a billing account

### Testing
- **Backend**: Deno's built-in test runner against a real `reimbursement_test` database (not mocked). Tests in `backend/tests/`. Uses `test-utils.ts` for DB cleanup (ordered deletion respecting FKs), user creation, and JWT minting. Requires running PostgreSQL and RustFS. Sanitization disabled (`sanitizeResources: false, sanitizeOps: false`) to keep Hono server alive across tests.
- **Frontend**: Vitest with happy-dom environment. Setup in `frontend/src/setupTests.ts` (includes `@testing-library/jest-dom`).

### Seeded Dev Users
- `admin@test.com` / `Test1234!` — FINANCIAL_ADMIN
- `supervisor@test.com` / `Test1234!` — SUPERVISOR (reports to admin, has 2 billing accounts)
- `user@test.com` / `Test1234!` — USER (reports to supervisor)

Seed runs automatically in dev mode. In production, only runs when `DEMO_MODE=true`.

### Environment
- `.env` at repo root for Docker Compose
- `backend/.env.test` for backend test runs (points to `reimbursement_test` DB on localhost)
- Env validated with Zod in `backend/src/lib/env.ts` — `JWT_SECRET` and `JWT_REFRESH_SECRET` must be ≥32 chars
- `CURRENCY` env var (default `CAD`) controls display currency app-wide (backend env + Vite build-time `VITE_CURRENCY`)
- `DEMO_MODE` env var (default `false`) — when `true`, seeds demo data on migration
