---
name: toyota-reliability
description: >-
  Build and review Stage for production reliability and safety — like Rust at the
  product level. Assume misuse (double-clicks, Strict Mode, refresh mid-run),
  enforce type and API contracts, avoid null/unsafe patterns, prevent resource
  leaks, and fail gracefully. Use for runs/mutations, Convex read models, Electron,
  React effects, stage-engine Rust, and any change where runtime safety matters.
---

# Toyota Reliability

We maken een productie-applicatie. Mensen gaan rare dingen klikken. Ons systeem mag niet falen.

**Ons systeem moet als een Toyota zijn:** betrouwbaar onder misbruik, voorspelbaar onder stress, en **veilig by design** — niet alleen “het werkt op happy path”.

Dit document geldt voor **alles** in Stage: React UI, Convex, Electron, Cloudflare Workers, en `stage-engine` (Rust).

---

## Core philosophy (Rust mindset, whole stack)

Rust dwingt veiligheid af via types en ownership. Wij doen hetzelfde **bewust** in TypeScript en product design:

| Rust idea | Stage equivalent |
|-----------|------------------|
| No null unless `Option` | Gebruik `undefined` + `.optional()` voor “niet gezet”; vermijd `null` in domain types tenzij extern API het vereist |
| Compile-time contracts | Zod schemas + Convex DB validators + aligned read/write shapes |
| `Result`, not panic | Expliciete errors; geen stille failures; user ziet één rustige boodschap |
| Ownership / drop | Cleanup subscriptions, timers, listeners, IPC, sidecar processes |
| No `unsafe` without reason | Geen `as any`, `@ts-ignore`, force casts, of “trust me” runtime gaps |
| Fail closed on auth/access | Geen data lekken bij twijfel over rechten |

**Doel:** runtime gedrag moet matchen met wat types beloven. TypeScript compileert niet alles — **API boundaries** (Convex queries, IPC, uploads) zijn onze “borrow checker”.

---

## Principles

### Reliability under misuse

1. **Assume misuse, not ideal use** — double clicks, double effects, back/forward, tab switch, retry while pending.
2. **Idempotent by default** — the same user intent must not spawn duplicate paid work.
3. **Success wins over noise** — if the artifact exists, do not show a stale run error from a duplicate or failed sibling run.
4. **Defense in depth** — guard at UI, hook, engine, and database layers; any single layer can fail without user impact.
5. **Fail gracefully** — one malformed provider response must not corrupt saved state or block the happy path.

### Type & contract safety

6. **One truth per field** — DB schema, write path, and read path must agree (same required/optional, same fallback rules).
7. **Resolve at the boundary** — normalize messy backend values (URLs, IDs, enums) in Convex read models / mappers; UI gets clean types.
8. **Required means required** — if the UI needs a string (e.g. `attachment.url`), the API must guarantee `string`, not `string | null`.
9. **Optional means absent** — prefer `field?: T` / `undefined` over `null` for “not set” in frontend domain types.

### Resource & lifecycle safety

10. **Everything that opens must close** — `useEffect` cleanups, `AbortController`, `clearInterval`, `removeListener`, tray/window teardown.
11. **No orphaned work** — sidecar, uploads, and runs must be cancellable or deduped; don’t leave zombie processes or duplicate charges.
12. **Bounded retries** — retry with backoff + cap; never infinite loops on failure.

---

## Required patterns

### API & data contracts (Convex / Zod)

- **Write and read must mirror each other.** Example: if save uses `(await resolveAssetUrl(key)) ?? key`, read must use the same fallback — never return `null` when DB stores a string.
- **Validators at the edge:** Convex `v.*` on insert/patch; Zod on frontend inputs; don’t pass raw `unknown` into UI components.
- **Don’t leak partial broken rows:** filter or repair at read time (e.g. attachment without resolvable URL) instead of pushing `null` to every consumer.
- **Prefer queries that return `null` over throwing** when project access is missing (not found / unauthorized distinction stays explicit in handlers).

### TypeScript / React

- No `@ts-expect-error` / `as any` to “make deploy green” — fix the contract.
- `useEffect` that registers listeners, polls, or starts async work **must** return cleanup.
- Debounced saves: cancel on unmount; don’t fire after component destroyed.
- Strict Mode–safe: guards and one-shot flags consumed **before** `await`, not in `.finally()`.
- Loading/error/success states must match real in-flight work (no stale error after success).

### Electron / desktop

- Single-instance lock; don’t spawn duplicate main windows on deep link races without intent.
- IPC handlers: validate args; reject malformed payloads early.
- Sidecar: start/stop tied to app lifecycle; no duplicate supervisors on quit/relaunch.
- Auto-update: silent when up to date; popup only when actionable; don’t block startup.

### Rust (`stage-engine`)

- **No `.unwrap()` / `.expect()` on user-controlled or network paths** — use `Result` and map to HTTP/run errors.
- Prefer owned data at boundaries; avoid cloning in hot loops without reason.
- Run dedupe and cancellation must be deterministic under concurrent starts.
- Log for ops; return stable error codes/messages to the UI layer.

