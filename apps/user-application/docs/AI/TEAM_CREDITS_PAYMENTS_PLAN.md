# Team Members + Credits + Payments — Implementation Plan

> **Status:** Phase 1 + 2 + 3 backend complete · Frontend wired · `npx convex typecheck` GREEN · `apps/user-application tsc` had 1 error (fixed, final re-run interrupted — see Verification)  
> **Locked pricing spec:** 2026-06-24  
> **Last updated:** 2026-09-20

---

## Critical invite-flow audit (2026-09-20)

> **Change freeze:** no further code changes, tests, commits, pushes, or production deploys until Werner has reviewed this table and completed the manual testing. Testing and Development already contain the invite-flow candidate; Production does not.

| Area | Intended behavior | Current status | Environment | Evidence / files | Manual check required | Decision |
|------|-------------------|----------------|-------------|------------------|-----------------------|----------|
| Existing Stage user invite | Owner invites an existing account; member receives workspace access and sees all owner projects | Implemented candidate | Local, Development, Testing | `convex/workspaceMembers.ts`, `domain/collaborators/service.ts`, `domain/projects/readModel.ts` | Invite Roberto, sign in as Roberto, confirm all owner projects appear and are editable | **Keep; must pass** |
| New user invite | Owner can invite an email with no Stage account | Implemented candidate | Local, Development, Testing | `convex/workspaceInvites.ts`, `platform/inviteTokens.ts` | Invite a fresh email address and confirm the email arrives | **Keep; must pass** |
| Invitation email link | Email contains a usable `/invite/:token` link | Implemented candidate; not manually verified by Werner | Local, Development, Testing | `platform/inviteEmail.ts`, `routes/invite.$token.tsx` | Open the actual email and verify the link targets Testing during QA | **Keep; must pass** |
| Signup/sign-in continuation | Logged-out invitee signs up or signs in and returns to the invitation | Implemented candidate; not manually verified by Werner | Local, Development, Testing | `AuthPage.tsx`, `postAuthRedirect.ts`, `webRoutePolicy.ts` | Complete the flow in a private browser with a fresh account | **Keep; must pass** |
| Invitation acceptance | Signed-in user accepts only an invitation addressed to their verified email | Implemented candidate | Local, Development, Testing | `workspaceInvites.ts`, `platform/inviteTokens.ts` | Try correct email, wrong email, expired/revoked token, and a reused token | **Keep; security-critical** |
| Seat enforcement | Pending and accepted members cannot exceed the owner's plan seat limit | Implemented candidate; billing combinations not manually verified | Local, Development, Testing | `domain/collaborators/service.ts`, `workspaceMembers.ts` | Fill all seats, then attempt one additional invite | **Keep; billing-critical** |
| Pending invitation management | Owner can see pending invitations | Implemented candidate | Local, Development, Testing | `TeamPanel.tsx`, `useWorkspaceMembersQuery.ts` | Confirm pending row, recipient email, expiry, and status are correct | **Review necessity** |
| Resend invitation | Owner can issue a replacement invitation email | Implemented candidate | Local, Development, Testing | `workspaceMembers.ts`, `TeamPanel.tsx` | Resend and confirm the old link no longer works and the new link does | **Review necessity** |
| Revoke invitation | Owner can revoke a pending invitation | Implemented candidate | Local, Development, Testing | `workspaceMembers.ts`, `TeamPanel.tsx` | Revoke, then confirm the emailed link cannot be accepted | **Review necessity** |
| Existing workspace/member access | Current members retain access; client portal remains separate | Expected unchanged; regression check outstanding | Local, Development, Testing | `projectCollaborators`, project access/read model | Check one existing member and one client-portal link | **Must not regress** |
| Production release | No invite-flow candidate should be live before Werner's approval | **Not deployed** | Production | No production deploy performed for this candidate | Verify production remains on the prior behavior | **Blocked** |

### Deployment and verification record

| Item | Status |
|------|--------|
| Local code changes | Present and uncommitted |
| Convex Development deployment | Updated with invite-flow candidate |
| Testing web deployment | Updated; version `b94f6b64-36b8-4ceb-9911-aebba22f52c4` |
| Testing URL | `https://testing.getstage.co` |
| Production deployment | **Not performed** |
| Werner end-to-end test | **Not performed yet** |
| Production approval | **Not granted** |

### Ponytail review gate

Before any commit or production deploy, review the complete diff and classify every invite-related change as one of:

- **Required core:** invite record, secure token, expiry, verified-email match, authentication continuation, acceptance, membership creation, authorization, and seat enforcement.
- **Candidate to remove or defer:** pending-invite management UI, resend, revoke, duplicate orchestration, and explanatory code that does not protect behavior.
- **Unrelated:** must stay out of the invite commit.

---

## Implementation status (as of 2026-07-03)

**All three phases are implemented end-to-end.** Backend (Convex) is typecheck-green. Frontend (desktop `user-application`) is wired to live Convex/Stripe data — sidebar credits, billing panel, subscriptions/checkout, purchase history, voice metering, and the credits-exhausted paywall all read from or write to real endpoints. The web app (`web-application`) is auth + payments only by design (see Scope).

The final `tsc --noEmit` re-run after the last fix was interrupted by the CLI session and did not complete; the run before the fix showed exactly one error (`billingCycle` shorthand in `SubscriptionsPageView.tsx`), which is now fixed. **Verification = the one remaining step before this is shippable** (see Verification).

