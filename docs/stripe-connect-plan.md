# Stripe Connect — Implementation Plan

## Current status

**Already built:**
- Database schema: `paymentConnections`, `invoices`, `payments`, `financeEntries` tables
- OAuth flow: `startConnect`, `completeConnect`, `connectCallback` in `convex/stripeConnect.ts`
- Data sync: `syncStripeData` fetches invoices + payments from connected Stripe account
- Settings UI: IntegrationsTab with Connect / Sync / Disconnect buttons
- HTTP routing: `/stripe/connect/callback` endpoint registered

**What Stage reads from a connected Stripe account:**
- Invoices (up to 100): status, amount, currency, client name, dates
- Charges/payments (up to 100): amount, status, currency, description

---

## What you need to do

### Step 1 — Complete Stripe Connect platform setup

This is in your Stripe Dashboard. You saw the "Continue setup" page.

1. Go to **Stripe Dashboard > Connect > Continue setup**
2. Complete the platform profile:
   - Platform type: **"Build a platform"** (freelancers are your connected accounts)
   - Business details as prompted
3. Set your Connect settings:
   - Account type: **Standard** (freelancers keep their own Stripe dashboard)
   - Country availability: as needed
4. Get your **Connect Client ID**:
   - Go to **Settings > Connect > OAuth** in Stripe Dashboard
   - Copy the `ca_...` client ID
5. Add it to your environment:
   - Set `STRIPE_CONNECT_CLIENT_ID=ca_...` in your Convex environment variables
   - Verify `STRIPE_SECRET_KEY` is set
   - Verify `CONVEX_SITE_URL` is set (needed for OAuth redirect)
   - Verify `SITE_URL` is set (for post-connect redirect to settings)

After this, the "Connect Stripe" button in Settings > Integrations should work.

### Step 2 — Test the flow end-to-end

1. Click "Connect Stripe" in Settings > Integrations
2. You should be redirected to Stripe's Connect onboarding
3. After connecting, you should land back at `/settings?tab=integrations&stripe=connected`
4. Click "Sync data" to pull invoices and payments

**Known issue:** The frontend doesn't parse the `stripe=connected` query param yet to show a success toast. This should be added.

### Step 3 — Missing pieces to fix (priority order)

#### Must have for launch:

1. **Success/error feedback after OAuth redirect**
   - SettingsPage needs to read `?stripe=connected` or `?stripe=error` from URL
   - Show a toast/banner confirming connection succeeded or failed

2. **Disconnect confirmation dialog**
   - Currently disconnects immediately — should show "This will stop syncing your invoices and payments"

3. **Better error state in UI**
   - When connection has `status: error`, explain why (e.g. "Account setup incomplete on Stripe")

#### Should have soon:

4. **Webhook handler for `account.application.deauthorized`**
   - If user disconnects Stage from their Stripe dashboard, Stage should know
   - Endpoint exists at `/stripe/webhook` but no event handlers are wired up

5. **Pagination for large accounts**
   - Currently limited to 100 invoices/charges
   - Freelancers with lots of history will miss older data

6. **Rate limiting on sync**
   - Add a cooldown (e.g. 1 sync per 5 minutes) to avoid Stripe API limits

---

## How the OAuth flow works (already built)

```
User clicks "Connect Stripe"
  → Frontend calls startConnect action
  → Backend generates state token, saves pending connection
  → Redirects to https://connect.stripe.com/oauth/authorize
  → User authorizes on Stripe
  → Stripe redirects to /stripe/connect/callback
  → Backend exchanges code for connected account ID
  → Saves account ID in paymentConnections
  → Redirects to /settings?tab=integrations&stripe=connected
```

## How sync works (already built)

```
User clicks "Sync data"
  → Frontend calls syncStripeData action
  → Backend uses connected account's Stripe ID
  → Fetches invoices + charges via Stripe API
  → Maps to app schema (invoices, payments, financeEntries)
  → Saves atomically to database
  → Returns counts: importedInvoices, importedPayments
```

---

## Environment variables needed

| Variable | Where | Description |
|---|---|---|
| `STRIPE_SECRET_KEY` | Convex env | Your Stripe secret key (sk_live_... or sk_test_...) |
| `STRIPE_CONNECT_CLIENT_ID` | Convex env | Connect OAuth client ID (ca_...) |
| `CONVEX_SITE_URL` | Convex env | Your Convex deployment URL (for OAuth callback) |
| `SITE_URL` | Convex env | Your app URL (for redirect after OAuth) |

---

## Key files

| File | What it does |
|---|---|
| `convex/stripeConnect.ts` | All backend logic: OAuth, sync, queries |
| `convex/schema.ts` (lines 260-380) | Database tables for payments/invoices |
| `convex/http.ts` | HTTP routes for webhook + OAuth callback |
| `src/components/settings/IntegrationsTab.tsx` | Frontend UI for Connect/Sync/Disconnect |
| `src/components/settings/SettingsPage.tsx` | Wires up actions + state management |
