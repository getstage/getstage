# Research dev status & debugging guide

Date: May 31, 2026  
Audience: You + the next AI agent  
Scope: Desktop Research V1 — what works, what broke, what we changed

---

## Read this first

If Research fails and you cannot see why, start here — not DevTools Network.

```txt
Terminal 1: packages/data-ops  →  npx convex dev
Terminal 2: apps/user-application  →  pnpm dev
Logs:       Terminal 2 only, lines prefixed with [stage-engine]
Do NOT:     Run cargo run in a third terminal while pnpm dev is running (port 48221 conflict)
```

---

## Architecture (desktop Research)

```txt
Research form (React)
  → upsertContext (Convex)           save industry, website, brief, competitors
  → startRun (Electron IPC)
  → Stage Engine (Rust, port 48221)
      → getResearchInput (Convex)
      → Refero MCP
      → Claude/Codex CLI
      → completeResearchRun (Convex)
  → React reads getLatestResearchArtifact (Convex)
```

React does **not** call Refero or Claude directly. Stage Engine owns the run.

---

## What was broken (May 31 session)

| Problem | Cause | Symptom |
|---------|-------|---------|
| Zapier/fixture data after Run | `USE_MOCK_RESEARCH_DATA = import.meta.env.DEV` | Fake research, Figma 404 images |
| Form ignored | Configure form not saved to Convex | Engine ran with empty context |
| No engine logs | Rust filter targeted `stage_data_service` not `stage_engine` | Only Cargo lines in terminal |
| Convex crash | `.env` had placeholder `your-deployment.convex.cloud` | `[CONVEX FATAL ERROR]` in renderer |
| Generic UI error | UI showed `error.message` only, hid `error.detail` | "The selected AI provider could not finish…" with no reason |
| Port conflict | Manual `cargo run` while Electron already spawned engine | `Address already in use (os error 48)` |
| Connect Claude error | Toggle in Integrations ≠ CLI actually ready | Red banner before run starts |
| Stuck “Running Research” | Electron main `runEventSchema.parse()` crashed on empty `provider_warning` | Stream died; no `run_failed` to React |
| Saved research, empty UI | `contentJson` failed Zod (explicit `null` from Codex/Rust) | Console: `[research] artifact parse failed` |
| No Refero screenshots | MCP returns refs without image URLs; no R2 upload | UI Patterns text only, no carousel images |

---

## What we fixed

### 1. Real runs by default (no mock)

**File:** `apps/user-application/src/mock/project/research/index.ts`

```ts
// Before: mock ON in every dev build
USE_MOCK_RESEARCH_DATA = import.meta.env.DEV

// After: mock only when explicitly enabled
USE_MOCK_RESEARCH_DATA = import.meta.env.VITE_MOCK_RESEARCH === "1"
```

Mock data = Zapier, dead Figma asset URLs. Only use for UI layout work.

### 2. Save form → Convex before run

**Files:**

- `apps/user-application/src/hooks/project/research/useSaveResearchContext.ts` (new)
- `apps/user-application/src/hooks/project/research/useResearchTab.ts`
- `packages/data-ops/convex/projectAi.ts` — added `industry` to `upsertContext` + `getResearchInput`
- `packages/data-ops/convex/schema.ts` — `projectAiContexts.industry`

Flow: Run Research → `upsertContext` → `startResearch()` → Stage Engine reads `getResearchInput`.

### 3. Engine logs visible in `pnpm dev` terminal

**Files:**

- `apps/stage-engine/src/observability/mod.rs` — filter `stage_engine=info`
- `apps/user-application/package.json` — `RUST_LOG=stage_engine=info,tower_http=info`
- `apps/user-application/electron/helpers/sidecar.ts` — forwards stdout/stderr as `[stage-engine] …`
- `apps/stage-engine/src/research/workflow.rs` — step logs (Convex load, Refero, provider, save)
- `apps/stage-engine/src/runs/mod.rs` — log run start + provider-not-ready failures
- `apps/stage-engine/src/providers/process.rs` — log provider stderr + process failures
- `apps/user-application/electron/ipc.ts` — log every run event (failed/completed/tools/warnings)

You should see lines like:

```txt
[stage-engine]  INFO stage_engine::app: stage engine config loaded refero_configured=true …
[stage-engine] run request provider=claude mode=research projectId=…
[stage-engine] tool started runId=… tool=stage-context label=Load Stage project context
[stage-engine] run failed runId=… detail=…        ← full reason here
```

More detail: `RUST_LOG=stage_engine=debug pnpm dev`

### 4. Errors: user message in UI, full detail in terminal

**User sees (production):**

- Run failed → *"Something went wrong while running Research. Please try again."*
- Setup missing → actionable copy (*"Connect Claude in Settings → Integrations"*) — not technical, not "check terminal"

