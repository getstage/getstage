# Production Deployment & Launch Checklist

## Critical Note

- Target storage is **Cloudflare R2**, not Convex storage.
- The current codebase still uses Convex storage in a few places for uploads and CSV handling.
- Before launch, confirm those flows are migrated to R2 or explicitly accepted as temporary.

## 1. Auth

- Email OTP request sends successfully
- OTP email arrives in inbox, not spam
- OTP email shows the actual 6-digit code variable correctly
- Correct OTP signs the user in
- Wrong OTP fails cleanly
- Expired OTP fails cleanly
- Google sign-in works
- Logout works

## 2. Loops Email

- Loops domain is verified
- `AUTH_LOOPS_API_KEY` is set in Convex
- `AUTH_LOOPS_TRANSACTIONAL_ID` is set in Convex
- Transactional OTP email is published in Loops
- OTP email uses the `code` variable correctly
- `welcome_email` event exists in Loops
- Welcome email loop is published
- First successful payment triggers the welcome email
- Refreshing the success page does not send the welcome email again

## 3. Billing

- `SITE_URL` is correct
- Stripe checkout opens from the app
- Successful payment returns to the app correctly
- Cancelled payment returns to the app correctly
- Billing portal opens correctly
- Paid user state is reflected in the app

## 4. Stripe Connect

- `STRIPE_SECRET_KEY` is set
- `STRIPE_WEBHOOK_SECRET` is set
- `STRIPE_CONNECT_CLIENT_ID` is set
- `STRIPE_YEARLY_PRICE_ID` or `STRIPE_PRICE_ID` is set
- Stripe Connect starts from Settings
- Stripe OAuth callback returns correctly
- Stripe account status becomes `pending` or `active`
- Sync imports invoices and payments
- Disconnect works

## 5. Google Sheets

- Connect Google Sheet from onboarding works
- Connected URL is saved and visible
- Connected URL is clickable
- Connect Google Sheet from Settings works
- Updating the connected sheet URL works
- Import from a real shared/public Google Sheet works
- Invalid Google Sheet URL shows a useful error
- Re-import does not create bad duplicates

## 6. CSV Import

- CSV upload works
- CSV import works
- Invalid CSV shows a useful error
- Replacing the CSV source works

## 7. Storage

- Decide final production storage path: **R2 only**
- Remove or replace Convex storage usage for:
- task attachments
- CSV uploads
- any file upload or file URL flow
- Confirm uploaded files can be read back correctly from R2
- Confirm delete flows also remove files from R2

### Files that still use Convex storage and likely need R2 migration

- [app/convex/tasks.ts](/Users/wdiebenwdambitions/stagemvp/app/convex/tasks.ts)
  - attachment upload URL generation
  - attachment `storageId` handling
  - attachment file URL resolution
- [app/src/components/task/TaskDetailPage.tsx](/Users/wdiebenwdambitions/stagemvp/app/src/components/task/TaskDetailPage.tsx)
  - frontend upload flow for task attachments currently expects Convex upload URLs
- [app/convex/googleSheets.ts](/Users/wdiebenwdambitions/stagemvp/app/convex/googleSheets.ts)
  - CSV upload uses Convex storage
  - CSV import reads uploaded file from Convex storage
  - `sheetConnections.storageId` is part of the current model
- [app/src/components/settings/SettingsPage.tsx](/Users/wdiebenwdambitions/stagemvp/app/src/components/settings/SettingsPage.tsx)
  - CSV upload flow currently posts to Convex storage upload URLs
- [app/convex/schema.ts](/Users/wdiebenwdambitions/stagemvp/app/convex/schema.ts)
  - `attachments.storageId`
  - `sheetConnections.storageId`
  - review schema shape if R2 keys/URLs replace Convex storage ids
- [app/convex/_helpers.ts](/Users/wdiebenwdambitions/stagemvp/app/convex/_helpers.ts)
  - attachment URL resolution currently uses `ctx.storage.getUrl(...)`
- [app/convex/projects.ts](/Users/wdiebenwdambitions/stagemvp/app/convex/projects.ts)
  - project deletion flow deletes attachment files from Convex storage
- [app/convex/settings.ts](/Users/wdiebenwdambitions/stagemvp/app/convex/settings.ts)
  - account deletion flow deletes uploaded files from Convex storage

### Migration questions to resolve before launch

- What is the canonical stored reference in DB: R2 key, public URL, signed URL source, or both?
- Will CSV files also live in R2, or do you want Google Sheets only and no stored CSV files in production?
- Are attachment URLs public, signed, or proxied through your backend?
- Which delete flows must remove R2 objects immediately versus async cleanup?

## 8. Dashboard / Onboarding