### What is DONE

#### Phase 1 — Workspace team members (backend + UI)
- Schema: `projectCollaborators` evolved to `{ ownerUserId, userId, role, addedBy, createdAt }` with `by_owner` / `by_user` / `by_owner_user` indexes.
- Access (`projectAccess.ts`): editor access via workspace membership; **collaborator's own-subscription requirement removed**, owner-subscription check kept.
- Invite write (`domain/collaborators/service.ts`): workspace membership, dedup per workspace, Zod email guard, **seat limit derived from the owner's active subscription tier** (Start/Pro = 1, Team = 3).
- Listing (`readModel.ts`): `listProjectsForUser` unions owned + workspace-shared, tagged `owner`/`editor`.
- Members list + share dialog API: workspace-scoped.
- Cleanup: single-project delete no longer revokes workspace access; account delete tears down owned workspace + memberships.
- `requireWorkspaceOwner(ctx)` helper.
- `workspaceMembers.ts`: `list`/`add`/`remove` (no `projectId`), rate-limited.
- Settings → Team (`TeamPanel.tsx`) wired to real `workspaceMembers.*` with Zod-validated invite.

#### Phase 2 — Credits + metering (backend)
- Schema: `creditWallets` (`ownerUserId`, `monthlyBalance`, `topupBalance`, `updatedAt`) + `creditLedger` (`walletId`, `delta`, `reason`, `kind`, `userId`, `runId?`, `idempotencyKey?`, `balanceAfter`, `createdAt`), unique on `idempotencyKey`.
- `lib/credits/service.ts`: `CREDIT_COSTS` (voice 5/min, refero 1/req, moodboard fallback 4, research fallback 27), `walletTotal`, `getWalletForOwnerOrNull`, `getOrCreateWallet` (**creates empty — no seeding**), `requireCredits` (**always enforces, fail-closed**, throws `insufficient_credits`), `recordUsage` (idempotent, deducts monthly first), `grantCredits`, `revokeCredits` (zero wallet on cancel/dunning), `reverseCredits` (clamp-at-zero on refund), `getCreditSummaryForOwner`.
- `credits.ts` endpoints: `getCreditSummary` (query), `recordVoiceUsage` (project-scoped), `recordVoiceUsageSelf` (global companion, charges signed-in user's wallet), `grantCreditsForOwner` / `revokeCreditsForOwner` / `reverseCreditsForOwner` (internal, for webhooks + QA).
- Metering hooks: `createResearchRunHandler` pre-checks `requireCredits` + `completeResearchRunHandler` records `reference` usage; `createMoodboardRunHandler` pre-checks + `completeMoodboardRunHandler` records `moodboard` usage (styleguide runs **not** metered — text AI / BYO key).
- **Never metered:** strategy, wireframes reasoning, styleguide text (per locked spec).

#### Phase 3 — Stripe payments (backend)
- `lib/credits/priceConfig.ts`: env-driven map `priceId → { tier, kind, billingCycle, monthlyCredits, includedSeats, topupCredits, isSeatAddOn }`. Locked numbers: Start 5,000 / Pro 10,000 / Team 18,000 credits; Team 3 seats included; top-ups 3,000 / 7,500 / 18,000; trial cap 1,500; seat add-on +5,000/seat.
- `lib/billing/handlers/webhooks.ts`: 5 event handlers (`checkout.session.completed`, `invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted`, `charge.refunded`) — grant trial/monthly/topup credits, revoke on past_due/cancel, reverse on refund. Idempotent on Stripe event id. Registered in `http.ts` via `registerRoutes(..., { events })`.
- `lib/billing/handlers/index.ts` reworked: `loadSubscriptionByUserId` derives **real tier from `priceId`** (legacy `STRIPE_PRICE_ID`/`STRIPE_*_PRICE_ID` map to `pro` for back-compat); `createCheckoutSession` rewritten to use the raw Stripe SDK with `kind`/`tier`/`billingCycle`/`isTrial`/`seats`/`topupSize`, 14-day `trial_period_days`, Team seat add-on as a second line item, top-up as `mode: "payment"`; `createCustomerPortalSession` unchanged.
- Seat enforcement (`domain/collaborators/service.ts`): `includedSeatsForTier(ownerSubscription.plan)` — fail-closed, dynamic.
- Schema `plan` widened to `free | start | pro | team` (`schema.ts`).
- Trial = 14 days, all paid tiers, **card required** (Stripe default; we do not set `payment_method_collection`).

#### Frontend (desktop `user-application`) — wired to live data
- `SidebarCreditsCard.tsx`: reads `useCreditSummaryQuery` (real remaining/granted/used%) + `useSettingsOverviewQuery` (renews date); breakdown is **Voice + Visuals** (Visuals = moodboard + reference); fires `onExhausted` at 0.
- `StageSidebar.tsx`: listens for the `stage-credits-exhausted` window event → opens `CreditsExhaustedModal`; passes `onExhausted` to the card.
- `BillingPanel.tsx`: reads `useSettingsOverviewQuery` (plan name, billing cycle, renews, payment method) + `useCreditSummaryQuery` (usage); top-up buttons → `createCheckoutSession({kind:"topup", topupSize})` then redirect; "Update Payment Method" → `createCustomerPortalSession`; **credit packs corrected to locked pricing** ($9 / $19 / $39 for 3,000 / 7,500 / 18,000); **PurchaseHistory table wired to `usePurchaseHistoryQuery`** (real Stripe top-up payments). Mock `settingsSnapshot` no longer used by BillingPanel.
- `SubscriptionsPageView.tsx`: plan CTAs → `createCheckoutSession({kind:"subscription", tier, billingCycle, isTrial:true, seats})` then redirect; renamed `studio`→`team`; "7-Day Trial"→"Start 14-Day Trial"; Start copy aligned to pricing spec; seat stepper for Team.
- `useVoiceTranscription.ts`: after a successful transcription, calls `recordVoiceUsageSelf({durationMs, idempotencyKey: transcriptionId})` (fire-and-forget, idempotent).
- `lib/errors.ts`: `insufficient_credits` maps to a friendly message **and dispatches `stage-credits-exhausted`** so any run hook that hits the error surfaces the paywall; added `CREDITS_EXHAUSTED_EVENT` + `isInsufficientCreditsError`.
- `useNonProOnboardingGate.ts` + `ClientPortalSettingsView.tsx`: plan gates treat any **paid** tier as paid (not just `pro`); portal access fails closed (only `start`/`pro`/`team`, not undefined).
- `models/settings/settings.ts`: `planSchema` (Zod) widened to `free | start | pro | team`; `formatPlanPrice` handles all tiers.
- Onboarding paywall (`useOnboardingController.ts`): checkout call now passes `tier:"pro"`, `isTrial:true`.
- New Zod hooks: `useCreditSummaryQuery`, `usePurchaseHistoryQuery` (+ exported from `hooks/convex-data/index.ts`).

#### Stripe / Convex env (set by Werner on the dev deployment)
- All `STRIPE_*_PRICE_ID` env vars, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, webhook destination configured. Webhook events enabled include the 5 above plus the `@convex-dev/stripe` component's internal sync events.

### What is NOT done / known gaps (read before QA)

1. **Verification not finalized** — the final `tsc --noEmit` on `user-application` after the `billingCycle` fix did not complete (CLI session interrupted). Re-run it before merging. `npx convex typecheck` is GREEN.
2. **`TEAM_CREDITS_PAYMENTS_PLAN.md`** — this update is the one being written now.
3. **`settingsSnapshot.ts` is still mock data** — `ProfilePanel.tsx` still reads it (profile name/role/avatar). BillingPanel no longer uses it. Not blocking credits/payments, but profile fields are mock.
4. **Team-member voice metering** — `recordVoiceUsageSelf` charges the **signed-in user's own wallet**. Correct for workspace owners; a team member using the global companion would charge their own (empty) wallet and fail closed. Project-scoped voice (`recordVoiceUsage`) charges the project owner correctly but isn't called anywhere yet (no project-scoped voice surface exists).
5. **Web app (`web-application`) plan gates** — `ShareProjectDialog.tsx`, `new-project.tsx`, `DashboardPage.tsx`, `ClaudeConnectPage.tsx` still check `=== "pro"`. By design web = auth + payments only, so these are low-priority but should be widened to `start|pro|team` for consistency. Not blocking desktop.
6. **Refero metering** — still fixed fallbacks (moodboard 4, research 27). Engine does not yet report actual request counts per run. Open decision (ask engine owner).
7. **Trial reminder email (day 12)** + **workspace invite email copy** + **tier names in welcome/first-payment emails** — Loops templates not updated. `handleSuccessfulPaymentEvent` still fires the generic `welcome_email`.
8. **Stripe Dashboard dunning rules** — Werner was asked to set retry/cancel behavior so failed trial-end charges flip to `past_due` predictably (drives the revoke). Not confirmed done.
9. **Card network trial compliance** — Stripe requires clear disclosure + reminder emails for trials. Flag for product/legal; not a code blocker.
10. **Purchase history = top-ups only.** Subscription renewals surface as invoices (not `payments` rows in the component), so they don't appear in the table yet. A future `listInvoicesByUserId` pass would add renewals.
11. **`PurchaseHistory` "Invoice" download button** — removed (no invoice URL stored). The table now shows Purchase / Status / Amount / Date / Credits.
12. **Manual QA not run** — trial flow, top-up flow, seat-limit enforcement, credit drain → paywall, idempotent retries (see Verification checklist below).

### Scope (confirmed with Werner, 2026-07-03)
- **Desktop `apps/user-application`** = the product. All credits/billing/team/credits-widget UX lives here.
- **Web `apps/web-application`** = auth + payments surface only (sign-in, pricing/checkout, download). Its plan gates are secondary.

---

## Does “projectCollaborators = team members” change the plan?

**Yes — Phase 1 is simpler, not bigger.**

| Original plan | Revised plan |
|---------------|--------------|
| New `teams`, `teamMembers`, `teamInvites` tables | **Evolve collaborators to workspace-level membership** — one row per `(ownerUserId, userId)`, not per project |
| Parallel team entity + migration from collaborators | **Same concept, wider scope** — “team member” = workspace editor on **all** of the owner’s projects |
| Team UI as new surface | **Settings → Team** (partner) + retire per-project invite as primary path |

**Unchanged:** credits, Stripe tiers/trial/top-ups, metering, paywall, widget, portal gating.

**Explicitly separate (NOT team members):**

| Surface | What it is |
|---------|------------|
| **Client portal** | Token-based `portalConfigs.shareToken` — clients view progress without a Stage seat |
| **Settings → Clients** | CRM-style `clients` table — contact records, not workspace access |
| **Portal branding** | Pro/Team feature on `portalConfigs` — unrelated to who can edit projects |

---

## Locked numbers (source of truth)

### Credit unit

- **1 credit = $0.001**
- **1 Refero request = 1 credit** (moodboard ≈ 4, research run ≈ 27 — count requests, no bundling)
- **1 voice minute = 5 credits** (Voxtral transcription-only)
- **Single pool** — monthly + top-ups stack; spend monthly first; **no rollover** at launch
- **Text AI unmetered** — BYO Claude/Codex for research/strategy/wireframes reasoning

### Tiers

| Plan | Monthly | Yearly (~17% off) | Credits/mo | Seats |
|------|---------|-------------------|------------|-------|
| **Start** | $19 | ~$189 | 5,000 | 1 |
| **Pro** | $29 | ~$289 | 10,000 | 1 |
| **Team** | $49 | ~$489 | 18,000 pooled | 3 included |
| **Team extra seat** | +$15 | +$149 | +5,000 to pool | per seat |

### Trial

- 14 days · card required · **1,500 credit hard cap** · auto-converts at day 14
- Day-12 pre-charge reminder email (Loops)

### Top-ups

| Pack | Price | Credits |
|------|-------|---------|
| Small | $9 | 3,000 |
| Medium | $19 | 7,500 |
| Large | $39 | 18,000 |

---

## Current state (grounding — resolved items struck)

- [x] ~~Subscriptions read live from `@convex-dev/stripe` (`listSubscriptionsByUserId`); snapshot hardcodes `plan: "pro"`~~ → tier now derived from `priceId` (legacy ids → `pro`).
- [x] ~~Schema `subscriptions` table largely vestigial for reads~~ → component table is the source of truth; `plan` enum widened.
- [x] ~~`projectCollaborators` is per-project~~ → workspace grain (`ownerUserId`).
- [x] ~~`resolveProjectAccess` requires both subscriptions~~ → owner-subscription only.
- [x] ~~`listProjectsForUser` returns owned only~~ → unions workspace-shared.
- [x] ~~No credits yet~~ → wallet + ledger + `requireCredits`/`recordUsage` + metering on research/moodboard/voice.
- [x] ~~Pricing UI divergent / mock~~ → desktop sidebar + billing + subscriptions wired to live data (web still divergent by scope).
- [x] ~~Settings billing uses mock snapshot~~ → BillingPanel uses `useSettingsOverviewQuery` + `useCreditSummaryQuery` + `usePurchaseHistoryQuery`. (`ProfilePanel` still mock.)

---

## Partner coordination (settings work)

Your partner is editing **Settings → Team members**. Align on this **before** merging Phase 1:

- [ ] **API contract** — agree on Convex exports:
  - `workspaceMembers.list` (for current user as owner OR as member)
  - `workspaceMembers.add` / `workspaceMembers.remove`
  - `workspaceMembers.listForOwner(ownerUserId)` (owner-only management)
  - Optional: `workspaceMembers.inviteByEmail` (reuse Loops pattern from `collaborators.ts`)
- [ ] **Settings tab** — confirm location: new “Team” tab vs section under Account/Billing
- [ ] **Seat UX** — who renders seat counter / “upgrade for more seats”: Settings Team panel vs `SubscriptionsPageView`
- [ ] **Copy** — “Team member” = Stage user with edit access; “Client” = portal/CRM only
- [ ] **Remove per-project invite as primary** — `AddProjectMemberDialog` / kanban member UI should link to Settings or call workspace-level add (not `projectId`-scoped add)
- [ ] **Zod/types** — extend `settingsOverviewSchema` / billing models with `tier`, `seats`, `seatLimit`, `members[]` (partner + backend in sync)

---

## Phase 1 — Workspace team members (no billing/credits yet)

**Goal:** Any workspace member sees **all** projects owned by the workspace owner. One subscription on the owner covers members. Client portal unchanged.

### 1.1 Schema & migration

- [x] ~~Add `workspaceMembers` table~~ → **evolved `projectCollaborators` in place** to `{ ownerUserId, userId, role: "editor", addedBy, createdAt }`; indexes `by_owner`, `by_user`, `by_owner_user`. Dropped `projectId` + legacy indexes. **No `status` field** (no invite-before-signup at launch).
- [x] `workspaceInvites` — **deferred to Phase 3** (invite-before-signup not at launch)
- [x] **Migration:** dev data disposable → clear table once on deploy (no backfill script)
- [x] Deprecate writes to old grain — done (table repurposed; new writes use `ownerUserId`)
- [x] Update `projectCleanup` — done (`deleteWorkspaceMembershipsForOwner` on owner account deletion)

### 1.2 Access control

- [x] Extend `resolveProjectAccess` — owner → `owner`; workspace membership (`ownerUserId === project.userId`) → `editor` via `by_owner_user`
- [x] **Remove** requirement that collaborator has their own subscription — done
- [x] Replace dual-subscription check with **owner-subscription-only** check — done
- [ ] Add `resolveWorkspaceOwner` — **deferred to Phase 2** (billing subject; resolves the owner from the project being metered, so no standalone helper needed yet)
- [x] Add `requireWorkspaceOwner(ctx)` for invite/remove/seat mutations — done (`requireAuthUser.ts`)

### 1.3 Project listing & members display

- [x] Extend `listProjectsForUser` to union owned + workspace-shared projects — done
- [x] Set `accessRole: "editor"` on shared projects — done (owner role wins on dedup)
- [x] Update `getProjectMembersHandler` to list **workspace members** — done (`by_owner`)
- [ ] Ensure desktop + web project pickers/dashboard consume updated list query — **verify** (they call `listProjectsForUser`, so expected automatic)

### 1.4 Convex API (replace / wrap collaborators)

- [x] Evolved `collaborators.ts` / `service.ts` exports with workspace semantics (kept `projectId` arg so existing dialogs keep working)
- [x] `add` — owner only; target must exist; dedup per workspace (seat limit stub deferred to Phase 3)
- [x] `remove` — owner only, workspace-scoped
- [x] `list` (`listByProject`) — members for workspace owner
- [x] Reuse Loops email — kept as-is (copy still "project X"; workspace copy pending)
- [x] Rate limits: migrate `enforceProjectInviteRateLimit` → `enforceWorkspaceInviteRateLimit` (owner + owner:recipient keys) — done
- [x] **Workspace-native API for Settings → Team** (`workspaceMembers.list/add/remove`, no `projectId`) — done (partner to confirm final export names + wire UI)

### 1.5 Frontend

- [x] **Settings → Team** — list/invite/remove wired to `workspaceMembers.*` (`TeamPanel.tsx`); seat cap display-only until Phase 3
- [ ] Desktop `AddProjectMemberDialog` — redirect to Settings or call workspace `add` (remove `projectId` requirement)
- [ ] Web `ShareProjectDialog` — same; stop gating on “both need Pro”
- [ ] Dashboard: member sees owner’s projects with clear “Shared workspace” indicator if needed
- [x] Task assignee dropdowns: workspace members as assignee pool — done via backend (`getProjectMembers` now workspace-wide)

### 1.6 Phase 1 verification

- [ ] Owner invites member → member sees **all** owner projects on dashboard
- [ ] Member can edit tasks/runs on shared projects
- [ ] Remove member → access revoked immediately
- [ ] Client portal link still works without Stage account
- [ ] Legacy per-project collaborator rows migrated or still resolve during compat window
- [ ] Solo user unaffected

---

## Phase 2 — Credits + metering (manual grants first)

**Goal:** Real wallet + ledger + hard-stop. Test without Stripe.

### 2.1 Schema

- [x] `creditWallets`: `{ ownerType: "user", ownerId, monthlyBalance, topupBalance, updatedAt }` (Team pool uses `ownerId = workspaceOwnerUserId` — no separate team table). `trialCreditsGranted?` dropped — trial grant is just a `trial_grant` ledger row.
- [x] `creditLedger`: `{ walletId, delta, reason, kind, userId, runId?, idempotencyKey?, balanceAfter, createdAt }`
- [x] Indexes: wallet by owner; ledger by wallet, by wallet+createdAt, by wallet+kind; **unique on idempotencyKey** (Toyota: no double charge)

### 2.2 Credit helpers (`lib/credits/service.ts` + `credits.ts`)

- [x] `resolveBillingSubject` — folded into `requireCredits(ctx, ownerUserId, cost)` (owner resolved at call sites from `project.userId` or signed-in user).
- [x] `getCreditSummaryForOwner` → `{ total, monthly, topup, usedByKind }`
- [x] `requireCredits` → throws `insufficient_credits` (always enforces, fail-closed)
- [x] `recordUsage` — deduct monthly first; idempotent on `idempotencyKey`
- [x] `grantCredits` / `revokeCredits` / `reverseCredits` internal mutations for webhooks + QA
- [x] Query: `getCreditSummary` (+ `getPurchaseHistory`)

### 2.3 Metering hooks

- [x] **Pre-check** before metered runs:
  - [x] `createResearchRun` / `createMoodboardRun` — `requireCredits` with fallback costs (27 / 4)
  - [ ] Voice — no upfront pre-check (duration unknown); metered post-transcription
- [x] **Post-usage deduct:**
  - [x] Voice: `useVoiceTranscription` → `recordVoiceUsageSelf` (global companion); `recordVoiceUsage` mutation exists for project-scoped (not yet called)
  - [x] Refero: fixed fallback costs on run complete in `handlers/research.ts` + moodboard handlers (actual counts pending engine — see Open decisions)
  - [x] Moodboard → kind `"moodboard"`; research references → kind `"reference"`
- [x] **Never meter:** strategy, wireframes, styleguide text reasoning paths
- [x] Propagate `insufficient_credits` to desktop clients (`lib/errors.ts` maps + dispatches paywall event)

### 2.4 Frontend (credits UX)

- [x] **Credit widget** (`SidebarCreditsCard`): total remaining, of granted, % used, **Voice + Visuals** breakdown (per Werner 2026-07-03), renews date, Top Up + Manage Plan. Tri-state (`undefined` = loading).
- [x] **Paywall modal** (`CreditsExhaustedModal`) — opens on `stage-credits-exhausted` event (fired by `errors.ts` on `insufficient_credits` and by the card at 0 balance).
- [x] Widget wired to `getCreditSummary` (mock `settingsSnapshot.billing.creditsUsed` no longer used by sidebar/billing).
- [x] "Voice Board" → "Voice"; "Mood Board"+"References" → "Visuals".

### 2.5 Phase 2 verification — **NOT YET RUN** (manual QA)

- [ ] Manual grant 5,000 credits → moodboard + research + voice deduct correctly
- [ ] Ledger rows match kinds; widget breakdown matches ledger
- [ ] Drain to 0 → hard-stop + paywall modal
- [ ] Retry same runId → no double deduct
- [ ] Workspace member spend debits **owner's wallet** (project-scoped runs — voice `Self` variant charges member's own wallet, known gap)

