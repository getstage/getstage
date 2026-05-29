# Stage Monorepo Implementation Tracker

Date: May 9, 2026  
Branch: `monorepo`  
Status: Desktop product data migrated to direct Convex; ready for manual testing
Latest doc handoff: 2026-05-11 — `apps/user-application/docs/05-11/05-11-session-summary.md`

## Scope

This tracker follows the first real implementation pass for the Stage Desktop monorepo architecture.

Current goal:

```txt
Electron remains stable in `apps/user-application/`.
Rust sidecar boundary starts small.
No UI redesign work.
Stage is desktop-first: desktop product UI may use direct Convex reads/writes,
while Electron/Rust own native/local/agent work. Website remains auth,
payment, onboarding, download, and return-to-desktop.
No Figma/Notion implementation yet.
No SQLite.
No local AI inference.
```

## Step Tracker

- [x] 1. Confirm branch is `monorepo`.
- [x] 2. Confirm desktop TypeScript still typechecks from `apps/user-application/`.
- [x] 3. Create `apps/stage-engine/` Rust sidecar folder.
- [x] 4. Add Rust service skeleton with clear module folders.
- [x] 5. Add `/v1/health`, `/v1/readiness`, and `/v1/version` route code.
- [x] 6. Document how to run the Rust sidecar.
- [x] 7. Move existing web app from `app/` to `apps/web-application/`.
- [x] 8. Move desktop app from `desktop/` to `apps/user-application/`.
- [x] 9. Confirm post-move desktop TypeScript/build verification.
- [x] 10. Install/verify local Rust toolchain.
- [x] 11. Run `cargo fmt`.
- [x] 12. Run `cargo check`.
- [x] 13. Add WebSocket `/v1/events`.
- [x] 14. Add typed `engine.ping -> engine.ready`.
- [x] 15. Create `packages/data-ops` with shared Zod contracts/domain models.
- [x] 16. Add shared `ProjectContext`, `EngineCommand`, and `EngineEvent` contracts in `packages/data-ops`.
- [x] 17. Wire desktop to consume selected project context through `data-ops` contracts.
- [x] 18. Add Electron sidecar supervisor.
- [x] 19. Add renderer engine status bridge.
- [x] 20. Add desktop auth launcher and `stage://auth` deep-link callback plan/implementation.
- [x] 21. Add secure desktop session storage and authenticated boot state.
- [x] 22. Replace desktop API-key bridge with Convex Auth JWT handoff.
- [x] 23. Wire live Convex-backed selected project context after desktop auth works.

Step 23 sub-items (2026-05-10 update):

- [x] Replace visible demo-only dashboard/sidebar/projects/project-detail/client-portal with live, loading, empty, or clearly marked fallback states.
  See `05-09/05-09-dynamic-pages-plan.md` (passes 1-3).
- [x] Token-expiry UX: 401/403 detector clears session and surfaces "Sign in" empty state.
  See `05-10/05-10-token-refresh-and-tasks-priority-plan.md` (Part 1, Layer 1 + Layer 2 stopgap).
- [x] JWT lifetime stopgap (30 days) so dev/test sessions do not expire hourly.
  See same doc; requires Convex deploy on testing.
- [x] Logout button wired (sidebar account menu -> auth.logout IPC -> session-changed broadcast).
  See `05-10/05-10-token-refresh-and-tasks-priority-plan.md` (pass 2).
- [x] Logged-out desktop route guard/login screen.
  No valid desktop session now renders `DesktopAuthView`, which opens the
  web-owned login/signup/onboarding/billing flow and resumes after
  `auth:session-changed`.
- [x] Direct Convex queries are gated behind desktop auth.
  The companion/critique panel and product-data hooks now pass `"skip"` to
  Convex while there is no desktop session, so signed-out startup shows the
  login screen instead of a customer-visible `Not authenticated` error.
- [x] Tasks page: priority enum field, GET /api/v1/me/tasks, kanban grouping by priority.
  See same doc (Part 2, pass 1).
- [x] Tasks page: create/delete/setPriority mutations, persist drag-and-drop.
  See same doc (pass 3).
- [x] Strict-typing rule documented + skill created.
  See `05-10/05-10-strict-typing-rule.md` and `.claude/skills/strict-typing/SKILL.md`.
