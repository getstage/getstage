# Email Flows (Convex + Resend) — Implementation Checklist

> **Status:** Plan locked · Phase 1 (emails pkg) typecheck errors identified · Build not started
> **Target:** Push live within ~2h of start
> **Last updated:** 2026-07-03
> **Owner:** Werner (deploy + env) · AI (code)

---

## Locked decisions (confirmed 2026-07-03)

1. **Go** — build now.
2. **Trial = 14 days.** Keep `TRIAL_DAYS = 14` in code. Fix all template copy "7-day" → "14-day".
3. **Flow A anchor = trial-start** (Stripe checkout with card, `isTrial` branch), NOT `onboarding_complete`. Reason: `completeOnboarding` sets `onboardingCompletedAt` with no card; the trial only starts at Stripe checkout. Anchoring to trial-start makes the copy "your trial is running" true. `onboarding_complete` becomes **audit-only** (recorded in `emailEvents`, schedules no drip).
4. **Resend = LIVE.** Domain `getstage.co` verified, sender `adrien@getstage.co`. `EMAILS_TEST_MODE = false`.
5. **Reuse `STAGE_RESEND_API_KEY`.** No new key. The `@convex-dev/resend` component auto-reads `RESEND_API_KEY`, so set `RESEND_API_KEY` on Convex **to the same value** as the existing `STAGE_RESEND_API_KEY`. The existing `resendAudience.ts` (raw SDK, reads `STAGE_RESEND_API_KEY`) stays untouched.

### Loops — what stays, what goes
- **STAYS:** `integrations/loopsOtp.ts` (OTP / login codes). Untouched.
- **GOES:** the Loops `welcome_email` event in `handleSuccessfulPaymentEventHandler` (`lib/billing/handlers/index.ts:395`) → replaced by the Resend Flow-B "Welcome to Pro" trigger. One welcome, from Resend, not two.
- **STAYS:** `resendAudience.syncContactToResend` on signup (audience list management, not sending).

### Untouched (explicitly out of scope)
- Stripe credit grant/revoke logic in `webhooks.ts`.
- DataFast client-side tracking (cookies, `window.datafast`).
- Login / OTP emails.

---

## The 4 events (Adrien's Convex interface)

| Event | Meaning | Fires where | Drip effect |
|---|---|---|---|
| `signed_up` | Web signup done | `lib/auth/handlers/index.ts` → `createOrUpdateUser`, `isNewUser` branch | Schedules Flow A emails 1 + 1b |
| `app_downloaded` | Mac app first opened | NEW `desktop.recordAppOpened` mutation, called from Electron `onMainWindowReady` (`apps/user-application/electron/windows.ts:82`), idempotent via `appDownloadedAt` | Cancels pending 1b timer |
| `trial_started` | Trial starts (card entered at Stripe) | `lib/billing/handlers/webhooks.ts` → `handleCheckoutCompleted`, `isTrial` branch | Schedules Flow A emails 2–5 |
| `payment_confirmed` | Converted to paid | `lib/billing/handlers/webhooks.ts` → `handleCheckoutCompleted` non-trial + `handleInvoicePaid` first post-trial invoice | Schedules Flow B 1–4; cancels pending Flow A |

> **Change from original Adrien spec:** `onboarding_complete` is no longer a drip anchor (replaced by `trial_started`). It is still written to `emailEvents` for audit. This is the one semantic change — flag it to Adrien.

Each event → one row in `emailEvents` (audit + idempotency, index `by_user_type`).

---

## The emails + exact timing

### Flow A — two anchors. 1 & 1b from `signed_up`; 2–5 from `trial_started`.

| # | Email | Delay | Anchor | Template | Skip rule |
|---|---|---|---|---|---|
| 1 | Welcome + Download | ~2 min | signed_up | `welcome` (WelcomeEmail.tsx) | — (2 min lets DataFast attach visitor id first) |
| 1b | Download Reminder | +24 h | signed_up | `download_reminder` (DownloadReminder.tsx) | Skip if `appDownloadedAt` set OR not Mac |
| 2 | First Project Setup | +1 day | trial_started | `first_project` (FirstProject.tsx) | Skip if sub cancelling/cancelled |
| 3 | AI Workflow Deep-Dive | +3 days | trial_started | `workflow_deep_dive` (WorkflowDeepDive.tsx) | Skip if sub cancelling/cancelled |
| 4 | Client Portal + Integrations | +5 days | trial_started | `client_portal` (ClientPortal.tsx) | Skip if sub cancelling/cancelled |
| 5 | Trial Ending Tomorrow | Stripe `trial_end − 1 day` (≈ +13 d for 14-day trial) | trial_started / Stripe | `trial_ending` (TrialEnding.tsx) | Skip if sub cancelling/cancelled |

