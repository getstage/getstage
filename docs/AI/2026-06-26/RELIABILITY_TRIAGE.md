# Stage Reliability Triage — 2026-06-26

Source of truth for the reliability push. Format per item: **Problem · Status ·
Details · Done this session · Acceptance**. See [PRIORITY_ALERT.md](./PRIORITY_ALERT.md)
for the priority order; billing/credits and emails have their own files.

> Done = product behavior verified. Typecheck/cargo check are necessary, not sufficient.
> Status legend: ✅ done & typechecks · 🔶 partial · ⏳ pending · 🔁 needs manual QA.

---

## P0a — AI integrations / engine-provider errors (chat `fetch failed`)
**Problem:** Partner sees raw `Error invoking remote method 'engine:start-run': TypeError: fetch failed` in chat.
**Status:** 🔶 error-mapping fixed; root cause (partner machine) still open.

**Details:**
- `src/lib/errors.ts` `NETWORK_PATTERN` matched browser wording `"failed to fetch"` but
  NOT Node/undici `"fetch failed"`, so the calm engine message never fired.
- `formatRunError.ts` already maps engine `run_failed` events well (provider auth →
  `claude auth login` / `codex login`, session limits, model errors).

**Done this session:**
- ✅ `errors.ts`: `NETWORK_PATTERN` now also matches `fetch failed`, `econnrefused`,
  `enotfound`, `etimedout`, `socket hang up`. Chat `fetch failed` now →
  **"Stage Engine is not reachable. Restart Stage and try again."**
- ✅ Routed the engine **start** error through `toUserFacingErrorMessage` in
  `useStrategyRun.ts`, `useFlowsRun.ts`, `useWireframesRun.ts` (research already did).
  Chat already mapped via `CritiquePanel` line ~532.

