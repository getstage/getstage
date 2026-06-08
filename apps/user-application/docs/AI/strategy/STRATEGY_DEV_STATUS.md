# Strategy Dev Status

Last updated: 2026-06-03

## Provider output pipeline (normalize first)

Codex/Claude output is **never trusted as final shape**. Stage uses two layers:

| Layer | Where | Role |
|-------|--------|------|
| **Extract** | `apps/stage-engine/src/helpers/provider_json.rs` | Find `strategyArtifact` / `researchArtifact` in stdout or stderr (full JSON lines with `artifactKind`) |
| **Normalize** | `apps/stage-engine/src/convex_store/strategy_repository.rs` | Coerce provider JSON into the Zod contract before Convex save |

**Strategy normalize examples (June 2026):**

- `table` rows: 1..N columns → always `[label, value]` (extra columns joined with ` · `)
- Missing sections: filled from `SECTION_SPECS` order
- All sections forced to `status: "action"` on full generate

**Prompt** (`strategy/prompt.rs`) guides the model but does **not** guarantee shape. If Codex returns 4-column audience tables, normalize fixes it — the run must not fail.

**Terminal noise:** Long `provider_warning` streams are often Codex printing JSON or the prompt on **stderr**. If the last event is `run_completed` / `Strategy artifact saved.`, the run succeeded. See [STRATEGY_TESTING.md](./STRATEGY_TESTING.md#terminal-noise-provider_warning).

Research uses the same pattern: extract → normalize in `research_repository.rs` / workflow. See [RESEARCH_DEV_STATUS.md](../research/RESEARCH_DEV_STATUS.md#provider-output-pipeline-normalize-first).

## Current state

Strategy V1 is now wired end-to-end from saved Research into `stage-engine`, Convex, and the desktop Strategy tab.

Implemented:

- `stage-engine` Strategy workflow with:
  - Convex repository reads/writes
  - provider prompt builder
  - artifact normalization before save
  - section regenerate flow
- Convex-backed Strategy generation input persistence
- Convex-backed Strategy artifact save/update flow
- Strategy tab approve/save/add-section persistence
- Strategy section regenerate through `stage-engine`
- Strategy export to Notion
- successful Notion exports persisted as durable artifact destinations
- dev generate path aligned with Research: Convex query + `stage-engine` (no automatic dev mock on Generate)
- optional layout mock only via `VITE_MOCK_STRATEGY=1` (not wired to Generate)

## Verification

Passed:

```txt
cargo check
pnpm --dir packages/data-ops exec convex codegen
pnpm --dir packages/data-ops run convex:typecheck
pnpm run desktop:typecheck
```

Note:

- `cargo clippy --all-targets --all-features -- -D warnings` still fails because of pre-existing warnings in unrelated `refero` and `research` files:
  - `apps/stage-engine/src/refero/parse.rs`
  - `apps/stage-engine/src/research/refero_assets.rs`
  - `apps/stage-engine/src/research/workflow.rs`

No new clippy failures remained in the new Strategy workflow files after cleanup.

## Regenerate strategy (shipped)

- **Regenerate strategy** beside **Edit Strategy** when an artifact exists (modal with last generate input from sessionStorage / Convex).
- Full run uses the same engine path as first generate; `deletePreviousStrategyArtifacts` on success.
- Research is unchanged. Downstream prompt matches Research re-run policy — see [RESEARCH_DEV_STATUS.md](../research/RESEARCH_DEV_STATUS.md#re-run-research-shipped).
- Per-section **Regenerate with AI** on cards is unchanged.

---

## Known follow-ups

- Figma parity can still be refined further in small visual details.
- `Continue to Moodboard` navigates to the moodboard tab (no approval gate yet).
- Strategy currently reuses the stored Research provider selection instead of owning a separate selector.
- Re-run / regenerate UX — see sections above and Research dev status.

## Notion export

Strategy uses the same native Notion OAuth connection and stored parent page as Research. Convex performs the API write and persists the completed destination URL. See [`NOTION_INTEGRATION.md`](../integrations/NOTION_INTEGRATION.md).
