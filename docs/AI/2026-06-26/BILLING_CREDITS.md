# Billing, Credits & Pricing — 2026-06-26 (separate track)

Planning doc. No code shipped here yet. See [PRIORITY_ALERT.md](./PRIORITY_ALERT.md).

## Problem
1. **Settings billing is a static mockup.** `src/components/settings/BillingPanel.tsx`
   renders `src/data/settings/settingsSnapshot.ts` (`planName: "Stage Pro"`, fake credits,
   fake `sk_live_…` apiKey, hardcoded `CREDIT_PACKS`). Every user sees "Stage Pro".
2. **Backend is the real source of truth** and disagrees: `projectService.ts` →
   `subscription?.plan ?? user.plan ?? "free"`, enforced by `entitlement.ts`
   (`FREE_PROJECT_LIMIT = 1`). → partner (real `free`) is correctly blocked at project #2
   while the UI claims Pro.
3. **Duplicate accounts:** `werner@stage.com`=pro (seed/test), `contact@lumenapps.dev`=free
   (real Google login). Two sign-ins; not an identity-system bug.

## Tasks — make billing honest (do first)
- [ ] Replace `settingsSnapshot.billing` reads in `BillingPanel.tsx` with a live Convex query
      for the logged-in user's real plan + credits.
- [ ] Plan label, credits used/total, renew date all from live data.
- [ ] If free + at project limit, surface the limit in the UI **before** creation fails:
      *"Free plan includes 1 project. Upgrade to Pro to create more projects."*
- [ ] Audit / merge the duplicate `Wessel Dieben` accounts (test vs real).

## Free project limit — product decision needed
`FREE_PROJECT_LIMIT = 1`. Keep at 1, or raise? Tie to new pricing below before changing the constant.

## New pricing tiers + usage-based credits (Stripe)
Reference: https://stripe.com/blog/introducing-credits-for-usage-based-billing
- [ ] Define tiers (free / pro / team?) and monthly credit grants per tier.
- [ ] Credit top-up packs (the BillingPanel `CREDIT_PACKS` are placeholders: 2.5k/$15,
      5k/$25, 15k/$60 — confirm or replace).
- [ ] Implement Stripe usage-based **credits** (credit grants + drawdown on AI usage).
- [ ] Meter AI runs (chat/research/strategy/styleguide/flows/wireframes) → credit consumption.
- [ ] Convex: store credit balance + ledger; entitlement checks read live balance.

## Open questions for Wessel
- Final tier names + prices + monthly credit amounts?
- What does 1 credit map to (per run? per token bucket?)
- Free limit: stays 1 project, or changes with new tiers?

## Acceptance
Settings plan + credits match server entitlement for the same user; free user sees a clear
upgrade path before any failure; Pro/Team users get expected project counts.
