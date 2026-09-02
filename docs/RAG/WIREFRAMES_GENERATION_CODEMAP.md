# Wireframes generation — complete code map

> Snapshot of the files that actually produce Hi-Fi / Lo-Fi wireframes in this worktree.
> Written 2026-08-29 so the overlapping paths can be read as one system, not patched one symptom at a time.
> Updated 2026-08-31 after the first reliability simplification. This is the
> living map of the current code, including what is verified locally and what
> still requires a live provider run.
>
> Live failures and Stage caps (2000-char query, token 8192, top-6 RAG, thumbnail sandbox): [`WIREFRAMES_LIVE_FAILURES.md`](./WIREFRAMES_LIVE_FAILURES.md).

---

## What a generate actually is

A desktop Hi-Fi run with Nebius selected is **not** one program. It is six processes talking through untyped strings:

```txt
Electron renderer (React)
    → preload IPC
    → Electron main
    → stage-engine (Rust sidecar :48221)
        → Convex (project input, run lock, RAG search, R2 source)
        → wireframe-ai-gateway (:48231) → Nebius (TSX)
        → wireframe-renderer (Node CLI) → HTML
        → Convex (save artifact, complete/fail/cancel run)
```

The UI never talks to Nebius or the renderer. The engine never talks to the DOM. Convex is the only durable state.

Lo-Fi still exists. It skips RAG, gateway, and the React renderer and uses the Claude/Codex CLI path.

---

## The two generation backends (this is the split)

`apps/stage-engine/src/wireframes/workflow.rs` (~1650 lines) owns **both** backends in one function.

| Token in `context.source` | What runs |
|----------------------------|-----------|
| `gen:nebius` | Local gateway + Qwen RAG + `wireframe-renderer` |
| anything else | Claude/Codex CLI in a sealed provider workspace |

Nebius is **not** a `providerId`. The UI still sends `providerId: "codex"` as a dummy and puts `gen:nebius` in a comma-separated source string:

```txt
kind:hifi,brand:style-guide,style-direction:<id>,gen:nebius,screens:screen-a;screen-b
```

Parser: `apps/stage-engine/src/wireframes/helper/source.rs`.
Builder: `apps/user-application/src/lib/project/wireframeScreenList.ts` → `buildWireframeRunSource`.

That string is the entire contract between UI and engine for kind, brand, direction, generator, and screen scope.

---

## Runtime sequence (live Nebius Hi-Fi)

1. **Configure / Results** — user picks screens, kind, brand, skills, libraries.
2. **`useWireframesTab`** builds the source string and calls **`useWireframesRun.startWireframes`**.
3. **`useProviderRun`** → IPC `engineStartRun` → Electron `ipc.ts` → `POST /v1/runs`.
4. **`runs/mod.rs`** creates an engine `run_id` (UUID) and dispatches `WireframesWorkflow`.
5. **Workflow** loads Convex project input (`getWireframesInput`).
6. **Workflow** calls `createWireframesRun`. Convex inserts `projectAiRuns` with `module: "generate"` and `status: "running"`. If another generate row is still `running` and younger than 60 minutes, this throws and the whole run dies.
7. Sealed temp workspace is written (`provider_workspace.rs`).
8. Optional Design Director (CLI) unless gateway skips it / uses a local plan.
9. **Per selected screen:** Qwen embed of the screen brief → Convex vector search (max 12) → R2 `loadCatalogSource` → files materialized for gateway + renderer. The renderer keeps the full retrieved set; the model prompt keeps the top **6** entry files and truncates oversized design artifacts. An unavailable candidate is skipped; if a screen has no usable source at all, only that screen is omitted from provider work.
10. **Gateway** gets sequential batches of **at most 5** screens (`MAX_GATEWAY_SCREENS_PER_REQUEST`). Claude/Codex screen calls use the same maximum concurrency.
11. A failed or malformed gateway batch is retried once. If that retry fails, only that batch is decomposed into one-screen recovery calls; later batches still run.
12. Gateway parses JSON screens, drops empty TSX, keeps requested ids, warns on extras. Missing ids get one independent recovery call.
13. Engine normalizes TSX (`framer-motion` → `motion/react`, strips `createRoot`).
14. **Renderer CLI** compiles and server-renders **only the ids from this run**, not saved siblings. Missing imports and SSR exceptions are real per-screen failures; no component or empty-HTML stubs are fabricated.
15. A technically failed screen gets one compact repair. The repair receives the rejected TSX and exact renderer error; the gateway repair drops research, flows, moodboard, and skills from the repeated payload.
16. A screen that still fails is removed from this result only. Successful siblings continue to checkpoint and persist. A prior accepted version stays unchanged during scoped regeneration.
17. **`apply_scoped_screens`** merges accepted screens into the saved Convex artifact. Unselected screens stay.
18. HTML is offloaded to R2; Convex artifact is updated; the run completes with honest partial-result copy when necessary.

