# Stage — Project Status

> **Living document.** Update weekly (or before each release).  
> **Last updated:** 2026-08-30

---

## NOW (this week)

| Priority | Item | Owner / where |
|----------|------|----------------|
| **!!! P0 wireframes: non-generic design quality** | **W1–W5 implemented 2026-08-11; live acceptance pending.** Hi-Fi runs now materialize exact selected project/design/skill/library context and real brand assets in a unique sealed run-local workspace; Claude/Codex receive short per-call manifests and provider-specific read restrictions; structured event adapters gate missing required reads; screens are checkpointed and repaired independently; cancellation preserves validated siblings; workspace/debug retention is separated; R2 deletion uses durable queued retries with live-reference protection. **Verified 2026-08-11:** Convex functions deployed in dev; monorepo TypeScript typecheck and production build pass; stage-engine 231/231 tests pass; renderer 13/13 tests pass; packaged renderer preparation succeeds. **Not yet user-run:** fixed four-screen Claude/Codex comparison, access coverage, latency/tokens, visual rubric, live preview, Figma resting frames, and transient R2 retry scenario. Full plan + evidence: `docs/WIREFRAMES_REAL_REACT_AUDIT.md`; quality contract: `docs/WIREFRAMES_REAL_REACT_LIBRARIES.md`. | `apps/stage-engine/src/wireframes/provider_workspace.rs`, `apps/stage-engine/src/wireframes/workflow.rs`, `packages/data-ops/convex/lib/r2/domain.ts` |
| **P0 wireframes: agentic retrieval cutover** | **Mandatory Hi-Fi retrieval is implemented locally.** Native Convex vector search and exact R2 source loading remain the retrieval architecture. The current Codex CLI generation/repair path is too slow and unreliable; it is not the target default. No commit, Git push, production deployment, or production backfill is authorized. | `docs/RAG/WIREFRAMES_AGENTIC_RAG_PLAN_AUG26.md`, `docs/WIREFRAMES_LIBRARY_INGEST.md` |
| **P0 wireframes: provider reliability reset** | **First reliability slice implemented locally 2026-08-31; full Stage acceptance pending.** Live failures and every numeric cap (catalog query **2000 chars**, Nebius **8192** default output, top **6** RAG files, thumbnail without JS) are listed in `docs/RAG/WIREFRAMES_LIVE_FAILURES.md`. Generation uses batches of at most five, retries once, and sends `max_tokens` 32768. Still open: Decision log RAG query overflow on the Codex path, no per-library RAG quota, catalog copy-instead-of-import, thumbnail sandbox. No commit or push has been made for this slice. **Acceptance checklist:** `docs/RAG/WIREFRAMES_RELIABILITY_CHECKLIST.md`; **plan:** `docs/RAG/WIREFRAMES_RIG_NEBIUS_GATEWAY_PLAN_28-AUG.md`; **code map:** `docs/RAG/WIREFRAMES_GENERATION_CODEMAP.md`; **failures:** `docs/RAG/WIREFRAMES_LIVE_FAILURES.md`. | `apps/wireframe-ai-gateway/`, `apps/stage-engine/src/wireframes/`, `packages/wireframe-renderer/` |
| **!!! P0** | Desktop idle energy P0 — PR `fix/desktop-idle-energy-p0` | `docs/AI/desktop/2026-06-07!!!-DESKTOP_IDLE_ENERGY_PLAN.md` |
| **P1** | Run packaged-DMG benchmark + 2 h soak (RAM < 400 MB, 12 hr power < 500) | `scripts/desktop-idle-benchmark.sh` |
| **P2** | IPC R2 upload (separate PR after energy gate) | `src/lib/r2Uploads.ts`, `electron/helpers/r2-upload.ts` |
| **P2** | Engine hygiene (async fs, Convex client lock, production expects, shared WorkflowError, typed wireframe JSON) | `apps/stage-engine/ENGINE_REVIEW.md` |
| **P3** | Export E2E + Convex deploy | Notion live test, Figma plugin publish, Paper live write |
| **P2 triage** | Bug triage #33 / #40 / #45 + Dashboard Revenue gap | `apps/user-application/docs/AI/BUG_TRIAGE_2026_06_24.md` |
| **P1 moodboard** | Moodboard + Style Guide fix plan (multi-project, Edit, images, engine vision) — **implemented 2026-06-25** | `apps/user-application/docs/AI/moodboard/MOODBOARD_STYLEGUIDE_FIX_PLAN.md` |
| **P1 moodboard followup** | Provider selection, components from palette, data-loss on tab switch, engine fetch reliability | `apps/user-application/docs/AI/moodboard/MOODBOARD_FOLLOWUP_PLAN.md` |
| **P0 reliability review** | Research images, Moodboard directions, Style Guide, exports, uploads, provider errors, client portal recovery checklist | `apps/user-application/docs/AI/moodboard/STAGE_RELIABILITY_RECOVERY_PLAN.md` |
| **P1 local review** | Project-aware Stage chat: `@project`, bounded Convex context, screenshots, confirmed window capture | `apps/user-application/docs/AI/chatbot/CHATBOT_PLAN.md`; branch `feat/stage-chat-project-context-vision` |
| **P2 desktop flash-kill** | Convex queries routed through TanStack Query (`@convex-dev/react-query`) + route loaders (`ensureQueryData`) so screens paint ready data instead of setup/empty flashes. Interim: per-tab `TabLoadingState` loader on Flows/Wireframes/Assets. Branch `feat/convex-tanstack-query-loaders`. Follow-up: strip residual `isRunsLoading`/`isStyleGuideRunsLoading` guards once live smoke confirms loader cache hits. Skill: `.agents/skills/convex-tanstack-query-adapter/` | apps/user-application/src |
| **P0 testing round 2** | Adrien's Stage 2 feedback — **fixed 2026-07-30**: screen list now Flows-derived + project-type aware (was a hardcoded marketing fixture shipping in prod), screens add/edit/delete + persist, every run scoped to the ticked screens (a "2 screen" Hi-Fi run used to generate all 13 in one provider call), Edit Workflow removed | `apps/user-application/docs/AI/wireframes/WIREFRAMES_BUILD_PLAN.md` |
| **P0 "Stage needs a quick refresh"** | Partners hit the root error boundary on cold start — **fixed 2026-08-01**: route loaders warmed Convex data with `Promise.all`, so one rejected query (cold socket, brief network drop) threw out of the loader and replaced the app with a sign-in prompt. Loaders now settle via `warmRouteData`; the boundary leads with Try again instead of signing the user out. A genuinely signed-out user is still redirected by the `_authed` guard | `apps/user-application/src/lib/routeData.ts` |
| **P0 Convex custom domains** | Client requirement. Move Convex API + HTTP actions onto `getstage.co` subdomains, production first, and ride the switch along with the `prod-v0.2.18` design release. Hardcoded `*.convex.cloud` / `*.convex.site` references inventoried; the switch is a Worker var + a GitHub Environment secret + the Figma allowlist, **not** an env override — overriding `CONVEX_SITE_URL` moves the JWT issuer and signs every user out. Figma re-review is the long pole, start it first | `apps/user-application/docs/AI/infra/2026-08-01-CONVEX_CUSTOM_DOMAIN_MIGRATION.md` |
| **P1 Hi-Fi preview whitespace** | **Fixed 2026-08-01**: the thumbnail measured `documentElement.scrollHeight`, which never reports less than the iframe's own viewport, so every screen shorter than the 900px starting height stayed pinned at 900 and rendered the remainder as a white band — and could never shrink back. Now measures the body only, matching what the Figma export already did | `apps/user-application/src/components/project/tabs/wireframes/WireframeHtmlPreview.tsx` |
| **P0 community move to Discord** | **Done 2026-08-05**: the Slack invite is gone from every surface. `DISCORD_INVITE_URL` (`STAGE_DISCORD_INVITE_URL` override) → `https://discord.gg/z4ZAKu6r29`, 8 lifecycle templates switched, `discord-glyph-white` glyph added (`packages/emails/emails/static/` + `apps/web-application/public/email/`), Slack glyph/workspace/icon assets deleted. Invite verified live (server "Stage"). **Make the invite non-expiring in Discord** — a bot-created invite can lapse, and then every Pro email CTA dead-ends | `packages/emails/components/links.ts`, `packages/emails/EMAIL-FLOWS.md` |
| **P0 marketing copy vs shipped product** | **Done 2026-08-05**: audited email + landing + paywall copy against code. Removed the custom-domain promise (no backend exists; the web Save button is disabled), "no credit card required" (Stripe checkout collects a card for the 14-day trial), "no usage limits from Stage" (research 27 / moodboard 4 / voice 5-per-min credits with a `requireCredits` precheck) and the sitemap claim (no sitemap artifact exists). Shortcut copy now matches reality: `Cmd+Shift+A` opens chat, `Cmd+Shift+V` records a voice note, window capture is a manual picker inside the chat. Portal copy upgraded from "read-only" to revision requests, which have been live since `convex/portal.ts:requestTaskRevision` | `packages/emails/emails/*`, `apps/web-application/src/components/landing-v2/*`, `apps/*/src/components/onboarding/OnboardingPaywall.tsx` |