### UI triggers (buttons, auto-start effects)

- Disable or no-op while `isPending || isRunning`.
- Module-level or ref lock for in-flight mutations per `projectId`.
- One-shot flags (e.g. `pendingStrategyGeneration`): **consume synchronously before async work**, not in `.finally()`.
- React Strict Mode: effects that start runs must survive mount/unmount/remount without duplicate starts.

### Engine runs

- Dedupe full project runs by `(projectId, mode)` while a run is active.
- Exclude subsection runs (e.g. strategy section regenerate via `context.source`).
- Return the existing `runId` on duplicate start instead of spawning a second provider job.

### Convex / persistence (runs)

- Reject a second `running` run for the same `(projectId, module)`.
- Allow idempotent retry when `externalRunId` matches an existing running record.

### Error display

- Track the **latest terminal run event**, not the first failure in a batch.
- Hide run errors when a valid artifact is already loaded (`hasArtifact`).
- Log technical detail; show one calm user message.

---

## Review checklists

### Before any PR (general safety)

- [ ] Read path matches write path for every field the UI consumes
- [ ] No new `null` in domain types without explicit reason
- [ ] Effects/listeners/timers have cleanup
- [ ] Auth/access checked before returning or mutating user data
- [ ] No `@ts-ignore` / `as any` added to silence errors
- [ ] Errors are handled; no unhandled promise rejections on user paths

### Before shipping a run or mutation flow

- [ ] Double-click / double-effect cannot start two runs
- [ ] Second click joins or no-ops; never parallel duplicate provider calls
- [ ] Partial success (one run completes, one fails) shows content, not red error
- [ ] Button disabled state matches real in-flight state
- [ ] Backend rejects duplicate `running` records for same project + module
- [ ] Auto-start paths cleared before `await`

### Rust engine change

- [ ] No new `unwrap` on IO/auth/user input paths
- [ ] Concurrent run start tested or dedupe verified
- [ ] Errors propagate as `Result`, not panic

---

## Stage-specific touchpoints

| Layer | Files / areas |
|-------|----------------|
| Strategy UI | `StrategyTab.tsx`, `useStrategyRun.ts`, `useStrategyTab.ts` |
| Research UI | `useResearchRun.ts`, research tab auto-start (mirror strategy guards) |
| Engine | `apps/stage-engine/src/runs/mod.rs` — project run dedupe |
| Convex runs | `lib/projectAi/domain/runStore.ts`, `handlers/strategy.ts`, `handlers/research.ts` |
| Convex read models | `convex/_helpers.ts`, `domain/projects/readModel.ts`, `r2.ts` — URL/asset resolution |
| Frontend types | `apps/web-application/src/data-ops/schema.ts` — Zod must match Convex outputs |
| Desktop | `electron/helpers/auto-update.ts`, `sidecar.ts`, `ipc.ts`, `windows.ts` |

---

## Anti-patterns

### Misuse & runs

- Clearing one-shot flags only after async completion
- Single global `activeRunId` with no dedupe when two starts race
- Showing `run_failed` from run B while run A already saved the artifact
- Trusting "users won't double-click"
- Only guarding the button, not the effect or API

### Type & contract safety

- Returning `null` from read helpers when DB field is required `string`
- Different fallback logic on save vs read (causes TS drift and broken UI at runtime)
- Spreading `string | null` into components that assume `string`
- Using `null` and `undefined` interchangeably in domain models

### Resource & unsafe practices

- `useEffect` without cleanup for subscriptions, intervals, or global shortcuts
- Fire-and-forget `void fetch()` with no abort on unmount
- Leaking Electron `BrowserWindow` or sidecar on reload
- `@ts-expect-error` to ship; fixing symptoms not contracts
- Silent `catch {}` that hides data corruption or auth failures

---

## When fixing a duplicate-run bug

1. Find all entry points (button, auto-start, navigation handoff).
2. Fix the earliest synchronous guard (flag consumption / ref lock).
3. Add engine + Convex dedupe so races cannot charge twice.
4. Fix error UI so success is not masked by sibling failure.
5. Document the scenario in the relevant testing doc (`STRATEGY_TESTING.md`, etc.).

## When fixing a type/contract bug (e.g. deploy TS errors)

1. Find the **boundary** where types diverge (Convex query return vs Zod schema).
2. Decide the **canonical shape** (usually: DB validator + frontend Zod).
3. Fix the **read model** to guarantee that shape — don’t nullable the whole frontend to greenwash.
4. Align write path fallbacks with read path fallbacks.
5. Run `pnpm run build:testing` (web) or `cargo check` (engine) before deploy.

---

## Reference: attachment URL fix (good pattern)

**Problem:** save stored `url: string`; read could return `null` when R2 resolution failed.

**Fix:** shared fallback at read boundary — `(await resolveAssetUrl(key)) ?? attachment.url` — always `string`.

This is the standard: **normalize once at the API edge**, keep UI types strict.
