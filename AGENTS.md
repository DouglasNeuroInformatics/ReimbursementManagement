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
# Run backend directly (requires Deno 2.3+, .env file)
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

**Note**: Requires Deno 2.3+ with npm registry support for Vite, React, and TanStack libraries.

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
- **Frontend**: React 19.2, TanStack Router (file-based), TanStack Query/Form/Table, Tailwind CSS v4.2, Vite 7.3, Deno 2.3.3
- **Backend**: Deno 2.3.3, Hono v4, Prisma v7, PostgreSQL 16
- **Storage**: RustFS (S3-compatible)
- **Infrastructure**: Docker Compose, Caddy reverse proxy

**Request Flow:**
```
DRAFT → SUBMITTED → SUPERVISOR_APPROVED → FINANCE_REVIEWING → FINANCE_APPROVED → PAID
                   ↓ (rejected)                              ↓ (rejected)
         SUPERVISOR_REJECTED                       FINANCE_REJECTED (can revise & resubmit)
```

Finance approval requires `REQUIRED_FINANCE_APPROVALS` (default 3) **distinct** FINANCIAL_ADMIN signoffs:
1. 1st signoff: `SUPERVISOR_APPROVED` → `FINANCE_REVIEWING`
2. 2nd signoff: stays `FINANCE_REVIEWING`
3. Final signoff: `FINANCE_REVIEWING` → `FINANCE_APPROVED` (blocked if any item lacks `codeSecondaire`)

Any finance admin can reject at any point during the finance stage. Same admin cannot sign off twice.

**Code secondaire classification:** All line items (`ReimbursementItem`, `TravelAdvanceItem`, `TravelExpenseItem`) must be classified with a valid code (29 codes, defined in `backend/src/lib/code-secondaire.ts`) before the final finance signoff. Classifications are set via `PATCH /api/requests/:id/classify-item` by FINANCIAL_ADMIN users during `SUPERVISOR_APPROVED` or `FINANCE_REVIEWING` status.

**Three user roles:**
- `USER`: Create and manage own requests
- `SUPERVISOR`: Review subordinates' requests, approve with billing account selection
- `FINANCIAL_ADMIN`: Multi-signoff approval, mark paid, classify items, manage users and accounts. Can also perform supervisor-stage approvals/rejections.

## Key Technical Details

### Backend Structure
- **Entry point**: `backend/main.ts` - mounts Hono routes, initializes S3 bucket
- **Routes**: `backend/src/routes/` - auth, requests, approvals, documents, users, accounts, code-secondaire
- **Services**: `backend/src/services/` - business logic layer (auth, request, approval, classification, storage, account, user)
- **Middleware**: `backend/src/middleware/auth.ts` - JWT auth, CSRF protection (`X-Requested-With` header required), role gates
- **Lib**: `backend/src/lib/` - Prisma client singleton, S3 client, JWT utilities, env validation, code-secondaire codes

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

### Internationalization (i18n)

The platform is fully bilingual (English / French — Canadian variants by default) and structured to accept additional locales without code changes outside a single allowlist + JSON resource files.

**Shared allowlist (single source of truth):**
- `backend/src/lib/locales.ts` and `frontend/src/lib/locales.ts` both export `SUPPORTED_LOCALES = ['en-CA', 'fr-CA'] as const`, a `Locale` type, `DEFAULT_LOCALE = 'fr-CA'`, and `isSupportedLocale()`. The two arrays MUST stay in sync (CI grep-assert recommended).
- Locale identifiers are BCP 47 tags. Region matters — `fr-CA` ≠ `fr-FR`. `i18next-browser-languagedetector` is configured with `convertDetectedLanguage` so unsupported regional variants (e.g. `en-US`, `fr-FR`) downgrade to the closest supported tag, else `DEFAULT_LOCALE`.

**Backend error contract:**
- `backend/src/lib/errorCodes.ts` defines `ERROR_CODES` (49 codes) and `VALIDATION_ISSUE_CODES` (7 codes). `frontend/src/lib/errorCodes.ts` mirrors them.
- `AppError(statusCode, code, details?)` carries a stable code; the global handler returns `{ error, code, details? }`. The `error` field is a server-side fallback string in the requested locale; the frontend's `errors.json` is the authoritative source for what users see.
- Locale resolution in `backend/src/middleware/error.ts` reads `Accept-Language` (which the frontend `api.ts` sets to `i18n.language` on every request) and falls back to `DEFAULT_LOCALE`. `backend/src/lib/i18n.ts` holds the EN/FR fallback message tables + Zod issue mapping.

