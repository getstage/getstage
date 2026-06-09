# Stage Engine Rename Decision

Date: May 28, 2026  
Status: Approved and implemented naming decision  
Scope: Stage Desktop monorepo architecture

## Caption: The Rust app is `stage-engine`, not `data-service`

The Rust sidecar is now named **Stage Engine**.

Use this path everywhere:

```txt
apps/stage-engine/
```

Do not describe this app as `data-service` in current architecture notes, code,
scripts, or future plans. The old name made the Rust sidecar sound like a cloud
data/backend service, which is not its role in the desktop-first architecture.

## Caption: Why the rename matters

Stage Engine is the **local desktop execution engine**.

It owns local/native/heavy work:

```txt
Codex/Claude CLI execution
provider detection
deep local file search
job queues
streaming events
cancellation
future macOS native bridges
```

It does **not** own normal cloud product data, Convex schema/functions, auth,
billing, or web API routes.

## Caption: Final app ownership language

Use these names when explaining the monorepo:

```txt
apps/user-application
  Desktop product UI: Electron + React + direct Convex product data.

apps/web-application
  Web-owned flows: auth, signup, billing, marketing, download, return-to-desktop.

apps/stage-engine
  Local desktop engine: Rust sidecar for local agents, file search, jobs, and native work.

packages/data-ops
  Cloud/domain/contracts package: Zod contracts now, future Convex ownership target.
```

## Caption: Runtime boundary

The runtime boundary stays the same after the rename:

```txt
React renderer
  -> preload IPC
  -> Electron main
  -> Stage Engine Rust sidecar
  -> local provider process / filesystem / native APIs
```

Desktop product data should continue to use direct Convex from the renderer.
IPC is for native/local/engine work, not the normal path for projects, tasks,
settings, or dashboard data.

## Caption: Compatibility note

The new override env var is:

```txt
STAGE_ENGINE_MANIFEST
```

The old `STAGE_DATA_SERVICE_MANIFEST` override is removed from current
architecture. New scripts and docs must use `STAGE_ENGINE_MANIFEST`.

## Caption: Historical references

Older docs may mention `apps/data-service` when describing work done before
May 28, 2026. Treat those as historical references only. Current and future
architecture should use **Stage Engine** and `apps/stage-engine`.
