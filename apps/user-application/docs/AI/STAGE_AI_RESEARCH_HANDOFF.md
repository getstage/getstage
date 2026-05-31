# Stage AI Research Handoff

Date: May 31, 2026 (updated end of day)  
Status: Backend done; desktop wiring in progress — see `RESEARCH_DEV_STATUS.md`  
Scope: Research workflow only

> **For debugging and what changed today:** read [`RESEARCH_DEV_STATUS.md`](./RESEARCH_DEV_STATUS.md) first.

## CAPTION: Why this file exists

This file is the short and explicit handoff.

It answers only these questions:

```txt
What was actually implemented?
What files changed?
What is verified?
What is still missing?
What should the next AI do first?
```

## CAPTION: Architecture that is now implemented

Internal desktop Research now follows this path:

```txt
React -> Electron IPC -> Stage Engine
Stage Engine -> Convex direct
Stage Engine -> Refero
Stage Engine -> Claude/Codex
Stage Engine -> Convex direct
Stage Engine -> stream/update back to React
```

Important:

```txt
Research does NOT use the public Stage REST API as the normal internal desktop path.
Research does NOT rely on React to assemble the full project context.
Stage Engine is now the Research context owner.
```

## CAPTION: What was implemented

### 1. Direct Convex integration in Rust

Implemented:

```txt
apps/stage-engine/Cargo.toml
apps/stage-engine/src/config/mod.rs
apps/stage-engine/src/convex_store/mod.rs
apps/stage-engine/src/convex_store/value.rs
apps/stage-engine/src/convex_store/research_repository.rs
apps/stage-engine/src/main.rs
```

What it does:

```txt
Adds the Rust Convex client.
Adds Convex runtime config via CONVEX_URL / VITE_CONVEX_URL.
Lets Stage Engine authenticate to Convex with the bearer token coming from Electron.
Lets Stage Engine fetch Research input and write Research runs/artifacts directly.
```

### 2. Research workflow orchestration in Stage Engine

Implemented:

```txt
apps/stage-engine/src/research/workflow.rs
apps/stage-engine/src/research/mod.rs
apps/stage-engine/src/runs/mod.rs
apps/stage-engine/src/server/runs.rs
apps/stage-engine/src/app.rs
```

What it does:

```txt
When a run starts in Research mode:
1. Stage Engine validates auth/project context.
2. Stage Engine fetches Research input from Convex.
3. Stage Engine creates a Research run in Convex.
4. Stage Engine builds Refero context.
5. Stage Engine builds the Research prompt.
6. Stage Engine runs Claude/Codex.
7. Stage Engine extracts/parses the final JSON artifact.
8. Stage Engine saves the completed artifact back to Convex.
9. Stage Engine marks the run failed in Convex if something breaks.
```

### 3. Provider final-text collection

Implemented:

```txt
apps/stage-engine/src/providers/process.rs
apps/stage-engine/src/providers/adapter.rs
apps/stage-engine/src/providers/claude.rs
apps/stage-engine/src/providers/codex.rs
```

What it does:

```txt
Adds a collect-path so Research can get the final provider output as text,
parse it as JSON, and persist a typed researchArtifact.
```

### 4. Convex functions added for direct Stage Engine usage

Implemented:

```txt
packages/data-ops/convex/projectAi.ts
```

Added:

```txt
getResearchInput
createResearchRun
completeResearchRun
failResearchRun
```

What they do:

```txt
Provide the exact direct Convex query/mutation surface that Stage Engine now uses for Research.
```

### 5. Electron now passes auth to Stage Engine

Implemented:

```txt
apps/user-application/electron/ipc.ts
apps/user-application/electron/helpers/sidecar.ts
apps/user-application/electron/sidecar.ts
```

What it does:

```txt
Electron gets the current access token and forwards it to Stage Engine.
The same auth header is passed for run creation and streamed run events.
Stage Engine then uses that token for direct Convex access.
```

## CAPTION: What is verified

Verified successfully:

```txt
cd apps/stage-engine && cargo check
cd packages/data-ops && pnpm run convex:typecheck
cd apps/user-application && pnpm run typecheck
```

Meaning:

```txt
Rust compiles.
Convex TypeScript typechecks.
User application TypeScript typechecks.
```

## CAPTION: What is NOT done yet

Still missing:

```txt
1. Edit/save/regenerate mutations for Research sections.
2. Export to Notion.
3. Brief file upload to R2 (filename only in form today).
4. Full end-to-end smoke test signed off.
```

Desktop wiring progress (May 31):

```txt
DONE:
  - useResearchArtifact + useResearchRun hooks
  - useSaveResearchContext (form → upsertContext)
  - Real runs by default (mock opt-in via VITE_MOCK_RESEARCH=1)
  - Engine logs in pnpm dev terminal ([stage-engine] prefix)
  - Error detail surfaced in UI + IPC logging
  - industry field on projectAiContexts

NOT DONE:
  - Section edit/save/regenerate
  - Notion export
  - E2E verification
```

Important:

```txt
Backend Research foundation is real.
Desktop Research runs end-to-end (Codex/Claude + Convex artifact) when CLI and .env are correct.
Artifact parse in UI fixed May 31: research.ts + refero.ts use .nullish() for Codex null fields.
Refero screenshots NOT persisted yet — next work is stage-engine → R2.
See RESEARCH_DEV_STATUS.md and RESEARCH_PRODUCT_REQUIREMENTS.md.
```

## CAPTION: Current auth reality

Current implementation:

```txt
Electron passes the current bearer token to Stage Engine.
Stage Engine uses that same token against Convex directly.
```

This is working as the current bridge.

Still recommended later:

```txt
A cleaner short-lived scoped engine token, issued/refreshed by Electron.
```

But that is NOT required before the next frontend Research step.

## CAPTION: The next AI should do this first

**Product rules:** [`RESEARCH_PRODUCT_REQUIREMENTS.md`](./RESEARCH_PRODUCT_REQUIREMENTS.md)

Priority order:

```txt
1. Stage Engine: Refero MCP images → download → R2 → permanent URLs in contentJson + uiPatterns.examples.imageUrl
2. Convex completeResearchRun: delete previous research artifacts for project (one active research)
3. React: Save Changes → patch contentJson in Convex
4. Section-level Regenerate with AI (not full rerun)
5. Pre-fill Configure Research from projectAiContexts
```

Desktop hook + artifact read are done. Do **not** re-wire fixtures unless VITE_MOCK_RESEARCH=1.

## CAPTION: Files the next AI should inspect first

Backend:

```txt
apps/stage-engine/src/research/workflow.rs
apps/stage-engine/src/convex_store/research_repository.rs
apps/stage-engine/src/app.rs
apps/stage-engine/src/server/runs.rs
apps/stage-engine/src/runs/mod.rs
```

Convex:

```txt
packages/data-ops/convex/projectAi.ts
packages/data-ops/src/contracts/research.ts
packages/data-ops/src/contracts/refero.ts
packages/data-ops/src/contracts/parseResearchArtifact.ts
```

Frontend:

```txt
apps/user-application/src/components/project/tabs/research/ResearchTab.tsx
apps/user-application/src/components/project/tabs/research/ResearchActions.tsx
apps/user-application/src/data/fixtures/project/researchTabFixtures.ts
apps/user-application/src/project/components/ProjectDetailView.tsx
```

## CAPTION: One-line summary

```txt
Research backend is now wired through Stage Engine -> Convex direct -> Refero -> Claude/Codex -> Convex direct, but the React Research tab still needs to stop using fixtures and start reading the saved artifact.
```
