# Wireframes Agentic RAG Plan — AUG26

> **Date:** 2026-08-26
> **Status:** Research verified; approved architecture; implementation not yet started
> **Embedding model:** `Qwen/Qwen3-Embedding-8B` via Nebius Token Factory
> **Embedding size:** 4,096 dimensions

## Simple version

The component ingest is complete. R2 contains the exact component bundles and Convex contains their small catalog records.

The next system will work like this:

1. Verify that a catalog record points to usable React source in R2.
2. Build one deterministic search document for each verified component.
3. Create a 4,096-dimensional embedding with Qwen3-Embedding-8B.
4. Store the embedding in a dedicated Convex vector table.
5. Use `rrag` as the Rust RAG foundation behind Stage-owned adapters.
6. Give Claude Code and Codex two bounded Rust tools through a run-scoped local MCP bridge:
   - `search_components` finds a small number of relevant, verified components.
   - `load_component` loads the exact selected source bundle from R2.
7. Let the model search, inspect source, search again when needed, and then generate.
8. Record the retrieval and generation lifecycle with Rust tracing, rrag observability, and Helicone.
9. Keep the existing Rust typecheck, render, quality, repair, checkpoint, and save gates.

Claude Code and Codex remain the generation agents. Embeddings do not replace them. Embeddings only make component retrieval semantic instead of relying on exact names.

## Decisions that are fixed

- Embeddings are included from day one, not postponed.
- Use Nebius Token Factory with `Qwen/Qwen3-Embedding-8B`.
- Use 4,096 dimensions consistently in Nebius requests and the Convex vector index.
- Convex is the searchable catalog and vector store.
- R2 remains the source of truth for complete component source bundles.
- Rust owns retrieval budgets, bundle validation, safe materialization, and generation gates.
- Claude Code and Codex CLI remain the agents that write the screen implementation.
- Search returns only `verified = true` components from allowed libraries and runtimes.
- No LoRA or fine-tuning is needed for this retrieval system.
- Use `rrag` as the Rust RAG foundation, pinned exactly to `=0.1.0-alpha.2`.
- Keep `rrag` behind Stage-owned adapters. It does not own Convex, R2, provider execution, authentication, run budgets, or persistence.
- Start with `default-features = false`; enable only a feature after its concrete Stage use and dependency cost are verified.
- Do not enable `rsllm-client`. Claude Code and Codex CLI remain the generation agents.
- Do not implement R2 as the generic rrag `Storage` trait for generation. That trait includes write, delete, clear, and list operations; generation needs a narrower read-only bundle loader.
- Helicone is included from day one for retrieval/tool/run telemetry. Rust `tracing` remains the detailed local source. Full model prompt/token visibility is only claimed when a provider CLI request can actually be routed through Helicone.

## Current state

### Already complete

- The supported component libraries have been ingested.
- Full registry JSON/source bundles are stored under library-specific R2 keys.
- Minimal component pointers are stored in `wireframeCatalogComponents` in Convex.
- The existing Rust wireframe workflow already has provider workspaces, typechecking, rendering, quality checks, bounded repair, checkpoints, and persistence.

### Missing

- A real verification pass that controls the `verified` field.
- Deterministic search documents.
- Qwen embeddings and a Convex vector index.
- Typed Rust retrieval contracts.
- Bounded `search_components` and `load_component` tools.
- Retrieval integration in the Claude Code and Codex generation loop.
- Retrieval-quality evaluation before making it the default path.

## RRAG research record — Firecrawl + Cargo, 2026-08-26

This decision was verified against the published crate, its generated Rust API documentation, its Cargo metadata, the released source, and the current source repository. It is not based only on the repository README.

### Primary sources checked

