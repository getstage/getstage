# Wireframes Agentic Retrieval Plan — AUG26

> **Date:** 2026-08-26
>
> **Updated:** 2026-08-27
>
> **Status:** Native Convex vector-search cutover implemented locally; development backfill and one authenticated Codex acceptance run remain
>
> **Embedding model:** `Qwen/Qwen3-Embedding-8B` through Nebius Token Factory
>
> **Embedding size:** 4,096 dimensions

## Simple version

Stage uses four separate responsibilities:

1. `wireframeCatalogComponents` stores small catalog metadata and the R2 pointer.
2. R2 stores the exact component source bundle.
3. `wireframeCatalogEmbeddings` stores one Qwen vector per current component revision and provides one native Convex vector index.
4. The Rust Stage Engine searches Convex, loads only the selected R2 bundles, and gives them to the local Codex CLI inside the sealed workspace.

```text
Local Rust engine
  -> authenticated Convex vector search
  -> best component IDs
  -> authenticated exact R2 source load
  -> sealed local provider workspace
  -> local Codex CLI
```

There is no LangChain runtime, no RRAG runtime, and no official Convex RAG component in this version.

## What an embedding is

An embedding is a derived list of 4,096 numbers representing the meaning of a component. It is not source code and it is not a second component bundle.

```text
componentId: kokonut-ui/action-search-bar
sourceRevision: v1
embedding: [0.013, -0.248, ... 4,094 more numbers]
```

Qwen creates this vector once when a component revision is indexed. Qwen also creates one vector for each screen search query. Convex compares the query vector with the stored component vectors and returns the closest matches.

## Storage ownership

| Storage | Contents | Does not contain |
| --- | --- | --- |
| `wireframeCatalogComponents` | Component ID, library, name, type, R2 key, revision, verification/index status | Source code or vectors |
| `wireframeCatalogEmbeddings` | Component ID, revision, library/runtime scope, 4,096-number vector | Full source bundles |
| R2 | Exact registry JSON and source files | Search vectors |
| Local sealed workspace | At most four selected exact bundles per screen | The complete catalog or secrets |

The embedding table is separate so normal catalog reads do not load 4,096 numbers for every component.

## Fixed decisions

- Use one native Convex vector index, not `@convex-dev/rag`.
- Keep Rust as the local workflow and provider orchestrator.
- Keep exact source only in R2.
- Use Qwen3-Embedding-8B with exactly 4,096 dimensions.
- Keep Nebius and optional LangSmith keys in the Convex deployment, never in the renderer or provider workspace.
- Require authenticated search and exact source loading.
- Filter search by the libraries selected in the UI and by browser runtime compatibility.
- Reject stale results when the indexed revision differs from the current R2/catalog revision.
- Keep backfill explicit. Deployment must never start an embedding backfill automatically.
- Use Codex for the current acceptance run because Claude is not available.
- Do not add LoRA or fine-tuning for component retrieval.

## Why native Convex search instead of the Convex RAG component

The official RAG component is useful for document RAG with chunks, content records, namespaces, multiple vector dimensions, and a workpool. Stage has a smaller problem: one bounded vector per component and exact source already stored in R2.

The native design therefore needs only one application table and one 4,096-dimensional index. It removes the component-owned `chunks`, `content`, `entries`, `namespaces`, multi-dimension vector tables, and workpool from the active architecture.

## Why not RRAG now

RRAG is a Rust RAG framework, but it does not remove Stage's storage problem. Its published `0.1.0-alpha.2` API provides local in-memory/file storage and retrieval abstractions; Stage would still need to build and maintain:

- a local index download/export format;
- per-device index synchronization and revision invalidation;
- Convex authentication and catalog adapters;
- R2 source adapters;
- a Qwen/Nebius embedding adapter;
- safe update and recovery behavior for every installed desktop.

That would move the shared index onto every device and duplicate infrastructure already provided by native Convex vector search. Rust still owns the important local boundary without RRAG: bounded requests, authentication forwarding, source materialization, local Codex execution, cancellation, rendering, and validation.

RRAG is appropriate only if Stage later makes fully local/offline retrieval a product requirement. It is not required for centralized semantic search.

References:

- [RRAG published API](https://docs.rs/rrag/latest/rrag/all.html)
- [Convex native vector search](https://docs.convex.dev/search/vector-search)

## Indexing flow

```text
Convex catalog row and R2 pointer
  -> signed short-lived R2 read
  -> validate JSON, paths, file count, and source size
  -> build one bounded search document
  -> Qwen embedding through Nebius
  -> insert or replace one wireframeCatalogEmbeddings row
  -> atomically mark the catalog revision ready
```

Rules:

- One component has at most one native embedding row.
- A changed source revision deletes its old vector and resets readiness.
- Index success stores the vector and readiness in one Convex mutation.
- A failed item records a bounded error and can retry at most three times.
- A batch processes 1–24 rows.
- Recursive continuation occurs only when a person explicitly runs the batch with `continue: true`.

## Runtime search flow

```text
Screen design plan
  -> Rust builds a bounded semantic query
  -> Convex calls Qwen for one query embedding
  -> native vector search filters selected library/runtime scopes
  -> current catalog revision is checked again
  -> at most four component IDs return to Rust
  -> Rust loads those exact R2 bundles through Convex
  -> bundles enter the sealed screen workspace
  -> local Codex generates TSX
  -> existing typecheck, render, quality, repair, and checkpoint gates run
```

The Rust `searchCatalog` and `loadCatalogSource` contracts did not change during the native-index cutover.

## Security and network boundary

The Stage Engine runs on the user's device. Search still needs server requests because the shared index and shared API keys are not shipped to the desktop.

```text
Desktop -> localhost Rust engine
Rust -> authenticated Convex action
Convex -> Nebius embedding API
Convex -> native vector index
Rust -> authenticated Convex source-load action
Convex -> R2
Rust -> local Codex CLI
```

Nebius receives only:

- a bounded component search document during indexing, or
- a bounded screen query during generation.

It does not receive the complete catalog, auth token, local paths, or provider workspace. Optional LangSmith tracing receives only correlation/model/latency/status/dimension/token metadata; inputs, source, embeddings, prompts, and secrets are suppressed.

Convex deployment environment:

```text
NEBIUS_API_KEY=<server-side secret>
NEBIUS_EMBEDDING_MODEL=Qwen/Qwen3-Embedding-8B
LANGSMITH_API_KEY=<optional server-side secret>
LANGSMITH_PROJECT=stage-wireframes-rag
```

## Current limits

| Boundary | Limit |
| --- | ---: |
| Query length | 2,000 characters |
| Selected libraries | 1–8 |
| Native vector matches inspected | 48 maximum |
| Candidates returned to Rust | 12 maximum |
| Bundles loaded per screen | 4 maximum |
| Files per source bundle | 128 maximum |
| Source bundle size | 1,000,000 bytes maximum |
| Search document | 24,000 characters maximum |
| Index retry attempts | 3 maximum |

## Safe activation and test order

The local `npx convex dev` watcher automatically synchronizes code and schema changes to the selected development deployment. It does not run the embedding backfill.

1. Confirm the intended development deployment has `NEBIUS_API_KEY`.
2. Index one known component:

   ```bash
   npx convex run wireframeCatalog:indexCatalogComponent \
     '{"componentId":"kokonut-ui/action-search-bar"}'
   ```

3. Confirm the result reports `indexed: true` and that exactly one `wireframeCatalogEmbeddings` row exists for the component.
4. Run one conservative batch without continuation:

   ```bash
   npx convex run wireframeCatalog:indexCatalogBatch \
     '{"limit":8,"continue":false}'
   ```

5. Inspect successes and errors. Only after the small batch is correct, explicitly start the remaining development backfill:

   ```bash
   npx convex run wireframeCatalog:indexCatalogBatch \
     '{"limit":8,"continue":true}'
   ```

6. Confirm the selected libraries have current embeddings and no unresolved verification errors.
7. Start one local Codex Hi-Fi generation and confirm:
   - a Qwen query embedding occurs;
   - native search returns selected-library components;
   - exact R2 bundles are materialized locally;
   - Codex reads the catalog candidate files;
   - typecheck, render, quality, and persistence pass.

No production backfill, commit, Git push, or production deployment is authorized by this plan.

## Changed code

### Convex

- `packages/data-ops/convex/schema.ts`
- `packages/data-ops/convex/convex.config.ts`
- `packages/data-ops/convex/wireframeCatalog.ts`
- `packages/data-ops/convex/wireframeCatalogEmbeddings.ts`
- `packages/data-ops/convex/lib/wireframeCatalog/embedding.ts`
- `packages/data-ops/convex/lib/wireframeCatalog/handlers.ts`
- `packages/data-ops/convex/lib/wireframeCatalog/source.ts`

### Rust

- `apps/stage-engine/src/convex_store/catalog_repository.rs`
- `apps/stage-engine/src/wireframes/workflow.rs`

## Verification evidence

Completed locally on 2026-08-27:

- `@convex-dev/rag` removed from the package and component configuration.
- One native `wireframeCatalogEmbeddings` table and one 4,096-dimensional vector index added.
- Source-change invalidation and revision checks retained.
- Convex TypeScript typecheck passes.
- Full data-ops TypeScript typecheck passes.
- Rust API contract remains unchanged; no extra Rust migration was added.
- Development smoke indexing `kokonut-ui/action-search-bar` succeeded with one 4,096-dimensional native vector and 2,605 embedding tokens.

Remaining:

- the controlled development backfill;
- one authenticated local Codex Hi-Fi acceptance run;
- removal of the three optional legacy `rag*` fields after development rows have been rewritten by the native indexer.