- [ ] Refresh-token rotation (true Layer 2).
  Deferred by launch decision on 2026-05-10. Option A ships with 30-day JWT
  and monthly re-login. Plan remains in
  `05-10/05-10-token-refresh-and-tasks-priority-plan.md`.
- [x] Decide whether direct Convex subscriptions belong in desktop V1 or remain behind Electron main + website API.
  Decision: desktop-first. Desktop should use direct Convex for cloud
  product data once the migration is verified; IPC remains for native/Rust.
- [x] Migrate desktop product data off the `/api/v1` IPC bridge.
  Sidebar/projects/project detail/tasks now use direct Convex
  `useQuery`/`useMutation` through the desktop renderer. Electron IPC remains
  for auth handoff, session storage, shell/native, and Rust sidecar work.
- [x] Fix create project and delete account.
  Create project now calls direct Convex and navigates with the real created
  project id. Delete account now calls the existing Convex account deletion
  action and then clears the local desktop session.
- [x] Migrate `packages/data-ops` from "point to src" to "build to dist" pattern.
  Completed on 2026-05-10. See `05-10/05-10-data-ops-build-pattern.md`.

Step 23 sub-items (2026-05-11 update):

- [x] Settings -> Clients: live `clients.listForCurrentUser`, Zod at IPC boundary.
- [x] Settings -> Profile: R2 avatar upload + `settings.updateProfile`.
- [x] Client Portal branding: plan from `settings.getOverview` (Pro unlock);
  `settings.updatePortalBranding` for accent.
- [x] Project-detail Kanban: real task create via Convex (no mock local ids).
- [x] `useLiveProject`: skip `getProjectData` until desktop session exists.

- [ ] 24. Add fake provider runner that receives typed project context.
- [ ] 25. Add Codex/Claude provider detection.
- [ ] 26. Add deep file scanner.
- [ ] 27. Add `.codex` / `.claude` discovery.
- [ ] 28. Add design critique job pipeline.
- [ ] 29. Add cloud voice transcription flow.
- [ ] 30. Add basic Figma integration layer.
- [ ] 31. Add basic Notion integration layer.
- [ ] 32. Add web lifecycle event tracking for Resend flows.

## Current Files Added

```txt
apps/stage-engine/Cargo.toml
apps/stage-engine/README.md
apps/stage-engine/src/main.rs
apps/stage-engine/src/app.rs
apps/stage-engine/src/config/mod.rs
apps/stage-engine/src/helpers/mod.rs
apps/stage-engine/src/helpers/time.rs
apps/stage-engine/src/models/commands.rs
apps/stage-engine/src/models/events.rs
apps/stage-engine/src/models/mod.rs
apps/stage-engine/src/models/status.rs
apps/stage-engine/src/observability/mod.rs
apps/stage-engine/src/server/events.rs
apps/stage-engine/src/server/mod.rs
apps/stage-engine/src/server/status.rs
packages/data-ops/README.md
packages/data-ops/package.json
packages/data-ops/tsconfig.json
packages/data-ops/src/contracts/engine-command.ts
packages/data-ops/src/contracts/engine-event.ts
packages/data-ops/src/contracts/project-context.ts
packages/data-ops/src/domain/design-critique.ts
packages/data-ops/src/domain/project-context.ts
packages/data-ops/src/index.ts
apps/user-application/src/project-context/convexProjectContext.ts
apps/user-application/src/project-context/data/selectedProjectContext.ts
apps/user-application/src/project-context/index.ts
apps/user-application/docs/05-09/05-09-desktop-auth-deep-link-plan.md
apps/user-application/electron/sidecar.ts
apps/user-application/src/hooks/useEngineStatus.ts
apps/user-application/electron/auth.ts
apps/user-application/electron/helpers/auth.ts
apps/user-application/electron/helpers/desktop-api.ts
apps/user-application/electron/helpers/permissions.ts
apps/user-application/electron/helpers/session-storage.ts
apps/user-application/electron/helpers/sidecar.ts
apps/user-application/electron/helpers/time.ts
apps/user-application/electron/project-context.ts
apps/user-application/src/hooks/useSelectedProjectContext.ts
apps/web-application/src/routes/auth.desktop.tsx
```

## Current App Layout

```txt
apps/
├── web-application/   # Existing Stage web/cloud app with Convex and Wrangler
├── user-application/  # Electron + React desktop UI
└── stage-engine/      # Rust local engine sidecar
```

Shared package:

```txt
packages/data-ops/      # Shared Stage cloud/domain/contracts layer
```