Cancel is supposed to set the engine watch channel **and** patch Convex `status: "cancelled"`. Those are different IDs and different callers. If the sidecar dies first (`pkill`), Convex stays `running`.

---

## Three clocks, three IDs (why the overlay and the lock disagree)

| Thing | Where | Lifetime |
|-------|--------|----------|
| Engine run UUID | `stage-engine` memory, UI `activeRunId` | Until sidecar process dies |
| Convex `projectAiRuns._id` | `projectAiRuns` row `module: "generate"` | Until status leaves `running` |
| Overlay "still generating" | `useWireframesRun` `isFreshRunningRun` | **20 minutes** from `startedAt` |

Convex refuses a new generate for **60 minutes** (`STALE_RUNNING_RUN_MS` in `runStore.ts`).

So after `pkill` or a watchdog fail:

- Overlay can hide (20 min, or local `runEnded = true`).
- Convex still blocks (`already in progress`) until 60 min or an explicit cancel mutation.
- Engine UUID is gone, so IPC cancel has nothing to talk to.

`cancelWireframesRun` (engine → Convex) and `projectAi.cancelRun` (UI → Convex) both patch the same table. The generating overlay is the only desktop surface that calls cancel. After the overlay is gone, the user cannot clear the lock from the UI.

---

## File map

Paths are from repo root. Line counts are this worktree, 2026-08-29.

### 1. Desktop UI — start, overlay, results

| File | Lines | Role |
|------|------:|------|
| `apps/user-application/src/components/project/tabs/wireframes/WireframesTab.tsx` | 738 | Wizard + results + generating overlay. `isGenerating` fully replaces the tab. |
| `apps/user-application/src/components/project/tabs/wireframes/GeneratingStep.tsx` | ~80 | Progress UI. Cancel button lives here only. |
| `apps/user-application/src/components/project/tabs/wireframes/ConfigureStep.tsx` | | Screen list, add/edit, generate CTA. |
| `apps/user-application/src/components/project/tabs/wireframes/ResultsGrid.tsx` | | Saved screens, regenerate/delete selection. |
| `apps/user-application/src/components/project/tabs/wireframes/TypeChooser.tsx` | | Style-guide vs brand-kit. |
| `apps/user-application/src/components/project/tabs/wireframes/WireframeKindChooser.tsx` | | Lo-Fi vs Hi-Fi. |
| `apps/user-application/src/components/project/tabs/wireframes/StyleGuideStep.tsx` | | Direction pick. |
| `apps/user-application/src/components/project/tabs/wireframes/BrandKitStep.tsx` | | Brand-kit upload. |
| `apps/user-application/src/components/project/tabs/wireframes/WireframeRunSelection.tsx` | | Provider / Nebius picker surface. |
| `apps/user-application/src/components/project/tabs/wireframes/WireframeHtmlPreview.tsx` | | Sandboxed `srcdoc` preview (the `allow-scripts` console noise). |
| `apps/user-application/src/components/project/tabs/wireframes/WireframeBlockPreview.tsx` | | Lo-Fi block preview. |
| `apps/user-application/src/components/project/tabs/wireframes/FidelityToggle.tsx` | | Lo/Hi control. |
| `apps/user-application/src/components/project/tabs/wireframes/CanvasShell.tsx` | | Centered canvas wrapper. |
| `apps/user-application/src/components/project/tabs/wireframes/WireframePrimitives.tsx` | | Shared buttons. |
| `apps/user-application/src/components/project/AiRunSettings.tsx` | | Mode / provider chrome reused on the tab. |
| `apps/user-application/src/components/project/SkillsComponentsSelect.tsx` | 330 | Skill + library ids persisted on the project. |

