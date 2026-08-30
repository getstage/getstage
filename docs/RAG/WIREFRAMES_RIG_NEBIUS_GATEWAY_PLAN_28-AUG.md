# Wireframes Rig + Nebius Gateway Plan — 28 AUG 2026

> **Reliability correction — 30 AUG 2026:** the current multi-screen gateway
> boundary and model-repair path are not the target architecture. The replacement
> below supersedes the earlier batch/repair details in this document.

## Reliable generation reset

### Observed failure

The captured failure was an upstream provider response, not a RAG, JSON-schema,
or renderer failure:

```text
503 Service Unavailable
The model `zai-org/GLM-5.3-Flash` is temporarily unavailable.
```

Stage currently turns this into a generic `provider_unavailable` error for one
multi-screen chunk. When all requested screens share that chunk, no screen lands.
The request also contains the full nested source closure for every retrieved
component, and a repair repeats much of that context with the rejected TSX. This
unnecessarily increases latency, output truncation risk, and code paths.

### Reliability definition

An external provider can still return `429`, `503`, timeout, or invalid output.
Stage cannot guarantee that every provider call succeeds. Stage **can** guarantee:

- one failed screen never removes or blocks a successful sibling;
- a failed run never overwrites the last accepted screen;
- provider, schema, TSX, renderer, and RAG failures remain distinct;
- retries are bounded and never become a second open-ended repair workflow;
- Claude, Codex, and Nebius implement the same Stage-owned screen contract;
- the UI reports `success`, `partial_success`, or `failed` from actual results.

### One pipeline, three adapters

```text
selected screens
  -> shared Stage context (style guide, strategy, selected skills)
  -> per-screen RAG selection
  -> bounded parallel screen jobs
       -> Claude adapter
       -> Codex adapter
       -> Nebius/Rig adapter
  -> per-screen validate + render + checkpoint
  -> merge successful screens only
```

Provider selection must be a real typed backend choice. Nebius must no longer be
encoded as `providerId: codex` plus a `gen:nebius` source token. No adapter may
silently fall back to another provider.

### Batches of five without batch-wide acceptance

The desktop starts one run and the selected screens are sent to the provider in
batches of at most five. Five is the normal provider-call limit because the
screens need shared design context and should form one coherent product. A
**screen remains the unit of validation, repair, checkpointing, and persistence**.

The provider returns one typed batch envelope. Stage then converts every returned
screen into an independent result instead of accepting or rejecting the envelope
as one artifact:

```rust
enum ScreenGenerationResult {
    Success { screen: GeneratedScreen },
    Failed { screen_id: String, error: ScreenGenerationError },
}
```

Rig enforces the small `GeneratedScreens` batch schema. Claude and Codex return
the same semantic batch contract through their adapters. A valid JSON envelope
does not imply that every TSX string is accepted: each screen is compiled,
rendered, and checkpointed independently.

If a provider returns `429`, `503`, timeout, or an unparseable envelope, Stage
retries that batch once. If the second batch attempt still fails, the recovery
path decomposes only that failed batch into smaller calls so unaffected batches
continue. Missing screen IDs are handled like failed screens, never like a failed
run.

### RAG boundary

Retrieval and compilation require different payloads:

1. Convex vector search returns up to 12 verified metadata candidates per screen.
2. A deterministic byte budget selects the most relevant exact component entry
   sources for the model. The count is evidence-driven, not library-hardcoded.
3. The renderer receives the full R2 dependency closure for those selected
   entries so every real `@/` import resolves.
4. Internal dependency source is not copied into the model prompt unless the
   model needs its public API to use the selected entry correctly.

Empty or unavailable R2 source excludes that candidate and records the reason;
it does not invent a component path. RAG quality and source availability are
reported separately.

### Retry, repair, and validation policy

- Retry a transient `429`, `503`, timeout, `NoData`, or malformed batch envelope
  once with bounded backoff.
- After a valid envelope, treat compile/import/render failures as failures of only
  that screen.
- Apply deterministic safe normalization before another model call.
- Allow one compact per-screen repair containing the rejected TSX, exact compiler
  error, and selected entry-source interface. Never resend the complete project or
  full nested source closure.
