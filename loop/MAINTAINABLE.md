# Maintainable-Code Worklist

> The **actionable backlog** the maintainable loop eats from. Categorised rationale lives in `apps/user-application/docs/PRE_LAUNCH_CLEANUP.md`; this is the *what/where/verify*.
> Full rules & gates: this file + `loop/README.md`. Each item is one PR-sized unit. **Loops stay OFF until Phase 0 (regression net) exists.**

## PRIME DIRECTIVE
**Change / refactor / delete code — do NOT add code or grow files.** A maintainable PR should usually end with **net-negative or flat line count**. If a fix needs new code, it's extracting a helper/hook out of an existing file, not bolting on.

- File-size budget: **≤ ~400 lines**. Over → split into hooks/subcomponents, don't append.
- Every behavioral change **rides a test** that proves the old behavior still holds (green-baseline rule).
- **Exclude generated files** (`*.gen.ts`, `convex/_generated/**`) — never hand-edit.
- Scope-lock: touch only the files listed in the item.
- **Minimalism enforced by [Ponytail](https://github.com/DietrichGebert/ponytail)** — builder runs with the plugin (`/plugin install ponytail@ponytail`) so it follows the decision ladder (YAGNI → stdlib → existing dep → one line → minimal code). `/ponytail-review` runs on the diff and its **delete-list must be applied before the PR**. Ponytail is minimalism only — it does **not** verify correctness, so it never replaces the test/verify gate. Security · data-loss · a11y are never trimmed.

## ALWAYS-ON GATE (verifier ticks Security; builder cannot)
**Security:** no secrets in code/logs · inputs validated (zod/contracts) · authz server-side (Convex) · Electron `contextIsolation/sandbox` intact + one `contextBridge` method per IPC + `ipcMain.handle` validates payload · Rust engine loopback + token + `Schema.parse` · no new exec/network/file surface.
**Maintainable:** tokens not `[#hex]` · no magic constants · derive don't mirror · file ≤400 · `<img>` has `alt` · clickable = `<button>`.
**Verify cmd (must pass):** `pnpm run typecheck` · `engine:clippy`+`engine:test` · e2e/visual (once Phase 0 done) · `/ponytail-review` delete-list clean · the maintainability greps below.

---

## P0 — State correctness (highest regression value)

- [ ] **`CritiquePanel.tsx` — kill mirrored state.** `selectedModel/selectedEffort/selectedSpeed` (L94–98) mirror `chatDefaults.*` and re-sync via `useEffect` (L229–230). Derive from `chatDefaults` instead; delete the sync effect.
  - Verify: `tsc` green · model picker still switches · **e2e: chat sends with selected model**. Risk: behavioral → needs the e2e first.
- [ ] **`CritiquePanel.tsx` — hardcoded favourite ids** (L100–101 incl. `"gpt-5.5"`) → import the shared `DEFAULT_MODEL_ID` (see P0-constants). Net: change, not add.
- [ ] **Audit mirror candidates** (verify each, fix only real ones): `TaskDetailsView.tsx`, `OnboardingIntegrationPanels.tsx`, `IntegrationsPage.tsx` (have query+effect+useState together).

## P0 — Dead/duplicate constants

- [ ] **Single `DEFAULT_MODEL_ID`.** Literal `"gpt-5.5"` is in `hooks/engine/useChatDefaults.ts:97`, `lib/engine/providerModels.ts:37`, `components/companion/CritiquePanel.tsx:101`. Create one const, import everywhere, delete literals.
  - Verify: `tsc` · grep `"gpt-5.5"` returns only the const definition.

## P1 — File-size splits (change shape, don't add features)

Split fat files into hooks + subcomponents (pure refactor, **zero behavior change** — must be covered by e2e first):
- [ ] `components/companion/CritiquePanel.tsx` — **1307** → extract chat-store hook, model-picker, message-list.
- [ ] `components/tasks/TaskDetailsView.tsx` — **796**.
- [ ] `components/project/tabs/strategy/StrategyTab.tsx` — **717**.
- [ ] `components/project/header/ProjectHeaderModals.tsx` — **712**.
- [ ] `components/settings/IntegrationsPage.tsx` — **654**.
- [ ] `components/project/tabs/flows/FlowsTab.tsx` — **613**.
- [ ] `components/project/tabs/moodboard/MoodboardTab.tsx` — **612**.
  - Verify each: `tsc` + the file's golden e2e unchanged + visual snapshot unchanged.

## P1 — Arbitrary `[#hex]` → design tokens

Token map: `rounded-[12/8/6px]`→`rounded-panel/surface/control` · `bg-[#8782F5]`→`bg-accent` · `bg-[#F5F5F5]`→`bg-input-bg` · ink hexes→`text-ink/-soft/-muted/-subtle` · `shadow-[0_0.45px…]`→`shadow-stage-hairline` (defs in `styles/globals.css`).
Per-file sweeps (count = arbitrary utilities):
- [ ] `project/tabs/strategy/StrategyTab.tsx` (101)
- [ ] `client-portal/ClientPortalSettingsView.tsx` (98)
- [ ] `client-portal/ClientPortalPreviewView.tsx` (96)
- [ ] `tasks/TaskDetailsView.tsx` (92)
- [ ] `settings/IntegrationsPage.tsx` (81)
- [ ] `project/ProjectDetailView.tsx` (78)
- [ ] `project/tabs/research/ResearchConfigureStep.tsx` (76)
  - Verify each: **visual snapshot unchanged** (this is how we prove a token swap didn't shift pixels) + grep shows 0 arbitrary values left in the file.
- [ ] **CI guard:** add lint/grep that fails a PR introducing new `[#hex]` (stops the bleed; do in Phase 0).

## P1 — `window.alert/prompt` → toast/dialog primitive

Replace with the app toast/dialog (build the primitive once if missing — the only sanctioned "add"):
- [ ] `settings/ProviderUpdatesBanner.tsx:24`
- [ ] `settings/IntegrationsPage.tsx:129, 134, 195`
- [ ] `settings/IntegrationsPage.tsx:189` `window.prompt(sheetUrl)` → real input dialog **+ validate the URL** (security: don't trust pasted input).
- [ ] `onboarding/OnboardingIntegrationPanels.tsx:235, 243, 255`
  - Verify: `tsc` · e2e error path still surfaces a message.

## P2 — `X | null` sentinels → discriminated unions / `undefined`

- [ ] `settings/ProfilePanel.tsx` — 6 separate `string|null` error/notice states → one `{kind}` union.
- [ ] `settings/IntegrationsPage.tsx` — `busyIntegrationId` + `setupDialogProviderId` can both be set; collapse to one interaction union.
- [ ] Sweep remaining (59 total) opportunistically; prefer `undefined` when a lone sentinel is unavoidable.

## P2 — Accessibility

- [ ] ~**66** `<img>` without `alt` — add `alt` (decorative → `alt=""`). Mechanical, low-risk.

## NOT a target (verified clean — don't waste loop budget)
`console.log` 0 · `@ts-ignore` 0 · empty `catch {}` 0 · `TODO/FIXME` 0 · hand-written `: any` 0 (all in `routeTree.gen.ts`, excluded).

---

## Discovered during loops
> The loop appends new findings here (and to Notion) as it runs. Format: `- [ ] [RUN-id] <file:line> — <issue> → <action>`
<!-- loop:appends-below -->