### 2. Desktop hooks / source string

| File | Lines | Role |
|------|------:|------|
| `apps/user-application/src/hooks/project/wireframes/useWireframesTab.ts` | 242 | Orchestrates artifact + run. `nebiusSelected` default true. Dummy `codex` provider when Nebius is on. |
| `apps/user-application/src/hooks/project/wireframes/useWireframesRun.ts` | 370 | Start / cancel / overlay / 20 min watchdog. Reads Convex `listRuns` module `"generate"`. |
| `apps/user-application/src/hooks/project/wireframes/useWireframesArtifact.ts` | | Loads saved artifact. |
| `apps/user-application/src/hooks/project/wireframes/useSaveWireframesArtifact.ts` | | Manual save (screen list edits). |
| `apps/user-application/src/hooks/project/wireframes/useClearWireframeScreens.ts` | | Clear generated screens. |
| `apps/user-application/src/hooks/project/wireframes/useWireframeBrandKit.ts` | | R2 brand-kit files. |
| `apps/user-application/src/hooks/project/wireframes/index.ts` | | Re-exports. |
| `apps/user-application/src/hooks/engine/useProviderRun.ts` | | Generic engine start/cancel/events. Cancel talks to **engine UUID**, not Convex. |
| `apps/user-application/src/lib/project/wireframeScreenList.ts` | | Source-string builder, screen-id resolve. |
| `apps/user-application/src/lib/settings/skillsCatalog.ts` | | Catalog of skill + library ids the UI offers (`kokonut-ui`, `magic-ui`, `bklit-ui`, …). |
| `apps/user-application/src/lib/project/mapWireframesArtifactToTabData.ts` | | Artifact → result cards. |
| `apps/user-application/src/types/project/wireframesTab.ts` | | Tab types. |
| `apps/user-application/src/types/project/wireframesArtifactRecord.ts` | | Artifact record type. |

### 3. Electron bridge

| File | Role |
|------|------|
| `apps/user-application/electron/preload.ts` | `desktop.engine.startRun` / `cancelRun`. |
| `apps/user-application/electron/ipc.ts` | HTTP to sidecar `/v1/runs` and `/v1/runs/{id}/cancel`. |
| `apps/user-application/src/types/stage-desktop.d.ts` | Renderer typings for that bridge. |

Sidecar spawn / port `48221`: desktop main process (not listed here — generic engine, not wireframe-specific).

### 4. Engine — dispatch and Convex I/O

| File | Lines | Role |
|------|------:|------|
| `apps/stage-engine/src/app.rs` | | Wires `WireframesWorkflow` into the sidecar. |
| `apps/stage-engine/src/runs/mod.rs` | | Accepts run, cancel watch channel, routes `RunMode::Wireframes`. Skips CLI-provider readiness when source contains `gen:nebius`. |
| `apps/stage-engine/src/server/runs.rs` | | HTTP `/v1/runs`, `/cancel`, `/events`. |
| `apps/stage-engine/src/models/wireframes.rs` | | `WireframesInput`, kind, viewport. |
| `apps/stage-engine/src/models/runs.rs` | | `StartRunRequest` (mirrors TS contract). |
| `apps/stage-engine/src/convex_store/wireframes_repository.rs` | 326 | `getWireframesInput`, `createWireframesRun`, checkpoint / complete / cancel / fail / update artifact. |
| `apps/stage-engine/src/convex_store/catalog_repository.rs` | 246 | `search_components` + `load_component` (Convex actions). |

### 5. Engine — generation workflow (the pile)

