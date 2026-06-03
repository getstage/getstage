# Moodboard — implementation plan (for review)

Last updated: 2026-06-03  
Audience: **Dan** (product + scope), engineering (build order)  
Related: [`STAGE_AI_WORKFLOW_CONTEXT_PLAN.md`](./STAGE_AI_WORKFLOW_CONTEXT_PLAN.md#caption-moodboard-and-styleguide-workflow) · [`STRATEGY_DEV_STATUS.md`](./STRATEGY_DEV_STATUS.md) · [`RESEARCH_DEV_STATUS.md`](./RESEARCH_DEV_STATUS.md)

---

## Purpose

Moodboard is the **visual direction** step after Research + Strategy: users import references, group them into **directions**, and generate **style guides** (palette, typography, atmosphere) that downstream **Flows** and **Wireframes** can consume.

This doc is the **V1 plan** — what exists today, what we will build next, and **decisions Dan should confirm** before we wire the engine.

---

## Current state (June 2026)

| Area | Status |
|------|--------|
| **Zod contract** | `packages/data-ops/src/contracts/moodboard.ts` — `moodboardArtifact`, directions, references, `styleGuides[]` |
| **Convex read** | `getLatestMoodboardArtifact` |
| **Convex cleanup** | `deletePreviousMoodboardArtifacts` — only via explicit downstream clear (after Research/Strategy re-run dialog), not auto on upstream success |
| **Desktop UI** | `MoodboardTab` — upload / Figma modes, grid, direction hub, style guide views (mostly **fixture + local state**) |
| **Hooks** | `useMoodboardArtifact` (Convex), `useMoodboardTab` — **`startMoodboard` throws** `"Moodboard engine is not connected yet."`; `generateStyleGuide` = **mock delay only** |
| **Stage Engine** | **No** `apps/stage-engine/src/moodboard/` module; `RunManager` only runs **research** + **strategy** |
| **Engine contract** | `runModeSchema` already includes `"styleguide"` (unused) |

Research and Strategy are **production-shaped** (engine → normalize → Convex). Moodboard is **UI + contract ready**, engine **not started**.

---

## V1 goal (proposed)

Ship a path Dan can test end-to-end:

```txt
Prerequisites: Research artifact + Strategy artifact on the project
User:          Upload images (or Figma link V1.1) → assign to directions
User:          Generate style guide per direction (AI)
Output:        moodboardArtifact in Convex (references + styleGuides)
Downstream:    Flows tab can read moodboardArtifactId when we wire Flows
```

**Out of V1 (unless Dan promotes):**

- Full AI “build my moodboard from scratch” without user-selected images
- Refero screens persisted into moodboard references
- DTCG / Figma token export
- Real Figma file import (beyond URL + manual grid today)
- Moodboard section-level regen parity with Research (can follow in V1.1)

---

## Product decisions — **Dan, please confirm**

| # | Question | Recommendation | Impact |
|---|----------|----------------|--------|
| 1 | **Gate:** Start moodboard / style guide only if Strategy exists? | **Yes** — same as Strategy requires Research | Empty states + `UpstreamStaleBanner` already nudge upstream |
| 2 | **Gate:** Require all Strategy sections **approved**? | **No for V1** — match Strategy → Moodboard today (“Continue to Moodboard” has no approval gate) | Faster iteration; add gate in V1.1 if needed |
| 3 | **V1 AI scope:** One run type or two? | **Two steps:** (A) user saves board structure (references + directions), (B) **`styleguide` run per direction** | Matches existing UI (`DirectionHub` → generate style guide) |
| 4 | **Re-run Strategy:** Clear moodboard automatically? | **No** — same policy as Research re-run: **prompt** “Keep / Clear later steps” (`DownstreamStepsDialog`) | Protects teammate work on moodboard while someone re-runs Strategy |
| 5 | **Re-run Moodboard / regen style guide:** Clear Flows + Wireframes? | **Same prompt pattern** when those modules have Convex artifacts | Reuse `useProjectDownstreamWork` |
| 6 | **Refero in moodboard V1?** | **Context only** (read UI pattern titles from research artifact), do not add Refero fetch in moodboard workflow | Keeps V1 smaller; Refero already heavy in Research |
| 7 | **Images:** Where stored? | **R2** via existing project upload rules; `imageUrl` / `uploadedAssetId` on references | Align with research brief + pattern images |
| 8 | **Figma import in V1?** | **Defer** — keep current UI stub; V1 = upload + manual direction assignment | Reduces integration risk |

Reply inline in PR / Notion / this file — engineering will lock phases from your answers.

---

## Architecture (mirror Research / Strategy)

Same four layers as [RESEARCH_DEV_STATUS.md](./RESEARCH_DEV_STATUS.md#system-structure-layers):

```txt
React (MoodboardTab, hooks)
  → Electron IPC startRun (mode: styleguide, context: projectId + directionId)
  → stage-engine moodboard/ or styleguide/ workflow
  → Convex: get input, create run, complete run, save moodboardArtifact
  → R2 for reference images
```

### Provider pipeline (non-negotiable)

| Layer | Planned location |
|-------|------------------|
| Extract | `helpers/provider_json.rs` — add `moodboardArtifact` / style guide JSON detection |
| Normalize | `convex_store/moodboard_repository.rs` — coerce palettes, typography rows, direction linkage |
| Prompt | `styleguide/prompt.rs` — research summary + strategy sections + reference metadata (not raw megapixel blobs in prompt) |

Prompt guides the model; **normalize guarantees** the Zod contract (same lesson as Strategy table rows).

### Proposed engine layout

```txt
apps/stage-engine/src/styleguide/   # or moodboard/ with styleguide submodule
  workflow.rs      # load strategy + research + moodboard input; run provider; merge styleGuides[]
  prompt.rs
  section.rs       # optional: regen single direction’s guide
```

Wire in `runs/mod.rs` next to `StrategyWorkflow`. Extend dedupe key if we add project-scoped `RunMode::Styleguide` (with `directionId` in context).

---

## Implementation phases

### Phase 0 — Dan review (this doc)

- [ ] Dan confirms table in **Product decisions**
- [ ] Agree V1 vs V1.1 scope

### Phase 1 — Persistence without AI (“save the board”)

**Goal:** User uploads and organizes directions; artifact persists in Convex without provider run.

| Task | Notes |
|------|--------|
| Upload → R2 | Reuse project asset upload path; populate `moodboardReference` + `uploadedFiles` |
| `upsertMoodboardInput` / `saveMoodboardArtifact` mutations | Mirror `upsertStrategyGenerateInput` + manual save patterns |
| Replace fixture-only grid state | `MoodboardTab` reads/writes artifact via mutation, not only `createSeedReferences()` |
| `useMoodboardTab.startMoodboard` | Becomes “save & finalize structure” OR no-op until Phase 2 — **remove** misleading throw after Phase 1 |

**Exit:** Reload project → moodboard layout restored from Convex.

### Phase 2 — Style guide generation (AI V1)

**Goal:** “Generate style guide” on a direction runs real engine + saves `styleGuides[]` entry.

| Task | Notes |
|------|--------|
| Convex `createStyleGuideRun` / `completeStyleGuideRun` (or generic moodboard run handlers) | Follow `lib/projectAi/handlers/strategy.ts` shape |
| `useMoodboardRun` + scoped `useProviderRun` | Same cross-tab busy pattern as Research/Strategy |
| Engine `styleguide` workflow | Input: latest research + strategy JSON, direction id, selected reference ids |
| `provider_json` + `moodboard_repository` normalize | |
| UI loading | Reuse `StyleGuideGenerating`; full-screen while run active |
| Error surface | User-facing message + `[stage-engine]` log lines |

**Exit:** Dan can generate two directions, see distinct palettes/typography, artifact in Convex.

### Phase 3 — Regenerate + upstream policy

| Task | Notes |
|------|--------|
| Regenerate style guide (per direction) | `styleguide` run with `source: direction:{id}`; patch one `styleGuides[]` entry |
| `UpstreamStaleBanner` | Already on tab — ensure flags when research/strategy artifact newer than moodboard |
| Regenerate moodboard (full) | Optional button + confirm; `deletePreviousMoodboardArtifacts` + downstream dialog |
| Docs | Add [`MOODBOARD_TESTING.md`](./MOODBOARD_TESTING.md) checklist (copy STRATEGY_TESTING shape) |

### Phase 4 — V1.1+ (backlog)

- Figma import (real file/frame fetch)
- Pull Refero screens into references
- Strategy approval gate before style guide
- Export style guide to Notion / DTCG
- Flows consumes `moodboardArtifactId` + approved direction

---

## File map (today → add)

### Already in repo

| Path | Role |
|------|------|
| `packages/data-ops/src/contracts/moodboard.ts` | Artifact + input schema |
| `packages/data-ops/convex/projectAi.ts` | `getLatestMoodboardArtifact` |
| `packages/data-ops/convex/lib/projectAi/domain/artifactStore.ts` | `deletePreviousMoodboardArtifacts` |
| `apps/user-application/src/components/project/tabs/moodboard/*` | Tab UI |
| `apps/user-application/src/hooks/project/moodboard/useMoodboardTab.ts` | Tab state (stub engine) |
| `apps/user-application/src/hooks/project/moodboard/useMoodboardArtifact.ts` | Load artifact |
| `apps/user-application/src/lib/project/mapMoodboardArtifactToTabData.ts` | Artifact → UI |
| `apps/user-application/src/lib/project/moodboardConfigureInput.ts` | Form validation |
| `apps/user-application/src/components/project/UpstreamStaleBanner.tsx` | Stale research/strategy |

### To add (Phase 1–2)

| Path | Role |
|------|------|
| `packages/data-ops/convex/lib/projectAi/handlers/moodboard.ts` | Runs + save + input |
| `apps/stage-engine/src/styleguide/workflow.rs` | Provider run |
| `apps/stage-engine/src/convex_store/moodboard_repository.rs` | Normalize + save |
| `apps/user-application/src/hooks/project/moodboard/useMoodboardRun.ts` | IPC start/cancel |
| `apps/user-application/docs/AI/MOODBOARD_TESTING.md` | E2E checklist (Phase 3) |

---

## Upstream / downstream alignment

Already shipped on Research/Strategy (moodboard must **not** break this):

```txt
Research re-run  → clears research + strategy immediately; moodboard/flows/wireframes kept unless user chooses “Clear later steps”
Strategy regen   → replaces strategy artifact; same downstream prompt if moodboard+ exists
Moodboard        → downstream of strategy; upstream stale banner when research/strategy newer than moodboard artifact
```

When moodboard AI ships, **do not** auto-delete flows/wireframes on style guide regen unless Dan chooses that in decision #5.

---

## Verification (when Phase 2 lands)

Same discipline as Strategy:

```bash
# Terminal 1
cd packages/data-ops && npx convex dev

# Terminal 2
cd apps/user-application && pnpm dev

# After Rust changes
kill $(lsof -t -i:48221)
```

```txt
cargo check
pnpm --dir packages/data-ops exec convex codegen
pnpm --dir packages/data-ops run convex:typecheck
pnpm run desktop:typecheck
```

Success signals:

```txt
[stage-engine] styleguide workflow started
[stage-engine] moodboard artifact saved to Convex
run_completed
```

UI: direction shows `hasStyleGuide: true`, style guide view matches **project** content (not fixture `defaultStyleGuide` only).

---

## Dan review checklist

- [ ] Read **Product decisions** table and mark agree / disagree per row
- [ ] Confirm **V1 scope** (upload + per-direction style guide vs full AI moodboard)
- [ ] Confirm **Figma** in V1.1 is acceptable
- [ ] Confirm **downstream prompt** behavior matches Research/Strategy
- [ ] Optional: walk `MoodboardTab` in app and note UI gaps vs Figma

Once confirmed, engineering starts **Phase 1** (persistence) in parallel with any UI polish Dan wants.