Important: `data-ops` is the intended clean layer for shared Zod contracts and project context. Do not duplicate project-context schemas randomly across desktop and Rust.

Use these paths for local commands, GitHub Actions, and Cloudflare settings:

```txt
apps/user-application/  # Electron desktop UI package path
apps/stage-engine/      # Rust sidecar Cargo manifest path
apps/web-application/   # Web/cloud app path with package.json and wrangler.jsonc
```

Important current note: this branch currently exposes the desktop UI package and the Rust sidecar. If a GitHub or Cloudflare setting still points at old `desktop/` or `app/` paths, update it to the matching `apps/...` path above.

Cloudflare/Wrangler commands should run from `apps/web-application/`, because `wrangler.jsonc` uses paths relative to that folder:

```bash
cd apps/web-application
pnpm run build:testing
npx wrangler deploy -e testing
```

Equivalent package script:

```bash
cd apps/web-application
pnpm run testing:deploy
```

Rust CI checks can run from the repository root:

```bash
cargo fmt --manifest-path apps/stage-engine/Cargo.toml --check
cargo check --manifest-path apps/stage-engine/Cargo.toml
```

## Rust Toolchain Status

Rust is now available locally:

```txt
cargo 1.95.0
```

`rustfmt` was installed with:

```bash
rustup component add rustfmt
```

The Rust sidecar now passes:

```bash
cargo fmt --manifest-path apps/stage-engine/Cargo.toml
cargo check --manifest-path apps/stage-engine/Cargo.toml
cargo run --manifest-path apps/stage-engine/Cargo.toml
```

## Intended First Runtime Contract

```txt
GET /v1/health
GET /v1/readiness
GET /v1/version
WS  /v1/events
```

Current first WebSocket command:

```json
{
  "apiVersion": "v1",
  "id": "smoke-ping",
  "type": "engine.ping",
  "payload": {},
  "createdAt": 1778066547538
}
```

Expected response:

```json
{
  "apiVersion": "v1",
  "id": "smoke-ping:ready",
  "commandId": "smoke-ping",
  "jobId": null,
  "type": "engine.ready",
  "payload": {
    "kind": "ready",
    "service": "stage-engine",
    "ready": true,
    "timestampMs": 1778066547538
  },
  "createdAt": 1778066547538
}
```

Current Rust sidecar verification:

```bash
cargo fmt --manifest-path apps/stage-engine/Cargo.toml --check
cargo check --manifest-path apps/stage-engine/Cargo.toml
cargo run --manifest-path apps/stage-engine/Cargo.toml
curl http://127.0.0.1:48221/v1/health
curl http://127.0.0.1:48221/v1/readiness
curl http://127.0.0.1:48221/v1/version
```

## Verification Log

- `pnpm run typecheck` in `apps/user-application/` passes after adding the Rust sidecar files.
- `pnpm run build` in `apps/user-application/` passes after adding the Rust sidecar files.
- `pnpm run typecheck` in `apps/user-application/` passes after moving `desktop/` to `apps/user-application/`.
- `pnpm run build` in `apps/user-application/` passes after moving `desktop/` to `apps/user-application/`.
- `pnpm run typecheck` in `apps/web-application/` passes after moving `app/` to `apps/web-application/`.
- `rustup component add rustfmt` completed successfully.
- `cargo fmt --manifest-path apps/stage-engine/Cargo.toml` passes.
- `cargo check --manifest-path apps/stage-engine/Cargo.toml` passes.
- `cargo run --manifest-path apps/stage-engine/Cargo.toml` starts the local server on `127.0.0.1:48221`.
- `curl http://127.0.0.1:48221/v1/health` returns `status: "ok"`.
- `curl http://127.0.0.1:48221/v1/readiness` returns `ready: true` with provider/WebSocket checks intentionally `false`.
- `curl http://127.0.0.1:48221/v1/version` returns `version: "0.1.0"` and `rustEdition: "2024"`.
- Added Axum WebSocket support for `GET /v1/events`.
- Added typed Rust command/event models for `engine.ping` and `engine.ready`.
- `cargo fmt --manifest-path apps/stage-engine/Cargo.toml` passes after WebSocket changes.
- `cargo check --manifest-path apps/stage-engine/Cargo.toml` passes after WebSocket changes.
- Local smoke test on port `48222` returned HTTP health/readiness/version responses and a WebSocket `engine.ready` event for `engine.ping`.
- Created `packages/data-ops` and pushed it in commit `ce6aba9`.
- `packages/data-ops` dependencies were installed locally.
- `packages/data-ops` typecheck passed locally.
- `pnpm run typecheck` in `apps/user-application/` passes after data-ops was created.
- `pnpm run build` in `apps/user-application/` passes after data-ops was created.
- Added `@stage/data-ops` as the shared package dependency in `apps/user-application`;
  as of May 28 this uses the root monorepo `workspace:*` dependency boundary.