| File | Lines | Role |
|------|------:|------|
| `apps/stage-engine/src/wireframes/workflow.rs` | **1618** | Still the largest orchestration file. Input, workspace, RAG, provider adapter, render, one repair, merge, save, cancel. The duplicated gateway/CLI post-render repair branches were collapsed. |
| `apps/stage-engine/src/wireframes/gateway.rs` | 954 | HTTP client and tests. Chunks of 5, same-batch retry, per-screen recovery, missing-id recovery, compact repair request, TSX normalize. |
| `apps/stage-engine/src/wireframes/prompt.rs` | **1106** | Prompt assembly for CLI + plan; Hi-Fi skill/library prefs. |
| `apps/stage-engine/src/wireframes/normalize.rs` | 814 | Artifact normalize + `merge_regenerated_screens` / `apply_scoped_screens`. |
| `apps/stage-engine/src/wireframes/render.rs` | 400 | Spawns `packages/wireframe-renderer` CLI. Scoped to current ids. |
| `apps/stage-engine/src/wireframes/quality.rs` | 81 | Pre-generation Design Director library validation only. Visual preferences no longer reject renderable output after generation. |
| `apps/stage-engine/src/wireframes/design_plan.rs` | 404 | Design-plan types / expected ids. |
| `apps/stage-engine/src/wireframes/provider_workspace.rs` | 453 | Sealed temp workspace, manifests, integrity. |
| `apps/stage-engine/src/wireframes/debug_dump.rs` | | Temp dump folder for prompts/TSX (`/var/folders/.../stage-wireframes/<run>`). |
| `apps/stage-engine/src/wireframes/mod.rs` | | Module + caps (`MAX_BRAND_KIT_FILES`, section limits). |

Helpers (`apps/stage-engine/src/wireframes/helper/`):

| File | Lines | Role |
|------|------:|------|
| `mod.rs` | 33 | Re-exports. |
| `source.rs` | 34 | Parse `kind:` `brand:` `gen:` `screens:` tokens. |
| `artifact.rs` | 181 | Merge repair TSX and moodboard keys. The dead `missing_screen_ids` helper was removed. |
| `design_director.rs` | 246 | CLI Design Director call (not the Nebius path). |
| `workspace.rs` | 363 | Per-screen required files / call manifests. |
| `parallel.rs` | 187 | Parallel CLI screen runs (Codex/Claude), capped at five, with one fresh retry for only the failed screen calls. |
| `attachments.rs` | 78 | Moodboard image fetch. |
| `brand_kit.rs` | 68 | Brand-kit file fetch. |
| `offload.rs` | 155 | Rendered HTML → R2. |
| `events.rs` | 39 | Tool started/completed events. |
| `error.rs` | 72 | `WorkflowError`. |

Tests: `apps/stage-engine/src/testing/wireframes/` (`workflow.rs`, `normalize.rs`, `prompt.rs`, `quality.rs`, `design_plan.rs`).

### 6. Local Nebius gateway

App: `apps/wireframe-ai-gateway/` — separate binary, default `127.0.0.1:48231`.

| File | Role |
|------|------|
| `src/main.rs` / `lib.rs` / `app.rs` | Axum: `/v1/health`, `/v1/readiness`, `POST /v1/wireframes/generate`. |
| `src/generator.rs` | 300 | Prompt + Nebius call + parse. Partial batches allowed; extra ids warned; empty TSX dropped. |
| `src/contracts.rs` | Request/response types (screens, design context, skills, catalog bundles). |
| `src/config.rs` | URL, model, concurrency, token/timeouts. |
| `src/auth.rs` | Bearer check. |
| `src/error.rs` | `provider_unavailable`, `provider_malformed_output`, `provider_no_data`. |
| `tests/live_nebius.rs` | Live provider test (not default CI). |

Engine talks to it from `gateway.rs` (`DEFAULT_GATEWAY_URL`).

### 7. Renderer

| File | Lines | Role |
|------|------:|------|
| `packages/wireframe-renderer/src/cli.ts` | 480 | Compile TSX → static HTML + live HTML. Per-screen import/SSR validation; missing modules and render crashes are never replaced with fake success. |
| `packages/wireframe-renderer/src/theme.ts` | | Brand CSS variables. |
| `packages/wireframe-renderer/src/lib/utils.ts` | | `cn` helper. |
| `packages/wireframe-renderer/test/smoke.test.mjs` | | Smoke including sibling isolation. |
| `packages/wireframe-renderer/package.json` | | Package entry. |

Vendored library components under `src/components/` / `src/libraries/` were largely deleted in this branch. Runtime source is supposed to come from **R2 catalog files** written into the renderer batch, not from those packs.

