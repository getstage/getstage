# Current Status

## Done
- Google auth is working through Convex Auth.
- Onboarding modal is integrated on the dashboard.
- New users see a mock dashboard preview in the background during onboarding.
- After onboarding, the user goes to a paywall flow instead of directly into the live workspace.
- Real dashboard data still comes from Convex. The preview data is frontend-only.
- Settings now has live wiring for:
  - Stage billing
  - Stripe Connect
  - Google Sheets link
  - CSV upload/import
- Convex backend modules were added for:
  - billing (`billing.ts`)
  - Stripe Connect (`stripeConnect.ts`)
  - Google Sheets / CSV import (`googleSheets.ts`)
  - onboarding state (`onboarding.ts`)
  - dashboard (`dashboard.ts`)
  - projects (`projects.ts`)
  - tasks (`tasks.ts`)
  - settings (`settings.ts`)
  - portal (`portal.ts`)
- Convex HTTP routes (`http.ts`) were added for:
  - Stripe webhook
  - Stripe Connect callback
- Google Sheets template created (v1.0) with:
  - Instructions tab (branded with Stage logo, guide link, rules, column reference)
  - Transactions tab with 13 columns (7 required, 6 optional)
  - Settings tab (reserved for future API-powered dropdowns)
  - Sheet-level validation: dropdowns for Type, Direction, Currency, Status
  - Amount validation (positive numbers only)
  - Date validation (YYYY-MM-DD format) on Date, Due at, Paid at
  - All validations use errorStyle "stop" to block invalid input
  - Header row + Instructions + Settings tabs are sheet-protected (password: "stage")
  - Example rows included for user reference

## Architecture
- **BaaS**: Convex (everything — auth, database, functions, HTTP routes)
- **No separate API layer needed for v1** — all import logic runs inside Convex
- Existing Convex files relevant to import: `googleSheets.ts`, `schema.ts`, `http.ts`
- Existing Convex tables relevant to import: `clients`, `projects`, `financeEntries`, `invoices`, `payments`

## Verified
- `pnpm typecheck` passes
- `pnpm build` passes

## You Still Need To Do

### 1. Stripe setup
Add these env vars in Convex:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_CONNECT_CLIENT_ID`
- `STRIPE_YEARLY_PRICE_ID` or `STRIPE_PRICE_ID`

In Stripe:
- create the yearly price/product
- set Connect redirect URI to:
  - `https://<your-convex-site>/stripe/connect/callback`
- set webhook endpoint to:
  - `https://<your-convex-site>/stripe/webhook`

### 2. Google Sheets import — update `googleSheets.ts`

**Template columns (Transactions tab):**

Required:
- `Date` — YYYY-MM-DD
- `Type` — Invoice, Expense, Salary, Tax, Loan, Other
- `Direction` — In, Out
- `Counterparty` — must match an existing client name in the `clients` table
- `Amount` — positive number
- `Currency` — ISO code (EUR, USD, GBP, etc.)
- `Status` — Paid, Pending, Overdue, Cancelled

Optional:
- `Project name` — must match an existing project name in the `projects` table (if provided)
- `External reference`
- `Due at` — YYYY-MM-DD
- `Paid at` — YYYY-MM-DD
- `Category`
- `Notes`

**Important:** The template uses Title Case for headers and dropdown values. The import function in `googleSheets.ts` must `.toLowerCase()` all enum values before storing (e.g. "Invoice" → "invoice", "In" → "in").

**Import matching logic — match existing only (in `googleSheets.ts`):**
- `Counterparty` must match an existing `clients.name` (case-insensitive). If no match → reject the row with error: "Client '{name}' not found. Please create this client in Stage first."
- `Project name` (if provided) must match an existing `projects.name` for that user (case-insensitive). If no match → reject the row with error: "Project '{name}' not found. Please create this project in Stage first."
- The import function should store the matched `clientId` and `projectId` on the `financeEntries` record, not just the text name.
- Rows that pass validation → insert into `financeEntries` with proper foreign keys.
- Rows that fail → collect and return to the UI as a list of errors with row numbers.

**How onboarding connects to import:**
During onboarding, the user already creates their first project + client (step 2). At step 7 (Connect your data), they link their Google Sheet. So when they import, the client/project matching works immediately because those entities were just created. This is the ideal first-run experience.

**Customer import flow:**
1. Make a copy of the Stage Google Sheets template
2. Fill in transaction rows (using client/project names that exist in Stage)
3. Share the sheet publicly (Anyone with link → Viewer)
4. Paste the Google Sheets URL into Stage (Settings or Onboarding step 7)
5. Click Import
6. Stage validates all rows — valid rows are imported, invalid rows show errors
7. Repeat monthly — add new rows, then re-import

If they do not want Google Sheets, they can upload a CSV instead (same column format).

### 3. Backend validation — in `googleSheets.ts`
The Convex import function must validate every row server-side:
- All 7 required fields present
- Date format is valid YYYY-MM-DD
- Type is in allowed list (after toLowerCase): invoice, expense, salary, tax, loan, other
- Direction is "in" or "out" (after toLowerCase)
- Amount is a positive number
- Currency is a valid ISO code
- Status is in allowed list (after toLowerCase): paid, pending, overdue, cancelled
- **Counterparty must match `clients.name`** → query `clients` table (case-insensitive), store `clientId`
- **Project name (if provided) must match `projects.name`** → query `projects` table (case-insensitive), store `projectId`
- Return per-row error messages to the UI for any failures

### 4. Template guide page
Create a help article at `stage.mvp/help/google-sheets-import` with step-by-step screenshots (similar to PDT's guide at help.portfoliodividendtracker.com/article/126-import-google-sheets).

### 5. Final testing
Test these flows:
- Google login
- Onboarding: workspace type → project + client creation → roadmap → phases → timeline → connect data
- Paywall appears after onboarding
- Stripe checkout starts
- Stripe Connect redirect works
- Google Sheets connect works (step 7 of onboarding + Settings page)
- CSV upload works
- Import with valid client/project names succeeds
- Import with unknown client name shows clear error
- Import with unknown project name shows clear error
- Import with invalid date/type/amount shows clear error
- Re-import (monthly update) works correctly (no duplicates)

### 6. Future: API-powered dropdowns (v2)
The template has a Settings tab reserved for this. When ready:
- Add HTTP routes in `http.ts` that return CSV data:
  - `GET /api/import/data/clients.csv` → returns user's client names
  - `GET /api/import/data/projects.csv` → returns user's project names
- Template uses `IMPORTDATA()` to populate dropdown validation lists dynamically
- Optional: put a Cloudflare Worker with KV cache in front to reduce Convex function calls (IMPORTDATA refreshes ~hourly per user)
- This adds stickiness — the sheet knows their business and validates before import

## Important Note
- Preview dashboard data is only for onboarding/paywall presentation.
- It is not mixed into the live Convex dashboard data.
- Google Sheets template sheet protection password is "stage" (for internal reference only).
- All import logic runs inside Convex — no external API layer needed for v1.