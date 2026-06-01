# Stage Engine — module layout and helper conventions

Research V1 established the pattern other workflows (Strategy, Moodboard, Flows) should follow.

## Layer roles

| Layer | Path | Responsibility |
|-------|------|----------------|
| Orchestration | `research/workflow.rs` | Load input → external context → provider → post-process → save. No inline JSON shaping. |
| Domain assembly | `research/refero_assets.rs`, `research/section.rs` | Artifact shaping, image wiring, section merge — private helpers + a few `pub fn` entry points. |
| Context queries | `research/context.rs` | Build Refero search requests from project input. |
| Prompts | `research/prompt.rs` | Provider prompt strings only. |
| Service glue | `research/service.rs` | Thin bundle builder; calls Refero + prompt. |
| Refero MCP | `refero/*` | MCP client, parse, normalize — no Research-specific UI row logic. |
| Persistence | `convex_store/*` | Convex fetch/save/enrich — no Refero or prompt logic. |
| Shared runtime | `runs/`, `providers/` | Run lifecycle, Claude/Codex, SSE events. |
| Cross-cutting | `helpers/time.rs` | Tiny shared utilities only — not a dump for domain logic. |

Reference implementation for helpers: [`src/research/refero_assets.rs`](src/research/refero_assets.rs) (`collect_recognized_patterns`, `build_ui_pattern_example`, etc.).

## When to extract a private `fn`

Extract when **any** of these is true:

- The block is reused twice in the same file.
- The block has a clear name (e.g. “collect recognized patterns”, “resolve image URLs”).
- The block is worth unit testing (dedupe, caps, JSON normalization).
- The block is longer than ~15 lines and hides the main flow.

Do **not** extract one-liners or wrappers that only rename a call.

## Visibility

- `pub fn` — entry points other modules call (`persist_refero_context_images`, `apply_engine_ui_patterns`).
- `fn` — everything else in the module.
- `pub(crate)` — only when two sibling modules in the same workflow share logic (rare).

## Async

- Use `async fn` helpers when the body `.await`s (e.g. `upload_reference_image`).
- Do not wrap synchronous logic in async.

## Errors

- Keep workflow-local error enums in the orchestration file (`workflow.rs`).
- Map to user-facing messages in one place (`user_message`).

## Tests

- Pure helpers → `#[cfg(test)]` in the same file (`refero_assets.rs`, `context.rs`, `refero/parse.rs`).
- Full orchestration → E2E Research run; see [`../user-application/docs/AI/RESEARCH_TESTING.md`](../user-application/docs/AI/RESEARCH_TESTING.md).

## Next workflow module shape (Strategy, Moodboard, …)

Copy the **layout**, not Research-specific code:

```txt
strategy/
  workflow.rs       # thin run loop
  context.rs        # load prior artifacts + build queries
  prompt.rs         # provider instructions
  post_process.rs   # validate/merge artifact (workflow-specific)
```

Shared platform stays in `refero/`, `runs/`, `providers/`, `convex_store/`.
