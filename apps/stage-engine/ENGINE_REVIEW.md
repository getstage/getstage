# Stage Engine — known debt

Living note. Process loop, cancel, and tests are solid. Remaining issues are
mostly **blocking I/O in async**, **copy-paste**, and **JSON soup** — not
broken ownership. Highest leverage: `tokio::fs` in the workspace helper, stop
panicking on Convex JSON, one `WorkflowError`, a typed wireframe artifact.

---

## Fix

### 1. Blocking disk I/O on the Tokio worker

`configure_provider_workspace_call` reads required context with
`std::fs::read_to_string` on the async wireframes path. Same pattern:
`std::fs::create_dir_all` in `provider_cli_working_directory`. Large files can
stall other runs on that worker. Use `tokio::fs`.

`src/wireframes/helper/workspace.rs` (~line 66):

```rust
let content = std::fs::read_to_string(path).map_err(|error| {
    WorkflowError::Internal(format!(
        "could not load required provider context {path}: {error}"
    ))
```

### 2. Chat Convex client: one global lock per query

`ChatRepository` holds `tokio::sync::Mutex` across the whole `query(...)`.
One slow Convex call blocks every other chat context fetch. Other repos do
not cache; they open a **new `ConvexClient` per RPC** (wireframes, research,
strategy, …). Chat is over-serialized; the rest handshake too often.

### 3. Panics on production paths

- `src/app.rs`: `AppState::new(...).expect(...)` — Refero/config failure
  aborts the sidecar instead of returning `Result` to `main`.
- `src/research/refero_assets.rs`: `.expect("source reference must be object")`
  — bad Convex JSON kills the task.
- `src/providers/process/stderr.rs`: `.expect("pending stderr json buffer")` —
  invariant, still a panic in the provider loop.

### 4. Artifacts are `serde_json::Value`

Wireframes especially: `prompt.rs` is ~1500 lines of string/JSON;
normalize/merge walk untyped maps. A missed key becomes a silent empty UI,
not a compile error. `WireframesInput` exists, then `#[allow(dead_code)]` on
the model file hides unused fields from clippy.

### 5. `WorkflowError` copied six times

wireframes, research, strategy, moodboard, flows, styleguide — same enum,
same `unreachable!("handled above")`. One shared type would stop drift
(research has a timeout; wireframes does not wrap provider collect the same
way).

---

## Smells, not bugs

| What | Where | Why it matters |
|---|---|---|
| Stale `#![allow(dead_code)]` + “upcoming `/v1/runs`” | `src/models/runs.rs` | The API exists. The allow hides unused variants (`Voice`, `Generation`, …). |
| `clippy::too_many_arguments` | prompt, process loop, design_director | God functions; hard to test without the whole workflow. |
| Fat clones into `spawn` | `src/runs/mod.rs` | `StartRunRequest` includes the full prompt. Fine at current size. |
| `std::sync::Mutex` on event history | `RunEventSink` | OK — not held across `.await`. Poison is only logged. |

`unwrap` in `src/testing/` is fine. `LIBRARY_SLOTS.split_first().expect` is a
static invariant. No `unsafe`.
