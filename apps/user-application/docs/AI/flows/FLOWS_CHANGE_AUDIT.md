# Flows V1 Change Audit

Last updated: 2026-06-04

| Layer | Files | Change | Reason | Notes |
|---|---|---|---|---|
| Contract | `packages/data-ops/src/contracts/engine-run.ts` | Added `flows` to `runModeSchema`. | Allows renderer and engine IPC to start Flows runs. | Mirrors Rust `RunMode::Flows`. |
| Contract | `packages/data-ops/src/contracts/flows.ts` | Added upstream artifact IDs, FigJam metadata, `updatedAt`, and step `screenId`. | Keeps generated, edited, regenerated, and exported Flows traceable. | Optional fields must be omitted, not written as `null`. |
| Convex | `packages/data-ops/convex/lib/projectAi/handlers/flows.ts` | Added `getFlowsInput`, run create/complete/fail, artifact update, and FigJam export request. | Gives Flows the same workflow shape as Strategy. | `getFlowsInput` requires Research + Strategy + Moodboard. |
| Convex reliability | `packages/data-ops/convex/lib/projectAi/handlers/flows.ts` | Added server-side Flows artifact shape validation for complete/update paths. | Prevents malformed public mutation payloads from corrupting saved Flows. | Checks artifact header, project ownership, statuses, steps, screens, and `null` optional fields. |
| Convex reliability | `packages/data-ops/convex/lib/projectAi/handlers/flows.ts` | Made FigJam export request idempotent per artifact/action. | Double-clicks should update the existing destination instead of creating duplicate records. | Still reports current Plugin/Widget boundary honestly. |
| Convex | `packages/data-ops/convex/projectAi.ts` | Exported Flows endpoints. | Makes handlers callable by renderer and Stage Engine. | Codegen required after changes. |
| Engine model | `apps/stage-engine/src/models/runs.rs` | Added `RunMode::Flows`. | Rust mirror of the shared run contract. | Required for IPC deserialization. |
| Engine model | `apps/stage-engine/src/models/flows.rs` | Added `FlowsInput`. | Typed shape for Convex context response. | Holds upstream artifacts and optional existing Flows artifact. |
| Engine repository | `apps/stage-engine/src/convex_store/flows_repository.rs` | Added Convex adapter for Flows. | Keeps workflow orchestration separate from transport. | Mirrors Strategy repository style. |
| Engine workflow | `apps/stage-engine/src/flows/workflow.rs` | Added full generate and targeted regenerate orchestration. | Makes Flows a real Stage Engine workflow. | Supports `screen:{id}` and `flow:{id}` sources. |
| Engine prompt | `apps/stage-engine/src/flows/prompt.rs` | Added full and targeted regenerate prompts. | Provider gets Research + Strategy + Moodboard context only. | No Refero call in Flows V1. |
| Engine normalize | `apps/stage-engine/src/flows/normalize.rs` | Added provider drift normalization and merge helpers. | Protects Convex/UI from malformed provider output. | Full generation forces `Draft`. |
| Engine parser | `apps/stage-engine/src/helpers/provider_json.rs` | Added `extract_flows_artifact`. | Extracts Flows JSON from provider stdout/stderr. | Accepts full artifact or normalizable shape. |
| Engine routing | `apps/stage-engine/src/runs/mod.rs`, `apps/stage-engine/src/app.rs`, `apps/stage-engine/src/main.rs` | Wired `FlowsWorkflow` into app state and run routing. | Routes `mode: flows` through the typed workflow. | Full project run dedupe includes Flows. |
| Frontend hooks | `apps/user-application/src/hooks/project/flows/useFlowsRun.ts` | Added Flows run hook. | Reuses provider readiness and fast/default model options. | Mirrors Strategy run handling. |
| Frontend hooks | `apps/user-application/src/hooks/project/flows/useSaveFlowsArtifact.ts` | Added artifact save hook. | Persists manual edits and status changes. | Builds a full artifact from UI state. |
| Frontend hooks | `apps/user-application/src/hooks/project/flows/useFlowsFigJamExport.ts` | Added FigJam export request hook. | Makes the FigJam button real without pretending REST can write canvas nodes. | Records export request and surfaces limitation. |
| Frontend reliability | `apps/user-application/src/hooks/project/flows/useFlowsFigJamExport.ts` | Added in-flight request lock. | Prevents duplicate FigJam export mutations from rapid clicks before React disables the button. | Returns the active promise for repeated clicks. |
| Frontend hooks | `apps/user-application/src/hooks/project/flows/useFlowsScreenRegenerate.ts` | Added targeted regenerate helper. | Supports screen/flow regenerate via `mode: flows`. | FlowsTab currently calls `useFlowsRun` directly for the same behavior. |
| Frontend UI | `apps/user-application/src/components/project/tabs/flows/FlowsTab.tsx` | Converted normal flow from fixture-backed to artifact-backed. | Empty state now asks user to generate Flows. | Manual add/edit/status/screen edits persist. |
| Frontend reliability | `apps/user-application/src/components/project/tabs/flows/FlowsTab.tsx` | Added serialized save queue and run-busy guards for generation/regeneration. | Prevents overlapping edit saves and duplicate targeted AI runs from spam clicks. | Stale run errors are hidden once a valid artifact is loaded. |
| Frontend UI | `FlowHeaderActions.tsx`, `FlowRow.tsx`, `FlowSummary.tsx`, `FlowActions.tsx`, `ScreensPanel.tsx`, `ScreenCard.tsx` | Added FigJam handler, status control, regenerate action, and loading states. | Completes the interactive V1 tab behavior. | Maintains Figma visual language. |
| Frontend reliability | `FlowRow.tsx`, `FlowActions.tsx` | Added regenerate disabled/loading state for flow rows. | Prevents rapid repeated flow regenerate starts from the expanded row action. | Shares Flows run busy state from `FlowsTab`. |
| Docs | `FLOWS_DEV_STATUS.md`, `FLOWS_TESTING.md`, `FLOWS_CHANGE_AUDIT.md` | Added Flows implementation docs and audit table. | Gives the next agent/user a durable status reference. | Keep updated after verification. |

## Verification

| Check | Result | Notes |
|---|---|---|
| `cargo check` from `apps/stage-engine` | Passed | Root repo has no `Cargo.toml`; Stage Engine is the Rust crate root. |
| `cargo check` from `apps/stage-engine` after reliability pass | Passed | Rechecked after Toyota reliability review. |
| `cargo test flows` from `apps/stage-engine` | Passed | 2 Flows normalizer tests passed. |
| `pnpm --dir packages/data-ops exec convex codegen` | Passed | Regenerated Convex TypeScript bindings. |
| `pnpm --dir packages/data-ops run convex:typecheck` | Passed | Convex handlers/types compile. |
| `pnpm --dir packages/data-ops run convex:typecheck` after reliability pass | Passed | Rechecked server-side validation/idempotent export changes. |
| `pnpm run desktop:typecheck` | Passed | Renderer/main TypeScript compile. |
| `pnpm run desktop:typecheck` after reliability pass | Passed | Rechecked UI locks/save queue changes. |
