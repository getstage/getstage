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