**You see (pnpm dev terminal):**

- Full `[stage-engine]` JSON run events
- Rust `tracing` at debug level
- `console.error` with `code=`, `detail=`, provider stderr

The UI never tells the user to open a terminal.

### 5. Refero token from `.env`

**File:** `apps/user-application/electron/helpers/loadEnv.ts`

Accepts `REFERO_MCP_TOKEN`, `refero_mcp_token`, or `VITE_REFERO_MCP_TOKEN`.

Electron loads `apps/user-application/.env` on startup and passes token to Stage Engine.

### 6. IPC run event stream (no stuck spinner)

**Files:**

- `apps/user-application/electron/ipc.ts` — `safeParse` run events; skip invalid blocks; `emitSyntheticRunFailed` if stream ends without terminal event
- `apps/stage-engine/src/providers/process.rs` — skip empty stderr lines (no bogus `provider_warning`)
- `packages/data-ops/src/contracts/engine-run.ts` — `provider_warning.message` no longer requires min length
- `apps/user-application/src/hooks/project/research/useResearchRun.ts` — 20s stall watchdog + `resetActiveRun`
- `apps/user-application/src/hooks/engine/useProviderRun.ts` — `resetActiveRun()`

Requires **full `pnpm dev` restart** after `electron/ipc.ts` changes (Electron main does not HMR).

### 7. Provider picker (no auto-Claude)

**Files:** `ResearchConfigureStep.tsx`, `useResearchProviderSelection.ts` — user picks Claude or Codex before Run.

### 8. Artifact parse in UI (Zod 4 + explicit null)

Codex and Rust serialize absent fields as **`null`**, not omitted keys. Zod 4 `.optional()` rejects `null`.

**Files:**

- `packages/data-ops/src/contracts/refero.ts` — optional Refero fields → `.nullish()`; URLs not strict `.url()`
- `packages/data-ops/src/contracts/research.ts` — competitors, UI examples, source refs, matrix notes, etc. → `.nullish()`
- `packages/data-ops/src/contracts/parseResearchArtifact.ts` — shared parse helper + issue formatting for console
- `apps/user-application/src/hooks/project/research/useResearchArtifact.ts` — uses parser; logs `[research] artifact parse failed` with field paths
- `apps/user-application/src/components/project/tabs/research/ResearchTab.tsx` — removed persistent “could not be parsed” banner (configure form shows when parse fails; check console)

After schema changes: `pnpm --dir packages/data-ops run build` then reload app. **No re-run** needed if artifact already in Convex.

**Known parse failures fixed (May 31 evening):**

```txt
referoContext.references[].imageUrl — null from Rust Refero normalize
competitiveAnalysis.competitors[].logoUrl — null from Codex
uiPatterns[].examples[].imageUrl / sourceProduct — null from Codex
sourceReferences[].url / externalId — null from Codex
```

---

## `.env` setup (required)

**File:** `apps/user-application/.env`

```txt
REFERO_MCP_TOKEN=your_token_here
```

Optional — only if you want to override the default dev Convex URL:

```txt
VITE_CONVEX_URL=https://reliable-bullfrog-917.convex.cloud
```

**Do not** use the placeholder `your-deployment.convex.cloud` from old examples.

If `VITE_CONVEX_URL` is wrong or missing a real deployment, the app crashes on load.

Copy real URL from `app/.env.local` if needed.

---

## How to test Research (checklist)

1. `cd packages/data-ops && npx convex dev`
2. Fix `apps/user-application/.env` (Refero token; no bad Convex URL)
3. `cd apps/user-application && pnpm dev`
4. Confirm in terminal: `refero_configured=true` and `ready on port 48221`
5. Log in to Stage desktop
6. **Settings → Integrations** → Connect Claude or Codex → **Refresh** until status is ready
7. Open project → **Research** → fill form → **Run Research**
8. Watch terminal 2 for `[stage-engine]` lines through the full run
9. Tab updates when Convex saves the artifact (Convex reactive query)

---

## Common errors → what they mean

| UI / terminal message | Meaning | Fix |
|----------------------|---------|-----|
| Connect Claude or Codex in Integrations | No provider enabled in local preferences | Settings → Integrations → Connect |
| Claude is not ready… install CLI… | Toggle on but CLI missing or not logged in | Install `claude` CLI, run `claude auth login`, Refresh |
| `[CONVEX FATAL ERROR] Couldn't parse deployment name` | Bad `VITE_CONVEX_URL` in `.env` | Fix or remove that line |
| Address already in use :48221 | Two engines running | Stop extra `cargo run`; use only `pnpm dev` |
| The selected AI provider could not finish… | Provider CLI failed — read **Details** below message or terminal `detail=` | Check `[stage-engine] provider stderr` lines |
| Research context could not be prepared | Refero step failed | Check `REFERO_MCP_TOKEN` |
| Stage project context could not be loaded… | Convex auth or `upsertContext` failed | Logged in? `convex dev` running? |
| AI response did not match Research artifact format | Claude returned non-JSON | Terminal shows provider output size / parse error |
| `[research] artifact parse failed … received null` | Saved artifact has `"field": null`; schema was `.optional()` only | Fixed in `research.ts` / `refero.ts` — rebuild `data-ops`, reload app |
| Research tab shows configure form but run succeeded | Parse failed on existing `contentJson` | Renderer console for field paths; artifact row still in Convex |
| UI Patterns has no screenshots | `imageUrl` null in artifact; Refero→R2 not built | See `RESEARCH_PRODUCT_REQUIREMENTS.md` |