- [Published rrag API index](https://docs.rs/rrag/latest/rrag/all.html)
- [EmbeddingProvider trait](https://docs.rs/rrag/latest/rrag/embeddings/trait.EmbeddingProvider.html)
- [Retriever trait](https://docs.rs/rrag/latest/rrag/retrieval_core/trait.Retriever.html)
- [Tool trait](https://docs.rs/rrag/latest/rrag/tools/trait.Tool.html)
- [Storage trait](https://docs.rs/rrag/latest/rrag/storage/trait.Storage.html)
- [Pipeline module](https://docs.rs/rrag/latest/rrag/pipeline/index.html)
- [Evaluation module](https://docs.rs/rrag/latest/rrag/evaluation/index.html)
- [Observability module](https://docs.rs/rrag/latest/rrag/observability/index.html)
- [Published feature flags](https://docs.rs/crate/rrag/latest/features)
- [Published crate metadata](https://crates.io/crates/rrag)
- [Current source repository](https://github.com/0xteamhq/rrag)

### Verified facts

- The published version is `0.1.0-alpha.2`, MIT licensed, with Rust 1.70 as its declared minimum.
- The package and documentation describe the crate as production-ready. The released API contains real modules for embeddings, retrieval, tools, pipelines, evaluation, caching, storage, streaming, and observability.
- The crate is 68.88% documented on docs.rs. API presence is verified; complete documentation is not.
- `EmbeddingProvider` is an async `Send + Sync` customization boundary with single and batch embedding, dimension reporting, provider metadata, and health checks. This fits a custom Nebius Qwen provider.
- `Retriever` is an async `Send + Sync` customization boundary with search, indexing, removal, statistics, and health checks. A Convex adapter can implement it, while Stage denies mutation methods in the generation path.
- `Tool` supports custom async tools and fits `search_components` and `load_component`.
- The pipeline and evaluation modules expose implemented types for composable execution and retrieval metrics such as Precision@K, Recall@K, MRR, and NDCG.
- The observability module exposes metrics, health, profiling, logging, and export APIs. It does not provide a native Helicone integration; Stage must add that adapter.
- Cargo reports 19 feature flags. The default feature enables HTTP through `reqwest`; `observability` additionally enables `dashmap`. `rsllm-client` is optional and is not needed for Stage.
- A local `cargo check --lib --no-default-features` of the exact published package completed successfully on 2026-08-26.
- The released source contains 84 Rust source files and extensive test modules. Two executable `todo!` calls were found in multimodal processing, which Stage will not use in this cutover.

### Maturity and integration risks

- The crate still uses an alpha version identifier. Pinning the exact version is mandatory.
- The published package metadata points to the old `leval-ai/rrag` repository, which redirects to `0xteamhq/rrag`. This is harmless for Cargo but shows metadata staleness.
- The repository README contains a workspace roadmap that conflicts with the released monolithic crate API. The published package source and docs.rs API are the authority for what exists; neither marketing text nor that roadmap alone proves operational reliability.
- The repository has a small public maintenance footprint and the latest visible commit is from October 2025. Stage therefore needs its own adapter tests and cannot depend on rapid upstream fixes.
- Even with default features disabled, the crate has a broad set of non-optional dependencies, including security and cryptography packages. Dependency size, compile time, audit status, and desktop packaging impact must be measured before the cutover is default-on.
- Some rrag traits are broader than Stage's least-privilege requirements. Stage adapters must refuse unsupported mutation operations rather than exposing them to generation agents.

### Conclusion

Use rrag, but use it selectively. Stage will adopt its stable abstraction points and useful evaluation/observability components while retaining ownership of data, security, provider processes, budgets, and persistence. The first compatibility slice must compile the exact dependency, exercise one fake-backed embedding/retrieval/tool round trip, and measure the dependency footprint before wider integration.

## How rrag maps to Stage

| rrag boundary | Stage implementation | Ownership rule |
|---|---|---|
| `EmbeddingProvider` | `NebiusQwenEmbeddingProvider` | Stage owns credentials, timeouts, retry policy, dimension validation, and Helicone spans. |
| `Retriever` | `ConvexCatalogRetriever` | Convex remains the vector index. Generation receives search only; mutation methods are denied. |
| `Tool` | `SearchComponentsTool`, `LoadComponentTool` | Rust enforces schemas, scopes, budgets, source size, and path safety. |
| `Pipeline` | Indexing and retrieval orchestration where it reduces Stage code | Existing Stage workflow gates remain authoritative. |
| `Evaluation` | Fixed component-selection benchmark | Stage supplies the dataset and acceptance thresholds. |
| `Observability` | Internal metrics and tracing | Helicone is the external run/session view; no source or secrets are logged. |
| `Storage` | Not used for R2 generation access | Stage keeps a narrower read-only `R2BundleLoader`. |
| `rsllm` agent | Not used | Claude Code and Codex CLI remain the generation agents. |

## Target architecture

### Indexing path

```text
Convex catalog pointer
  -> load exact R2 bundle
  -> validate source and paths
  -> typecheck/render in the existing controlled workspace
  -> mark component verified
  -> build deterministic search document
  -> Nebius Qwen3-Embedding-8B
  -> Convex embedding row + vector index
```

### Generation path

```text
User intent + selected libraries + viewport
  -> Claude Code or Codex CLI
  -> run-scoped local MCP bridge
  -> rrag SearchComponentsTool
  -> authenticated Convex vector search with hard filters
  -> small candidate list
  -> rrag LoadComponentTool
  -> exact R2 source bundle
  -> sealed provider workspace
  -> generation
  -> typecheck + render + quality gate
  -> repair once when allowed
  -> checkpoint and save
```

The model may call search more than once. Rust controls the maximum number of searches, candidates, loaded bundles, bytes, and elapsed time.

## Search data

The embedding input is deterministic. It contains only useful retrieval signals:

- component name and normalized name tokens;
- library and component kind;
- runtime and relevant tags;
- exports;
- npm and file dependencies;
- source file paths;
- bounded source text needed to understand the component;
- a stable embedding-document version.

Raw ingest metadata that does not help retrieval is not copied into Convex. Complete source stays in R2.

Query embeddings use a retrieval instruction suited to React UI component selection. Document embeddings use the stable component search document. Both use the same model, dimensions, and normalization contract.

## Minimal Convex changes

Keep `wireframeCatalogComponents` small. Add a separate embedding table instead of adding many columns to the existing table.

The embedding row contains only:

- `componentId`;
- `sourceRevision`;
- `scope` for exact filtering;
- `embedding`;
- `embeddingVersion`;
- `updatedAt`.

Indexes:

- normal index by `componentId`;
- 4,096-dimensional vector index on `embedding`;
- `scope` as the vector filter field.

The public search action must:

1. require an authenticated Stage identity;
2. validate query length, filters, and result limit;
3. embed the query with the server-side Nebius key;
4. run Convex vector search with exact scope filters;
5. join results to current catalog rows;
6. discard unverified or stale-revision results;
7. return a small typed candidate list without source code.

`NEBIUS_API_KEY` is a server-side Convex secret. It must never be sent to the renderer, logged, or written into a source bundle.

## Rust retrieval boundary

The first Rust implementation adds typed contracts before prompt integration:

- `CatalogSearchRequest`;
- `CatalogCandidate`;
- `CatalogRetriever`;
- validated library/runtime scopes;
- typed repository and remote-service errors;
- fake-backed tests for filtering, limits, malformed responses, and failure propagation.

The Rust module remains inside the existing binary crate:

```text
apps/stage-engine/src/rag/
  mod.rs
  error.rs
  models.rs
  embedding.rs
  retriever.rs
  bundle_loader.rs
  tools.rs
  pipeline.rs
  observability.rs
  mcp.rs
```

`stage-engine` is a binary crate, so `src/main.rs` is its crate root. A new `lib.rs` is not required for rrag. Add one only if Stage later has a concrete need to publish or independently reuse engine modules.

The final tools will enforce these initial budgets:

- at most 3 searches per screen;
- at most 12 candidates per search;
- at most 5 unique bundles loaded per screen;
- bounded source bytes and network timeouts;
- no path traversal or files outside the sealed run workspace.

These are operational constants, not model suggestions.

## Provider tool bridge

Stage does not currently expose catalog tools to either generation CLI:

- Claude wireframe runs deliberately use `--strict-mcp-config` with an empty `mcpServers` object.
- Codex wireframe runs do not receive a catalog MCP server configuration.

The cutover therefore adds a localhost-only, run-scoped MCP server owned by `stage-engine`. It exposes only `search_components` and `load_component`, uses an unguessable per-run token, inherits the run cancellation signal, and shuts down with the run. Provider adapters receive an ephemeral MCP configuration pointing to that server. No global CLI configuration is modified.

## Observability workflow

One Stage run ID becomes the shared correlation ID across:

- rrag pipeline and tool spans;
- Nebius embedding requests;
- Convex vector searches;
- R2 bundle loads;
- Claude/Codex process lifecycle;
- typecheck, render, quality, repair, checkpoint, and persistence gates.

Rust `tracing` records detailed local structured events. A fail-open Helicone exporter sends bounded metadata asynchronously: operation, duration, status, model, dimensions, candidate counts, selected component IDs, source byte counts, and error category. It must not send R2 source, API keys, auth tokens, local paths, or complete prompts. Helicone failure never blocks generation.

## Static component-pack retirement

The local `apps/stage-engine/component-packs/**/pack.css` and `pack.md` files are still compiled into the current legacy generation path. They are removed only in the same cutover that removes their Rust consumers:

1. Make RAG source retrieval pass one end-to-end Claude run and one Codex run.
2. Remove `ComponentPack`, `COMPONENT_PACKS`, and the `include_str!` references.
3. Remove static `pack.md` prompt injection.
4. Remove `pack.css` injection from normalization.
5. Update the affected prompt, normalization, workflow, and renderer tests.
6. Delete the component-pack files.
7. Keep the UI library choices and logos; their meaning changes from static CSS packs to allowed RAG library scopes.

Deleting the folder before these code changes would break compilation. Keeping both systems after the cutover would send conflicting component instructions to the model.

## Implementation order

### 1. Contracts and safe foundation

- Correct this dated plan and update the living status.
- Pin `rrag = "=0.1.0-alpha.2"` with default features disabled initially.
- Measure the resolved dependency tree, compile time, binary size, and package impact.
- Add typed Rust catalog search contracts and fake-backed tests.
- Implement one fake-backed rrag embedding, retrieval, and tool round trip before external services.
- Add the minimal Convex embedding table and authenticated search contract.
- Add the Nebius embedding client with strict response validation and bounded retry behavior.

### 2. Verification and indexing

- Load each current R2 bundle without rewriting it.
- Validate source presence and safe paths.
- Run the existing typecheck/render path where the component contract permits it.
- Mark only successful components verified.
- Build deterministic search documents and embeddings.
- Upsert embeddings idempotently by component and source revision.
- Produce a summary with discovered, verified, embedded, skipped, and failed counts.

The live backfill is a separate execution step. Code and tests can be prepared first; the backfill will not run silently.

### 3. Agent tools

- Implement bounded Rust `search_components` and `load_component` operations.
- Add the run-scoped localhost MCP bridge and provider-specific ephemeral configuration.
- Materialize only explicitly loaded bundles into the sealed provider workspace.
- Record tool calls, durations, selected component IDs, and byte counts without logging source or secrets.

### 4. Generation cutover

- Replace static whole-library prompt context with the retrieval tools.
- Remove the static component-pack CSS/Markdown path only after both provider smoke tests pass.
- Keep the existing generation and quality gates unchanged.
- Enable the new path behind one explicit feature switch until evaluation passes.

### 5. Evaluation and default-on

Use fixed representative tasks, including dashboard, pricing, authentication, content/editorial, and mobile screens. Measure:

- retrieval relevance;
- successful bundle loads;
- typecheck and render pass rate;
- repair rate;
- latency and token use;
- visual quality against the current baseline.

The RAG path becomes the default only when it is at least as reliable as the current path and materially improves component selection.

## Worktree protection

The repository already contains substantial uncommitted work. Implementation must:

- preserve all unrelated edits and untracked files;
- never reset, discard, or broadly rewrite the worktree;
- inspect overlapping files before editing them;
- keep schema additions separate and minimal;
- avoid running a live embedding backfill or deployment without an explicit execution step;
- report exactly which files were changed and which checks passed.

## Acceptance criteria

This plan is complete when:

- every searchable component is verified and has a current Qwen embedding;
- Convex search enforces authentication, scopes, `verified = true`, and revision freshness;
- Rust can search and load exact components through typed, budgeted operations;
- Claude Code and Codex can iteratively retrieve components during generation;
- rrag is exact-version pinned and isolated behind tested Stage adapters;
- the local MCP bridge is run-scoped, authenticated, cancellable, and leaves no global CLI configuration;
- no full catalog or irrelevant ingest metadata is placed in a model prompt;
- exact source still comes only from R2;
- static component-pack prompts and CSS are absent once the RAG cutover becomes default;
- Helicone and local tracing correlate retrieval, tools, generation, and validation without logging source or secrets;
- existing typecheck, render, quality, repair, checkpoint, and save behavior remains intact;
- tests cover success, empty results, malformed responses, unavailable source, stale revisions, timeouts, and budget exhaustion.
