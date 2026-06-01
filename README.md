# Reimbursement Management Platform

A full-stack expense reimbursement and travel request management system with a multi-stage approval workflow. Built with React, Deno/Hono (backend + frontend), PostgreSQL, and S3-compatible object storage, fully containerized with Docker Compose.

---

## Table of Contents

- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [Production](#production)
  - [Development](#development)
- [Environment Variables](#environment-variables)
- [Internationalization (i18n)](#internationalization-i18n)
  - [Switching language](#switching-language)
  - [Adding a new language](#adding-a-new-language)
- [User Roles](#user-roles)
- [Request Types](#request-types)
- [Approval Workflow](#approval-workflow)
- [Platform Walkthrough](#platform-walkthrough)
  - [Registration and Login](#registration-and-login)
  - [Navigation](#navigation)
  - [Document Uploads](#document-uploads)
  - [Profile Management](#profile-management)
- [For Requesters (All Users)](#for-requesters-all-users)
  - [Dashboard Overview](#dashboard-overview)
  - [Viewing Your Requests](#viewing-your-requests)
  - [Creating a General Reimbursement](#creating-a-general-reimbursement)
  - [Creating a Travel Advance](#creating-a-travel-advance)
  - [Creating a Travel Reimbursement](#creating-a-travel-reimbursement)
  - [Viewing Request Details](#viewing-request-details)
  - [Editing a Request](#editing-a-request)
  - [Submitting, Revising, and Deleting](#submitting-revising-and-deleting)
- [For Supervisors](#for-supervisors)
  - [Review Queue](#review-queue)
  - [Request History](#request-history)
  - [Reviewing a Request](#reviewing-a-request)
  - [Approving a Request](#approving-a-request)
  - [Rejecting a Request](#rejecting-a-request)
- [For Financial Administrators](#for-financial-administrators)
  - [Finance Queue](#finance-queue)
  - [Processing a Request](#processing-a-request)
  - [Marking a Request as Paid](#marking-a-request-as-paid)
  - [User Management](#user-management)
  - [Supervisor Account Management](#supervisor-account-management)
- [API Reference](#api-reference)
  - [Authentication](#authentication-api)
  - [Requests](#requests-api)
  - [Approvals](#approvals-api)
  - [Documents](#documents-api)
  - [Users](#users-api)
  - [Supervisor Accounts](#supervisor-accounts-api)
- [Data Model](#data-model)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)

---

## Architecture

```
                         +-----------+
                         |  Browser  |
                         +-----+-----+
                               |
                         port 3000
                               |
                      +--------v--------+
                      |   Caddy (web)  |  static SPA + reverse proxy
                      +---+----------+--+
                          |          |
                   /assets/*     /api/*
                   (static)     (proxy)
                          |          |
                          |   +------v------+
                          |   |  Hono (api) |  Deno runtime, port 8000
                          |   +--+-------+--+
                          |      |       |
                          | +----v--+ +--v-------+
                          | |  S3   | | postgres |
                          | |rustfs | |    db    |
                          | +-------+ +----------+
                          |  9000       5432
```

**Services:**

| Service   | Image                    | Purpose                                      | Exposed Port |
|-----------|--------------------------|----------------------------------------------|--------------|
| `web`     | caddy:2-alpine           | Serves frontend SPA, reverse-proxies `/api/` | 8080         |
| `api`     | denoland/deno:2.3.3      | REST API server                              | 8000         |
| `db`      | postgres:16-alpine       | Relational database                          | --           |
| `rustfs`  | rustfs/rustfs:latest     | S3-compatible object storage for documents   | 9000, 9001   |
| `migrate` | denoland/deno:2.3.3      | Runs Prisma migrations on startup, then exits| --           |

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) v2+
- For local development: [Deno 2.3+](https://deno.land/) (frontend and backend)

---

## Getting Started

### Production

1. **Clone and configure:**

   ```bash
   git clone <repository-url>
   cd ReimbursementManagement
   cp .env.example .env
   ```

2. **Edit `.env`** with secure values (see [Environment Variables](#environment-variables)).

3. **Start all services:**

    ```bash
    docker compose up -d
    ```

    This builds the frontend (multi-stage: Deno build then Caddy), builds the backend Docker image, runs database migrations automatically, then starts the API and web server.

4. **Access the application** at [http://localhost:8080](http://localhost:8080).

5. **Register a new account** via the registration page. The first user is created with the `USER` role. To promote a user to `FINANCIAL_ADMIN` (required to manage other users), update the database directly:

   ```bash
   docker compose exec db psql -U app -d reimbursement \
     -c "UPDATE \"User\" SET role = 'FINANCIAL_ADMIN' WHERE email = 'your@email.com';"
   ```

### Development

Development mode uses bind mounts for hot-reload on both frontend and backend.

```bash
docker compose -f docker-compose.dev.yml up -d
```

- Frontend (Vite dev server): [http://localhost:8080](http://localhost:8080) with HMR
- Backend: auto-restarts on file changes via `deno run --watch`
- PostgreSQL: accessible at `localhost:5432` for direct access
- RustFS console: [http://localhost:9001](http://localhost:9001)

### Frontend Development

Run the frontend directly with Deno (requires Deno 2.3+):

```bash
cd frontend
deno task dev      # Vite dev server with HMR on port 3000
deno task build    # Production build to dist/
deno task preview  # Preview production build locally
```

Deno automatically resolves npm dependencies via the `deno.json` import map. A `deno.lock` file is generated for reproducible builds.

Development defaults are pre-configured -- no `.env` file is required (defaults like `devpassword` are used).

The development environment automatically seeds five test users on first startup:

| Email                  | Password    | Role               | Notes                       |
|-----------------------|-------------|--------------------|-----------------------------|
| `admin@test.com`      | `Test1234!` | `FINANCIAL_ADMIN`  | Finance Director            |
| `admin2@test.com`     | `Test1234!` | `FINANCIAL_ADMIN`  | Finance Manager             |
| `admin3@test.com`     | `Test1234!` | `FINANCIAL_ADMIN`  | Finance Officer             |
| `supervisor@test.com` | `Test1234!` | `SUPERVISOR`       | Team Lead, reports to admin |
| `user@test.com`       | `Test1234!` | `USER`             | Analyst, reports to supervisor |

The seed is idempotent -- restarting the containers will not create duplicates. The supervisor and admin also have pre-configured billing accounts so approval workflows work immediately.

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable              | Required | Default           | Description                                                        |
|-----------------------|----------|-------------------|--------------------------------------------------------------------|
| `DB_PASSWORD`         | Yes      | --                | PostgreSQL password for the `app` user                             |
| `RUSTFS_ACCESS_KEY`   | Yes      | --                | S3 access key for RustFS object storage                            |
| `RUSTFS_SECRET_KEY`   | Yes      | --                | S3 secret key (minimum 16 characters)                              |
| `JWT_SECRET`          | Yes      | --                | HMAC key for signing access tokens (minimum 32 characters)         |
| `JWT_REFRESH_SECRET`  | Yes      | --                | HMAC key for signing refresh tokens (minimum 32 characters)        |
| `NODE_ENV`            | No       | `development`     | Set to `production` to enable secure (HTTPS-only) cookies          |
| `CURRENCY`            | No       | `CAD`             | ISO 4217 currency code displayed in the UI                         |
| `S3_PUBLIC_ENDPOINT`  | No       | `http://localhost:8080/s3` | Public URL for S3 presigned download URLs (adjust for production) |
| `DEMO_MODE`           | No       | `false`           | Set to `true` to populate database with sample data for demonstration |
| `REQUIRED_FINANCE_APPROVALS` | No | `3`          | Number of distinct FINANCIAL_ADMIN signoffs required before finance approval |

## Demo Mode

The application supports a demo mode that populates the database with sample data for demonstration purposes.

### Enabling Demo Mode

Set the `DEMO_MODE` environment variable to `true`:

```bash
# In .env file
DEMO_MODE=true

# Or when starting Docker Compose
DEMO_MODE=true docker-compose up
```

### Demo Data

When demo mode is enabled, the database is seeded with:

- **5 Users** with various roles (3 Financial Admins, Supervisor, Regular User)
- **8 Sample Requests** at different workflow stages (draft, submitted, approved, rejected, paid)
- **3 Billing Accounts** for demonstrations

### Demo Credentials

All demo accounts use the same password: `Test1234!`

- **Financial Admin**: `admin@test.com`
- **Financial Admin**: `admin2@test.com`
- **Financial Admin**: `admin3@test.com`
- **Supervisor**: `supervisor@test.com`
- **Regular User**: `user@test.com`

### Security Notice

⚠️ **DEMO MODE IS FOR DEMONSTRATION ONLY**
- Never enable demo mode in production environments
- Demo credentials are publicly known
- Seed data is not meant for real financial transactions
- Always keep `DEMO_MODE=false` (default) in production

---

## Internationalization (i18n)

The application ships fully bilingual in **Canadian English (`en-CA`)** and **Canadian French (`fr-CA`)**. The default locale on a fresh visit is `fr-CA`; the language is auto-detected from the browser when possible and falls back to French otherwise.

Currency, dates, and validation messages all follow the active locale:

- `en-CA`: `CA$1,234.56`, `Mar 5, 2026`
- `fr-CA`: `1 234,56 $`, `5 mars 2026`

### Switching language

A **FR / EN** toggle appears in the top-right of every page (including the login and registration pages).

- **Anonymous users** (login / register): the choice persists in browser `localStorage` under the key `app.locale`. It survives a page reload but does not follow the user across devices.
- **Authenticated users**: the choice is additionally persisted to your user profile (`User.preferredLocale`). On every login, the server's stored preference overrides any local browser setting — so your language follows you across browsers and devices.

### Adding a new language

The platform is designed so that adding a third locale (e.g. Mexican Spanish `es-MX`, or European French `fr-FR`) is **a constant change plus a folder of JSON files** — no Prisma migration, no schema change, no per-route code edits.

**Steps:**

1. **Append the locale to the allowlist** (BCP 47 tag) in **both** files:

   ```ts
   // backend/src/lib/locales.ts
   // frontend/src/lib/locales.ts
   export const SUPPORTED_LOCALES = ['en-CA', 'fr-CA', 'es-MX'] as const
   ```

2. **Add a row to the backend's fallback message table** in `backend/src/lib/i18n.ts`. Provide one translation per error code (copy the `EN` map as a template). These are only used when the frontend cannot reach the user (rare), but they keep error responses self-describing.

3. **Create the locale's JSON resource files** under `frontend/src/i18n/locales/es-MX/`. Copy `fr-CA/` as a starting point and translate. The required files are:

   ```
   frontend/src/i18n/locales/es-MX/
   ├── common.json        # nav, app title, sign-out
   ├── auth.json          # login / register pages
   ├── enums.json         # status, role, request-type, stage labels
   ├── errors.json        # one entry per backend error code + validation codes
   ├── policies.json      # 15 expense policies (title / description / requirements / documentation / notes)
   ├── requests.json      # all request-flow pages
   ├── profile.json       # profile page
   ├── admin.json         # user-management page
   ├── review.json        # supervisor review pages
   ├── finance.json       # finance pages, code-secondaire UI
   └── forms.json         # shared form labels (Save, Cancel, Add Row, file upload, …)
   ```

   Important: in `policies.json`, the `requirements` and `documentation` arrays for each policy id MUST have the **same length** as the `en-CA` version. The test suite enforces this.

4. **Register the namespaces in i18next** by editing `frontend/src/i18n/index.ts`:

   ```ts
   import esCommon from './locales/es-MX/common.json'
   import esAuth from './locales/es-MX/auth.json'
   // … one import per namespace …

   const resources = {
     'en-CA': { common: enCommon, /* … */ },
     'fr-CA': { common: frCommon, /* … */ },
     'es-MX': { common: esCommon, auth: esAuth, /* … */ },
   } as const
   ```

5. **Add a switcher label** in `frontend/src/components/layout/LocaleSwitcher.tsx`:

   ```ts
   const LABELS: Record<Locale, string> = {
     'en-CA': 'EN',
     'fr-CA': 'FR',
     'es-MX': 'ES',
   }
   ```

   TypeScript will refuse to compile until you add the new entry — a useful guardrail against incomplete locale additions.

**Verify:**

```bash
cd frontend
deno task test    # locale-parity tests run automatically
deno task build   # confirms the bundle includes the new resources
```

The `LocaleSwitcher` UI auto-extends to render one button per `SUPPORTED_LOCALES` entry. Currency and date formatting accept the new BCP 47 tag without code changes (handled by `Intl.NumberFormat` / `Intl.DateTimeFormat`). Backend error messages will be rendered in the new locale because `Accept-Language` carries it on every request.

**Notes on regional variants:** the language detector includes a normalization step that maps unsupported regional variants to the closest supported tag (`fr-FR` → `fr-CA`, `en-US` → `en-CA`, etc.). If you want a different downgrade behavior, edit `convertDetectedLanguage` in `frontend/src/i18n/index.ts`.

**Removing a language:** delete its row from `SUPPORTED_LOCALES` (both files), remove its row from `LABELS`, delete its `locales/<tag>/` folder, and remove its imports from `frontend/src/i18n/index.ts`. Existing users with `preferredLocale` set to the removed tag will fall back to `DEFAULT_LOCALE` on their next login.

---

## User Roles

| Role               | Description                                                                                |
|--------------------|--------------------------------------------------------------------------------------------|
| `USER`             | Default role. Can create, edit, submit, and view their own reimbursement requests.          |
| `SUPERVISOR`       | Can do everything a USER can, plus review and approve/reject submitted requests from subordinates. Must select a charge account when approving. |
| `FINANCIAL_ADMIN`  | Full access. Reviews supervisor-approved requests, marks requests as paid, manages all users (role assignment, supervisor assignment), and manages supervisor billing accounts. |

---

## Request Types

### General Reimbursement

For out-of-pocket expenses. Contains one or more **line items**, each with:
- Description (required)
- Amount (required)
- Date of expense (required)
- Vendor (optional)
- Supporting documents (per-item file uploads)

### Travel Advance

A pre-trip funding request. Contains:
- Trip details: destination, purpose, departure and return dates
- Estimated total amount
- Expense categories with estimated amounts (e.g., airfare, hotel, meals)
- Supporting documents (request-level)

### Travel Reimbursement

A post-trip reimbursement for actual expenses incurred. Contains:
- Trip details: destination, purpose, departure and return dates
- Actual expense items: date, category, amount, vendor
- Total amount
- Optional link to a prior travel advance request
- Supporting documents (request-level)

---

## Approval Workflow

Every request follows this lifecycle:

```
                           +-------+
                    +----->| DRAFT |<-----------+
                    |      +---+---+            |
                    |          |                |
                    |       submit            revise
                    |          |                |
                    |   +------v------+   +-----+--------+
                    |   | SUBMITTED   |   | SUPERVISOR   |
                    |   +------+------+   | REJECTED     |
                    |          |          +--------------+
                    |   supervisor            ^
                    |   reviews               |
                    |     |         +---------+
                    |     |  reject |
                    |  +--v-----------+
                    |  | SUPERVISOR   |
                    |  | APPROVED     |
                    |  +--+-----------+
                    |     |
                    |  finance
                    |  signoff 1
                    |     |
                    |  +--v-----------+     +----------+
                    |  | FINANCE      |---->| FINANCE  |
                    |  | REVIEWING    |<----+ REJECTED |
                    |  +--+-----------+  ^  +----------+
                    |     |              |
                    |  signoff N        reject
                    |  (all items       (any admin)
                    |   classified)
                    |     |
                    |  +--v-----------+
                    |  | FINANCE      |
                    |  | APPROVED     |
                    |  +--+-----------+
                    |     |
                    |  mark paid
                    |     |
                    |  +--v---+
                    +--+ PAID |
                       +------+
```

**Status descriptions:**

| Status                 | Meaning                                                            |
|------------------------|--------------------------------------------------------------------|
| `DRAFT`                | Created but not yet submitted. Editable by the owner.              |
| `SUBMITTED`            | Awaiting supervisor review.                                        |
| `SUPERVISOR_APPROVED`  | Supervisor approved; awaiting first finance signoff.               |
| `SUPERVISOR_REJECTED`  | Supervisor rejected. Owner can revise and resubmit.                |
| `FINANCE_REVIEWING`    | Under finance review; accumulating required signoffs.              |
| `FINANCE_APPROVED`     | All required finance signoffs complete; awaiting payment.          |
| `FINANCE_REJECTED`     | Finance rejected. Owner can revise and resubmit.                   |
| `PAID`                 | Payment completed. Terminal state.                                 |

Requests can be edited when in `DRAFT`, `SUPERVISOR_REJECTED`, or `FINANCE_REJECTED` status.

---

## Platform Walkthrough

This section describes the interface that every user sees regardless of role.

### Registration and Login

**Creating an account:**

1. Open the application and click **No account? Register** on the login page.
2. Fill in the registration form:
   - **First name** (required)
   - **Last name** (required)
   - **Email** (required, must be unique across the system)
   - **Password** (required, minimum 8 characters)
3. Click **Create account**. On success you are redirected to the login page.

**Signing in:**

1. Enter your **Email** and **Password**.
2. Click **Sign in**.
3. You land on the Dashboard.

Sessions are managed with HTTP-only cookies. Your access token lasts 15 minutes and is refreshed automatically in the background using a 7-day refresh token. If both expire, you are redirected to the login page.

**Signing out:**

Click **Sign out** in the top-right corner of any page. Your session is invalidated server-side.

### Navigation

The left sidebar is visible on every authenticated page. Navigation items change based on your role:

| Sidebar Item      | Visible To                          | Destination                   |
|-------------------|-------------------------------------|-------------------------------|
| Dashboard         | All users                           | `/dashboard`                  |
| My Requests       | All users                           | `/dashboard/requests`         |
| Review Queue      | Supervisors, Financial Admins       | `/review`                     |
| Request History   | Supervisors, Financial Admins       | `/review/history`             |
| Finance Queue     | Financial Admins only               | `/finance`                    |
| Admin             | Financial Admins only               | `/admin/users`                |

At the bottom of the sidebar, your name and role are displayed. Clicking your name opens your **Profile** page.

### Document Uploads

Documents can be attached to requests during creation or editing. The upload component appears wherever documents are accepted.

**Adding files:**

- **Drag and drop** files onto the blue-bordered drop zone. The zone highlights when a file is dragged over it.
- **Click** the drop zone to open your operating system's file picker.
- Multiple files can be added at once.

**Constraints:**

- Maximum file size: **50 MB** per file.
- Accepted formats: **PDF**, **JPEG**, **PNG**, **GIF**, **WebP**, **Word** (.doc, .docx), **Excel** (.xls, .xlsx), **plain text** (.txt), **CSV** (.csv).
- Files that exceed the size limit or have an unsupported type are rejected with an alert message and are not added.

**File lifecycle:**

- After adding files, they appear in a **Pending upload** section with a yellow "PENDING UPLOAD" badge. They are not yet saved to the server.
- When you click **Save as Draft**, **Save**, or **Save & Submit**, all pending files are uploaded to the server. Once uploaded, they appear under **Uploaded** with a green "UPLOADED" badge.
- Uploaded files can be downloaded via the **Download** link, which generates a time-limited URL (valid for 5 minutes).
- On read-only pages (detail view, review, finance), only uploaded files are shown. The drop zone and Remove buttons are hidden.

**Where documents attach:**

- **General Reimbursement**: documents attach to individual expense line items. Each item has its own upload zone.
- **Travel Advance** and **Travel Reimbursement**: documents attach at the request level in a single "Supporting Documents" section.

### Profile Management

Access your profile by clicking your name at the bottom of the sidebar, or navigating to `/profile`.

**Read-only information** (displayed but not editable):
- Full name
- Email address
- Role
- Member since date

**Editable fields:**
- **Job Position** (e.g., "Senior Analyst")
- **Phone** (e.g., "+1 613 555 0100")
- **Work Extension** (e.g., "4201")
- **Address** (multi-line text)

Click **Save** to update. A green "Saved." banner confirms success.

---

## For Requesters (All Users)

Every authenticated user, regardless of role, can create and manage their own reimbursement requests. Supervisors and financial admins also use this workflow for their own expenses.

### Dashboard Overview

The **Dashboard** (`/dashboard`) is your landing page after login. It shows:

- **Welcome message**: "Welcome back, {your first name}".
- **Status summary cards**: a row of cards showing how many of your requests are in each status -- Draft, Submitted, Supervisor Approved, and Paid. Each card displays the count and a color-coded badge.
- **Recent requests**: a table of your 5 most recently updated requests with columns for Title (clickable link to details), Type, Status, and Date. A **New request** link at the top right takes you to the creation flow.
- If you have no requests yet, the table shows "No requests yet."

### Viewing Your Requests

Click **My Requests** in the sidebar to see all of your requests in a sortable table.

**Table columns:**

| Column    | Description                                                       |
|-----------|--------------------------------------------------------------------|
| Title     | Request title, clickable to open the detail page                  |
| Type      | General Reimbursement, Travel Advance, or Travel Reimbursement    |
| Status    | Color-coded badge showing the current workflow status             |
| Submitted | Date the request was submitted (blank if still a draft)           |
| Docs      | Number of documents attached to the request                       |

Click any column header to sort ascending or descending (indicated by arrows).

To create a new request, click the **New Request** button in the top right. If the list is empty, a **Create your first request** link is shown.

### Creating a General Reimbursement

Use this for out-of-pocket business expenses you have already paid.

1. From the **New Request** type selector, click **General Reimbursement**.
2. Fill in the **Request Details** card:
   - **Title** (required) -- a short name for the request, e.g., "Q1 Office Supplies".
   - **Description** (optional) -- additional context.
3. Fill in **Expense Items**. You start with one blank item row. Each item has:
   - **Description** (required) -- what the expense was for.
   - **Amount** (required) -- the dollar amount, entered as a number with up to two decimal places.
   - **Date** (required) -- the date the expense was incurred, in YYYY-MM-DD format.
   - **Vendor** (optional) -- the vendor or merchant name.
   - **Document upload zone** -- attach receipts or invoices per item.
4. Click **+ Add Row** to add more expense items. Click **Remove** to delete an item (available when more than one item exists).
5. Click **Save as Draft** to save without submitting (you can return later), or **Save & Submit** to save and immediately submit for supervisor review.

**Validation**: if any item has partial data (e.g., a file attached but no description), the form will show a red error banner: *"Each expense item with data or files must have a description, amount, and date."* You must complete or clear the item before saving.

After saving, you are redirected to the request's detail page.

### Creating a Travel Advance

Use this to request funds before an upcoming business trip.

1. From the **New Request** type selector, click **Travel Advance**.
2. Fill in the **Request Details** card:
   - **Title** (required)
   - **Description** (optional)
3. Fill in the **Trip Details** card:
   - **Destination** (required) -- where you are traveling.
   - **Purpose** (required) -- the business reason for the trip.
   - **Departure Date** (required) -- in YYYY-MM-DD format.
   - **Return Date** (required) -- in YYYY-MM-DD format.
4. Fill in **Estimated Expenses**. Each row has:
   - **Category** -- the type of expense (e.g., "Airfare", "Hotel", "Meals").
   - **Amount** -- estimated cost.
   - **Notes** (optional) -- additional details.
   - Click **Add Row** to add more categories. Click the red X button to remove a row.
5. Attach supporting documents (e.g., flight booking confirmations) in the **Supporting Documents** section.
6. Click **Save as Draft** or **Save & Submit**.

The estimated total is calculated automatically as the sum of all expense category amounts.

### Creating a Travel Reimbursement

Use this after a business trip to claim reimbursement for actual expenses incurred.

1. From the **New Request** type selector, click **Travel Reimbursement**.
2. Fill in the **Request Details** and **Trip Details** cards (same fields as Travel Advance).
3. Fill in **Actual Expenses**. Each row has:
   - **Date** -- when the expense occurred.
   - **Category** -- the type of expense.
   - **Amount** -- actual cost.
   - **Vendor** -- where the expense was paid.
   - Click **Add Row** / red X to add or remove rows.
4. Attach receipts in the **Supporting Documents** section.
5. Click **Save as Draft** or **Save & Submit**.

The total amount is calculated automatically from the actual expense items.

### Viewing Request Details

Click any request title from the Dashboard, My Requests, or any queue to open its detail page.

The detail page shows:

- **Header**: the request title, a status badge, and the request type.
- **Action buttons** (top right, shown only when applicable):
  - **Edit** -- available when the request is in Draft, Supervisor Rejected, or Finance Rejected status.
  - **Submit** -- available for Draft requests. Submits the request for supervisor review.
  - **Revise (Back to Draft)** -- available for rejected requests. Moves the request back to Draft so you can edit it.
  - **Delete** -- available for Draft requests only. Permanently removes the request.
- **Description** section (if a description was provided).
- **Type-specific details**:
  - *General Reimbursement*: a table of expense items showing Description, Date, Vendor, Amount, and document count per item. The total amount is shown in the card header.
  - *Travel Advance*: trip details (destination, purpose, departure, return, estimated amount) and a table of estimated expense categories.
  - *Travel Reimbursement*: trip details (destination, purpose, total amount) and a table of actual expense items.
- **Item Documents** (for reimbursement requests): lists uploaded documents per expense item, read-only.
- **Documents** (for travel requests or unlinked documents): lists uploaded documents, read-only.
- **Approval History**: a timeline of all approval actions taken on the request. Each entry shows:
  - A color-coded dot (green for approvals and payments, red for rejections).
  - The reviewer's name, their role (Supervisor or Finance), and the action taken.
  - The billing account charged (for supervisor approvals).
  - Any comment left by the reviewer.
  - The date and time of the action.

### Editing a Request

Requests can only be edited when in **Draft**, **Supervisor Rejected**, or **Finance Rejected** status, and only by the owner.

1. Open the request detail page and click **Edit**.
2. The edit form is pre-populated with all existing data.
   - For **General Reimbursement**: existing expense items are shown with their current values and any previously uploaded documents. You can modify any field, add or remove items, and attach new files.
   - For **Travel Advance**: trip details and estimated expense categories are editable. You can add new supporting documents.
   - For **Travel Reimbursement**: trip details and actual expense items are editable. You can add new supporting documents.
3. Click **Cancel** to discard changes and return to the detail page.
4. Click **Save** to save changes without submitting.
5. Click **Save & Submit** to save and immediately submit for review.

The same validation rules apply as during creation. Previously uploaded documents remain attached and are shown in the "Uploaded" section of each item.

### Submitting, Revising, and Deleting

**Submitting**: click **Submit** on the detail page (or **Save & Submit** on the create/edit form). The request moves from Draft to Submitted and enters the supervisor review queue. You can no longer edit it unless it is rejected.

**Revising after rejection**: if a supervisor or finance admin rejects your request, its status changes to Supervisor Rejected or Finance Rejected. You can:
1. Open the detail page and click **Revise (Back to Draft)** to return it to Draft status.
2. Click **Edit** to make changes.
3. Click **Save & Submit** to resubmit.

The approval history is preserved, so reviewers can see prior rejection comments and your revisions.

**Deleting**: click **Delete** on the detail page. Only Draft requests can be deleted. The request and all its associated data (items, documents, approvals) are permanently removed. There is no confirmation dialog.

---

## For Supervisors

Supervisors see everything a regular user sees, plus the **Review Queue** and **Request History** in the sidebar. They can create and manage their own requests and also review requests submitted by their subordinates.

A user becomes a supervisor when a financial admin assigns them the **Supervisor** role via the Admin page. Subordinates are users whose supervisor field is set to this supervisor. If a user has no supervisor assigned, any supervisor can review their requests.

### Review Queue

Click **Review Queue** in the sidebar to see all requests awaiting your review.

- **Heading**: "Review Queue" with a count of pending requests (e.g., "3 request(s) awaiting your review.").
- **Table**: lists all **Submitted** requests from your subordinates, showing:
  - **User** -- the requester's name.
  - **Title** -- clickable link to the review detail page.
  - **Type** -- request type.
  - **Status** -- always "Submitted" in this queue.
  - **Submitted** -- the date the request was submitted.
- Click any column header to sort.

### Request History

Click **Request History** in the sidebar to view all past requests that have moved beyond supervisor review.

- **Heading**: "Request History" with a count of completed or processed requests.
- **Table**: lists all requests with status **Supervisor Approved**, **Finance Reviewing**, **Finance Approved**, **Finance Rejected**, or **Paid**, showing:
  - **User** -- the requester's name.
  - **Title** -- clickable link to the review detail page (read-only, no approval form shown for completed requests).
  - **Type** -- request type.
  - **Status** -- color-coded badge showing the current status.
  - **Account** -- the billing account selected by the supervisor during approval.
  - **Submitted** -- the date the request was originally submitted.
- Click any column header to sort.

This page provides supervisors and financial administrators with a complete audit trail of all processed requests, without needing to search through active queues.

### Reviewing a Request

Click a request in the Review Queue to open the review detail page. This page shows:

- The request title, status badge, type, and the submitter's name ("by First Last").
- **Reimbursement Items** (if General Reimbursement): a full table of expense items with Description, Date, Vendor, Amount, and document count. The total is displayed in the header.
- **Travel Advance Details** (if Travel Advance): destination, estimated amount, and departure/return dates.
- **Travel Reimbursement Details** (if Travel Reimbursement): destination and total amount.
- **Item Documents**: for reimbursement requests, shows uploaded documents per expense item. You can download any document to verify receipts.
- **Documents**: for travel requests, shows request-level supporting documents with download links.
- **Your Decision** panel (only appears when the request status is Submitted).

### Approving a Request

In the **Your Decision** panel:

1. Select a **Charge to Account** from the dropdown. This dropdown lists your active billing account numbers in the format "AccountNumber -- Label" (e.g., "4100-001 -- Department Operations"). You must select an account before you can approve. If you have no accounts, contact a financial admin to set them up.
2. Optionally type a **Comment** for the requester (e.g., "Approved. Please submit travel receipts separately.").
3. Click **Approve**.

The request moves to **Supervisor Approved** and enters the Finance Queue for final review. The account you selected is recorded in the approval history and shown to the finance team.

### Rejecting a Request

In the **Your Decision** panel:

1. Optionally type a **Comment** explaining why you are rejecting (e.g., "Missing receipt for hotel charge. Please re-attach and resubmit.").
2. Click **Reject**.

The request moves to **Supervisor Rejected**. The requester sees your rejection comment in the approval history and can revise and resubmit the request. No account selection is required for rejections.

---

## For Financial Administrators

Financial administrators have the highest level of access. They see everything supervisors and regular users see, plus the **Finance Queue** and **Admin** pages in the sidebar. They can:

- Create and manage their own reimbursement requests.
- Review submitted requests in the Review Queue (same as supervisors).
- View all past processed requests in the Request History (same as supervisors).
- Process supervisor-approved requests in the Finance Queue.
- Mark approved requests as paid.
- Manage all users: assign roles, set supervisor relationships, and manage billing accounts.

### Finance Queue

Click **Finance Queue** in the sidebar to see requests awaiting finance action.

- **Heading**: "Finance Queue" with a count (e.g., "5 request(s) pending finance action.").
- **Table**: lists all requests with status **Supervisor Approved**, **Finance Reviewing**, or **Finance Approved**, showing:
  - **User** -- the requester's name.
  - **Title** -- clickable link to the finance detail page.
  - **Type** -- request type.
  - **Status** -- Supervisor Approved (needs first signoff), Finance Reviewing (under multi-admin review), or Finance Approved (ready to be marked as paid).
  - **Account** -- the billing account selected by the supervisor during approval.
  - **Submitted** -- original submission date.
- Click any column header to sort.

### Processing a Request

Click a request in the Finance Queue to open the finance detail page. This page shows:

- The same request details and documents as the review page.
- **Charged to account**: the billing account number and label selected by the supervisor.
- **Signoff progress**: shows how many distinct finance admin signoffs have been completed out of the required total (e.g., "1 / 3 signoffs completed"). If you have already signed off, a message indicates this.
- **Code secondaire classification**: each line item shows its classification status. Items without a classification display a dropdown to select a code. All items must be classified before the final signoff.
- **Finance Action** panel that changes based on the request's current status:

**When status is Supervisor Approved or Finance Reviewing:**

1. Optionally type a **Comment**.
2. Click **Approve** to add your signoff. On the first signoff, the request moves from Supervisor Approved to Finance Reviewing. Subsequent signoffs keep it in Finance Reviewing. The final signoff (when all items are classified) moves it to Finance Approved.
3. Click **Reject** to send it back to the requester as Finance Rejected. Any finance admin can reject at any point during the review.

**When status is Finance Approved:**

Only the **Mark as Paid** button is shown (see below).

**When the request is in any other status** (e.g., already Paid), the panel shows "No action available for status: {status}."

### Marking a Request as Paid

Once a request has been finance-approved:

1. Open the request from the Finance Queue (it will have status "Finance Approved").
2. Optionally add a **Comment** (e.g., a payment reference number).
3. Click **Mark as Paid**.

The request moves to **Paid**, which is the terminal state. It no longer appears in any queue. The requester can see the payment confirmation in their approval history.

### User Management

Click **Admin** in the sidebar to open the user management page (`/admin/users`).

The page shows a table of all registered users with columns:

| Column     | Description                                                    |
|------------|----------------------------------------------------------------|
| Name       | User's full name                                               |
| Email      | User's email address                                           |
| Role       | Current role (USER, SUPERVISOR, or FINANCIAL_ADMIN)            |
| Supervisor | The user's assigned supervisor (or "None")                     |
| Actions    | Edit and Accounts buttons                                      |

**Editing a user:**

1. Click **Edit** on the user's row.
2. The Role and Supervisor columns become dropdowns:
   - **Role**: select USER, SUPERVISOR, or FINANCIAL_ADMIN.
   - **Supervisor**: select from a list of all supervisors and financial admins (excluding the user themselves), or "None" to clear the assignment.
3. Click **Save** to apply changes, or **Cancel** to discard.

Role changes take effect immediately. Changing a user to Supervisor allows them to see the Review Queue and have billing accounts assigned. Changing a user to Financial Admin gives them full access.

**Supervisor assignment** determines the approval chain: when a user submits a request, only their assigned supervisor (or any supervisor if none is assigned) can approve it at the supervisor stage.

### Supervisor Account Management

Billing accounts are the charge codes supervisors select when approving requests. Each supervisor can have multiple accounts.

To manage a supervisor's accounts:

1. On the Admin page, find the supervisor's row.
2. Click the **Accounts** button (available for users with the Supervisor or Financial Admin role). The accounts panel expands below the user row.
3. The panel shows:
   - The heading "Account Numbers for {First} {Last}".
   - A list of existing accounts, each showing the account number, label, and a **Deactivate** button. Deactivated accounts appear with strikethrough text and cannot be selected during approvals.
   - An **Add** form at the bottom with fields for **Account #** and **Label**.
4. To add an account: fill in both fields and click **Add**. Account numbers must be unique per supervisor.
5. To deactivate an account: click **Deactivate**. The account is soft-deleted and can no longer be used for new approvals, but existing approvals that reference it are preserved.
6. Click **Hide** to collapse the accounts panel.


---

## API Reference

All API routes are prefixed with `/api`. Mutating requests require the `X-Requested-With` header (CSRF protection). Authentication uses HTTP-only cookies set on login.

### Authentication API

| Method | Endpoint           | Auth | Description                              |
|--------|--------------------|------|------------------------------------------|
| POST   | `/api/auth/register` | No   | Create a new account                   |
| POST   | `/api/auth/login`    | No   | Sign in, sets access + refresh cookies |
| POST   | `/api/auth/logout`   | Yes  | Invalidate session                     |
| POST   | `/api/auth/refresh`  | No   | Refresh access token via refresh cookie|
| GET    | `/api/auth/me`       | Yes  | Get current user profile               |
| PATCH  | `/api/auth/me`       | Yes  | Update profile fields                  |

Authentication endpoints are rate-limited to 15 requests per minute per IP address.

### Requests API

| Method | Endpoint                   | Auth | Role        | Description                                      |
|--------|----------------------------|------|-------------|--------------------------------------------------|
| GET    | `/api/requests`            | Yes  | Any         | List requests (cursor pagination, status/type filters) |
| POST   | `/api/requests`            | Yes  | Any         | Create a new DRAFT request                       |
| GET    | `/api/requests/:id`        | Yes  | Any         | Get request details                              |
| PATCH  | `/api/requests/:id`        | Yes  | Owner       | Update request (DRAFT/REJECTED only)             |
| DELETE | `/api/requests/:id`        | Yes  | Owner       | Delete request (DRAFT only)                      |
| POST   | `/api/requests/:id/submit` | Yes  | Owner       | Submit for review (DRAFT only)                   |
| POST   | `/api/requests/:id/revise` | Yes  | Owner       | Move rejected request back to DRAFT              |

**Visibility rules:**
- `USER` sees their own requests.
- `SUPERVISOR` sees their own plus subordinates' requests.
- `FINANCIAL_ADMIN` sees all requests.

**Pagination:** Cursor-based. Pass `?cursor=<lastId>&limit=<n>` for page-through. Supports `?status=<STATUS>&type=<TYPE>` filters.

### Approvals API

| Method | Endpoint                              | Auth | Role            | Description                              |
|--------|---------------------------------------|------|-----------------|------------------------------------------|
| POST   | `/api/requests/:id/supervisor-approve` | Yes  | SUPERVISOR, FINANCIAL_ADMIN | Approve (requires `accountId` in body)  |
| POST   | `/api/requests/:id/supervisor-reject`  | Yes  | SUPERVISOR, FINANCIAL_ADMIN | Reject (optional `comment`)             |
| POST   | `/api/requests/:id/finance-approve`    | Yes  | FINANCIAL_ADMIN | Add finance signoff (multi-admin required) |
| POST   | `/api/requests/:id/finance-reject`     | Yes  | FINANCIAL_ADMIN | Reject (optional `comment`)             |
| POST   | `/api/requests/:id/mark-paid`          | Yes  | FINANCIAL_ADMIN | Mark as paid (terminal state)           |
| PATCH  | `/api/requests/:id/classify-item`      | Yes  | FINANCIAL_ADMIN | Classify item with code secondaire      |
| GET    | `/api/code-secondaire`                 | Yes  | FINANCIAL_ADMIN | List valid code secondaire codes        |

### Documents API

| Method | Endpoint                                   | Auth | Description                              |
|--------|--------------------------------------------|------|------------------------------------------|
| POST   | `/api/requests/:id/documents`              | Yes  | Upload document (multipart, optional `itemId`) |
| GET    | `/api/requests/:id/documents/:docId/url`   | Yes  | Get presigned S3 download URL (5 min TTL)|
| DELETE | `/api/requests/:id/documents/:docId`       | Yes  | Delete document                          |

### Users API

| Method | Endpoint           | Auth | Role                       | Description                        |
|--------|--------------------|------|----------------------------|------------------------------------|
| GET    | `/api/users`       | Yes  | SUPERVISOR, FINANCIAL_ADMIN | List all users                    |
| PATCH  | `/api/users/:id`   | Yes  | FINANCIAL_ADMIN             | Update user role, supervisorId    |

### Supervisor Accounts API

| Method | Endpoint                                          | Auth | Role            | Description                              |
|--------|---------------------------------------------------|------|-----------------|------------------------------------------|
| GET    | `/api/supervisors/:id/accounts/mine`              | Yes  | SUPERVISOR      | List own active accounts                 |
| GET    | `/api/supervisors/:id/accounts`                   | Yes  | FINANCIAL_ADMIN | List all accounts for supervisor         |
| POST   | `/api/supervisors/:id/accounts`                   | Yes  | FINANCIAL_ADMIN | Create account (accountNumber, label)    |
| PATCH  | `/api/supervisors/:id/accounts/:accountId`        | Yes  | FINANCIAL_ADMIN | Update account                           |
| DELETE | `/api/supervisors/:id/accounts/:accountId`        | Yes  | FINANCIAL_ADMIN | Deactivate account (soft delete)         |

---

## Data Model

### Core Entities

```
User
  |-- 1:N -- Request
  |-- 1:N -- Session
  |-- 1:N -- SupervisorAccount (for SUPERVISOR users)
  |-- 1:N -- Approval (as actor)
  |-- self-referential -- supervisor/subordinates

Request
  |-- 1:1 -- ReimbursementDetail (if type = REIMBURSEMENT)
  |       |-- 1:N -- ReimbursementItem
  |                   |-- 1:N -- Document
  |-- 1:1 -- TravelAdvanceDetail (if type = TRAVEL_ADVANCE)
  |       |-- 1:N -- TravelAdvanceItem
  |-- 1:1 -- TravelReimbursementDetail (if type = TRAVEL_REIMBURSEMENT)
  |       |-- 1:N -- TravelExpenseItem
  |-- 1:N -- Document (request-level)
  |-- 1:N -- Approval

Approval
  |-- N:1 -- Request
  |-- N:1 -- User (actor)
  |-- N:1 -- SupervisorAccount (optional, for supervisor approvals)
```

### Enums

- **Role:** `USER`, `SUPERVISOR`, `FINANCIAL_ADMIN`
- **RequestType:** `REIMBURSEMENT`, `TRAVEL_ADVANCE`, `TRAVEL_REIMBURSEMENT`
- **RequestStatus:** `DRAFT`, `SUBMITTED`, `SUPERVISOR_APPROVED`, `SUPERVISOR_REJECTED`, `FINANCE_REVIEWING`, `FINANCE_APPROVED`, `FINANCE_REJECTED`, `PAID`
- **ApprovalAction:** `APPROVE`, `REJECT`, `REQUEST_CHANGES`, `PAID`
- **ApprovalStage:** `SUPERVISOR`, `FINANCE`

All monetary amounts are stored as `Decimal(12,2)`.

---

## Technology Stack

### Frontend

| Technology             | Purpose                                    |
|------------------------|--------------------------------------------|
| React 19.2             | UI framework                               |
| TanStack Router v1.166  | File-based routing with type-safe navigation |
| TanStack Query v5.90    | Server state management and caching        |
| TanStack Table v8.21    | Sortable data tables                       |
| TanStack Form v1.28     | Form state management                      |
| Tailwind CSS v4.2       | Utility-first styling                      |
| Vite v7.3               | Build tool and dev server                  |
| Deno 2.3                | JavaScript/TypeScript runtime (dev + build)|
| Zod v3                  | Schema validation                          |

**Note**: The frontend uses Deno 2.3+ as the runtime for both development and production builds. Dependencies are managed via `deno.json` import maps, eliminating the need for `package.json` and `node_modules`.

### Backend

| Technology             | Purpose                                    |
|------------------------|--------------------------------------------|
| Deno 2.3                | JavaScript/TypeScript runtime              |
| Hono v4                 | Web framework                              |
| Prisma v7               | ORM with PostgreSQL adapter                |
| jose v6                 | JWT creation and verification (HS256)      |
| argon2                 | Password hashing                           |
| AWS SDK v3             | S3-compatible storage client               |
| Zod v3                  | Request validation                         |

### Infrastructure

| Technology             | Purpose                                    |
|------------------------|--------------------------------------------|
| PostgreSQL 16          | Relational database                        |
| RustFS                 | S3-compatible object storage               |
| Caddy 2                | Static file server and reverse proxy       |
| Docker Compose         | Container orchestration                    |

---

## Project Structure

```
ReimbursementManagement/
|-- docker-compose.yml            # Production orchestration
|-- docker-compose.dev.yml        # Development orchestration (hot-reload)
|-- .env.example                  # Environment variable template
|
|-- backend/
|   |-- main.ts                   # API entry point (Hono app, route mounting)
|   |-- Dockerfile                # Production container build
|   |-- deno.json                 # Deno config, tasks, import map
|   |-- prisma/
|   |   |-- schema.prisma         # Database schema (11 models, 5 enums)
|   |   |-- migrations/           # Prisma migration files
|   |-- src/
|       |-- types.ts              # Shared types (AuthUser, HonoEnv)
|       |-- routes/
|       |   |-- auth.ts           # Registration, login, logout, refresh, profile
|       |   |-- requests.ts       # Request CRUD, submit, revise
|       |   |-- approvals.ts      # Supervisor/finance approve, reject, mark-paid, classify-item
|       |   |-- documents.ts      # File upload, download URL, delete
|       |   |-- users.ts          # User listing and role management
|       |   |-- accounts.ts       # Supervisor billing account CRUD
|       |   |-- code-secondaire.ts # Code secondaire list endpoint
|       |-- services/
|       |   |-- auth.service.ts   # Auth logic (argon2 hash, JWT, sessions)
|       |   |-- request.service.ts # Request lifecycle and data access
|       |   |-- approval.service.ts # Multi-signoff approval workflow state machine
|       |   |-- classification.service.ts # Code secondaire classification logic
|       |   |-- storage.service.ts # S3 upload, download, delete
|       |   |-- account.service.ts # Supervisor account management
|       |   |-- user.service.ts   # User listing and role/supervisor updates
|       |-- middleware/
|       |   |-- auth.ts           # JWT auth, CSRF, role gate, rate limit
|       |   |-- error.ts          # Global error handler
|       |-- lib/
|           |-- prisma.ts         # Prisma client singleton
|           |-- s3.ts             # S3 client configuration
|           |-- jwt.ts            # JWT sign/verify utilities
|           |-- env.ts            # Environment config with Zod validation
|           |-- code-secondaire.ts # Static code list (29 codes)
|
|-- frontend/
    |-- Dockerfile                # Multi-stage build (deno build + Caddy)
    |-- Caddyfile                 # Reverse proxy + SPA fallback config
    |-- deno.json                 # Deno config, tasks (dev/build/preview), and imports
    |-- deno.lock                 # Reproducible dependency lock file
    |-- vite.config.mts           # Vite + Tailwind + TanStack Router (Deno-compatible)
    |-- src/
        |-- main.tsx              # React entry point
        |-- types.ts              # All TypeScript domain types
        |-- lib/
        |   |-- api.ts            # Fetch wrapper with auto token refresh
        |   |-- queryClient.ts    # React Query client config
        |-- hooks/
        |   |-- useAuth.ts        # Authentication state
        |   |-- useRequests.ts    # Request CRUD mutations and queries
        |   |-- useDocuments.ts   # Document upload/download/delete
        |   |-- useProfile.ts     # Profile update
        |-- components/
        |   |-- layout/           # AppShell, Sidebar, Header
        |   |-- forms/            # DocumentUpload, ApprovalForm
        |   |-- tables/           # RequestsTable (sortable)
        |   |-- ui/               # Button, Card, Input, Select, etc.
        |-- routes/
        |   |-- __root.tsx        # Error boundary, 404 handler
        |   |-- login.tsx         # Login page
        |   |-- register.tsx      # Registration page
        |   |-- _auth/
        |       |-- route.tsx     # Auth guard layout (redirects if unauthenticated)
        |       |-- dashboard/
        |       |   |-- index.tsx # Dashboard with summary cards
        |       |   |-- requests/
        |       |       |-- index.tsx           # My Requests list
        |       |       |-- new.index.tsx       # Request type selector
        |       |       |-- new.reimbursement.tsx
        |       |       |-- new.travel-advance.tsx
        |       |       |-- new.travel-reimbursement.tsx
        |       |       |-- $requestId.tsx      # Layout route
        |       |       |-- $requestId.index.tsx # Request detail view
        |       |       |-- $requestId.edit.tsx  # Edit request form
        |       |-- review/
        |       |   |-- route.tsx     # SUPERVISOR/FINANCIAL_ADMIN guard
        |       |   |-- index.tsx     # Supervisor review queue
        |       |   |-- history.tsx   # Request history (past approved/paid)
        |       |   |-- $requestId.tsx # Review detail + approval form
        |       |-- finance/
        |       |   |-- route.tsx     # FINANCIAL_ADMIN guard
        |       |   |-- index.tsx     # Finance queue
        |       |   |-- $requestId.tsx # Finance detail + approval form
        |       |-- admin/
        |       |   |-- route.tsx     # FINANCIAL_ADMIN guard
        |       |   |-- users.tsx     # User + account management
        |       |-- profile/
        |           |-- index.tsx     # Profile editor
        |-- utils/
            |-- dates.ts          # Date formatting utilities
```