---

## Files changed (May 31)

### Frontend (`apps/user-application`)

| File | Change |
|------|--------|
| `src/mock/project/research/index.ts` | Mock opt-in only |
| `src/hooks/project/research/useSaveResearchContext.ts` | New — saves form to Convex |
| `src/hooks/project/research/useResearchTab.ts` | Real run path, no default mock |
| `src/hooks/project/research/useResearchRun.ts` | Provider picker flow, stall watchdog, resetActiveRun |
| `src/hooks/project/research/useResearchArtifact.ts` | Parse saved artifact; console errors on failure |
| `src/hooks/engine/useProviderRun.ts` | `resetActiveRun()` |
| `src/components/project/tabs/research/ResearchConfigureStep.tsx` | Claude/Codex picker |
| `src/components/project/tabs/research/ResearchTab.tsx` | No parse-error banner on configure view |
| `electron/ipc.ts` | safeParse run events, synthetic run_failed, logging |
| `src/lib/engine/formatRunError.ts` | User-friendly run error message |
| `electron/helpers/loadEnv.ts` | Refero token aliases |
| `package.json` | `RUST_LOG` in dev script |
| `.env.example` | Refero + optional mock flag |

### Backend (`packages/data-ops`)

| File | Change |
|------|--------|
| `convex/schema.ts` | `projectAiContexts.industry` |
| `convex/projectAi.ts` | `industry` in upsert/getResearchInput/getContext |
| `src/contracts/refero.ts` | `.nullish()` on optional Refero fields |
| `src/contracts/research.ts` | `.nullish()` on AI optional fields (competitors, UI examples, source refs) |
| `src/contracts/parseResearchArtifact.ts` | Shared `parseResearchArtifactContent` + parse issue helper |
| `src/contracts/engine-run.ts` | Relaxed `provider_warning.message` validation |
| `src/contracts/index.ts` | Export parse helper |

### Stage Engine (`apps/stage-engine`)

| File | Change |
|------|--------|
| `src/observability/mod.rs` | Correct tracing filter |
| `src/research/workflow.rs` | Step + failure logging |
| `src/runs/mod.rs` | Run start + pre-flight failure logging |
| `src/providers/process.rs` | Provider stderr + failure logging; skip empty stderr |

---

## Still TODO (Research V1 not done)

See full owner checklist: [`RESEARCH_PRODUCT_REQUIREMENTS.md`](./RESEARCH_PRODUCT_REQUIREMENTS.md)

- [ ] **One research per project** — delete previous `projectAiArtifacts` (research) + orphaned R2 before saving new run (`completeResearchRun` / engine)
- [ ] **Refero images → R2 → `contentJson` URLs** — implement in **`apps/stage-engine`** (download MCP images, upload R2, wire `uiPatterns.examples.imageUrl`)
- [ ] Edit/save sections → Convex mutation on `contentJson` (Save Changes today is UI-only)
- [ ] Regenerate section (block-level) — not full research rerun
- [ ] Pre-fill Configure Research from `projectAiContexts`
- [ ] Export to Notion
- [ ] Brief file upload → R2 (form only stores filename today)
- [x] Artifact schema accepts Codex/Rust `null` optional fields — `research.ts` + `refero.ts` `.nullish()` (May 31 evening)
- [ ] Scoped engine token (optional hardening)

---

## Related docs

| Doc | Purpose |
|-----|---------|
| `RESEARCH_PRODUCT_REQUIREMENTS.md` | **Owner rules** — one research, edits, Refero→R2, what’s done vs not |
| `RESEARCH_TESTING.md` | E2E test commands + run log |
| `STAGE_AI_RESEARCH_HANDOFF.md` | Backend handoff for next AI |
| `STAGE_AI_WORKFLOW_CONTEXT_PLAN.md` | Full workflow architecture + audit table |

---

## One-line summary

Research backend is real; desktop saves form context, runs through Stage Engine, saves artifact to Convex. **Reload app after `data-ops` schema changes.** Refero screenshots still need R2 work in stage-engine. Product rules: `RESEARCH_PRODUCT_REQUIREMENTS.md`.