---

## Phase 3 — Stripe payments rework

**Goal:** Wire money to wallet + tiers + seats + trial + top-ups.

### 3.1 Stripe catalog (test + live)

- [x] Products: Start, Pro, Team (+ Top-up product, one-time)
- [x] Prices: each tier × monthly + yearly (~17% off annual)
- [x] Team **per-seat** add-on price (quantity line item): +$15/mo, +$12/mo yearly
- [x] One-time top-up prices: Small $9 (3,000), Medium $19 (7,500), Large $39 (18,000)
- [x] Env vars wired: `STRIPE_START_*`, `STRIPE_PRO_*`, `STRIPE_TEAM_BASE_*`, `STRIPE_TEAM_SEAT_*`, `STRIPE_TOPUP_{SMALL,MEDIUM,LARGE}_PRICE_ID`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (set on dev deployment by Werner)
- [x] Code config map: `lib/credits/priceConfig.ts` (`priceId → { tier, kind, monthlyCredits, includedSeats, topupCredits, isSeatAddOn }`)

### 3.2 Checkout & trial

- [x] `createCheckoutSession` accepts `kind`/`tier`/`billingCycle`/`isTrial`/`seats`/`topupSize` (raw Stripe SDK)
- [x] Trial: `trial_period_days: 14`, card required (Stripe default), all paid tiers
- [x] On `checkout.session.completed` (subscription): metadata `userId`/`priceId`/`isTrial` → grant trial (1,500 cap) or monthly allotment; (top-up): grant `topupCredits`
- [x] Trial start grant = 1,500 hard cap (via `TRIAL_CREDIT_CAP`)
- [ ] Block top-up checkout until wallet/customer exists — **not enforced** (top-up creates a customer if missing; acceptable)

