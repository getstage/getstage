# Stripe Considerations for Stage

Short discussion document for deciding how Stage should connect freelancer payment data.

---

## What we are deciding

There are two separate Stripe-related concerns in Stage:

1. **Stage subscription billing**
   How users pay for access to Stage itself.
   Possible providers: `Stripe`, `Polar`, `Creem`.

2. **Freelancer payment data inside Stage**
   How Stage reads a freelancer's invoices and payments so the dashboard can show revenue status.
   For this, the main Stripe options are:
   - `Restricted API key` (read-only first)
   - `Stripe Connect` (more complete, better long term)

These should stay separate in product decisions and in the database.

---

## Option A — Restricted Stripe API key

### What it is

The freelancer pastes a Stripe restricted key into Stage.
Stage stores it securely server-side and uses it to read invoice and payment data.

### Good

- Fastest way to launch `read-only v1`
- Low product friction
- No Connect onboarding flow needed yet
- Good for dashboard metrics, invoice status, revenue overview

### Risks

- Users must trust Stage with a secret key
- Key rotation/revocation becomes a support issue
- Harder to explain clearly to non-technical users
- Not ideal if Stage later wants to act on behalf of the account

### Best fit

- `v1 read-only`
- Dashboard analytics only
- No invoice creation yet

---

## Option B — Stripe Connect

### What it is

The freelancer connects their Stripe account through Stripe's own onboarding/authorization flow.
Stage receives an account connection and can later read or act on behalf of that account.

### Important Connect note

For a new Stripe Connect platform, Stripe does **not** recommend classic OAuth as the default path.

Recommended direction:

- use `Stripe Connect Onboarding` for `Standard accounts`
- store the resulting connected account ID
- run all Stripe server calls in the connected account context

Stripe's OAuth flow still exists, but Stripe explicitly says it is **not recommended for new Connect platforms**. If Stage goes with Connect, the preferred path is Connect Onboarding rather than building a new OAuth-first integration.

### What Connect unlocks

If Stage eventually needs more than read-only reporting, Connect is the path that supports:

- onboarding a freelancer's own Stripe account
- invoice creation on behalf of the connected account
- accepting payments in a multi-tenant setup
- charging application fees
- long-term lifecycle events like reconnect, disconnect, and onboarding recovery

In practice, that means:

- `read-only dashboard visibility` can still be done faster with a restricted key
- `create invoices / accept payments / deeper automation` should push Stage toward Connect

### Minimal Connect requirements

If Stage chooses Connect, the minimum architecture should include:

1. A connected account onboarding flow
2. Storage of the Stripe connected account ID in `paymentConnections`
3. Server-side Stripe calls only, never from the browser
4. Stripe webhooks for sync and UI correctness

Typical webhook groups for this product direction:

- `invoice.*`
- `payment_intent.*`
- optionally payout / account status events later

### Good

- Cleaner trust model than key paste
- Better long-term architecture
- Best path for future invoice creation / deeper payment workflows
- Proper account lifecycle: connect, reconnect, disconnect

### Costs

- More setup than restricted key
- Stripe platform configuration is needed
- Slightly more product and engineering work up front

### Best fit

- `v2+`
- When Stage wants to go beyond reading
- If invoice creation or deeper automation becomes core

---

## Recommendation

### Recommended rollout

1. **V1**
   Use `restricted read-only Stripe key` for dashboard revenue/invoice visibility.

2. **V2**
   Add `Stripe Connect` as the preferred integration path.

3. **Later**
   If Stage starts creating invoices or syncing more payment workflows, move primary users to Connect.

This gives the fastest launch now without blocking the better architecture later.

### Practical decision rule

Use this shortcut:

- if v1 only needs `dashboard visibility` for invoices, payment status, and revenue metrics, keep `restricted read-only key`
- if v1 must also `create invoices` or `accept payments`, skip the restricted-key-only approach and plan for `Stripe Connect`

---

## Product/UX note

If `restricted key` is chosen for v1, the UI must explain clearly:

- what access Stage needs
- that it is read-only for now
- that the key can be revoked later
- that no manual copy/paste of a full secret key should be requested if a safer restricted key is available

---

## Technical note

Current backend structure already separates:

- `subscriptions` for Stage's own billing
- `paymentConnections` for freelancer payment access
- `invoices`
- `payments`

That means we can start with `accessMode = restricted_key` and later add `accessMode = connect` without changing the table structure.

---

## Stripe doc notes

Relevant Stripe guidance verified from the official docs:

- Stripe says OAuth is not recommended for new Connect platforms and recommends Connect Onboarding for Standard accounts instead.
- Restricted keys are available and can be permission-limited.
- Stripe Invoicing supports invoice creation through the API.

Sources:

- https://docs.stripe.com/connect/oauth-standard-accounts
- https://docs.stripe.com/connect/standard-accounts
- https://docs.stripe.com/keys
- https://docs.stripe.com/api/invoices/create