### Flow B — all from `payment_confirmed`.

| # | Email | Delay | Template |
|---|---|---|---|
| 1 | Welcome to Pro/Studio | now | `welcome_pro` (WelcomePro.tsx) |
| 2 | Power User Tips | +3 days | `power_user_tips` (PowerUserTips.tsx) |
| 3 | Your Workflow, Optimized | +7 days | `daily_workflow` (DailyWorkflow.tsx) |
| 4 | How's It Going? | +14 days | `feedback` (Feedback.tsx) |

### Conditional rules (re-checked at send time)
- `app_downloaded` event → cancel pending 1b timer immediately.
- `payment_confirmed` → cancel any still-pending Flow A trial emails (converted, no need to nurture trial).
- Trial cancel (sub `cancelling`/`cancelled`) → stop remaining Flow A.
- Dedup: each step = one `scheduledEmails` row, status `pending → sent`. Retries / double-clicks / Strict-Mode can't double-send.
- Mac vs Windows: at send time Convex calls DataFast `GET /api/v1/visitors/{datafastVisitorId}`. Mac → normal download CTA. Windows / mobile / tablet → Welcome uses "Join the Windows waitlist" as primary; **1b skipped entirely**. Unknown / API fail → default Mac, never crash the send.

---

## Data model changes (`packages/data-ops/convex/schema.ts`)

- [ ] `users` += `datafastVisitorId: v.optional(v.string())`
- [ ] `users` += `appDownloadedAt: v.optional(v.number())`
- [ ] New `emailEvents` table: `userId`, `type` (literal union of the 4 events + `onboarding_complete`), `createdAt`, `metadata?: v.string()` (JSON). Index `by_user_type` = `["userId", "type"]`.
- [ ] New `scheduledEmails` table: `userId`, `flow` (`trial` | `retention`), `template` (StageEmailTemplate literal), `status` (`pending` | `sent` | `skipped` | `cancelled` | `failed`), `runAt`, `scheduledFunctionId?: v.string()`, `resendEmailId?: v.string()`, `createdAt`, `updatedAt`, `sentAt?`. Indexes `by_user_flow` = `["userId", "flow"]`, `by_user_template` = `["userId", "template"]`, `by_status_runAt` = `["status", "runAt"]` (cron cleanup).

---

## New Convex code (`packages/data-ops/convex/lib/emails/` + transport)

- [ ] `lib/emails/config.ts` — flow definitions: for each email → template id, subject line (from `emails/EMAIL-FLOWS.md`), delay (ms), anchor event, skip rule. Single place to edit copy/timing.
- [ ] `lib/emails/client.ts` — `export const resend = new Resend(components.resend, { testMode: false, onEmailEvent: internal.emails.handleEmailEvent })`. Reads `RESEND_API_KEY` automatically (set = STAGE_RESEND_API_KEY value).
- [ ] `lib/emails/platform.ts` — DataFast lookup → `{ isMac, deviceType }`. `GET https://datafa.st/api/v1/visitors/{id}` with `Authorization: Bearer DATAFAST_API_KEY`. Read `os` / `device` defensively (try `identity.os.name` + `identity.device.type` AND flat `os` + `device`). Any error / missing → `{ isMac: true, deviceType: "desktop" }`.
- [ ] `lib/emails/handlers.ts` — `recordEmailEvent(ctx, { userId, type, metadata })` (writes `emailEvents` + schedules the right timers via `ctx.scheduler.runAfter`), `sendStep` (internal **action**: re-check skip rules live → render via `renderStageEmail` → `resend.sendEmail` → mark row `sent` with `resendEmailId`, or `skipped`/`failed`), and cancel helpers (`cancelPendingStep`, `cancelFlow`).
- [ ] `lib/emails/events.ts` — `handleEmailEvent` internalMutation (`vOnEmailEventArgs`) → update `scheduledEmails` status from Resend delivered/bounced/opened.
- [ ] `emails.ts` — thin transport: `recordEmailEvent` (internal mutation), `sendStep` (internal action), `handleEmailEvent` (internal mutation), `attachDatafastVisitor` (mutation, authed), `recordAppOpened` (mutation, authed), `cleanupFinalizedEmails` (internal mutation for cron). Matches the repo "thin transport + lib/handlers" pattern.