### 8. Convex — project runs and artifacts

| File | Role |
|------|------|
| `packages/data-ops/convex/schema.ts` | `projectAiRuns` (`module: "generate"`), `projectAiRunCheckpoints`, `projectAiArtifacts`, `wireframeCatalogComponents`, `wireframeCatalogEmbeddings` (4096-d Qwen index). |
| `packages/data-ops/convex/projectAi.ts` | Transport: `getWireframesInput`, `createWireframesRun`, checkpoint/complete/cancel/fail, `updateWireframesArtifact`, `clearWireframeScreens`, plus generic `cancelRun`. |
| `packages/data-ops/convex/lib/projectAi/handlers/wireframes.ts` | 515 | Handlers. **`createWireframesRunHandler` throws if a generate run is already `running`.** |
| `packages/data-ops/convex/lib/projectAi/handlers/runs.ts` | Generic `cancelRun` (any module). |
| `packages/data-ops/convex/lib/projectAi/domain/runStore.ts` | `findRunningRunForProjectModule` — 60 min stale-fail, otherwise blocks. |
| `packages/data-ops/src/contracts/engine-run.ts` | `StartRunRequest` (`mode: "wireframes"`, `context.source`). |
| `packages/data-ops/src/contracts/wireframes.ts` | Artifact Zod schema. |

### 9. Convex — RAG catalog (Qwen + R2)

| File | Role |
|------|------|
| `packages/data-ops/convex/wireframeCatalog.ts` | `searchCatalog`, `loadCatalogSource`, ingest/index upserts. |
| `packages/data-ops/convex/wireframeCatalogEmbeddings.ts` | Internal action: embed via Nebius Qwen3-Embedding-8B. |
| `packages/data-ops/convex/lib/wireframeCatalog/handlers.ts` | 554 | Search, load, upsert, index batch. |
| `packages/data-ops/convex/lib/wireframeCatalog/source.ts` | 157 | Fetch exact R2 source bundle. |
| `packages/data-ops/convex/lib/wireframeCatalog/embedding.ts` | 26 | Model + `library:runtime` scopes. |

Ingest (not per-run, but required before Hi-Fi works): `docs/WIREFRAMES_LIBRARY_INGEST.md`, `docs/WIREFRAMES_CATALOG_INGEST_2026-08-24.md`.

### 10. Prompt skills copied into the workspace (CLI path; also selected for Nebius)

Under `apps/stage-engine/skills/`:

- `frontend-design/SKILL.md`
- `emil-design-eng/SKILL.md`
- `ui-ux-pro-max/SKILL.md`
- `impeccable/SKILL.md`
- `design-motion-principles/SKILL.md`
- `shadcn-ui-skill/SKILL.md`

These are **files**, not the catalog. The catalog is R2 + Convex vectors. Skills are extra prose the model is allowed to read.

### 11. Tests that pin generation behavior

| File | Role |
|------|------|
| `apps/stage-engine/src/testing/wireframes/workflow.rs` | Source tokens, merge helpers, compact model bundles, and failed-screen isolation. |
| `apps/stage-engine/src/testing/wireframes/normalize.rs` | Merge / bonus screen keep. |
| `apps/user-application/src/lib/project/wireframeScreenList.test.ts` | Source string including `gen:nebius`. |
| `apps/wireframe-ai-gateway` unit tests in `generator.rs` | Extra ids / empty TSX. |
| `packages/wireframe-renderer/test/smoke.test.mjs` | Invalid sibling must not block valid screen. |

### 12. Adjacent, not the generate loop

These consume artifacts; they do not produce TSX:

- `apps/user-application/src/hooks/project/assets/useFigmaWireframeExport.ts`
- `apps/user-application/src/hooks/project/assets/useWireframeDeliveryExport.ts`
- `apps/user-application/electron/helpers/wireframe-screenshot.ts`
- `apps/web-application/src/components/project/GenerateTab.tsx` (499) — **second UI**, Convex `cancelRun` on its own loading overlay. Desktop does not use this file.

---

## Data stored per screen

A generated screen object typically carries: `id`, `tsx`, `html`, `liveHtml`, `renderMode`, `catalogComponentIds`, plus artifact-level `configureScreens`, `wireframeKind`, `designPlan`, `catalogRetrieval`.