- Added a desktop read adapter that maps a Convex-like selected project/read-model shape into `ProjectContext`.
- The selected desktop project context is validated by `projectContextSchema` before the dashboard or critique panel consumes it.
- The dashboard header and critique mock now read from the shared `ProjectContext` path instead of isolated local copy.
- `pnpm run typecheck` in `packages/data-ops/` passes after the desktop project-context bridge.
- `pnpm run typecheck` in `apps/user-application/` passes after the desktop project-context bridge.
- `pnpm run build` in `apps/user-application/` passes after the desktop project-context bridge.
- Added Electron main-process `SidecarSupervisor` in `apps/user-application/electron/sidecar.ts`.
- Electron now starts the Rust sidecar on app ready, reuses an existing ready service on the same port, polls `/v1/readiness`, and stops only the child process it owns on app quit.
- Sidecar startup failure is logged without crashing the desktop window.
- `pnpm run typecheck` in `apps/user-application/` passes after the Electron sidecar supervisor.
- `pnpm run build` in `apps/user-application/` passes after the Electron sidecar supervisor.
- `cargo check --manifest-path apps/stage-engine/Cargo.toml` passes after the Electron sidecar supervisor.
- `pnpm run typecheck` in `packages/data-ops/` passes after the Electron sidecar supervisor.
- Added typed `EngineStatus` Zod model in `apps/user-application/shared/models/desktop.ts`.
- Added `engine:get-status` IPC and `window.stageDesktop.engine.getStatus()`.
- Added `useEngineStatus()` in the renderer.
- Dashboard header now shows a small engine readiness status from the supervised sidecar.
- `pnpm run typecheck` in `apps/user-application/` passes after the renderer engine status bridge.
- `pnpm run build` in `apps/user-application/` passes after the renderer engine status bridge.
- Added Electron main-process desktop auth controller in `apps/user-application/electron/auth.ts`.
- Registered the `stage://` custom protocol from Electron main.
- Added running-app and queued/cold-start callback handling for `stage://auth`.
- Updated `auth.openLogin` to launch the desktop auth route with a state nonce and `stage://auth` redirect URI.
- Local dev defaults to `https://testing.getstage.co/auth/desktop`; packaged production defaults to `https://getstage.co/auth/desktop`; `STAGE_DESKTOP_AUTH_URL` can override either.
- Persisted only the short-lived auth state nonce in Electron user data so callback validation can survive cold-start.
- Added a visible Account settings login launcher that calls `window.stageDesktop.auth.openLogin()`.
- Added placeholder in-memory session exchange for the callback path; secure session storage remains next.
- `pnpm run typecheck` in `apps/user-application/` passes after desktop auth launcher/deep-link implementation.
- Added `apps/user-application/electron/helpers/` to keep Electron constants, types, URL helpers, timing helpers, sidecar helpers, and default permission state out of orchestration files.
- `pnpm run typecheck` in `apps/user-application/` passes after the Electron helper refactor.
- `pnpm run build` in `apps/user-application/` passes after the Electron helper refactor.
- `pnpm run typecheck` in `packages/data-ops/` passes after the Electron helper refactor.
- `cargo check --manifest-path apps/stage-engine/Cargo.toml` passes after the Electron helper refactor.
- `git diff --check` passes after the Electron helper refactor.
- Replaced desktop login API-key bridge with Convex Auth JWT handoff from the signed-in website session.
- Added `GET /api/v1/me` so Electron can verify a bearer token before storing a desktop session.
- Fixed `/auth/desktop` routing so the desktop handoff child route is not swallowed by the normal `/auth` page.
- Changed local development handoff from browser `fetch()` to a form POST to `http://127.0.0.1:48224/auth`, avoiding localhost CORS/private-network fetch failures.
- Local Electron callback server accepts both JSON and form-encoded desktop auth payloads.
- Desktop now displays `name` or `email` before falling back to `userId`.
- Added `auth:session-changed` IPC so the renderer refreshes session and selected project context after successful login without a manual reload.
- `pnpm run typecheck` in `apps/web-application/` passes after auth route fixes.
- `pnpm run build:testing` in `apps/web-application/` passes after auth route fixes.
- `pnpm run typecheck` in `apps/user-application/` passes after session refresh/display fixes.
- `pnpm run build` in `apps/user-application/` passes after session refresh/display fixes.

