# Stage AI Research Handoff

Date: May 31, 2026  
Status: Clear handoff for the next AI  
Scope: Research workflow only

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
1. React Research hooks that read the saved researchArtifact from Convex.
2. ResearchTab switching from fixtures to persisted artifact data.
3. Real Run Research action from the Research UI.
4. Edit/save/regenerate mutations for Research sections.
5. Full end-to-end smoke test from Research form -> saved artifact -> rendered tab.
```

Important:

```txt
Backend Research foundation is now real.
Frontend Research rendering is still fixture-driven.
So Research is NOT fully done yet.
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

First next step:

```txt
Replace Research fixture reads with a real Convex-backed hook.
```

Suggested order:

```txt
1. Add a query that returns the latest researchArtifact for a project.
2. Add a React hook, e.g. useResearchArtifact(projectId).
3. Map artifact JSON into the existing ResearchTab section props.
4. Keep fixtures only as explicit fallback/dev data.
5. Wire the "Run Research" action to the existing Stage Engine run path.
```

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