**Root cause (Wessel's diagnosis, 2026-06-26) — Stage Engine sidecar recovery:**
Likely **duplicate Stage / stage-engine processes fighting each other**, not a Claude/Codex
disconnect. Running the app repeatedly with the debug command leaves multiple sidecars:
```
STAGE_DESKTOP_DEBUG=1 RUST_LOG=stage_engine=debug,tower_http=info /Applications/Stage.app/Contents/MacOS/Stage
```
The UI's `engine:start-run` then can't reach a clean local engine → `TypeError: fetch failed`.

Partner recovery steps:
```
ps aux | rg "Stage|stage-engine"
pkill -f "/Applications/Stage.app/Contents/MacOS/Stage"
pkill -f "stage-engine"
```
Then open Stage normally from Finder once. This is local app/sidecar state, **not** a user mistake.

**Engine recovery (other agent + this session):** `electron/sidecar.ts` supervisor now
single-flights start/stop, only trusts a real `stage-engine` readiness response, adopts an
existing healthy engine instead of spawning a duplicate, and the `engine:start-run` handler
restarts + retries once when the engine is unreachable.

**Weak-spot fix (this session, sidecar.ts `getLiveStatus`):** previously it nulled the child
handle when marking the engine `failed`, so a *frozen-but-alive* engine was never reaped →
the restart couldn't bind the port → user had to restart Stage manually. Now the handle is
kept so recovery's `stop()` SIGTERM/SIGKILLs the frozen process before restart → a frozen
engine self-heals. **Remaining edge:** an *adopted* leftover engine (one Stage didn't spawn)
still can't be force-killed by handle; that rarer case shows the friendly restart message.

**MUST SHIP:** the raw-error mapping + recovery only reach the partner once a **new build is
packaged and installed** — his current screenshot is an old build.

**Acceptance:** Break engine locally, start chat/research/strategy/flows → friendly message, no raw IPC.

---

## P0b — Auto-update (partner had to delete + re-download)
**Problem:** App never updated itself.
**Status:** ✅ release side verified healthy + app switched to silent auto-update (typechecks).

**Diagnosis (verified via `gh`, 2026-06-26):** the release pipeline is CORRECT — repo
`getstage/getstage` is **public**, `v0.1.90` ships `latest-mac.yml` + arm64/x64 `.zip` +
blockmaps + dmg, and the build log shows **"Apple signing + notarization enabled"** →
*Developer ID Application: Wessel Dieben* → **"notarization successful"**. So feed/signing
were never the problem. The real cause was app config: `autoDownload = false` +
`autoInstallOnAppQuit = false` → updates only appeared behind a one-time "Download?" dialog.

**Done this session (`electron/helpers/auto-update.ts`, `DesktopUpdateBanner.tsx`, `desktop.ts`):**
- ✅ `autoDownload = true` + `autoInstallOnAppQuit = true` → silent background download, install on quit.
- ✅ Automatic check no longer blocks the download behind a dialog (would double-download).
- ✅ Added a `downloaded` flag to the update status; the persistent top banner now flips to
  **"Restart to update"** once downloaded and applies instantly (`quitAndInstall`, no re-download).
- Always-open users are covered by the persistent banner (not a dismissable popup); quitters
  get it via install-on-quit.

**MUST SHIP:** reaches the partner only after a new build is packaged + installed once
(the in-app updater lives in the app, so the current old build governs his updates until then).

**Acceptance:** Install older packaged build → it downloads the newer one silently and shows
"Restart to update".

---

## P1 — Billing / plan mismatch (also blocks partner now)
**Problem:** Settings shows "Pro" while backend treats user as `free` → "Upgrade to Pro to create another project."
**Status:** ⏳ diagnosed, not yet fixed. NOT broken auth.

**Details:**
- `BillingPanel.tsx` reads **static** `src/data/settings/settingsSnapshot.ts`
  (`planName: "Stage Pro"`, fake credits + fake `sk_live_…` apiKey). Shows "Pro" for everyone.
- Backend is correct & live: `projectService.ts` → `subscription?.plan ?? user.plan ?? "free"`,
  enforced by `entitlement.ts` (`FREE_PROJECT_LIMIT = 1`).
- Two "Wessel Dieben" records: `werner@stage.com`=pro (seed/test), `contact@lumenapps.dev`=free
  (real Google). Two sign-ins, not an identity bug.

**Tasks:** wire BillingPanel to a live Convex query (real plan/credits); optionally audit the
duplicate test account. See [BILLING_CREDITS.md](./BILLING_CREDITS.md) for the credits/pricing track.

**Acceptance:** Settings plan == server entitlement for the same logged-in user.

---

## P1 — Moodboard Directions UX
**Problem:** Could only delete a whole direction; couldn't open one, rename clearly, or remove a single image. Delete button ugly.
**Status:** ✅ core UX shipped (typechecks); 🔁 manual QA.

**Done this session (`DirectionHub.tsx`, `MoodboardTab.tsx`):**
- ✅ Direction card preview + title now **open the direction** (filtered board view).
- ✅ Replaced ugly red Delete with a **⋮ menu → Rename direction / Delete direction**.
- ✅ Inside a direction, the board header shows the **direction name (click to rename, pencil)
  + Delete direction**, so the name is always visible/editable.
- ✅ **Remove from Direction** already existed in the filtered board (select images → button
  reads "Remove from Direction", sets `folder:null`, keeps asset in All) — now reachable.
- ✅ `DirectionPreviewImage` reset effect now includes `item.sourceUrl` + clarifying comment.

**Acceptance:** Add 3 images to a direction, remove 1, reload → gone from direction, still in All.

---

## P2 — Exports (Figma / FigJam pairing code)
**Problem:** Pairing code hard to copy; success shown before plugin completes.
**Status:** ✅ copy buttons added; honest status already present.

**Done this session:**
- ✅ `FigJamExportDialog.tsx` + `ExportOptionsDialog.tsx`: added **Copy** button that swaps to
  green check + "Copied" for 1.5s.
- Both dialogs already gate "Complete" on real `jobStatus` (requested/claimed/completed/failed). ✅
- ✅ Figma copy already says "Run the Stage Exporter plugin in Figma Design".

**Acceptance:** Click copy → code on clipboard, shows "Copied".

---

## P2 — Moodboard import error copy
**Status:** ✅ done.
- ✅ `useMoodboardTab.ts`: replaced "Check that Stage Engine is running and Refero/Figma are
  configured" → **"Moodboard import failed. Try again. If it keeps happening, restart Stage."**
  Internal Refero/Figma detail stays in the logged `formatRunFailedEvent`.

---

## Paper export — NOT TOUCHED
Decided fine; not in the pain list. Left as-is.

---

## Still pending (next sessions)
- ⏳ **Styleguide V2** schema + kill Inter/banned defaults at the boundary (engine `prompt.rs`
  + UI dropdown/renderer/mock). Spec captured from partner: 7 sections, W3C DTCG, opus model.
- ⏳ **Capture**: friendly Screen Recording permission copy + full-screen capture option.
- ⏳ **Uploaded assets**: clickable → preview/details dialog + delete (checklist #1, not yet done).
- ⏳ **Styleguide View** back-button to match app nav.
- ⏳ Billing live-data wiring; **credits/pricing** → [BILLING_CREDITS.md](./BILLING_CREDITS.md).
- ⏳ **Emails → Resend + Convex** → [EMAILS_RESEND.md](./EMAILS_RESEND.md).

## QA gate
- ✅ `pnpm --dir apps/user-application run typecheck` passes after each batch this session.
- ⏳ Manual QA pending for all UI changes.