## Notes

- Electron now supervises the Rust sidecar lifecycle, but no provider execution or file scanning is connected yet.
- The Rust WebSocket boundary now exists, but it is intentionally minimal.
- The desktop now consumes selected project context through `packages/data-ops`; the live Convex subscription path is still deferred.
- Renderer can read engine status through the preload bridge.
- WebSocket event forwarding is still pending.
- Desktop auth can launch the website desktop auth route and accept validated local dev callback / packaged `stage://auth` callbacks.
- Secure desktop session storage is implemented through Electron main and `safeStorage`.
- Electron helper functions and constants now live under `apps/user-application/electron/helpers/` instead of the main controller files.
- Local dev desktop auth uses a localhost Electron callback server instead of relying on macOS `stage://` protocol registration, because macOS can route un-packaged dev links to the generic Electron app.
- Rust/Axum clean-architecture references are recorded in `05-05-stage-monorepo-architecture.md`; use them as guidance when the sidecar grows real domains, not as a reason to over-layer the current skeleton.
- Desktop session storage now uses Electron main plus `safeStorage` encrypted `userData`; renderer receives redacted session status only.
- Desktop selected project context now goes through Electron main and the Stage website `/api/v1` routes with the stored desktop token.
- The testing website route `/auth/desktop` now hands off the existing Convex Auth JWT instead of generating a developer API key.
- The desktop renderer refreshes after login through `auth:session-changed`; manual reload is no longer required for the account label/project-context query refresh.
- May 9 auth correction: no Convex desktop auth tables were added. The API-key bridge was removed from desktop login because it caused `desktop-dev-user` fallback and active API-key limit errors. See `05-09-desktop-auth-deep-link-plan.md`.
- Email lifecycle note: we can track per-user download intent after login/onboarding by firing a Convex mutation when the logged-in user clicks the macOS download CTA. Store that event on the user or a lifecycle-events table, for example `user.app_download_clicked` with `downloadClickedAt`. This is reliable for "clicked download"; use first desktop auth/open as the stronger proof that the app was actually opened.
- Figma and Notion remain production V1 scope, but they should come after the sidecar/chat/file-search foundation.

## Current Status Summary

We are through the monorepo move and the first Rust sidecar skeleton.

Done:

- Electron desktop UI path is `apps/user-application/`.
- Rust local engine path is `apps/stage-engine/`.
- Shared domain/contracts package path is `packages/data-ops/`.
- Rust installs and runs locally.
- `cargo fmt`, `cargo check`, and `cargo run` pass for `apps/stage-engine/Cargo.toml`.
- `/v1/health`, `/v1/readiness`, and `/v1/version` respond locally.
- `/v1/events` accepts WebSocket connections.
- `engine.ping` returns `engine.ready`.
- `packages/data-ops` now contains first Zod contracts for `EngineCommand`, `EngineEvent`, and `ProjectContext`.
- `apps/user-application` now imports `@stage/data-ops`.
- Desktop selected project context is shaped through `projectContextSchema`.
- Dashboard and critique mocks consume the validated selected `ProjectContext`.
- Desktop auth/deep-link plan is documented in `apps/user-application/docs/05-09/05-09-desktop-auth-deep-link-plan.md`.
- Electron main starts, readiness-checks, and shuts down the Rust sidecar.
- Renderer reads engine status through a typed IPC/preload bridge.
- Desktop auth launcher and local dev / `stage://auth` callback handling exist.
- Secure desktop session storage exists.
- Desktop can fetch selected project context dynamically through the website API when a session token exists.
- Desktop auth was tested successfully with a real testing user and now shows the real user display identity instead of `desktop-dev-user` or only the raw user id.

Not done yet:

- Token refresh/logout.
- Direct Convex subscription in the desktop app.
- Replace remaining visible demo-only dashboard/sidebar data with live, loading, empty, or clearly marked fallback states.
- Web lifecycle events for Resend Automations: `user.signed_up`, `user.app_download_clicked`, `user.app_opened`, `user.onboarding_complete`, and `user.payment_confirmed`.
- Provider detection, file scanner, design critique, voice, Figma, and Notion layers.

Next safe step:

```txt
Auth and the core live selected-project-context bridge are now working.
Before Step 24, replace remaining visible demo-only UI with live/loading/empty/fallback states.
Do not start provider execution until this stabilization pass is committed and tested.
```

## 09-05 Clean Auth Work Log

What changed in code:

```txt
apps/web-application/src/routes/auth.desktop.tsx
  now reads the existing Convex Auth token with useAuthToken()
  no longer calls developer.apiKeys.generate for desktop login
  uses form POST for local dev handoff instead of browser fetch to localhost

apps/web-application/src/components/settings/AccountTab.tsx
  local testing shortcut now starts the local Electron callback server flow

apps/web-application/src/routes/auth.tsx
  renders /auth normally but lets /auth/desktop render as its own child route
  fixes the bug where authenticated users were sent to /dashboard before handoff ran

apps/web-application/convex/api/index.ts
  adds GET /api/v1/me for desktop token verification

apps/web-application/convex/api/auth.ts
  accepts either a developer API key or a Convex Auth bearer token
  keeps API-key auth for developer/API routes

apps/user-application/electron/auth.ts
  rejects developer API keys for desktop login
  verifies the Convex Auth token against /api/v1/me before storing it
  emits auth:session-changed after storing a verified desktop session
  logs the verified display identity without logging the raw token

apps/user-application/electron/helpers/auth-callback-server.ts
  accepts local POST handoff from the website
  validates the callback payload with Zod
  allows browser private-network CORS preflight for testing.getstage.co -> 127.0.0.1
  accepts application/x-www-form-urlencoded form payloads for the local dev callback

apps/user-application/electron/preload.ts
  exposes auth.onSessionChanged(callback) as a preload-safe subscription

apps/user-application/src/app/WorkspaceFrame.tsx
  displays session name/email before user id
  invalidates session and selected project context queries after auth:session-changed

apps/user-application/src/settings/components/SettingsPageView.tsx
  updates Account settings automatically when the desktop session changes

apps/web-application/src/components/auth/AuthPage.tsx
  preserves local desktop redirect_uri values through /auth without relying only on storage

apps/user-application/shared/models/desktop.ts
  adds Zod schemas for desktop auth handoff and verified user identity
```

Verification run on May 9:

```txt
packages/data-ops: pnpm run typecheck passed
apps/user-application: pnpm run typecheck passed
apps/user-application: pnpm run build passed
apps/web-application: pnpm run typecheck passed
apps/web-application: pnpm run build:testing passed
git diff --check passed
manual testing.getstage.co -> local Electron login passed after route and form-post fixes
```

What is intentionally not changed:

```txt
No new Convex desktop auth tables.
No API-key based desktop login.
No auth/onboarding/billing moved into Electron.
No raw token stored in renderer.
No direct Convex subscriptions in desktop yet.
```

Current risk:

```txt
Current auth works locally against testing.getstage.co. True refresh-token
rotation is intentionally deferred for launch; monthly re-login is accepted.
Visible desktop UI still has some deferred fallback/mock areas before provider work.
The desktop must be restarted after Electron main-process auth changes during local development.
```

## Next Agent Task

Goal:

```txt
Verify Step 23 stabilization, without moving auth/onboarding/billing out of apps/web-application.
```

Recommended order:

1. Read `apps/user-application/docs/05-05-stage-monorepo-architecture.md`.
2. Read this tracker.
3. Read `apps/user-application/docs/05-09/05-09-desktop-auth-deep-link-plan.md`.
4. Verify no-session desktop boot shows the sign-in screen.
5. Verify browser login returns to desktop and refreshes without manual reload.
6. Verify logout returns to the same sign-in screen.
7. Run:

```bash
cd packages/data-ops && pnpm run typecheck
cd ../../apps/user-application && pnpm run typecheck && pnpm run build
```

Do not start provider execution, file scanner, Figma, or Notion work until the sidecar lifecycle is stable.

Auth note:

```txt
Live Convex data in the desktop app requires desktop auth first.
Website auth/onboarding/billing/payments remain in apps/web-application.
Desktop auth should use browser login + stage://auth callback, not an embedded webview.
```