### 3.3 Webhooks (`http.ts` + `lib/billing/handlers/webhooks.ts`)

- [x] `invoice.paid` (cycle) → grant monthly allotment (first invoice skipped — handled by checkout)
- [x] `checkout.session.completed` mode `payment` → add `topupCredits` to top-up balance
- [x] `customer.subscription.updated` → revoke on `past_due`/`unpaid`/`canceled`; tier/seat changes refill on next `invoice.paid`
- [x] `customer.subscription.deleted` → revoke all credits
- [x] `charge.refunded` → reverse top-up grant (clamp at zero)
- [x] Idempotent webhook processing (Stripe event id as `idempotencyKey`)

### 3.4 Subscription snapshot rework

- [x] Stop hardcoding `plan: "pro"` — `resolveTier(priceId)` (legacy ids → `pro`)
- [x] Snapshot returns `{ plan, status, billingCycle, currentPeriodEnd, cancelAtPeriodEnd, stripeCustomerId, stripeSubscriptionId, stripePriceId }` (payment method fields still null — component doesn't expose them yet)
- [x] Consumers updated: settings overview, `useNonProOnboardingGate` (isPaid), `ClientPortalSettingsView` (paid-tier gate, fail-closed)
- [x] Schema `plan` enum widened: `free | start | pro | team` (backend) + `planSchema` (Zod, frontend)

### 3.5 Seat enforcement

- [x] `includedSeats` from tier: Start/Pro = 1, Team = 3 (`includedSeatsForTier`)
- [x] `insertWorkspaceMembership` checks `currentMembers + 1 >= seatLimit` (owner counts as 1)
- [x] Team checkout: base price + `(seats - 3)` × seat add-on as a second line item
- [ ] Stripe subscription quantity sync when owner adds/removes members — **not automated**; owner manages seats in the Stripe portal (createCustomerPortalSession). Adding a member beyond the tier seat limit is rejected server-side regardless.

### 3.6 Emails

- [ ] Day-12 trial reminder — **not wired** (Loops template + `customer.subscription.trial_will_end` listener pending)
- [ ] Welcome / payment success emails updated for tier names — **not done** (`handleSuccessfulPaymentEvent` still fires generic `welcome_email`)
- [ ] Workspace invite email (workspace-scoped copy) — **copy still project-scoped** (functions, not blocking)

### 3.7 Pricing UI reconciliation (desktop)

- [x] `SubscriptionsPageView.tsx` → Start $19 / Pro $29 / Team $49 + seats; CTAs wired to `createCheckoutSession` with 14-day trial
- [x] `BillingPanel.tsx` → live tier, renewal, usage, top-up buttons (real checkout), payment method (portal), purchase history (real)
- [x] Removed hardcoded renewal dates / mock `settingsSnapshot` billing fields from BillingPanel
- [ ] `SubscriptionsPageView` "Get Started" CTA on Start currently also starts a trial — confirm Start should trial (currently yes, per "all paid tiers trial")
- [ ] Web `PricingSection.tsx` + `OnboardingPaywall.tsx` — **not touched** (web = auth/payments scope; lower priority)

### 3.8 Feature gating by tier

- [x] **Custom portal branding** (`logoUrl`): paid tiers only (Start/Pro/Team); error copy updated to "paid Stage plan"
- [x] **Team invites / multi-seat:** Team tier (Start/Pro = 1 seat, enforced server-side)
- [ ] **Priority support** badge/copy — not gated (cosmetic)
- [x] Project count — display only, no cap (per locked spec)

### 3.9 Phase 3 verification — **NOT YET RUN** (manual QA)

- [ ] Checkout each tier in Stripe test mode → 14-day trial, card required
- [ ] Start trial with card → 1,500 credits, hard cap enforced
- [ ] Stripe test clock → day 14 auto-charge + full monthly grant
- [ ] Each top-up increases `topupBalance`; survives monthly reset; appears in Purchase History
- [ ] Team: 3 seats included; +1 seat → +$15 + seat add-on line item; +5,000 credits to pool on next invoice
- [ ] Start tier cannot set custom portal logo
- [ ] Cancel/past_due → credits revoked → AI runs fail closed → paywall
- [ ] Refund a top-up → credits reversed (clamped at 0)

---

## Cross-cutting / reliability (Toyota)

- [x] `recordUsage` idempotent on `idempotencyKey` — voice retry, run retry, Strict Mode double-submit (unique index enforces)
- [x] `requireCredits` before expensive provider calls — fail closed at Convex even if UI bypassed
- [x] Wallet deduct + ledger insert in **same mutation** (atomic)
- [x] `useQuery` tri-state for credit widget: `undefined` = loading, not empty
- [x] Double-click on "Run research" cannot pass pre-check twice — server idempotency (UI disable is call-site responsibility; server is the hard gate)
- [x] No credits without payment — `getOrCreateWallet` creates empty; only `grantCredits` (webhook-driven) adds credits
- [x] Refund can't go negative — `reverseCredits` clamps at zero
- [x] Cancel/dunning revokes — `revokeCredits` zeros the wallet; `customer.subscription.updated` non-active → revoke

---

## Critical files

| Area | Path |
|------|------|
| Schema | `packages/data-ops/convex/schema.ts` |
| Access | `packages/data-ops/convex/helpers/access/projectAccess.ts` |
| Collaborators → workspace | `packages/data-ops/convex/collaborators.ts`, `domain/collaborators/service.ts` |
| Project list | `packages/data-ops/convex/domain/projects/readModel.ts` |
| Billing handlers | `packages/data-ops/convex/lib/billing/handlers/index.ts` |
| Stripe webhooks | `packages/data-ops/convex/lib/billing/handlers/webhooks.ts` |
| HTTP routes | `packages/data-ops/convex/http.ts` |
| Price config | `packages/data-ops/convex/lib/credits/priceConfig.ts` |
| Credits service | `packages/data-ops/convex/lib/credits/service.ts` |
| Credits endpoints | `packages/data-ops/convex/credits.ts` |
| AI runs (metering) | `packages/data-ops/convex/lib/projectAi/handlers/{research,moodboard}.ts` |
| AI runs (unmetered) | `packages/data-ops/convex/lib/projectAi/handlers/{wireframes,strategy,styleguide}.ts` |
| Voice (project) | `apps/user-application/electron/voice/route.ts` |
| Voice (meter call) | `apps/user-application/src/hooks/companion/useVoiceTranscription.ts` |
| Workspace API | `packages/data-ops/convex/workspaceMembers.ts` |
| Settings (partner) | `apps/user-application/src/components/settings/*`, `models/settings/settings.ts` |
| Desktop sidebar credits | `apps/user-application/src/components/dashboard/sidebar/SidebarCreditsCard.tsx`, `StageSidebar.tsx` |
| Desktop billing UI | `apps/user-application/src/components/settings/BillingPanel.tsx`, `components/subscriptions/SubscriptionsPageView.tsx` |
| Credit/paywall hooks | `apps/user-application/src/hooks/convex-data/{useCreditSummaryQuery,usePurchaseHistoryQuery}.ts` |
| Error → paywall | `apps/user-application/src/lib/errors.ts` |
| Onboarding checkout | `apps/user-application/src/features/onboarding/useOnboardingController.ts` |
| Web billing UI (scope: auth+payments) | `apps/web-application/src/components/project/dialogs/ShareProjectDialog.tsx`, `routes/_authed/new-project.tsx`, `components/dashboard/DashboardPage.tsx`, `components/agents/ClaudeConnectPage.tsx` |
| Team UI (legacy) | `apps/user-application/src/components/project/kanban/AddProjectMemberDialog.tsx` |

---

## Development team-flow smoke test (2026-09-20)

Use a new project such as `TEAM FLOW TEST`. Never use customer projects from the
production deployment for this test.

### How access works today

1. The owner has a subscription with more than one seat.
2. The invited email must already belong to a Stage user; pre-signup invitations are not implemented.
3. Adding the user in **Settings -> Team** creates the workspace membership immediately.
4. The email is informational; there is no separate invitation-acceptance step.
5. After signing in again, the member can access every project owned by that workspace owner.
6. Project-scoped AI usage is charged to the project owner's credit wallet.

### Development environment

Use Convex deployment `reliable-bullfrog-917` and Stripe **Test Mode**. Do not copy
live Stripe secrets, live webhook secrets, or live price IDs from Production.

- [ ] `SITE_URL=https://testing.getstage.co`
- [ ] `STRIPE_SECRET_KEY=sk_test_...`
- [ ] `STRIPE_WEBHOOK_SECRET` belongs to
      `https://reliable-bullfrog-917.convex.site/stripe/webhook`
- [ ] `STRIPE_START_MONTHLY_PRICE_ID` and `STRIPE_START_YEARLY_PRICE_ID`
- [ ] `STRIPE_PRO_MONTHLY_PRICE_ID` and `STRIPE_PRO_YEARLY_PRICE_ID`
- [ ] `STRIPE_TEAM_BASE_MONTHLY_PRICE_ID` and `STRIPE_TEAM_BASE_YEARLY_PRICE_ID`
- [ ] `STRIPE_TOPUP_SMALL_PRICE_ID`, `STRIPE_TOPUP_MEDIUM_PRICE_ID`, and
      `STRIPE_TOPUP_LARGE_PRICE_ID`
- [ ] `STAGE_RESEND_API_KEY`

The current code accepts both naming sets: Start/Solo, Pro/Studio, and
Team/Agency. `STRIPE_TEAM_SEAT_*` is not used by the current fixed-seat checkout.
Stripe Connect variables are not required for this collaboration test.

### End-to-end test

- [ ] Confirm the current backend is deployed to Development before testing.
- [ ] Create member account B first, then sign out.
- [ ] Create owner account A.
- [ ] Start a Pro or Team test subscription for A. Stripe test card:
      `4242 4242 4242 4242`, any future expiry date, and any CVC.
- [ ] As A, create `TEAM FLOW TEST`.
- [ ] In **Settings -> Team**, add the exact email address for B.
- [ ] Sign out and sign in as B.
- [ ] Confirm B can see and open `TEAM FLOW TEST`.
- [ ] As B, make one harmless task change.
- [ ] Sign in as A and confirm the same change is visible.
- [ ] Record both credit balances, run one project-scoped AI action as B, and
      confirm A's balance decreases while B's own balance does not.

Current plan limits in code are Start = 1 seat, Pro = 5 seats, Team = 15 seats.
Trialing subscriptions receive a hard cap of 150 credits.

---

## Open decisions

- [x] **Seat policy:** RESOLVED — Start = 1 seat, Pro = 5 seats, Team = 15 seats.
- [ ] **Refero metering:** Engine reports actual request count per run *(preferred)* vs fixed fallback (4 / 27) at launch? — **still open (ask engine owner)**. Fallbacks are live; swap to actual counts when the engine payload exposes them.
- [x] **Table name:** RESOLVED — evolved `projectCollaborators` in place.
- [x] **Invite before signup:** RESOLVED — deferred (not at launch).
- [x] **Trial:** RESOLVED — 14 days, all paid tiers, card required, 150-credit hard cap.
- [x] **Credit funding model:** RESOLVED — Convex-side ledger (prepaid, real-time gating); Stripe webhooks grant/revoke. No Stripe metered billing.
- [ ] **Start tier trial?** — currently Start also offers a 14-day trial (per "all paid tiers"). Confirm Start should trial vs. paid-immediate. (UI says "Start 14-Day Trial" on all three.)
- [ ] **Seat sync automation** — owner manages extra seats via Stripe portal today; auto-syncing seat quantity on member add/remove is deferred.

---

## Verification (the one remaining pre-merge step)

1. `cd packages/data-ops && npx convex typecheck` — **GREEN (2026-07-03)**.
2. `cd apps/user-application && pnpm exec tsc --noEmit` — had 1 error (`SubscriptionsPageView.tsx` `billingCycle` shorthand → `billingCycle: billingPeriod`), **fixed**; final re-run was interrupted by the CLI session. **Re-run this before merging.**
3. `npx convex dev` — confirmed "Convex functions ready" with no schema errors after the `plan` widening (additive, safe).
4. Manual QA — run the Phase 2.5 and Phase 3.9 checklists above (trial, top-up, seats, drain→paywall, refund, cancel→revoke).

---

## Suggested merge order (historical — phases are implemented)

1. ~~Partner: Settings Team UI~~ — done (`TeamPanel.tsx` wired).
2. ~~Phase 1 backend + `listProjectsForUser` + access helper~~ — done.
3. ~~Wire Settings to real `workspaceMembers` API~~ — done.
4. ~~Phase 2 credits (backend first, widget second)~~ — done.
5. ~~Phase 3 Stripe (catalog + webhooks + UI last)~~ — done.

**Now:** finish verification (final `tsc`, manual QA), then ship. Remaining polish (emails, web gates, engine Refero counts) can follow.

---

## What else you need beyond this doc

1. **Stripe Dashboard dunning rules** — set retry/cancel so failed trial-end charges flip to `past_due` predictably (drives the credit revoke). Werner to confirm done.
2. **Loops templates** — trial reminder (day 12 / `customer.subscription.trial_will_end`), workspace invite copy, tier names in welcome/first-payment emails. **Not done.**
3. **Engine answer** — Refero request count in run completion payload (ask engine owner). Fallbacks live until then.
4. **`PROJECT_STATUS.md` update** — repo rule; reflect Phase 1/2/3 done + verification pending.
5. **Convex deploy + env** — price IDs + secrets on prod deployment (dev is set).
6. **QA accounts** — two test users + Stripe test clock for trial conversion.
7. **Final `tsc --noEmit`** on `apps/user-application` (interrupted last run).
8. **Web app plan gates** — widen `=== "pro"` to `start|pro|team` in `web-application` (low priority; auth/payments scope).
