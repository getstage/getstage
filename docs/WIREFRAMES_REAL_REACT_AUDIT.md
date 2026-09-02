# !!! Wireframes real-React audit (progress)

> **Living progress table.** Update every session so Werner knows where we are,
> what is stuck, and where we left off.
>
> **Direction:** [`WIREFRAMES_REAL_REACT_LIBRARIES.md`](WIREFRAMES_REAL_REACT_LIBRARIES.md)  
> **Component inventory (data, not progress):** `packages/wireframe-renderer/manifests/wireframesQualityInventory.ts`  
> **Supersedes:** `WIREFRAMES_SESSION_AUDIT_2026-08-09.md` (deleted 2026-08-11)

**Legend:** `[x]` done · `[~]` partial · `[ ]` not started · `[!]` blocked

---

## Status right now

| Field | Value |
|-------|--------|
| **Last updated** | 2026-08-11 (static verification passed; live provider acceptance not run) |
| **Phase** | W1–W5 implementation is in the worktree. W0 baseline and W6 live Claude/Codex acceptance remain unverified. |
| **Busy on** | User-run four-screen Claude/Codex acceptance and visual review |
| **Left off** | Restart the desktop app, run the fixed four-screen set with Claude and Codex, and record access coverage, timing, screen coverage, renderer results, and full-size visual scores. |
| **Blocker** | None. No live provider run has exercised the new JSON event adapters, required-read gate, workspace cleanup, or visual output yet. |

---

## Handoff — current state (for the next agent)

