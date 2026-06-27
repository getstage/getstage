# 🚨 PRIORITY ALERT — Stage Reliability — 2026-06-26

Single source of truth for today's push. Start here.

> Done = product behavior verified. Typecheck + cargo check are necessary, not sufficient.

## Priority order (two bugs work for Wessel but break the partner — top priority)
1. **P0a — AI integrations / engine-provider errors** — chat shows raw `TypeError: fetch failed`.
2. **P0b — Auto-update broken** — partner must delete + re-download every release.
3. **P1 — Billing/plan mismatch** — blocks the partner now (static "Pro" mock vs real `free`).
4. **P1 — Style Guide V2** — new schema, kill Inter + banned defaults at the boundary.
5. **P1 — Moodboard Directions UX** — "New Direction" → "Directions"; per-image remove;
   clickable assets w/ preview+delete; editable title.
6. **P2 — Exports** — Figma/FigJam copy-code + honest completion; Paper copy; import copy.
7. **P2 — Capture** — friendly Screen Recording permission + full-screen capture option.
8. Separate tracks → **[BILLING_CREDITS.md](./BILLING_CREDITS.md)**, **[EMAILS_RESEND.md](./EMAILS_RESEND.md)**.

Detail per item: **[RELIABILITY_TRIAGE.md](./RELIABILITY_TRIAGE.md)**.

## Confirmed root causes (from code, 2026-06-26)
- **P0a:** `src/lib/errors.ts` `NETWORK_PATTERN` matches `"failed to fetch"` (browser) but
  NOT `"fetch failed"` (Node/undici) → friendly engine message never fires.
- **P0b:** `electron/helpers/auto-update.ts` — automatic checks swallow feed errors (only
  *manual* checks show fallback). Public `getstage/getstage` feed + `autoDownload=false`.
  Verify releases contain signed `.zip` + `latest-mac.yml`.
- **P1 billing:** `BillingPanel.tsx` reads static `data/settings/settingsSnapshot.ts`
  (`planName: "Stage Pro"`, fake credits/apiKey). NOT broken auth — backend entitlement
  (`subscription?.plan ?? user.plan ?? "free"`) is correct. Two "Wessel Dieben" records =
  test account (`werner@stage.com`=pro) + real Google (`contact@lumenapps.dev`=free).

## Branch
`fix/stage-reliability-recovery`, small focused commits per area.

## Superseded (source material, not truth)
- `/STAGE_2026_06.md`, `/2026-06-22-research-strategy-polish-checklist.md`,
  `apps/user-application/docs/AI/moodboard/STAGE_RELIABILITY_RECOVERY_PLAN.md`.