- A screen that renders but misses a visual-quality preference is accepted with a
  warning. Spacing, copy, or composition refinement must not erase usable output.
- Keep the previous accepted screen when a repair fails. A new unresolved screen
  remains failed without affecting siblings.

### Minimal implementation order

1. Preserve exact upstream status and error class at the gateway boundary.
2. Keep provider batches at five, then convert the response into per-screen
   validation and persistence results.
3. Make partial success a first-class engine and UI result.
4. Separate model context files from renderer dependency files.
5. Replace the large gateway/CLI repair paths with one compact per-screen repair
   path, then delete missing-screen batch machinery and superseded provider
   branching after the new tests pass.
6. Run the same fixed fixtures through Claude, Codex, and Nebius before choosing
   a default.

Required tests:

- two valid screens plus one malformed screen preserve the two valid screens;
- six selected screens are sent as batches of five and one;
- a provider `503` is classified, retried once, and never shown as a TSX error;
- a twice-failed batch decomposes without blocking successful batches;
- malformed structured output affects only its screen;
- an unresolved internal import affects only its screen;
- saved screens survive failed regeneration;
- visual-quality warnings preserve renderable output;
- identical fixtures pass the contract for Claude, Codex, and Nebius;
- prompt byte size and selected source count are recorded for every screen.

## Decision

Keep the Stage desktop workflow and retrieval pipeline local, but move the slow wireframe model call from the Codex/Claude CLI to a small hosted Rust service.

The hosted service will use:

- Axum and Tokio for HTTP;
- Rig for the typed LLM integration;
- Nebius Token Factory through its OpenAI-compatible API;
- Langfuse through OpenTelemetry for model-call observability;
- Railway as the first deployment target.

No Python service will be introduced. No second RAG database or vector store will be introduced.

## Current architecture

```text
React renderer
  -> Electron preload IPC
  -> Electron main process
  -> local stage-engine (Rust, Axum/Tokio)
       -> Convex metadata and vector search
       -> R2 exact component source bundles
       -> Codex or Claude CLI
       -> local validation, rendering, checkpoints and persistence
```

The current retrieval split remains valid:

- `wireframeCatalogComponents` is the canonical catalog metadata and R2 pointer table.
- `wireframeCatalogEmbeddings` contains the Qwen3-Embedding-8B vectors used by native Convex vector search.
- R2 contains the exact registry JSON and source files.
- The local Rust engine owns selected-library filters, retrieval evidence, validation and persistence.

The main latency and reliability problem is the CLI generation step and its large repair prompt. It is not the Convex vector lookup.

## Target architecture

```text
React renderer
  -> Electron preload IPC
  -> Electron main process
  -> local stage-engine
       1. load project and screen intent
       2. search Convex embeddings
       3. load exact source bundles from R2
       4. construct a bounded generation request
       5. call hosted Rust gateway over HTTPS
       6. validate TSX and server-owned retrieval evidence locally
       7. render locally
       8. save checkpoints and accepted output to Convex/R2

hosted wireframe AI gateway
  -> Axum/Tokio
  -> authenticated, versioned request
  -> Rig typed agent/extractor
  -> Nebius LLM
  -> Langfuse/OpenTelemetry traces
  -> typed generated-screen response
```

## Ownership boundary

### Local stage-engine owns

- project, user and screen orchestration;
- Convex RAG search and exact R2 source retrieval;
- selected-library enforcement;
- retrieval scores, component IDs and source revisions;
- prompt/context budget enforcement;
- TypeScript/TSX validation and local rendering;
- checkpoints, cancellation and persistence;
- the decision to accept, repair once, or reject an output.

### Hosted gateway owns

- calling the configured Nebius generation model;
- enforcing a typed request and response contract;
- a strict request timeout and bounded concurrency;
- redacted Langfuse traces and model metrics;
- returning model output without changing Stage-owned evidence.

The gateway is stateless. It does not query Convex or R2 and does not store catalog embeddings.

## HTTP contract

The first implementation exposes only:

- `GET /v1/health` — process is alive;
- `GET /v1/readiness` — configuration and provider client are ready;
- `POST /v1/wireframes/generate` — initial generation or one repair attempt.

The generation request contains a `run_id`, `screen_id`, attempt kind, compact screen brief, viewport, selected libraries, bounded exact component bundles, immutable retrieval evidence, and optional validation failures for the repair attempt.

The model response contains only generated content needed by Stage:

```rust
pub struct GeneratedScreen {
    pub id: String,
    pub tsx: String,
    pub dependencies: Vec<String>,
}
```

The local engine attaches and preserves `catalog_component_ids`, revisions and retrieval evidence. The model is never trusted to reproduce these fields.

## Retrieval and prompt budget

The existing hard limit of four source bundles is not the final design. The new flow will:

1. retrieve a larger metadata candidate set from Convex;
2. filter deterministically by selected libraries, verification and runtime compatibility;
3. rank by vector score plus explicit screen-role relevance;
4. load exact R2 source only for the selected candidates;
5. stop at a configured byte/token budget instead of an arbitrary fixed count;
6. record which candidates were included and excluded.

Initial limits will be conservative and configurable. The exact budget will be chosen from measured one-screen runs.

## Rig usage

Rig is used only at the hosted model boundary:

- its OpenAI-compatible client points to the Nebius base URL;
- the model name is configuration, not workflow logic;
- structured output is decoded into Rust types;
- provider errors become explicit Stage gateway errors;
- no Rig vector-store integration is used because Convex already owns retrieval.

Rig replaces the ad-hoc model CLI/HTTP orchestration, not the existing Convex/R2 RAG pipeline.

## Reliability and error handling

- No `unsafe` code.
- No production `unwrap()` or `expect()` for configuration, network, JSON or model output.
- Configuration failures prevent readiness and report a clear error.
- Requests use explicit timeouts and cancellation.
- Provider 4xx, 5xx, timeout, malformed output and local validation failure remain distinct errors.
- A repair is allowed at most once and receives only the compact brief, first result, immutable evidence and validation errors.
- Failure leaves the previous accepted screen unchanged.

## Security

- `NEBIUS_API_KEY`, `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY` exist only in the hosted Railway service.
- The desktop renderer never receives provider secrets.
- The local engine authenticates with a short-lived Stage-issued token; a renderer-controlled static API key is not accepted.
- Request bodies, component source and generated TSX are not logged by default.
- Trace attributes contain IDs, timings, model, token counts, result status and redacted error classes.
- Request size and concurrency are bounded.

## Observability

One `run_id` follows the request through local retrieval, gateway generation, local validation and persistence.

Minimum spans:

- `wireframe.retrieve_candidates`;
- `wireframe.load_sources`;
- `wireframe.gateway_request`;
- `wireframe.nebius_generation`;
- `wireframe.decode_output`;
- `wireframe.validate_local`;
- `wireframe.render_local`;
- `wireframe.persist`.

Minimum metrics:

- total one-screen latency;
- retrieval, provider and validation latency;
- prompt and completion tokens;
- candidate and source-bundle counts;
- first-pass success rate;
- repair rate and repair success rate;
- error class by model and gateway version.

Langfuse is the trace destination. LangChain and LangSmith are not part of the runtime architecture.

## Railway contract

The gateway will:

- bind to `0.0.0.0` and Railway's `PORT` environment variable;
- expose health and readiness routes;
- build as a separate Rust binary/service;
- support Railway Rust build detection or an explicit Dockerfile if reproducibility requires it;
- scale horizontally because it stores no session state.

No deployment will occur without explicit approval.

## Implementation sequence

### Phase 1 — isolated service skeleton

- create a separate deployable Rust service in an isolated worktree;
- add typed configuration and request/response contracts;
- add Axum health, readiness and generation routes;
- add graceful shutdown, timeout, request-size and concurrency limits;
- add unit tests for configuration and contracts.

### Phase 2 — Rig + Nebius vertical slice