### DONE + verified
- **R1 (live React preview):** renderer emits `liveHtml` — an esbuild IIFE bundle (React + ReactDOM/client + `motion` + the vendored components, tsconfig-path resolved) wrapped in a self-contained HTML doc with the run stylesheet inlined. Offloaded to R2 as `text/html` → `liveUrl`. The preview **dialog** fetches via IPC (`fetchR2TextRaw`) → `srcDoc` + `sandbox="allow-scripts"` (opaque origin — no app / Convex / IPC access). Static `renderToStaticMarkup` html is kept for Figma export, card thumbnail, and fallback.
- **R2 (motion allowed):** `motion` + `motion/react` added to `FREE_IMPORTS`; prompt now instructs live motion **and** "the resting frame must still look complete" (Figma is a static capture).
- **R3 acquisition pipeline:** `packages/wireframe-renderer/scripts/vendor-registry.mjs`. `GET /r/<name>.json` → reject motion/external deps (unless `--allow-motion`) → adapt `next/*` + strip next/image props → merge keyframes into `globals.css` → wire library index + `libraries.json`. Handles default-export + PascalCase. **The fixture render is the final gate** (deps list misses hidden imports).
- **R3a (static-safe, all fixture-gated):** Kokonut **21→25**, Magic UI **17→33**, **React Bits** new pack (7). Exact names: session log below + `STAGE_LIBRARY_EXPORTS` in the inventory.
- **React Bits** = selectable `sections` pack (icon = Werner's SVG, `public/logos/component-packs/react-bits.svg`).

### Files touched (R1/R2)
- Renderer: `src/cli.ts` (`FREE_IMPORTS`, `buildLiveDocument`, `liveHtml` output, `ScreenOutput`), `package.json` (+`motion`, +`esbuild`).
- Engine: `wireframes/render.rs` (`RenderScreenOut.live_html` + map-back), `wireframes/workflow.rs` (`offload_rendered_screens` uploads liveHtml → `liveUrl`, dropped on failure — too big to inline), `wireframes/prompt.rs` (motion block + allowed-imports line).
- Contract/Convex: `packages/data-ops/src/contracts/wireframes.ts` (`liveHtml`/`liveUrl`), `convex/lib/projectAi/domain/researchContent.ts` (resolve `liveUrl`). `collectR2KeysFromJson` already sweeps `liveUrl` for cleanup.
- App: `types/project/wireframesTab.ts`, `lib/project/mapWireframesArtifactToTabData.ts`, `components/project/tabs/wireframes/WireframeHtmlPreview.tsx` (IPC fetches `liveUrl` as raw text, then live `<iframe srcDoc={...} sandbox="allow-scripts">`), `ResultsGrid.tsx` (passes `liveUrl`), `lib/settings/skillsCatalog.ts` (React Bits pack).

### Verified how
renderer `tsc` + `pnpm test` (13/13) · headless-browser motion proof · `cargo check` + `cargo test` (231/231) + `cargo fmt --check` · Convex functions prepared successfully with `convex dev --once` · full monorepo TypeScript typecheck and production build · packaged renderer preparation. **NOT run by me:** the full in-app Electron E2E — Werner/next agent confirms by generating a run and opening a screen.

### How to test in the app
`pnpm run dev` in `apps/user-application` → generate a wireframe (model may now use `motion/react`) → open a screen **full-size** → it runs **live with motion**. Thumbnails + Figma stay static.

### NEXT — approved order
1. Restart the desktop app so the rebuilt Rust sidecar and Convex schema/functions are loaded.
2. Run the fixed four-screen set once with Claude and once with Codex using identical explicit skill/library/style selections.
3. Record run IDs, required-read coverage, prompt/read bytes, provider/render/total durations, screen coverage, repairs, and failures.
4. Inspect every screen full-size and in Figma; score the W6 visual rubric without inferring quality from successful compilation.
5. Exercise cancellation after at least one completed screen and inspect the cancelled run plus retained partial artifact/checkpoints.
6. Exercise one transient R2 delete failure and confirm the queue row survives until the hourly retry deletes the object.
7. Mark W0–W6 rows `[x]` only from those observed traces; reduce required context if measured reads erase the expected speed benefit.

### Implementation status — 2026-08-11

Implemented in code:

- unique sealed run-local provider workspaces with normalized paths, file/total limits, SHA-256 manifests, provenance/sensitivity labels, Stage-only writes, tombstoned cleanup, and expired Stage-marker pruning;
- selected project artifacts, skill adapters, library recipes, screen-scoped context, shared design plan, real brand assets, and the selected direction's actual moodboard images materialized as files;
- exact director/screen/repair call manifests, short path-only prompts, optional large project references, Claude exact `Read(path)` permissions with user settings/MCP disabled, and ephemeral Codex `--sandbox read-only --cd <workspace>` with project-doc discovery disabled;
- Claude/Codex JSON event parsing, observed read tracking, and rejection when a required non-attachment file was not observed;
- compact single-screen response envelopes, deterministic configure-screen reconstruction, local provider checkpoints plus durable Convex design-plan/validated-screen checkpoints, truthful cancelled run status with retained partial artifacts, and one isolated retry only for each failed screen;
- separate zero-retention provider workspaces and TTL-pruned debug dumps;
- durable Convex `r2DeletionQueue` tombstones, live-reference deferral, exponential retry, hourly retry scheduling, and the existing abandoned-upload pruning path retained.

Not yet verified by a live user run:

- real Claude and Codex event payload compatibility and 100% required-read coverage;
- measured prompt/token/latency delta against the old inline baseline;
- cancellation/crash recovery under a real provider process;
- transient R2 failure followed by scheduled retry;
- complete screen coverage, zero repair/fallback failures, live preview quality, and Figma resting-frame quality.

Code-only rows below are `[~]`, not `[x]`, until the named focused or live evidence exists.

### Caveats
- Live bundle ~500 KB/screen. · Aceternity 401. · React Bits MIT+Commons Clause.
- **Packs selected ≠ packs used** — dumps prove the model can ignore Magic UI / motion.

### Contract fixes — 2026-08-11 (from WIREFRAMES_RUN_FAILURE_DIAGNOSIS_2026-08-11.md)

All three diagnosed contract failures are fixed in code; live Claude/Codex re-run still owed.

1. **Component-prop contract:** `libraries.json` recipes now declare the real required props for the Bklit charts (`AreaChart`/`BarChart`: `data`+`label`, `DonutChart`: +`centerLabel`). New `test/manifest.test.mjs` block parses each vendored component's TSX signature (`prop?:` optional, else required) and fails when a recipe's `requiredProps` misses a required prop — manifest drift is now a test failure.
2. **Free-import contract:** renderer `cli.ts` validates named imports from `lucide-react` against the installed package's real exports (read once from `lucide-react.d.ts`) before SSR — fake icons like `Chrome` fail fast with a repairable message.
3. **Repair contract:** `repair_prompt_for_failures` states the hard rule (all required props per manifest; real lucide exports only) so the single repair attempt cannot repeat the same contract violation.
4. **Codex context-compliance message:** `provider completed without reading required context files` now maps to an honest "provider ignored context, not a login problem" message instead of the generic auth fallback.

---

## Quality diagnosis (from real dumps)

> Living section. Update after each dump you care about.  
> **Inspect:** Electron log → `path=/tmp/stage-wireframes/<run_id>` → open folder. Start with `00-meta.json`, `03-tsx-*.tsx`, `06-render-summary.json`.

### How content vs components work

| Layer | Source | Role |
|-------|--------|------|
| **Copy / product truth** | Research, strategy, flows, moodboard (in the prompt) | Headlines, goals — **not** from UI libraries |
| **Component packs** | User selection → `@stage/base` / `@stage/sections` / `@stage/charts` | Vendored React in `packages/wireframe-renderer` (no live registry fetch at runtime) |
| **Free imports** | `react`, `lucide-react`, `motion/react` | Icons + motion |
| **Provider output** | Selected provider (Claude or Codex) writes `tsx` | Chooses which exports to import — **quality bottleneck today** |
| **Renderer** | esbuild live + static HTML | Only compiles what the model wrote |

Slot map: **kokonut-ui → `@stage/base`**, **magic-ui → `@stage/sections`**, **bklit-ui → `@stage/charts`**.

### Dump `1f3717f2-3831-483a-b46b-873002343493` (2026-08-11)

**Selected:** `kokonut-ui` + `magic-ui` + `bklit-ui` · skills `ui-ux-pro-max`, `emil-design-eng` · scoped: signup, project-dashboard, decision-log, reports-archive.

**What this scoped run actually produced:**

| Screen | New output | Library use | Verdict |
|--------|------------|-------------|---------|
| decision-log | Usable TSX | Kokonut primitives + `DotPattern`; no Bklit; no Motion | Functional but generic; its declared `stat-strip` was rendered as text totals |
| reports-archive | Usable TSX | Kokonut primitives + `DotPattern`; no Bklit; no Motion | Same visual recipe repeated; generic stat cards |
| project-dashboard | No parsed screen | Malformed JSON: an unescaped newline inside the TSX JSON string | Parse retry required |
| signup | Outline only | Sections/blocks, but no `tsx` and no `html` | Completeness gate required |

**Merged-artifact warning:** the dump also contains TSX/static/live files for existing untouched screens. Those are useful renderer fixtures but are not new provider output from this four-screen scoped run. The `Figma` Lucide failure came from one of those merged screens, so it proves import validation is needed but does not belong in the scoped-generation score.

**Infra OK:** the two usable scoped screens and merged React screens produced live bundles with `liveHasProcessStub=true` (~500 KB).

### Design-guidance and library audit (2026-08-11)

This corrects the earlier “force 2–3 showcase components per screen” idea. Component count is not design quality.

**Selected skills:**
- **UI UX Pro Max:** its core workflow is *product/audience/style analysis → one master design system → page-specific overrides*, tuned by variance, motion, and density. Stage currently skips that workflow and injects the prose/source corpus into every independent screen prompt. The Stage adapter is also stale: it still says self-contained HTML instead of React TSX.
- **Emil Design Engineering:** quality comes from compounded details and a cohesive interaction vocabulary. Motion is frequency- and purpose-dependent: spatial continuity, state indication, explanation, or feedback. Repeated/keyboard actions should have little or no animation; occasional and first-time moments can carry delight. The Stage adapter incorrectly says React/Motion is not shipped.
- The upstream skill sources contain agent-operating instructions (`CLAUDE_PLUGIN_ROOT`, “respond only…”, filesystem/search commands). Those are reference material, not wireframe instructions, and must not be pasted into either Claude or Codex generation prompts.

**Selected libraries:**
- **Kokonut UI:** a mixture of primitives and specific compositions. `LiquidGlassCard`/`LiquidButton` can create a signature surface; `CardFlip` has a clear feature-card role. `CarouselCards` is an experience-marketplace composition, not a generic business-app carousel. Do not force components outside their semantic fit.
- **Magic UI:** mostly effects, overlays, text treatments, device frames, and a few structural compositions (`BentoGrid`). `DotPattern`, `ShineBorder`, or `Meteors` are decoration; using one does not prove the screen was composed from the library. Effects need a strong underlying layout and must be capped to avoid visual noise.
- **Bklit UI:** Stage currently exports small deterministic SVG charts, not the full upstream library. Use charts only for real comparisons/trends/distributions. A row of categorical totals does not automatically need a chart.

**Provider contract:** `build_wireframes_prompt` is shared by Claude and Codex. All design/execution rules must be provider-neutral; no provider name, plugin path, tool-use instruction, or provider-specific response behavior belongs in the generated prompt.

**Generalization contract:** do not flatten every skill/library into one generic rule. Each selectable skill needs a concise Stage adapter describing role, applicability, and its provider-neutral contribution to the shared design plan. Each component needs metadata for semantic role, visual weight, props, motion/static behavior, suitable screen/density, incompatibilities, and anti-use cases. A new export is not prompt-ready until that metadata and a fixture exist. Full contract: `WIREFRAMES_REAL_REACT_LIBRARIES.md` § Generalization contract.

**Dump correction:** run `1f3717f2-…` targeted four screens. Only decision-log and reports-archive returned usable new TSX; signup returned an outline with no TSX/HTML, and project-dashboard returned malformed JSON. The other TSX files in the dump are merged existing screens, so they must not be counted as new output from this run.

### Approved quality architecture plan — run-local provider workspace

The previous Q0–Q6 plan correctly diagnosed generic output, but its execution shape still repeated large text payloads and reduced rich context before the screen writer saw it. W0–W6 supersedes that execution shape.

The new invariant is simple: Stage materializes the user's exact selected context once, exposes it as an isolated read-only workspace, names every required file for every provider call, and audits whether Claude/Codex actually opened those files. The stdin prompt becomes a short execution contract, not the project database.

#### Non-goals

- No vague “read the workspace” instruction without an exact call manifest.
- No requirement that every screen reread every large source/example file.
- No hidden skill, library, provider, or aesthetic selection.
- No direct provider access to the repository, user home directory, Convex credentials, or unrelated project files.
- No claim that local files remove model context limits after those files are read.
- No self-reported read receipt accepted as proof when structured provider events are available.
- No visual-quality claim based only on compilation, component count, or file access.

#### W0 — Baseline and exact selection

- Capture the current inline-prompt baseline on the fixed four-screen set: prompt characters, provider input tokens where available, first-token time, provider duration, total duration, requested/returned screens, repairs, and visual rubric.
- Remove automatic Design Taste and any implicit legacy skill selection. Empty means empty.
- Snapshot only the provider, skills, libraries, screens, brand source, and style direction selected for this run.

#### W1 — Materialize one isolated workspace per run

Create `<system-temp>/stage-wireframes-workspaces/<run-id>-<nonce>.ready/` atomically. Stage owns writes; providers receive read-only access.

`context-manifest.json` lists every exposed file with its exact path, role, byte size, SHA-256 digest, provenance, sensitivity, access policy (`required` or `onDemand`), and applicable calls.

Materialize:

- compact runtime and output contracts;
- bounded research, strategy, flows, and target-screen context;
- style-guide JSON plus actual moodboard/brand images;
- only explicitly selected skill adapters and sanitized references;
- only explicitly selected library catalogs, recipes, examples, and optional source references;
- per-screen briefs, relevant flows, and existing TSX when regenerating;
- the validated shared design plan after the director call.

Use run-specific paths, normalized relative names, allowlisted file types, per-file/total size limits, atomic writes, cancellation-safe cleanup, and stale-directory pruning. Never reuse the current shared `stage-engine-provider` directory for run content.

Workspace lifecycle is mandatory: `Building → Ready → InUse → Deleting → Deleted`. The directory name contains run ID plus random nonce; the selected context manifest is written before an atomic `.building` → `.ready` rename; the Stage marker records run ID, engine-instance ID, owner PID, and an expiry longer than the bounded provider timeout and refreshes before each call. Every terminal Rust scope kills/joins provider children before the workspace guard tombstones/removes the directory. Each new workspace creation prunes only Stage-marked expired directories. Provider workspaces are never retained as debug dumps and never enter Convex/R2.

#### W2 — Exact provider file access and evidence

- Derive one ordered call manifest for the Design Director and one for every screen/repair call.
- Name every required path one by one in the short prompt.
- Claude: enable `Read` only for manifest-approved paths and pass visual files through its supported attachment/read path.
- Codex: set the run workspace as `--cd`, keep `--sandbox read-only`, and attach visual files with `--image`.
- Switch provider collection to structured event output where required and normalize Claude/Codex read events into one `ContextAccessReport`.
- Reject output when any required file lacks an observed read event or its manifest hash no longer matches.
- Record optional reads for diagnosis, not as a quota.

A model-authored list saying “I read these files” is not sufficient evidence by itself.

#### W3 — Manifest-driven generation

The Design Director and screen writers use the same workspace but different call manifests.

Design Director required reads:

1. runtime contract;
2. compact project research and strategy;
3. all target-screen intents and relevant flows;
4. style-guide JSON and actual visual assets;
5. all selected skill adapters;
6. selected library catalogs and recipes.

Stage validates the returned shared design plan and writes it to `design/design-plan.json`.

Each screen call must read:

1. runtime and output contracts;
2. `design/design-plan.json`;
3. its own brief and relevant flow;
4. style-guide JSON and visual assets;
5. applicable selected skill adapters;
6. relevant selected library catalog entries and recipes.

Large component source trees, long skill references, and extra examples remain `onDemand`. The prompt lists them as available but does not force every call to consume them. The provider returns only the requested screen envelope and TSX; Stage owns repeated artifact metadata and merging.

#### W4 — Persistence and partial success

- Persist the validated design plan immediately.
- Save or checkpoint every screen after it passes all gates; one failed sibling must not erase successful work.
- Scoped regeneration reuses the saved plan and existing workspace-derived contract unless the user deliberately changes design inputs.
- Cancellation stops active provider children but preserves already validated checkpoints and reports exactly what remains.
- The provider workspace is always removed. Sanitized development debug evidence lives separately under an explicit TTL; production retains no workspace copy.
- Convex/R2 output cleanup is independent from local workspace cleanup. Existing artifact/screen/project paths already collect referenced R2 keys, but physical deletion is currently best-effort.
- Before claiming ghost-free durable cleanup, add a persistent R2 deletion tombstone/queue. A key remains retryable until R2 confirms deletion or confirmed absence; only then may its deletion record disappear.
- Abandoned new uploads remain tracked and are collected by the existing hourly 24-hour pending-upload prune after reference checking.

#### W5 — Gates and one bounded repair

Before accepting a screen, require:

1. **Context access:** every required file was observed as read and hashes match.
2. **Response integrity:** exact screen ID, parseable envelope, non-empty TSX, no outline-only result.
3. **Renderer integrity:** valid imports, TypeScript/esbuild success, static render, live bundle, and complete visible resting frame.
4. **Plan conformance:** shared tokens, applicable recipe/signature intent, purposeful motion, real project content, and no competing design system.
5. **Cross-screen consistency:** shared patterns agree and unrelated screens do not repeat one generic layout without plan justification.
6. **Bounded repair:** one repair call receives the original TSX, structured diagnostics, original call manifest, and applicable plan files. It must pass the same gates.

A still-invalid Hi-Fi screen fails honestly and remains absent from the successful artifact.

#### W6 — Performance and visual acceptance

Run the same signup, project-dashboard, decision-log, and reports-archive set with Claude and Codex.

Compare against W0:

- total inline prompt characters;
- workspace bytes and required/on-demand file counts;
- observed bytes/files read per call;
- input tokens where providers report them;
- first-token, provider, render, and total durations;
- requested-screen coverage and repairs;
- import/render/fallback failures;
- visual rubric: system coherence, hierarchy, content fit, distinctiveness, component fit, interaction purpose, and cross-screen variety.

The workspace architecture passes only if it preserves complete context coverage while reducing repeated payload/latency or materially improving output. If every call simply reads every file and speed does not improve, W3 must reduce the required set rather than pretending file storage solved the problem.

### Implementation map

| Phase | Primary files | Focused verification |
|---|---|---|
| W0 | `skillsCatalog.ts`, `wireframes/prompt.rs`, fixed baseline dump | Exact empty/explicit selection tests; baseline metrics recorded |
| W1 | new focused `wireframes/provider_workspace.rs`, `workflow.rs`, workspace contracts | deterministic manifest/hash tests; isolation, limits, cleanup, cancellation fixtures |
| W2 | `providers/claude.rs`, `providers/codex.rs`, `providers/process/*`, context-access contract | exact allowed paths; structured read-event fixtures; missing-read rejection |
| W3 | `wireframes/prompt.rs`, `wireframes/design_plan.rs`, `workflow.rs` | short prompt fixtures; per-call required sets; optional large references absent from stdin |
| W4 | `workflow.rs`, artifact/checkpoint contracts, debug dump | mixed pass/fail and cancellation tests preserve validated siblings |
| W5 | `workflow.rs`, `render.rs`, renderer CLI | context/response/render/plan/repair fixtures; no fallback success |
| W6 | debug dump, live preview, Figma path | matched Claude/Codex four-screen benchmark and scored visual review |

### Acceptance criteria

- One isolated workspace is created per run; concurrent runs cannot see or overwrite each other's files.
- The sealed lifecycle is `Building → Ready → InUse → Deleting → Deleted`; every success/error/cancel/timeout path removes the workspace, and expired leases are recovered after crashes.
- Provider workspaces never enter Convex/R2; debug evidence is separate, sanitized, disabled in production, and TTL-pruned in development.
- Durable R2 deletion remains retryable until confirmed; a transient delete error may not discard the final tracking/tombstone record.
- `context-manifest.json` hashes and classifies every exposed file; every call has an exact ordered required-file list.
- Claude and Codex receive the same semantic context contract through provider-specific safe read mechanisms.
- Actual moodboard/brand images are available as visual inputs, not only JSON descriptions.
- No unselected skill/library or hidden aesthetic is exposed.
- Required provider reads are proven by normalized structured events; missing reads fail the context gate.
- Large references remain searchable on demand and are not repeatedly forced into every screen context.
- Stdin prompts contain contracts and paths, not duplicated research/strategy/skill/library bodies.
- The validated design plan is persisted and reused; each successful screen is checkpointed independently.
- Every accepted screen has non-empty TSX and passes static + live rendering, plan conformance, and bounded repair rules.
- The same four-screen Claude/Codex run records context coverage, token/latency metrics, complete screen coverage, and the visual rubric against the inline baseline.
- Debug evidence contains the workspace manifest, call manifests, normalized access reports, prompts, outputs, render reports, and final gate decisions without secrets.

---

## Execution audit table

This table is the implementation source of truth for W0–W6. Update the relevant row immediately after each change. Status may become `[x]` only when Evidence names an observed command result, focused test, debug dump, provider trace, or live scenario. Code without proof is `[~]`; planned work remains `[ ]`. Never bulk-complete rows from inference.

**Status:** `[x]` verified · `[~]` implemented but proof incomplete · `[ ]` not started · `[!]` blocked

| ID | Audit check | Status | Evidence required / observed |
|---|---|---:|---|
| A0.1 | Run-local provider workspace architecture is recorded in both living wireframe docs | `[x]` | This document § Approved quality architecture plan; `WIREFRAMES_REAL_REACT_LIBRARIES.md` § 1.2 |
| A0.2 | `PROJECT_STATUS.md` and `ARCHITECTURE.md` identify the workspace plan as current | `[x]` | Current P0 row and Local/AI runtime-flow subsection |
| F0.1 | Provider requests already support an explicit working directory | `[x]` | `StartRunRequest.working_directory`; Claude process cwd; Codex `--cd` in `providers/codex.rs` |
| F0.2 | Codex already supports read-only sandboxing and image attachments | `[x]` | `providers/codex.rs`: `--sandbox read-only`, `--image <local_path>` |
| F0.3 | Claude already supports exact attachment-path reads | `[x]` | `providers/claude.rs`: `Read(<local_path>)` allowlist |
| F0.4 | Current attachment staging is recognized as shared and unsafe for run context | `[x]` | `provider_cli_working_directory()` resolves one shared `stage-engine-provider`; W1 replaces it for wireframes |
| W0.1 | Record a fixed four-screen inline-prompt baseline before changing context delivery | `[ ]` | Run ID, dump, prompt chars, tokens where available, timing, coverage, repairs, visual rubric |
| W0.2 | Remove automatic Design Taste and make empty skill selection truly empty | `[~]` | UI/default/prompt tests and scoped source search |
| W0.3 | Snapshot exact provider, screen, skill, library, brand, and style selections at run start | `[~]` | Request-to-manifest fixture with no implicit entries |
| W0.4 | Define comparable performance counters for baseline and workspace runs | `[ ]` | Contract test for prompt chars, workspace/read bytes, tokens, first-token/provider/render/total durations |
| W1.1 | Define typed `ProviderWorkspaceManifest`, `ProviderContextFile`, and per-call manifest contracts | `[~]` | Rust serde success/failure tests |
| W1.2 | Create a unique workspace under `<system-temp>/stage-wireframes-workspaces/<run-id>-<nonce>.ready/` | `[~]` | concurrent-run isolation test and debug dump paths |
| W1.3 | Materialize runtime and output contracts as small required files | `[~]` | manifest fixture and byte-size bounds |
| W1.4 | Materialize bounded research, strategy, flows, and target-screen data | `[~]` | fixture proves irrelevant/unselected project data is absent |
| W1.5 | Materialize style-guide JSON and real moodboard/brand images | `[~]` | manifest MIME/hash tests plus provider attachment fixture |
| W1.6 | Materialize only explicitly selected skill adapters and sanitized references | `[x]` | 231-test Rust suite includes empty/explicit selection and operational-instruction sanitization fixtures |
| W1.7 | Materialize only selected library catalogs, recipes, examples, and optional sources | `[~]` | two-pack fixture proves unselected packs absent |
| W1.8 | Materialize per-screen brief, relevant flow, and existing TSX for regeneration | `[~]` | two-screen fixture proves isolation and correct prior TSX |
| W1.9 | Record path, role, size, hash, provenance, policy, sensitivity, and applicable calls for every file | `[~]` | deterministic manifest snapshot and tamper test |
| W1.10 | Enforce normalized relative paths, allowlisted types, per-file/total size limits, and no symlink escape | `[~]` | traversal, symlink, type, and oversize negative tests |
| W1.11 | Write atomically; clean on completion/cancel; prune stale workspaces safely | `[~]` | lifecycle, cancellation, and stale-prune tests |
| W1.12 | Enforce `Building → Ready → InUse → Deleting → Deleted`; providers never see an unsealed workspace | `[~]` | state-transition and invalid-transition tests |
| W1.13 | Protect active workspaces with run ID, nonce, engine-instance ID, PID, and a refreshed bounded-call lease | `[~]` | concurrent owner, expired lease, and live lease tests with injected clock |
| W1.14 | Kill/join every provider child before tombstoning and deleting its working directory | `[~]` | success, failure, timeout, and cancellation workflow tests |
| W1.15 | Workspace-creation janitor deletes only Stage-marked directories with expired leases | `[~]` | unmarked/live-lease preservation plus stale-state cleanup tests |
| W1.16 | Keep provider workspace retention at zero; place sanitized debug evidence in a separate TTL directory | `[~]` | production/dev retention tests and dump inspection |
| W1.17 | Persist no workspace path or raw workspace file in Convex/R2 | `[~]` | artifact payload and upload-call assertions |
| W2.1 | Derive an ordered exact required-file list for every director/screen/repair call | `[~]` | call-manifest fixtures for all call kinds |
| W2.2 | Set the run workspace as the actual working directory for both providers | `[~]` | Claude/Codex argument fixtures and observed process metadata |
| W2.3 | Restrict Claude `Read` permissions to manifest-approved exact paths | `[~]` | allowed-tools fixture; unlisted path denied |
| W2.4 | Keep Codex read-only and restrict its working directory to the run workspace | `[~]` | argument fixture and live read/no-write scenario |
| W2.5 | Pass visual assets through the supported provider-specific image/read path | `[~]` | Claude and Codex fixture each observes the same image asset |
| W2.6 | Collect structured provider events instead of relying only on final text | `[~]` | Claude and Codex event-stream fixtures with tool/read events |
| W2.7 | Normalize provider-specific read events into one `ContextAccessReport` | `[ ]` | equivalent Claude/Codex trace → identical report test |
| W2.8 | Fail the context gate when a required file was not read or its hash changed | `[~]` | missing-read and tampered-file negative tests |
| W2.9 | Treat optional reads as diagnostic evidence, never a component/quality quota | `[~]` | report fixture with unused optional files still passing |
| W2.10 | Redact secrets and unrelated absolute paths from prompts, traces, and dumps | `[ ]` | redaction fixture and dump inspection |
| W3.1 | Design Director receives only a short contract plus its exact required paths | `[~]` | prompt fixture contains paths but no inlined research/skill/library bodies |
| W3.2 | Validate the director output and write the shared plan to `design/design-plan.json` | `[~]` | parse/repair/persist tests and manifest update |
| W3.3 | Every screen call requires the same persisted design plan | `[~]` | multi-screen call manifests share the same plan hash |
| W3.4 | Every screen call names its own brief, flow, style, visual, skill, and library files one by one | `[~]` | two-screen prompt/call-manifest fixtures |
| W3.5 | Large skill references, component source, and extra examples stay `onDemand` | `[~]` | prompt fixture and access report prove they are not forced |
| W3.6 | Screen output is a minimal exact-ID envelope with non-empty TSX | `[~]` | response schema tests; no repeated artifact metadata required from provider |
| W3.7 | Claude and Codex receive the same semantic call manifest and output contract | `[~]` | provider-neutral fixture before process-argument adaptation |
| W3.8 | Scoped regeneration reuses the persisted design plan unless selected design inputs changed | `[~]` | unchanged/changed input-hash tests |
| W4.1 | Persist a validated design plan immediately after the director gate | `[~]` | interruption test after director completion |
| W4.2 | Checkpoint each screen immediately after all gates pass | `[~]` | mixed completion-order workflow test |
| W4.3 | One failed screen never erases or regenerates successful siblings | `[~]` | mixed pass/fail provider fixture and artifact assertion |
| W4.4 | Cancellation preserves validated checkpoints and reports unfinished screens | `[~]` | cancellation workflow scenario |
| W4.5 | Retry targets only missing/failed screens and reuses valid context hashes | `[~]` | retry request and artifact-merge test |
| W4.6 | Workspace retention is zero; debug retention is separate, sanitized, and bounded | `[~]` | production/dev retention configuration and prune test |
| W4.7 | Preserve the current 24-hour pending-upload prune for new R2 objects that never become referenced | `[x]` | `crons.ts` hourly job; `r2/handlers.ts` reference check and `STALE_PENDING_UPLOAD_MS` |
| W4.8 | Put old artifact/screen/project R2 keys into a durable deletion tombstone/queue | `[~]` | replacement, clear-screen, and project-cleanup mutation tests |
| W4.9 | Keep a deletion key retryable after transient R2 failure; remove tombstone only after deleted/confirmed absent | `[~]` | transient failure, retry success, and already-absent tests |
| W4.10 | Never remove a durable R2 deletion record merely because best-effort `deleteObject` threw | `[~]` | negative test covering current `deleteOldR2Asset` gap |
| W4.11 | Reconcile artifact references and deletion tombstones without deleting a live referenced key | `[~]` | shared-key/reference protection fixtures |
| W5.1 | Gate required context reads before accepting provider output | `[~]` | missing-read output rejected even when TSX compiles |
| W5.2 | Reject malformed, wrong-ID, empty-TSX, and outline-only responses | `[~]` | response-integrity negative fixtures |
| W5.3 | Validate library/Lucide imports before expensive rendering | `[~]` | invalid export and icon tests |
| W5.4 | Require TypeScript/esbuild, static render, live bundle, and visible resting state | `[~]` | success plus each failure-boundary fixture |
| W5.5 | Verify shared plan tokens, relevant recipe intent, real content, and purposeful motion | `[~]` | positive and competing-system/decorative-only negative fixtures |
| W5.6 | Detect unjustified repeated layouts/signature effects across unrelated screens | `[~]` | 231-test Rust suite verifies duplicate/generic layout rejection; rendered-effect comparison remains for W6 |
| W5.7 | Repair only failed screens with structured diagnostics and the original manifests/plan | `[~]` | mixed batch proves successful siblings untouched |
| W5.8 | Limit repair to one pass and re-run every applicable gate | `[~]` | repair success and still-invalid bounded-retry tests |
| W5.9 | Never save a still-invalid Hi-Fi screen as successful fallback HTML | `[~]` | save-path test and artifact assertion |
| W6.1 | Run the fixed four-screen baseline with Claude | `[ ]` | run ID, dump, access reports, timing/token metrics, renderer summary |
| W6.2 | Run the identical fixed four-screen baseline with Codex | `[ ]` | run ID, dump, access reports, timing/token metrics, renderer summary |
| W6.3 | Achieve 100% required-read coverage for both providers | `[ ]` | normalized context-access reports |
| W6.4 | Achieve complete requested-screen coverage, non-empty TSX, zero invalid imports/render failures/fallbacks | `[ ]` | both final gate reports |
| W6.5 | Compare inline versus workspace prompt chars, read bytes, tokens, and durations honestly | `[ ]` | recorded baseline/delta table; no speed claim without data |
| W6.6 | Review system coherence, hierarchy, content fit, distinctiveness, component fit, interaction purpose, and variety | `[ ]` | scored full-size visual review for both providers |
| W6.7 | Inspect live previews and static Figma resting frames | `[ ]` | in-app and export scenario evidence |
| W6.8 | Reduce required files if all-file reads erase the expected speed/context benefit | `[ ]` | conditional follow-up backed by W6 measurements |

## Progress table

| # | Item | Status | Notes / left off |
|---|------|--------|------------------|
| D1 | Direction doc: real React + Motion + Tailwind + registry libraries | `[x]` | `docs/WIREFRAMES_REAL_REACT_LIBRARIES.md` |
| D2 | Delete old quality plan | `[x]` | `WIREFRAMES_QUALITY_PLAN.md` gone |
| D3 | Delete old session audit (7–9 Aug) | `[x]` | This file replaces it |
| D4 | Link from PROJECT_STATUS / docs/README | `[x]` | P0 wireframes row points here + direction doc |
| D5 | Component inventory (data) | `[x]` | + **React Bits 165** (`REACTBITS_COMPONENTS`) |
| D6 | Firecrawl + registry research | `[x]` | React Bits: site Firecrawl fails; **GitHub `public/r/registry.json` works** |
| D7 | React Bits unblocked | `[x]` | Not blocked anymore |
| — | **Werner agrees on docs → start code** | `[x]` | Approved |
| R1 | Live React preview path | `[x]` | IPC `fetchR2TextRaw` → srcDoc; process stub |
| R2 | Allow `motion/react` on live path | `[x]` | Allowed; **model still rarely uses it** → Q1 |
| R3 | Registry vendor pipeline | `[~]` | Script exists |
| R3a | Vendor static-safe set | `[~]` | Kokonut/Magic/React Bits static-safe |
| R5 | Static capture for Figma only | `[x]` | Two consumers from one TSX |
| D8 | Debug dump per run | `[x]` | `/tmp/stage-wireframes/<run_id>/` · ON in Electron dev |
| W0 | Baseline + exact user selection | `[~]` | Hidden skill selection removed; fixed inline baseline still not measured |
| W1 | Isolated run workspace + hashed manifests | `[~]` | Materialize selected context once; Stage-owned writes, provider read-only |
| W2 | Exact Claude/Codex reads + access audit | `[~]` | Structured read events; missing required read fails |
| W3 | Short manifest-driven director/screen calls | `[~]` | Exact required paths; large references on demand |
| W4 | Persist plan + checkpoint valid screens | `[~]` | Partial success survives sibling failure/cancellation |
| W5 | Context/response/render/plan gates + one repair | `[~]` | Same gates before and after targeted repair |
| W6 | Claude + Codex speed/quality acceptance | `[ ]` | Same four screens; baseline deltas plus visual rubric |
| R3b | Vendor additional Motion/live set | `[ ]` | Only after Q0–Q6 proves a real recipe need |

---

## Session log

### 2026-08-11 — cancellation contract repaired and static verification passed

- Added `cancelled` to the canonical Convex schema, validators, API model, domain types, and web presentation instead of storing cancellation as failure.
- Fixed Rust compilation blockers in skill sanitization, moodboard filtering, and visual-attachment materialization.
- Added regression coverage for operational skill-instruction stripping, moodboard direction filtering/deduplication, and generic/repeated layout rejection.
- Observed: Convex functions ready; monorepo TypeScript typecheck and production build pass; stage-engine 231/231 tests pass; renderer 13/13 tests pass; Rust formatting passes; packaged renderer preparation succeeds.
- Live Claude/Codex and Electron visual acceptance remains W6.

### 2026-08-11 — workspace ghost-data and durable cleanup contract tightened

- Defined the exact local lifecycle: unique `.building` directory, atomic `.ready` seal, bounded-call lease refresh, provider-level read-only execution, child join, `.deleting` tombstone, recursive delete, and Stage-marker-only expiry recovery.
- Provider workspace retention is now explicitly zero. Development debug evidence is separate, sanitized, TTL-pruned, and absent in production.
- Confirmed the workspace never belongs in Convex/R2. Scoped regeneration creates a fresh workspace from explicitly selected persisted inputs.
- Audited current durable cleanup: previous wireframe artifacts, cleared screens, and project deletion collect R2 keys; abandoned unattached uploads are pruned hourly after 24 hours.
- Recorded the honest R2 gap: `deleteOldR2Asset` swallows deletion errors and drops tracking, so transient failures can leave an untracked object. Added required durable deletion tombstone/queue audit rows before calling durable cleanup ghost-free.

### 2026-08-11 — run-local provider workspace architecture approved

- Replaced the active Q0–Q6 execution shape with W0–W6. The prior diagnosis remains valid, but large inline context and aggressively reduced screen prompts did not produce the expected visual improvement.
- New contract: Stage materializes the exact selected project/design/skill/library/screen context once under a run-isolated read-only workspace.
- Every call receives a generated manifest that lists required files one by one. Large sources and examples are visible in the manifest but read on demand; forcing every screen to read everything would erase the speed and token benefit.
- Added a runtime context-access audit based on normalized structured Claude/Codex read events. Self-reported receipts are insufficient evidence.
- Added explicit speed caveats and a matched baseline: local staging is cheap, but provider reads still consume tokens and tool calls. W6 must measure the result before claiming it is faster.
- Added checkpointing as a first-class requirement so one failed screen cannot erase successful siblings.

### 2026-08-11 — non-generic quality architecture approved

- Added a line-item English execution audit table for every Q0–Q6 implementation and verification obligation. A row becomes done only with named observed evidence.
- Werner rejected automatic Design Taste because it conflicts with selected skills. Q0 is a clean deletion: no hidden replacement and empty means no selected skill.
- Replaced “force showcase + Motion” with Q0–Q6: compact explicit skills, one validated Design Director plan, semantic component recipes, small per-screen prompts, deterministic gates, one bounded repair, and the same Claude/Codex visual acceptance run.
- Kept the plan in this living audit and the existing direction doc; no parallel plan file was created.

### 2026-08-11 — selected skills + libraries reread (quality plan corrected)

- Read the actual UI UX Pro Max and Emil adapters + upstream sources, plus the exported Kokonut, Magic UI, and Bklit implementations used by run `1f3717f2-…`.
- Rejected the blunt “2–3 showcase components per screen” metric. Correct model: one shared design system, page-specific override, semantically fitting recipes, purposeful motion, and a deterministic post-generation quality gate.
- Found stale adapters (HTML/no React), provider/tool-operating text in injected sources, and a later `REACT_TSX_RULES` contradiction that says static/no JS after the live-Motion rule.
- Confirmed the same prompt builder serves Claude and Codex; the replacement contract is provider-neutral.
- Corrected dump attribution: only two of the four scoped screens produced usable new TSX; merged existing screens are not current-run generation evidence.

### 2026-08-11 — dump diagnosis → quality backlog (this doc)

- Analyzed `/tmp/stage-wireframes/1f3717f2-3831-483a-b46b-873002343493/`.
- **Selected packs ≠ used comps:** Card/Button spam; Magic/Bklit sparse; **zero motion**.
- Failures: bad JSON (dashboard), no tsx (signup), Lucide `Figma` (artifact-connect).
- Added § **Quality diagnosis** + Q1–Q4. Next code: **Q1 prompt pressure**.

### 2026-08-11 — wireframes debug dump (inspect every run)

- **Why:** Werner needs to see exact prompt / model TSX / static+live HTML / R2 keys — console only had counts.
- **What:** `apps/stage-engine/src/wireframes/debug_dump.rs`. Each run writes `/tmp/stage-wireframes/<run_id>/`:
  - `00-meta.json` — packs, skills, screen ids
  - `01-prompt-<screen>.md` — exact prompt to Claude
  - `02-provider-raw-<screen>.txt` — raw model output
  - `03-tsx-<screen>.tsx` — model TSX + log of every `import` line
  - `04-static-*.html` / `05-live-*.html` — both render consumers
  - `06-render-summary.json` — sizes, `liveHasProcessStub`, renderMode
  - `07-artifact-after-offload.json` — `htmlUrl` / `liveUrl` keys
  - `README.md` — how to read the folder
- **On by default** in debug cargo builds and in Electron dev (sidecar sets `STAGE_WIREFRAMES_DEBUG_DUMP=1` when unset). Disable with `STAGE_WIREFRAMES_DEBUG_DUMP=0`. Optional: `STAGE_WIREFRAMES_DEBUG_DIR=/other/path`.
- **Logs:** look for `wireframes debug dump ON`, `wireframes debug model TSX summary`, `wireframes debug render output summary`, `wireframes debug dump complete — open this folder…`.
- **How to use:** regenerate → copy the `path=` from the engine log → open that folder → start with `03-tsx` + `06-render-summary` + `07-artifact-after-offload`.

### 2026-08-11 — bugfix: blank live preview (`process` + R2 fetch)

- **Bug:** full-size dialog opened but body stayed blank white. Two independent breaks:
  1. **Live bundle crashed on `process is not defined`.** esbuild only defined `process.env.NODE_ENV`; vendored code (Kokonut `v0-button`) reads `process.env.VERCEL_PROJECT_PRODUCTION_URL` → ReferenceError → React never mounts → white `#root`. Fix: `banner` declares `var process = { env: { NODE_ENV: "production" } }` before the IIFE + `define: { "process.env": "process.env" }` keeps the identifier alive. Verified against a real esbuild build + run.
  2. **Live iframe loaded R2 directly (`src={liveUrl}`).** Static thumbnails were already fixed to fetch via the main process (`fetchR2Text` → `srcDoc`) because the sandboxed iframe can't fetch the bucket (no CORS / opaque origin) and Cloudflare rewrites HTML responses with an email-decode script. The live path still pointed the iframe straight at R2 → failed/cancelled navigation + "Unsafe attempt to load URL". Fix: dialog now fetches via new `storageFetchR2TextRaw` IPC → `srcDoc` + `sandbox="allow-scripts"`. **Raw variant needed** because `fetchR2Text` strips every `<script>` tag (right for static) — the live bundle *is* a script, so stripping deletes the entire app.
- **Files:** `packages/wireframe-renderer/src/cli.ts` (esbuild banner/define), `apps/user-application/electron/ipc.ts` (`storageFetchR2TextRaw`), `electron/preload.ts`, `shared/ipc/channels.ts`, `src/types/stage-desktop.d.ts`, `src/components/project/tabs/wireframes/WireframeHtmlPreview.tsx` (fetch-then-srcDoc, loading state, fallback to static on error).
- **Verified:** renderer `tsc` clean · smoke 4/4 · UI `tsc` clean. **NOT run by me:** full in-app Electron E2E — confirm by opening a screen full-size.

### 2026-08-11 — coding session (acquisition mechanism + vendor pipeline)

- **Decisions locked (Werner):** R1 = sandboxed live-Motion preview (own origin, no IPC/Convex tokens); build-time vendor script approved; Werner will source reactbits.
- **Acquisition mechanism proven — the recurring open question, now answered:**
  - Discovery = **one index file per registry** (`kokonutui.com/r/registry.json`, `magicui.design/registry.json`). Parsed live: **Kokonut 40** components (9 static-safe, 31 motion), **Magic UI 246** items (~209 no-motion-dep, 31 motion). The index carries `dependencies` → **auto** static-safe vs motion classification; Magic UI even ships `css`/keyframes inline.
  - Source = per component `GET /r/<name>.json` (real code, not docs/markdown, not `npx`).
  - Storage = **build-time snapshot committed to the repo**; renderer stays offline (no runtime cron). Optional manual refresh script.
  - Coverage: Kokonut / Magic UI / cult-ui (429 throttle) / Origin fully fetchable; **Aceternity** paid subset is 401-gated; **reactbits** = Firecrawl blocked but **GitHub registry fully fetchable** (see later log).
  - Final gate is always a **fixture render** (caught e.g. `switch-button` importing `next-themes` despite a clean deps list).
- **Built + ran** `scripts/vendor-registry.mjs`: `GET /r/<name>.json` → reject motion/external deps → adapt `next/*` → merge keyframes into `globals.css` → wire index + `libraries.json`. Reusable now (static set) and after R1 (`--allow-motion` for the motion set).
- **Vendored + fixture-verified (exit 0, no error, renderer `tsc` clean, smoke 4/4):** Kokonut `LiquidGlassCard`+`LiquidButton`; Magic UI `NeonGradientCard`, `RetroGrid`, `Meteors`, `NoiseTexture`, `PulsatingButton`. Magic UI Stage exports 17→22. `v0-button` auto-skipped (default-only export) — the deps/external filter + fixture gate keep bad vendors out.
- **Next phase:** R1 (sandboxed own-origin live-Motion iframe, no IPC/tokens) + R2 (allow `motion` on the live path) → unlocks the 31 motion comps/library; then R3b bulk-vendors them with `--allow-motion`.
- **React Bits wired as a selectable `sections` pack** (extended the vendor script with `react-bits` + PascalCase/default-export handling). Vendored + fixture-verified 7 components (all render visibly under SSR): `StarBorder`, `ElectricBorder`, `GlareHover`, `GlassIcons`, `GlassSurface`, `Folder`, `GradualBlur`. Registered across all surfaces: `cli.ts` LIBRARY_SLOTS, `render.rs` LIBRARY_SLOTS, `prompt.rs` COMPONENT_PACKS (+ minimal `component-packs/react-bits/pack.{css,md}`), `libraries.json`, `src/libraries/react-bits/index.ts`, UI `COMPONENT_PACK_CATALOG` + `public/logos/component-packs/react-bits.svg`. Verified: renderer `tsc` clean, `cargo test wireframes` 58/58, UI `tsc` clean, smoke 4/4.
- **Static-safe breadth batch (script-driven, each fixture-gated, poisoners auto-removed):** Magic UI **17→33** (+Android, ProgressiveBlur, HexagonPattern, StripedPattern, InteractiveGridPattern, AnimatedCircularProgressBar, RippleButton, InteractiveHoverButton, PixelImage, Backlight, MorphingText, NeonGradientCard, RetroGrid, Meteors, NoiseTexture, PulsatingButton); Kokonut **21→25** (+LiquidGlassCard, LiquidButton, CarouselCards, V0Button); React Bits **7**. Rejected by the gate: `file-tree` (@radix-ui/react-accordion), `terminal` (motion/react), `profile-dropdown` (missing @/components/ui/*). Script hardened to strip next/image-only props (`fill`). Verified: renderer `tsc` clean, smoke 4/4, `cargo test wireframes` 58/58, UI `tsc` clean, combined fixture exit 0.
- **R1 + R2 SHIPPED (live Motion).** Renderer: `motion`+`esbuild` deps; new `buildLiveDocument` bundles each screen (React + ReactDOM/client + motion + vendored components, tsconfig-path resolved) into a self-contained HTML doc, emitted as `liveHtml`. Engine: `render.rs` captures it, `offload_rendered_screens` uploads it to R2 (`text/html`) → `liveUrl` (dropped on failure; too big to inline). Contract `liveHtml`/`liveUrl`; Convex resolves `liveUrl`. App: preview dialog runs `liveUrl` in `sandbox="allow-scripts"` (opaque origin — no app/Convex/IPC access); thumbnail + Figma stay static. Prompt allows `motion/react`. **Verified: renderer `tsc`; `cargo build` + `cargo test wireframes` 58/58; data-ops build + convex `tsc`; UI `tsc`; and a real headless-browser load proved motion runs (React mounted, opacity 0→1).** Note: live bundle ~586 KB/screen — a shared runtime is a later optimization. Next: R3b (bulk-vendor the motion set with `--allow-motion`), R4 (motion skills).
- **cult-ui / coss-ui:** placeholder icons saved (`cult-ui.svg`, `coss-ui.svg`), but NOT registered as packs — cult-ui source not yet fetched (registry 429) and is mostly motion (R1); coss-ui is Base UI (not Tailwind) so it does not fit the renderer without a second styling stack. Honest blocker, not skipped silently.

### 2026-08-11 (later)

- React Bits: Firecrawl of `reactbits.dev` still fails; **GitHub works**.
- Indexed `https://raw.githubusercontent.com/DavidHDev/react-bits/main/public/r/registry.json` → 660 items / **165 unique** (prefer `*-TS-TW`).
- Stored as `REACTBITS_REGISTRY` + `REACTBITS_COMPONENTS` in inventory. Declared-deps split ≈41 static-safe / ≈124 need gsap|motion|three|ogl.
- License note: MIT + Commons Clause — review before ship.
- Werner approved sandboxed live-Motion + vendor pipeline → R1 + R3 next.

### 2026-08-11

- Agreed direction: real libraries + live React/Motion, not CSS-only hacks / static-everywhere.
- Wrote `WIREFRAMES_REAL_REACT_LIBRARIES.md` (`!!!`).
- Deleted `WIREFRAMES_QUALITY_PLAN.md`.
- Built inventory in `wireframesQualityInventory.ts` (measured: most Kokonut showcase components need `motion`).
- **Mistake corrected:** inventory ≠ progress audit. This file is the progress audit.
- Deleted outdated `WIREFRAMES_SESSION_AUDIT_2026-08-09.md`.
- **Paused** for Werner OK before coding.

---

## Current execution start

Begin with **W0** and continue through W6 in the audit-table order above. R1/R2 are already done; do not reopen the live/static architecture.

The first implementation slice is baseline measurement plus `provider_workspace.rs`: isolated workspace lifecycle, typed hashed manifests, and exact selected-input materialization. Do not change prompts to reference files until W1 has deterministic manifest and security tests.

Do not invent parallel plan `.md` files; update this table and the direction doc after every verified row.
