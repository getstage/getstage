---
name: toyota-reliability
description: >-
  Build and review Stage features for production reliability. Users double-click,
  spam buttons, refresh mid-run, and use React Strict Mode — the system must not
  fail, duplicate expensive work, or show errors after success. Use when
  implementing runs, mutations, auto-start effects, loading states, or reviewing
  UX around AI workflows (research, strategy, generate).
---

# Toyota Reliability

We maken een productie-applicatie. Mensen gaan rare dingen klikken. Ons systeem mag niet falen.

**Ons systeem moet als een Toyota zijn.**

## Principles

1. **Assume misuse, not ideal use** — double clicks, double effects, back/forward, tab switch, retry while pending.
2. **Idempotent by default** — the same user intent must not spawn duplicate paid work.
3. **Success wins over noise** — if the artifact exists, do not show a stale run error from a duplicate or failed sibling run.
4. **Defense in depth** — guard at UI, hook, engine, and database layers; any single layer can fail without user impact.
5. **Fail gracefully** — one malformed provider response must not corrupt saved state or block the happy path.

## Required patterns

### UI triggers (buttons, auto-start effects)

- Disable or no-op while `isPending || isRunning`.
- Module-level or ref lock for in-flight mutations per `projectId`.
- One-shot flags (e.g. `pendingStrategyGeneration`): **consume synchronously before async work**, not in `.finally()`.
- React Strict Mode: effects that start runs must survive mount/unmount/remount without duplicate starts.

### Engine runs

- Dedupe full project runs by `(projectId, mode)` while a run is active.
- Exclude subsection runs (e.g. strategy section regenerate via `context.source`).
- Return the existing `runId` on duplicate start instead of spawning a second provider job.

### Convex / persistence

- Reject a second `running` run for the same `(projectId, module)`.
- Allow idempotent retry when `externalRunId` matches an existing running record.
- Prefer queries that return `null` over throwing when project access is missing.

### Error display

- Track the **latest terminal run event**, not the first failure in a batch.
- Hide run errors when a valid artifact is already loaded (`hasArtifact`).
- Log technical detail; show one calm user message.

## Review checklist

Before shipping a run or mutation flow, verify:

- [ ] Double-click / double-effect cannot start two runs
- [ ] Second click joins or no-ops; never parallel duplicate provider calls
- [ ] Partial success (one run completes, one fails) shows content, not red error
- [ ] Button disabled state matches real in-flight state
- [ ] Backend rejects duplicate `running` records for same project + module
- [ ] Auto-start paths cleared before `await`

## Stage-specific touchpoints

| Layer | Files / areas |
|-------|----------------|
| Strategy UI | `StrategyTab.tsx`, `useStrategyRun.ts`, `useStrategyTab.ts` |
| Research UI | `useResearchRun.ts`, research tab auto-start (mirror strategy guards) |
| Engine | `apps/stage-engine/src/runs/mod.rs` — project run dedupe |
| Convex | `lib/projectAi/domain/runStore.ts`, `handlers/strategy.ts`, `handlers/research.ts` |

## Anti-patterns

- Clearing one-shot flags only after async completion
- Single global `activeRunId` with no dedupe when two starts race
- Showing `run_failed` from run B while run A already saved the artifact
- Trusting "users won't double-click"
- Only guarding the button, not the effect or API

## When fixing a duplicate-run bug

1. Find all entry points (button, auto-start, navigation handoff).
2. Fix the earliest synchronous guard (flag consumption / ref lock).
3. Add engine + Convex dedupe so races cannot charge twice.
4. Fix error UI so success is not masked by sibling failure.
5. Document the scenario in the relevant testing doc (`STRATEGY_TESTING.md`, etc.).