- New user sees onboarding
- Onboarding completes correctly
- Paywall appears after onboarding
- Google Sheets step works in onboarding
- Dashboard loads correctly after payment
- No preview/mock state leaks into live user data

## 9. Settings

- Profile save works
- Avatar/logo update works
- Billing tab loads correctly
- Integrations tab loads correctly
- Stripe Connect status shows correctly
- Google Sheets status shows correctly
- CSV status shows correctly

## 10. Production Safety

- All required env vars exist in production
- No test keys in production
- No localhost URLs in redirects
- Stripe webhook endpoint is live
- Connect callback URL is live
- Error states show useful messages
- Account deletion still works safely

## 11. Highest-Risk Flows To Test First

- Real OTP email login
- Real Stripe checkout success
- First-payment welcome email
- Stripe Connect OAuth callback
- Google Sheets import with a real sheet
- R2 upload/read/delete flow

## 12. Google Sheets Help Article

- Create one Stage help article modeled on this reference:
- https://help.portfoliodividendtracker.com/article/126-article
- Goal: one clean guide for users who want to import via Google Sheets

### Recommended article structure

- Short intro
- Explain what the Stage Google Sheets template is for
- Add one clear CTA to copy the template
- Setup steps with screenshots
- Make a copy of the template
- Fill in the `Transactions` tab
- Use client and project names that already exist in Stage
- Share the sheet with `Anyone with the link -> Viewer`
- Go to Stage onboarding or Settings
- Paste the Google Sheets URL
- Click `Link Google Sheets`
- Click `Import`
- Important notes
- Do not rename tabs
- Do not rename headers
- Remove example rows before importing
- Re-import after updates
- Template reference
- Explain `Instructions`, `Transactions`, and `Settings`
- Explain required and optional columns
- Explain allowed values for dropdown fields
- Troubleshooting
- Invalid Google Sheets URL
- Sheet is not publicly shared
- Unknown client or project name
- Invalid date, amount, or type

### Assets to prepare for the article

- Screenshot of the template overview
- Screenshot of the `Transactions` tab
- Screenshot of sheet sharing settings
- Screenshot of onboarding Google Sheets step
- Screenshot of Settings integrations area
- Screenshot of successful linked/imported state

## 13. Final Go-Live Check

- One clean new-user signup
- One clean paid conversion
- One clean Stripe Connect sync
- One clean Google Sheets import
- One clean logout/login repeat
- One manual pass on mobile

## 14. Google Sheets Troubleshooting (Fast)

If importing from Google Sheets fails, use this quick checklist:

## What to check first

1. **“Could not find required column” message**
   - Make sure your first row has these columns exactly:
     - `Date`
     - `Type`
     - `Direction`
     - `Counterparty` (or `Client`)
     - `Amount`
     - `Currency`
     - `Status`
   - Keep `Transactions` as your active tab when copying the URL.
   - Use the full Google Sheets URL from the `Transactions` tab, for example:
     `https://docs.google.com/spreadsheets/d/16D29umAEevwnw693su9sc9OKlv2HVy6If6CbhYJDVX8/edit?gid=2001528163#gid=2001528163`
   - The URL format should be:
     `https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit?gid=<TAB_GID>#gid=<TAB_GID>`

2. **“Unable to fetch / export failed” message**
   - Open your sheet → **Share**.
   - Set access to **Anyone with the link → Viewer**.
   - Keep that option on while importing.
   - If it still fails, try **File → Publish to the web** and retry.

3. **“Client not found” message**
   - Create the client in Stage first.
   - Use the same client name in Stage and in the sheet.

4. **“Project not found” message**
   - Create the project first (or leave that column blank).
   - Use the exact project name that exists in Stage.

5. **“Unsupported type / direction / status” message**
   - Use one of these values:
     - **Type**: `invoice`, `expense`, `salary`, `tax`, `loan`, `other`, `payment`, `refund`, `adjustment`
     - **Direction**: `in`, `incoming`, `out`, `outgoing`
     - **Status**: `draft`, `open`, `pending`, `paid`, `succeeded`, `complete`, `overdue`, `past_due`, `cancelled`, `failed`

6. **“Amount is invalid” or “Invalid date”**
   - Amount should be a valid number.
   - Date format: `YYYY-MM-DD` (for example `2026-03-09`).

7. **“Need at least one header row and one data row”**
   - Make sure your sheet includes the header row and at least one transaction row.
   - Remove extra blank rows above the header.

## One-line recovery flow

1. Keep only one valid transaction row and try import again.
2. If that works, add rows back in small batches (5–10 rows) until the bad row is found.
3. You can always remove and reconnect the sheet URL and try again.
