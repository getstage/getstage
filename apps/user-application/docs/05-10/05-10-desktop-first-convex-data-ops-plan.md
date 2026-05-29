# Desktop-First Convex + Data-Ops Plan

Date: 2026-05-10
Status: Approved direction. Start implementation from Step 1.

## Decision

Stage is now desktop-first.

The desktop app is the real product UI. The web app remains important, but its
job narrows to web-owned flows: auth, payment, marketing, download, and return
to desktop.

## Target Tree

```txt
apps/
  user-application/
    src/                  # Desktop React product UI
    electron/             # Native bridge, windowing, IPC, Rust supervisor
    shared/               # Desktop IPC models only

  web-application/
    src/
      auth/               # Login/signup web flow
      billing/            # Stripe/payment/account portal
      download/           # Download/open desktop page
    worker/               # Web routing if needed
    convex/               # TEMP: old location, to migrate out

  stage-engine/           # Rust
    src/
      providers/          # Codex/Claude CLI
      scanner/            # Local file search
      jobs/               # Queues, cancellation, streaming
      server/             # localhost /v1 + websocket

packages/
  data-ops/
    convex/               # Convex schema/functions/auth config target
    src/contracts/        # Zod contracts
    src/domain/           # Shared domain/read-model helpers
    dist/                 # Built artifact consumed by apps
```

## Runtime Boundaries

Desktop cloud data:

```txt
apps/user-application renderer
  -> Convex React client
  -> useQuery / useMutation
  -> Convex deployment
  -> packages/data-ops/convex functions after migration
```

Desktop local/native work:

```txt
apps/user-application renderer
  -> preload IPC
  -> Electron main
  -> apps/stage-engine Rust sidecar
  -> local files / Codex CLI / Claude CLI / native work
```

Web auth and payment:

```txt
desktop opens web auth/payment
  -> apps/web-application handles login/signup/Stripe
  -> web redirects or deep-links back to desktop
  -> desktop resumes with the same Stage account
```

## What Goes Where

`apps/user-application` owns:

- product UI
- direct Convex reads/writes for Stage app data
- desktop routes
- local engine status UI
- calling Electron/Rust for native/local work

`packages/data-ops` owns:

- shared Zod contracts
- shared domain/read-model helpers
- future Convex schema/functions/auth config
- build artifact consumed by desktop and later web

`apps/web-application` owns:

- login/signup
- OTP and Google auth UI
- Stripe checkout and billing portal
- marketing/download pages
- desktop handoff/deep-link return
- current Convex backend only until it is migrated into `packages/data-ops`

`apps/stage-engine` Rust owns:

- Codex/Claude CLI process execution
- local file scanning
- job queues
- cancellation
- streaming provider output
- future native screen/audio/macOS work

## IPC Rule

IPC is fast enough for UI-to-native calls. The issue is not IPC speed.

Use IPC for:

- Rust sidecar commands/events
- native windowing
- shell/open external URL
- local permissions
- filesystem/native work

Do not use IPC as the normal path for Convex project/task/dashboard data once
direct Convex is wired in the desktop renderer.

## Implementation Order

1. Build `packages/data-ops` to `dist/`.
   This gives desktop a stable package artifact and removes the VS Code stale
   export problem.
2. Update `apps/user-application` scripts so `data-ops` builds before desktop
   dev/build.
3. Verify `packages/data-ops` typecheck/build and `apps/user-application`
   typecheck/build.
4. Add desktop Convex client/auth provider to `apps/user-application`.
5. Move desktop cloud reads from `renderer -> IPC -> /api/v1` to direct
   Convex `useQuery`.
6. Move desktop cloud writes from IPC `/api/v1` fetchers to Convex mutations.
7. Keep web auth/payment redirects intact.
8. Migrate Convex backend code from `apps/web-application/convex` into
   `packages/data-ops/convex` in small slices after direct desktop reads are
   proven.

## Immediate Step

Start with Step 1 and Step 2:

```txt
packages/data-ops/package.json
packages/data-ops/tsconfig.json
apps/user-application/package.json
```

No product behavior should change in this first step.

## Progress Log

- 2026-05-10: Added this desktop-first plan.
- 2026-05-10: Completed `packages/data-ops` build-to-dist setup.
- 2026-05-10: `apps/user-application` now builds `packages/data-ops`
  before `dev`, `typecheck`, and `build`.
- 2026-05-10 verification:
  - `packages/data-ops pnpm run build` passed.
  - `packages/data-ops pnpm run typecheck` passed.
  - `apps/user-application pnpm install` passed.
  - `apps/user-application pnpm run typecheck` passed.
  - `apps/user-application pnpm run build` passed.
- 2026-05-10: Launch auth decision made: Option A ships with 30-day JWT
  and monthly re-login; true refresh-token rotation is deferred.
- 2026-05-10: Desktop logged-out route guard/sign-in launcher added so
  no-session boot opens the web-owned auth/signup/onboarding/billing flow.
- 2026-05-10: Direct desktop Convex migration implemented for product data:
  projects, project detail, phases, tasks, create project, task mutations,
  and delete account now use Convex from the desktop renderer. IPC remains
  for auth/session/native/Rust.
- 2026-05-10 verification:
  - `apps/web-application pnpm run typecheck` passed.
  - `packages/data-ops pnpm run build` passed.
  - `apps/user-application pnpm run typecheck` passed.
  - `apps/user-application pnpm run build` passed.
  - `apps/web-application pnpm run build:testing` passed.
  - `git diff --check` passed.

## Next Step

Manual testing:

```txt
1. Deploy testing Convex/web.
2. Restart desktop dev server.
3. Sign out and back in once.
4. Test Projects list.
5. Test Project detail + phases/tasks.
6. Test Tasks kanban create/delete/drag priority.
7. Test Create Project.
8. Test Delete Account only on a disposable account.
```
