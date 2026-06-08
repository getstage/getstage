# Flows Dev Status

Last updated: 2026-06-07

Related: [`FLOWS_TESTING.md`](./FLOWS_TESTING.md) · [`FLOWS_CHANGE_AUDIT.md`](./FLOWS_CHANGE_AUDIT.md) · [`RESEARCH_DEV_STATUS.md`](../research/RESEARCH_DEV_STATUS.md) · [`STRATEGY_DEV_STATUS.md`](../strategy/STRATEGY_DEV_STATUS.md) · [`MOODBOARD_DEV_STATUS.md`](../moodboard/MOODBOARD_DEV_STATUS.md)

---

## Purpose

Flows is the production-planning step after Research, Strategy, and Moodboard. It turns approved project intelligence into editable user flows and reusable screens.

## Current state

Implemented in this pass:

- `mode: "flows"` in the engine run contract.
- Convex read/write/run handlers for Flows.
- Stage Engine `FlowsWorkflow`.
- Provider prompt based on Research + Strategy + Moodboard only.
- Provider JSON extraction and normalization to `flowsArtifact`.
- Full-generate path saves a Convex `flowsArtifact`.
- Screen and flow regenerate paths use `context.source` (`screen:{id}` / `flow:{id}`).
- Flows tab is artifact-backed instead of fixture-backed in normal production flow.
- Manual flow add, step edits, screen element edits, and status changes persist to Convex.
- `Send to FigJam` creates an OAuth-bound, idempotent canvas export job through Stage Engine.
- The Stage Exporter plugin claims the job with the connected Figma user identity and writes editable FigJam shapes and connectors.
- A one-minute heartbeat keeps the short-lived plugin claim valid while the canvas write is active.

## Architecture

```txt
React FlowsTab
  -> Electron IPC startRun(mode: flows)
  -> stage-engine flows/workflow.rs
       -> Convex getFlowsInput
       -> Claude/Codex provider
       -> extract_flows_artifact
       -> normalize_flows_artifact
       -> Convex completeFlowsRun
  -> React getLatestFlowsArtifact
  -> editable UI + updateFlowsArtifact

Send to FigJam
  -> Electron IPC createFigJamExport
  -> stage-engine validates latest flowsArtifact and compiles FigJamWritePlan
  -> Convex stores OAuth-bound export job + one-time pairing code hash
  -> Stage Exporter plugin claims job in FigJam
  -> editable shapes/connectors + complete/fail callback
```

## Provider rules

- Use the existing provider settings path.
- Use `useChatDefaults()` and `buildRunModelOptions()`.
- Fast mode is handled by the existing Rust provider option layer.
- Generated flows are forced to `Draft`; the user approves flows explicitly.

## Context rules

Flows V1 uses:

- Research artifact
- Strategy artifact
- Moodboard artifact

Flows V1 does not call Refero directly.
