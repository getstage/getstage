# Clean Monorepo Architecture Plan

Date: May 28, 2026  
Status: Active cleanup plan  
Scope: Stage Desktop monorepo, package ownership, and runtime boundaries

## Caption: No more hybrid architecture

This cleanup deliberately rejects temporary split ownership.

The previous compromise was:

```txt
some cloud/backend ownership in apps/web-application
some desktop/product ownership in apps/user-application
some shared contracts in packages/data-ops
some local engine work in apps/data-service
```

That made the system hard to explain and easy to drift. The new rule is:

```txt
one owner per concern
one root workspace
no app-to-app imports for shared backend/domain contracts
```

## Caption: Final monorepo ownership

```txt
apps/user-application
  Desktop product app.
  Owns Electron, React UI, desktop routes, direct Convex product data usage,
  session transport, native bridge calls, and Stage Engine supervision.

apps/web-application
  Web-only app.
  Owns auth/signup, billing, marketing, download/open-desktop, and
  return-to-desktop flows.

apps/stage-engine
  Rust local desktop engine.
  Owns local agents, provider process execution, file search, queues,
  streaming, cancellation, and future native macOS work.

packages/data-ops
  Shared cloud/domain/contracts package.
  Owns Zod contracts, Convex schema/functions, generated Convex API, and
  generated Convex data model types.
```

## Caption: Clean runtime boundaries

Desktop cloud data:

```txt
apps/user-application renderer
  -> Convex React client
  -> Convex deployment
  -> packages/data-ops/convex functions
```

Desktop local/native work:

```txt
apps/user-application renderer
  -> preload IPC
  -> Electron main
  -> apps/stage-engine
  -> local files / Codex CLI / Claude CLI / native APIs
```

Web-owned flows:

```txt
apps/user-application
  -> opens browser for auth/billing/download flows
  -> apps/web-application
  -> returns to desktop through approved handoff/deep link
```

Convex operations:

```txt
pnpm run convex:dev
pnpm run convex:deploy
pnpm run convex:typecheck
```

These root scripts delegate to `packages/data-ops`. Do not run Convex as a
web-application-owned backend.

## Caption: Hard rules

1. `apps/stage-engine` is the only Rust sidecar path.
2. `data-service` is not a current architecture name.
3. The repo has one root PNPM workspace and one root lockfile.
4. Internal TypeScript packages use `workspace:*`, not `file:`.
5. Convex/backend dependency versions are pinned deliberately; no accidental
   patch/minor upgrades while the monorepo boundary is being cleaned.
6. `apps/user-application` must not import generated Convex APIs from
   `apps/web-application`.
7. Product data in desktop uses direct Convex, not Electron IPC.
8. Electron IPC is for auth/session transport, shell/native/windowing, and
   Stage Engine work.
9. `apps/web-application` is not the Convex backend owner.
10. `packages/data-ops` owns Convex schema/functions, generated API output,
   data model types, and shared backend/domain helpers.
11. Older docs are historical unless they match this May 28 plan.

## Caption: Execution order

### Phase 1 - Structural foundation

```txt
Rename data-service -> stage-engine everywhere.
Remove old compatibility env vars and old naming.
Create root package.json.
Create root pnpm-workspace.yaml.
Create one root pnpm-lock.yaml.
Remove nested pnpm-workspace.yaml files.
Remove nested pnpm-lock.yaml files.
Change @stage/data-ops to workspace:*.
Pin the Convex/backend dependency stack to the known-green versions from the
pre-root-workspace lockfiles.
```

### Phase 2 - Data Ops package boundary

```txt
Keep packages/data-ops build-to-dist.
Keep shared Zod contracts and shared helper rules under packages/data-ops/src.
Expose only package exports, not source paths.
Make desktop and web depend on @stage/data-ops as a workspace package when
they need shared contracts.
```

### Phase 3 - Convex ownership migration

```txt
Create packages/data-ops/convex. DONE.
Move Convex schema/functions/generated output from apps/web-application. DONE.
Expose generated API/types through @stage/data-ops. DONE.
Replace desktop and web generated API imports with @stage/data-ops. DONE.
Remove old web-owned Convex folder. DONE.
```

### Phase 4 - Remove old desktop product-data bridge

```txt
Confirm no renderer code uses window.stageDesktop.api for product data. DONE.
Remove product-data IPC handlers. DONE.
Remove Electron desktop-api fetchers for projects/tasks/phases. DONE.
Remove project-context IPC bridge. DONE.
Keep IPC for native/local/engine work only. DONE.
```

### Phase 5 - Resume product work

```txt
Implement Stage Engine fake provider runner.
Then provider detection.
Then file search.
Then Codex/Claude execution.
```

## Caption: Verification checklist

Every phase must keep these checks green:

```bash
pnpm install
pnpm run data-ops:build
pnpm run convex:typecheck
pnpm run desktop:typecheck
pnpm run web:typecheck
pnpm run engine:fmt
pnpm run engine:check
git diff --check
```

Use targeted builds before larger app changes:

```bash
pnpm run desktop:build
pnpm run web:build:testing
```

## Caption: Immediate next slice status

Phase 1 is complete and green.

Phase 3 is complete and green.
Phase 4 is complete and green.

The next slice is Phase 5:

```txt
Implement Stage Engine fake provider runner.
Then provider detection.
Then file search.
Then Codex/Claude execution.
```