Merge rules (Hi-Fi) live in `normalize.rs` `merge_regenerated_screens`:

- Unselected ids: keep saved.
- Requested + new markup that actually changed: replace.
- Requested + empty/unchanged: restore saved (or drop if never existed).
- Kind change (Lo-Fi → Hi-Fi): drop unselected leftover screens of the old kind.

---

## Remaining structural problems

These are structural, not one-line bugs:

1. **Two generators in one workflow file**, switched by a token in a CSV string, while `providerId` still says `codex`.
2. **Two run identities** (engine UUID vs Convex `_id`) and **three cancel functions** (`engine.cancelRun`, `projectAi.cancelRun`, `projectAi.cancelWireframesRun`).
3. **20 min overlay vs 60 min Convex lock.** Killing the sidecar does not clear Convex. The overlay then disappears and the user cannot cancel. Next generate throws `already in progress`.
4. **`workflow.rs` + `prompt.rs` remain too large** (~2680 lines together). The first reliability slice removed duplicated post-generation gates and repair behavior, but provider selection, RAG, merge, and cancellation still meet in the workflow.
5. **Renderer used to compile the whole saved artifact**, so old `@stage/base` TSX killed new screens. Scoped compile was added later; merge still happens after render. That coupling is easy to break again.
6. **R2 transitive dependency closure is not yet proven.** The model now gets only the selected component entry file and the renderer gets every file returned by the exact R2 bundles. If a bundle still references a dependency absent from R2, the renderer rejects that screen truthfully and the one repair may replace it; Stage no longer invents the module.
7. **Deleted local component packs** (git status) while the UI catalog and RAG libraries still name `kokonut-ui` / `magic-ui` / `bklit-ui`. Generation now depends on Convex/R2 ingest being present, not on files in `packages/wireframe-renderer`.
8. **Web `GenerateTab` and desktop `WireframesTab` are parallel UIs** with different cancel behavior.

## Locally verified on 2026-08-31

- Stage engine: `cargo test` — **246 passed**.
- Renderer: TypeScript check plus **9 passed** smoke tests.
- Standalone gateway: **16 passed** locally; the explicit one-screen live Nebius contract test also passed on 2026-08-31.
- Failure fixtures cover same-batch retry, malformed-envelope retry, batch-to-screen recovery, missing imports, SSR exceptions, and sibling preservation.
- Current implementation diff is net-negative; no commit or push was made for this slice.

The remaining acceptance step is a fixed-fixture run through the full Stage path
for Claude, Codex, and Nebius with populated R2 data. The live gateway test proves
Nebius can currently return the typed envelope; it does not prove the completeness
of live catalog data or end-to-end rendering.

A Cancel button on the overlay is necessary. It does not fix (2) or (3). If the overlay is gone, the lock remains.

---

## Read order if you want to see it yourself

1. `apps/user-application/src/lib/project/wireframeScreenList.ts` — the source string.
2. `apps/user-application/src/hooks/project/wireframes/useWireframesRun.ts` — overlay + 20 min + cancel.
3. `apps/stage-engine/src/wireframes/helper/source.rs` — how the engine reads that string.
4. `packages/data-ops/convex/lib/projectAi/domain/runStore.ts` — 60 min lock.
5. `packages/data-ops/convex/lib/projectAi/handlers/wireframes.ts` `createWireframesRunHandler`.
6. `apps/stage-engine/src/wireframes/workflow.rs` — the whole run.
7. `apps/stage-engine/src/wireframes/gateway.rs` — batches of 5.
8. `apps/wireframe-ai-gateway/src/generator.rs` — Nebius parse.
9. `packages/wireframe-renderer/src/cli.ts` — compile boundary.
10. `apps/stage-engine/src/wireframes/normalize.rs` — merge into saved artifact.

Related plans (history, not this map): `docs/RAG/WIREFRAMES_AGENTIC_RAG_PLAN_AUG26.md`, `docs/RAG/WIREFRAMES_RIG_NEBIUS_GATEWAY_PLAN_28-AUG.md`, `docs/WIREFRAMES_LIBRARY_INGEST.md`.
