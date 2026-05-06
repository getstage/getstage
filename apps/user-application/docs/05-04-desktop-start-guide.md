# Stage Desktop Start Guide

Date: 2026-05-04

This document explains the most important desktop files and how to run the Electron app locally.

Current app path:

```txt
apps/user-application/
```

## Current Scope

The current desktop work is a mock UI migration pass.

What this means:

- The desktop app uses mock data.
- No Convex data is wired yet.
- The Rust sidecar exists in `apps/data-service/`, but it is not wired into Electron yet.
- No native screen capture, shortcuts, auth, or deep-linking is implemented yet.
- The goal is visual parity with the current web `.tsx` screens before choosing the final data/native architecture.

## How To Run

From the repository root:

```bash
cd apps/user-application
pnpm install
pnpm run dev
```

The dev script already unsets `ELECTRON_RUN_AS_NODE`, because some shells can accidentally force Electron to start as Node instead of as the Electron runtime.

## Checks

Run these from `apps/user-application/`:

```bash
pnpm run typecheck
pnpm run build
```

Use `typecheck` while developing. Use `build` before handing the work to someone else.

## Important Files

### Electron Process

- `electron/main.ts`
  - Electron entry point.
  - Creates the app lifecycle and calls the window setup.

- `electron/windows.ts`
  - Owns `BrowserWindow` creation.
  - This is where desktop window behavior belongs.
  - Security settings should stay strict: `nodeIntegration: false`, `contextIsolation: true`, preload enabled.

- `electron/preload.ts`
  - Safe bridge between Electron and React.
  - Renderer code should not directly access Node.js.

- `electron/ipc.ts`
  - Main-process IPC handlers.
  - Later native/local actions can be exposed here or routed to the Rust sidecar.

### Shared Electron Contracts

- `shared/ipc/channels.ts`
  - Typed IPC channel names.

- `shared/models/desktop.ts`
  - Zod models for desktop IPC/session/native mock contracts.

### React Renderer

- `src/main.tsx`
  - React entry.
  - Mounts TanStack Router and TanStack Query.

- `src/router.tsx`
  - Desktop routes.
  - Current mock routes include dashboard, project detail, settings, integrations, billing, clients, developer, account, and portal.

- `src/app/DesktopShell.tsx`
  - Global renderer shell.
  - Keeps companion overlays available above all routes.

- `src/app/WorkspaceFrame.tsx`
  - Reusable desktop layout frame.
  - Provides sidebar + content area for mock UI screens.

### Mock UI Areas

- `src/dashboard/`
  - Dashboard UI copied/adapted from the web app.
  - Uses Zod-backed mock data in `dashboard/data/dashboardSnapshot.ts`.

- `src/project/`
  - Project detail mock UI.
  - Models live in `project/models/project.ts`.
  - Mock data lives in `project/data/projectSnapshot.ts`.
  - Tab screens live in `project/components/tabs/`.

- `src/settings/`
  - Settings and integrations mock UI.
  - Models live in `settings/models/settings.ts`.
  - Mock data lives in `settings/data/settingsSnapshot.ts`.
  - Components live in `settings/components/`.

- `src/companion/`
  - Desktop companion/orb/voice/chat UI.
  - This is separate from the web dashboard migration.

### Styling

- `src/styles/globals.css`
  - Tailwind v4 import and shared design tokens.

- `src/styles/desktop.css`
  - Desktop-specific companion styles.
  - Dashboard/project/settings screens should prefer Tailwind utility classes.

## Architecture Notes For Later

The likely future architecture is:

- Electron + React/Vite/TanStack for pixel-perfect UI.
- Convex hooks for normal cloud CRUD.
- A local Rust sidecar for heavy tasks, local queues, hardware access, file indexing, and possible local AI inference.
- Shared TypeScript/Zod/Convex schemas for cloud/frontend types.
- Rust mirrors critical contracts with `serde` structs.

That architecture is not implemented in this UI migration pass.

## Rust Sidecar

The local Rust engine lives separately from the Electron UI:

```txt
apps/data-service/
```

Run Rust checks from the repository root:

```bash
cargo fmt --manifest-path apps/data-service/Cargo.toml --check
cargo check --manifest-path apps/data-service/Cargo.toml
```

Run the local sidecar from the repository root:

```bash
cargo run --manifest-path apps/data-service/Cargo.toml
```

Then test:

```bash
curl http://127.0.0.1:48221/v1/health
curl http://127.0.0.1:48221/v1/readiness
curl http://127.0.0.1:48221/v1/version
```