---

## Edits to existing files

- [ ] `convex/convex.config.ts` → `import resend from "@convex-dev/resend/convex.config.js"; app.use(resend);`
- [ ] `convex/http.ts` → add `http.route({ path: "/resend-webhook", method: "POST", handler: httpAction(async (ctx, req) => resend.handleResendEventWebhook(ctx, req)) })`.
- [ ] `convex/crons.ts` → hourly `internal.emails.cleanupFinalizedEmails` (delete/ archive `sent`/`skipped`/`cancelled`/`failed` rows older than 30 days).
- [ ] `convex/schema.ts` → fields + 2 tables (above).
- [ ] `convex/lib/auth/handlers/index.ts` → in `createOrUpdateUser`, `isNewUser` branch (around line 407): schedule `internal.emails.recordEmailEvent({ userId, type: "signed_up" })` (alongside the existing `resendAudience.syncContactToResend` schedule).
- [ ] `convex/lib/billing/handlers/webhooks.ts` → `handleCheckoutCompleted`: after the trial credit grant (isTrial branch) schedule `recordEmailEvent({ userId, type: "trial_started" })`; after the non-trial monthly grant schedule `recordEmailEvent({ userId, type: "payment_confirmed" })`. `handleInvoicePaid`: on first post-trial invoice (billing_reason ≠ `subscription_create`, status active) schedule `recordEmailEvent({ userId, type: "payment_confirmed" })`.
- [ ] `convex/lib/billing/handlers/index.ts` → replace the Loops `welcome_email` fetch block in `handleSuccessfulPaymentEventHandler` (lines ~395–425) with a no-op or a call to `recordEmailEvent({ type: "payment_confirmed" })`. Keep `firstPaymentEmailSentAt` idempotency. (Flow B email 1 now comes from the Resend trigger, not Loops.)
- [ ] `convex/onboarding.ts` → `completeOnboarding`: schedule `recordEmailEvent({ userId, type: "onboarding_complete" })` (audit-only, no drip).
- [ ] `apps/user-application/electron/windows.ts` → in `mainWindow.once("ready-to-show", …)` (line 77) alongside `onMainWindowReady()`: call `recordAppOpened` via the existing Convex client/IPC path. Idempotent — the mutation no-ops if `appDownloadedAt` already set.
- [ ] Web/desktop app → after signup, call `attachDatafastVisitor({ visitorId })` reading the `datafast_visitor_id` cookie via existing `lib/datafast.ts` `getDatafastCheckoutMetadata()`.

---

## emails package (`emails/`)

### Typecheck errors (real, from `tsc -p tsconfig.build.json --noEmit`)
- [ ] `components/EmailLayout.tsx:57,60,88` — React-19 `ReactNode` duplicate-copy mismatch (`@types/react@19.0.10` vs the copy `@react-email/components` resolves). Fix: type the handoff props (`hero`, `headerNode`, `children`) so they don't cross the duplicate boundary — cast at the 3 usage sites with `as React.ReactNode` is NOT enough (same copy); instead retyping the props to `import("react").ReactNode` and wrapping the handoff in a Fragment, OR add a pnpm `overrides` pinning `@types/react` to one version. Pick the override (cleanest, 1 line in root `package.json`) unless it breaks other packages — verify with `pnpm --filter stage-emails typecheck`.
- [ ] `components/links.ts:10` — `Cannot find name 'process'`. Fix: add `@types/node` to `emails/package.json` devDependencies (`pnpm --filter stage-emails add -D @types/node`).