**User preference persistence:**
- `User.preferredLocale: String @default("fr-CA")` (Prisma — kept as `String`, not an enum, so adding a locale needs no migration). Migration `0002_add_user_preferred_locale`.
- Exposed via `GET /api/auth/me` and `PATCH /api/auth/me` (Zod schema accepts `z.enum(SUPPORTED_LOCALES).optional()`).
- Anonymous: localStorage key `app.locale`. Authenticated: PATCHes server on switch; on every shell mount `AppShell` overrides `i18n.language` with `user.preferredLocale` (server wins).

**Frontend i18n stack:**
- `i18next` + `react-i18next` + `i18next-browser-languagedetector`. Init: `frontend/src/i18n/index.ts`. Side-effect imported in `frontend/src/main.tsx`.
- Namespaces: `common`, `auth`, `enums`, `errors`, `policies`, `requests`, `profile`, `admin`, `review`, `finance`, `forms`. Layout: `frontend/src/i18n/locales/<bcp47>/<ns>.json`.
- `frontend/src/lib/translateApiError.ts` maps backend `code` → localized message via `errors:CODE`; falls back to backend-rendered `error` string on unknown codes.
- `frontend/src/utils/{currency,dates}.ts` are locale-aware via `Intl.NumberFormat` / `Intl.DateTimeFormat`. Default locale = `i18n.language`; pass an explicit locale arg for deterministic tests. `dateInputToISO` stays locale-independent (wire format).
- `frontend/src/components/forms/PolicyDisplay.tsx` reads policy text from the `policies` namespace via `t('${id}.title')` etc. (using `returnObjects: true` for arrays). Structural data (`id`, `category`, `limits`) lives in `frontend/src/lib/policies.ts`.

**Adding a new locale (example: `es-MX`):**

1. **Allowlist** — append the BCP 47 tag to **both** `SUPPORTED_LOCALES` arrays:
   - `backend/src/lib/locales.ts`
   - `frontend/src/lib/locales.ts`
2. **Backend fallback messages** — add an `es-MX` entry to the `MESSAGES` map in `backend/src/lib/i18n.ts`, providing one string per `ErrorCode` (use `EN` as the template). These are render-only fallbacks; the frontend's `errors.json` is what users normally see.
3. **Frontend resource files** — create `frontend/src/i18n/locales/es-MX/` and add all 11 namespace JSON files (`common.json`, `auth.json`, `enums.json`, `errors.json`, `policies.json`, `requests.json`, `profile.json`, `admin.json`, `review.json`, `finance.json`, `forms.json`). Copy `fr-CA/` as a template and translate. The `policies.json` array lengths (`requirements`, `documentation`) MUST match `en-CA` (enforced by `policies.test.ts`).
4. **Register the namespaces** — in `frontend/src/i18n/index.ts`, add static imports for each `es-MX` JSON and add an `'es-MX': { ... }` row to the `resources` object.
5. **Regional downgrade** (optional) — the `convertDetectedLanguage` function in `frontend/src/i18n/index.ts` already maps unknown regional variants to the nearest primary-language match, then `DEFAULT_LOCALE`. If you want `es-AR` to map to `es-MX`, no change is needed — it picks any locale sharing the `es` primary tag. If you want a different default, edit the function.

The `LocaleSwitcher` component iterates `SUPPORTED_LOCALES`, so the UI auto-extends. `Intl.NumberFormat` / `Intl.DateTimeFormat` accept the new tag with no code changes. `User.preferredLocale` accepts the new value because it's a `String` field (validated by `z.enum(SUPPORTED_LOCALES)`).

**Adding a label for the switcher button**: update `LABELS` in `frontend/src/components/layout/LocaleSwitcher.tsx` (e.g., `'es-MX': 'ES'`). It is `Record<Locale, string>`, so TypeScript will refuse to compile until you add the new entry — a useful guardrail.

**Tests to run after adding a locale:**
- `cd frontend && deno task test` — `policies.test.ts` will assert the new locale's `policies.json` has matching array lengths and non-empty title/description per policy id.
- Backend: trigger any error and verify `Accept-Language: es-MX` returns the new fallback strings.

**Logging stays English.** `console.error` in `backend/src/middleware/error.ts` and elsewhere is dev-facing and not localized.

## Development Notes

### Seeded Test Users (dev mode only)
- `admin@test.com` / `Test1234!` - FINANCIAL_ADMIN
- `admin2@test.com` / `Test1234!` - FINANCIAL_ADMIN
- `admin3@test.com` / `Test1234!` - FINANCIAL_ADMIN
- `supervisor@test.com` / `Test1234!` - SUPERVISOR (reports to admin)
- `user@test.com` / `Test1234!` - USER (reports to supervisor)

### Port Mapping
- 8080: Caddy gateway (frontend SPA + API proxy) — externally accessible
- 8000: Hono API (internal)
- 3000: Frontend dev server (internal, dev mode only)
- 5432: PostgreSQL (internal)
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
- `REQUIRED_FINANCE_APPROVALS`: Number of distinct FINANCIAL_ADMIN signoffs required before finance approval (default 3).

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