**Current desktop version (work branch):** `0.2.23`

---

## Implemented in the current integration branch

- **Convex refactor sprint** — thin transport files, `convex/models/` + `convex/helpers/`, handlers in `convex/lib/`; see [Notion task](https://app.notion.com/p/37b8714fd55781078141d5d610317f14) and `packages/data-ops/convex/ARCHITECTURE.md`
- Notion research export embeds Refero UI pattern images (`v0.1.59`)
- Desktop v0.1.52–0.1.55 (auto-update, auth handoff, provider CLI detection)
- Desktop performance pass (sidecar defer, polling reduced)
- Global voice/chat shortcuts and Settings → Shortcuts
- Persistent Stage chat history and resizable chat panel
- Main-window companion routing; full-screen companion overlay removed
- Notion OAuth and Research/Strategy Notion export paths
- Assets delivery with Code, Paper, and Figma wireframe exports
- Editable FigJam flow export
- Dashboard / project / task UI improvements

---

## Current local review changes

- Project-aware Stage chat pins one `@project`, blocks ambiguous critique requests, loads bounded indexed Convex context, and supports local image upload/paste/drop plus confirmed window capture.
- Chat switching no longer corrupts last-modified history order.
- Chat persistence no longer performs side effects inside a React state updater.
- Streaming chat updates no longer synchronously persist every chunk.
- Duplicate list-item React keys are fixed.
- Shortcut registration now unregisters only shortcuts owned by its module.
- Shortcut defaults and cross-platform Ctrl handling are aligned.
- Legacy companion cleanup no longer destroys unrelated windows.
- Development can run without the production single-instance lock.
- Audit, Greptile, operating-plan, and energy-plan status is updated.

---

## Blockers

- [x] Baseline idle benchmark on **v0.1.56 DMG** (2026-06-09) — **FAIL** (expected before energy P0 merge)
- [ ] Re-benchmark **v0.1.57 DMG** (no chat in smoke) — must PASS
- [x] PR #5 (`fix/desktop-idle-energy-p0`) merged into `work`
- [x] PR #6 (chat projectId + IPC polish) merged into `work`
- [x] Tag **v0.1.57** pushed — GitHub Actions DMG build running
- [ ] Export destinations verified with live E2E tests

### Baseline benchmark v0.1.56 (Werner Mac, chat used in smoke)

| Metric | Result | Budget |
|--------|--------|--------|
| Peak RSS | **956 MB** | < 400 MB |
| Avg CPU (30 min) | **9.2%** | < 1% |
| `stage-engine` at end | **still running** | none |

Smoke included one chat session → engine stayed up (no idle shutdown in 0.1.56). Energy P0 PR targets this.

---

## Tooling map

| Tool | Job |
|------|-----|
| **Notion** | Tasks, bugs, client portal |
| **Datafa.st** | Production user analytics |
| **Greptile (Lumenapps)** | PR code review only |
| **GitHub `getstage/getstage`** | Code + releases |
| **This file + `ARCHITECTURE.md`** | Dev source of truth |
| **`docs/README.md`** | Doc map (CURRENT / IGNORE) |

---

## Next release target

**v0.1.57** — merge PR #5 (energy P0) into `work`, rebuild DMG, re-run benchmark until PASS.  
**v0.1.56** — shipped (partner chat redesign); baseline FAIL above is the “before” proof.

---

## Links

- Operating plan: `docs/AI/desktop/2026-06-08!!!-PROJECT_OPERATING_PLAN.md` (repo root copy in `apps/user-application/docs/AI/desktop/` if moved)
- Architecture: `ARCHITECTURE.md`
- Desktop index: `apps/user-application/docs/AI/desktop/README.md`
- AI start: `AGENTS.md`