### Copy fixes (7-day → 14-day)
- [ ] `emails/emails/WelcomeEmail.tsx:56` — "your 7-day free trial" → "your 14-day free trial"
- [ ] `emails/emails/DownloadReminder.tsx:52` — "start your 7-day free trial" → "start your 14-day free trial"
- [ ] `emails/emails/FirstProject.tsx:30` — "your 7-day trial is running" → "your 14-day trial is running"
- [ ] `emails/emails/TrialEnding.tsx:40` — "your 7-day trial ends tomorrow" → "your 14-day trial ends tomorrow"

### Build
- [ ] `pnpm --filter stage-emails typecheck` → green
- [ ] `pnpm --filter stage-emails build` → `dist/render.js` + `dist/render.d.ts` (already configured: `main: ./dist/render.js`)

---

## Env vars (Werner sets on Convex dev + prod)

- [ ] `RESEND_API_KEY` = **same value as existing `STAGE_RESEND_API_KEY`** (component reads this name automatically)
- [ ] `RESEND_WEBHOOK_SECRET` (generate; also paste into Resend dashboard)
- [ ] `DATAFAST_API_KEY` (the `df_` website key)
- [ ] `EMAILS_TEST_MODE` = `false` (live; `adrien@getstage.co` verified)
- [ ] `CONVEX_SITE_URL` already set (used for webhook URL)

## Resend dashboard (Werner)
- [ ] Create webhook → `{CONVEX_SITE_URL}/resend-webhook`, enable all `email.*` events, secret = `RESEND_WEBHOOK_SECRET`.

---

## Verification checklist (before "done")

- [ ] `pnpm --filter stage-emails typecheck` green
- [ ] `pnpm --filter stage-emails build` produces `dist/`
- [ ] Smoke-render script: render all 10 templates via `renderStageEmail` → no crash, HTML + text non-empty
- [ ] `npx convex dev` run **once** → generates `components.resend` + component tables in `_generated/api.d.ts` (required before convex typecheck passes — the new code references `components.resend`)
- [ ] `npx convex typecheck` green
- [ ] `pnpm --filter @stage/data-ops typecheck` green
- [ ] Env vars set on Convex (above)
- [ ] Resend webhook created in dashboard
- [ ] `npx convex deploy`
- [ ] **End-to-end (Werner, post-deploy):** trigger each of the 4 events on the dev deployment and confirm the right email arrives at a real address. Specifically: signup → Welcome (+2 min); no download → Reminder (+24h); trial checkout → First Project (+1d); paid checkout → Welcome Pro (immediate) + Flow A cancelled.

---

## Known gaps / handoffs

1. **Cannot `convex deploy` from here.** Werner runs `npx convex dev` (to generate component types) then `npx convex deploy`. Code is written to the real `@convex-dev/resend` API so it compiles after the one codegen.
2. **`react-dom` bundling at Convex deploy.** `@react-email/render` pulls `react-dom` server-side. If Convex can't bundle it in a Node action, fallback = pre-render HTML at build time and store on the `scheduledEmails` row. **Flag before switching** — don't go silent.
3. **DataFast visitor field path** (`os` / `device` vs `identity.os.name`) — built defensively, defaults to Mac on any miss. Verify the exact shape on the first real send and tighten.
4. **Electron `recordAppOpened` call path** — `onMainWindowReady` is the hook, but the Electron main process needs a Convex mutation caller (preload/IPC). Verify the existing desktop Convex client can call an authed mutation from main; if not, route via renderer.
5. **First-payment email today fires client-side** (`DashboardPage.tsx:64` → `handleSuccessfulPaymentEvent` on `?billing=success`), using viewer context. The plan moves `payment_confirmed` to the webhook (more reliable, no viewer needed). After the switch, confirm the old client-side path is reduced to a no-op to avoid double scheduling (idempotency via `emailEvents` + `firstPaymentEmailSentAt` covers it, but clean it up).
6. **`PROJECT_STATUS.md`** — update after build to reflect email flows shipping (per AGENTS.md rule).

---

## Build order (suggested, ~2h)

1. **emails pkg** — type fixes + copy + build (15 min)
2. **schema + convex.config + http + crons** (15 min)
3. **lib/emails/{config,client,platform,handlers,events}.ts + emails.ts** (40 min)
4. **wire 4 events** (auth, webhooks, billing, onboarding, desktop, web attachDatafast) (25 min)
5. **typecheck + smoke-render** (15 min)
6. Hand off to Werner: `convex dev` → env → webhook → `deploy` → e2e.