- configure Rig's OpenAI-compatible provider for Nebius;
- generate one typed screen without the Codex CLI;
- decode and validate structured output;
- classify provider errors and retry only transient transport failures once;
- test with a mock provider before any live call.

### Phase 3 — local engine adapter

- add a wireframe gateway client to `stage-engine`;
- keep the current CLI provider as an explicit fallback during evaluation;
- preserve retrieval evidence outside the model response;
- replace the large CLI repair prompt with a bounded gateway repair request;
- keep validation, rendering and persistence local.

### Phase 4 — Langfuse observability

- add OpenTelemetry tracing in the gateway;
- propagate `run_id` and trace context from the local engine;
- redact prompts/source by default;
- verify traces, latency, token usage and error classification in Langfuse.

### Phase 5 — benchmark and cutover

Run the same one-screen fixture through the current Codex CLI, Rig + Nebius, and the CLI fallback after the adapter change. Compare latency, first-pass acceptance, repair rate, output validity and cost. Nebius becomes the default only after it passes the acceptance gates.

### Phase 6 — cleanup

After accepted parity:

- remove only wireframe-specific dead CLI prompt/repair code;
- retain CLI provider code used by chat, research, strategy and other workflows;
- remove obsolete LangSmith-only wireframe instrumentation if no runtime still uses it;
- update architecture and operating documentation.

## Acceptance gates

This checklist is the source of truth for whether the new route is actually ready. An unchecked item must not be described as complete.

### Isolated Rust gateway

- [x] Work is isolated in a separate worktree and branch.
- [x] A standalone Axum/Tokio service exists with versioned health, readiness and generation routes.
- [x] The generation boundary uses typed Rust request and response structures.
- [x] Rig is configured as an OpenAI-compatible Nebius client without adding another vector store.
- [x] Request body size, provider timeout and concurrent generation count are bounded.
- [x] Provider secrets remain server-side and bearer authentication is checked outside the renderer.
- [x] `cargo check` passes for the gateway.
- [x] Focused gateway unit tests pass (6 passed, 0 failed).
- [x] `cargo clippy -- -D warnings` passes for the gateway.
- [x] `cargo fmt --check` passes for the gateway.
- [x] Production gateway code contains no `unsafe`, `unwrap()` or `expect()`; assertions remain limited to tests.

### One-screen proof

- [ ] A gateway-only fixture completes one typed screen through Rig + Nebius.
- [ ] The response contains the exact requested screen ID and usable TSX.
- [ ] Selected-library constraints are enforced.
- [ ] Retrieved evidence remains local and survives generation and repair unchanged.
- [ ] Generated TSX passes the existing local validator and renderer.
- [ ] Provider timeout, malformed output and authorization failure are verified as distinct errors.
- [ ] A failed attempt leaves the previous accepted screen unchanged.
- [ ] No secret or raw source body appears in logs or traces.

### Integration and cutover

- [ ] The local stage-engine adapter calls the gateway behind an explicit provider choice.
- [ ] The existing CLI path remains available until measured parity is proven.
- [ ] End-to-end cancellation is verified.
- [ ] One-screen latency is materially lower than the current CLI path.
- [ ] First-pass acceptance, repair rate, output validity and cost are recorded for comparison.
- [ ] Werner has reviewed the diff before any commit, push or deployment.

Broad TypeScript workspace checks are intentionally not part of the isolated gateway gate. Only focused integration checks are added when the stage-engine adapter changes shared contracts.

## Change-control rules

- Work starts in a separate worktree.
- No commit, push, deployment, database deletion or remote mutation without explicit approval.
- Existing uncommitted work is preserved.
- The first change is a small vertical slice; broad cleanup happens only after measured parity.

## References

- [Rig RAG](https://rig.rs/docs/concepts/rag)
- [Rig observability](https://rig.rs/docs/concepts/observability)
- [Rig examples](https://github.com/0xPlaygrounds/rig/tree/main/examples)
- [Railway Axum guide](https://docs.railway.com/guides/axum)
- [Langfuse](https://langfuse.com/)
- [Nebius Token Factory quickstart](https://docs.tokenfactory.nebius.com/quickstart)
