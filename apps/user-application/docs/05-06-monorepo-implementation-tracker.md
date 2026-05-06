# Stage Monorepo Implementation Tracker

Date: May 6, 2026  
Branch: `monorepo`  
Status: In progress
Latest pushed checkpoint: `ce6aba9 created data ops`

## Scope

This tracker follows the first real implementation pass for the Stage Desktop monorepo architecture.

Current goal:

```txt
Electron remains stable in `apps/user-application/`.
Rust sidecar boundary starts small.
No UI redesign work.
No Convex wiring.
No Figma/Notion implementation yet.
No SQLite.
No local AI inference.
```

## Step Tracker

- [x] 1. Confirm branch is `monorepo`.
- [x] 2. Confirm desktop TypeScript still typechecks from `apps/user-application/`.
- [x] 3. Create `apps/data-service/` Rust sidecar folder.
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
- [ ] 18. Add Electron sidecar supervisor.
- [ ] 19. Add renderer engine status bridge.
- [ ] 20. Add desktop auth launcher and `stage://auth` deep-link callback plan/implementation.
- [ ] 21. Add secure desktop session storage and authenticated boot state.
- [ ] 22. Wire live Convex-backed selected project context after desktop auth works.
- [ ] 23. Add fake provider runner that receives typed project context.
- [ ] 24. Add Codex/Claude provider detection.
- [ ] 25. Add deep file scanner.
- [ ] 26. Add `.codex` / `.claude` discovery.
- [ ] 27. Add design critique job pipeline.
- [ ] 28. Add cloud voice transcription flow.
- [ ] 29. Add basic Figma integration layer.
- [ ] 30. Add basic Notion integration layer.

## Current Files Added

```txt
apps/data-service/Cargo.toml
apps/data-service/README.md
apps/data-service/src/main.rs
apps/data-service/src/app.rs
apps/data-service/src/config/mod.rs
apps/data-service/src/helpers/mod.rs
apps/data-service/src/helpers/time.rs
apps/data-service/src/models/commands.rs
apps/data-service/src/models/events.rs
apps/data-service/src/models/mod.rs
apps/data-service/src/models/status.rs
apps/data-service/src/observability/mod.rs
apps/data-service/src/server/events.rs
apps/data-service/src/server/mod.rs
apps/data-service/src/server/status.rs
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
apps/user-application/docs/05-06-desktop-auth-deep-link-plan.md
```

## Current App Layout

```txt
apps/
├── web-application/   # Existing Stage web/cloud app with Convex and Wrangler
├── user-application/  # Electron + React desktop UI
└── data-service/      # Rust local engine sidecar
```

Shared package:

```txt
packages/data-ops/      # Shared Stage cloud/domain/contracts layer
```

Important: `data-ops` is the intended clean layer for shared Zod contracts and project context. Do not duplicate project-context schemas randomly across desktop and Rust.

Use these paths for local commands, GitHub Actions, and Cloudflare settings:

```txt
apps/user-application/  # Electron desktop UI package path
apps/data-service/      # Rust sidecar Cargo manifest path
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
cargo fmt --manifest-path apps/data-service/Cargo.toml --check
cargo check --manifest-path apps/data-service/Cargo.toml
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
cargo fmt --manifest-path apps/data-service/Cargo.toml
cargo check --manifest-path apps/data-service/Cargo.toml
cargo run --manifest-path apps/data-service/Cargo.toml
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
    "service": "stage-data-service",
    "ready": true,
    "timestampMs": 1778066547538
  },
  "createdAt": 1778066547538
}
```

Current Rust sidecar verification:

```bash
cargo fmt --manifest-path apps/data-service/Cargo.toml --check
cargo check --manifest-path apps/data-service/Cargo.toml
cargo run --manifest-path apps/data-service/Cargo.toml
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
- `cargo fmt --manifest-path apps/data-service/Cargo.toml` passes.
- `cargo check --manifest-path apps/data-service/Cargo.toml` passes.
- `cargo run --manifest-path apps/data-service/Cargo.toml` starts the local server on `127.0.0.1:48221`.
- `curl http://127.0.0.1:48221/v1/health` returns `status: "ok"`.
- `curl http://127.0.0.1:48221/v1/readiness` returns `ready: true` with provider/WebSocket checks intentionally `false`.
- `curl http://127.0.0.1:48221/v1/version` returns `version: "0.1.0"` and `rustEdition: "2024"`.
- Added Axum WebSocket support for `GET /v1/events`.
- Added typed Rust command/event models for `engine.ping` and `engine.ready`.
- `cargo fmt --manifest-path apps/data-service/Cargo.toml` passes after WebSocket changes.
- `cargo check --manifest-path apps/data-service/Cargo.toml` passes after WebSocket changes.
- Local smoke test on port `48222` returned HTTP health/readiness/version responses and a WebSocket `engine.ready` event for `engine.ping`.
- Created `packages/data-ops` and pushed it in commit `ce6aba9`.
- `packages/data-ops` dependencies were installed locally.
- `packages/data-ops` typecheck passed locally.
- `pnpm run typecheck` in `apps/user-application/` passes after data-ops was created.
- `pnpm run build` in `apps/user-application/` passes after data-ops was created.
- Added `@stage/data-ops` as a local `file:../../packages/data-ops` dependency in `apps/user-application`.
- Added a desktop read adapter that maps a Convex-like selected project/read-model shape into `ProjectContext`.
- The selected desktop project context is validated by `projectContextSchema` before the dashboard or critique panel consumes it.
- The dashboard header and critique mock now read from the shared `ProjectContext` path instead of isolated local copy.
- `pnpm run typecheck` in `packages/data-ops/` passes after the desktop project-context bridge.
- `pnpm run typecheck` in `apps/user-application/` passes after the desktop project-context bridge.
- `pnpm run build` in `apps/user-application/` passes after the desktop project-context bridge.

## Notes

- This is intentionally not connected to Electron yet.
- The Rust WebSocket boundary now exists, but it is intentionally minimal.
- The desktop now consumes selected project context through `packages/data-ops`; the live Convex subscription path is still deferred.
- Electron sidecar supervision should come after the first `data-ops` contracts exist, so engine commands already have the right project-context shape.
- Figma and Notion remain production V1 scope, but they should come after the sidecar/chat/file-search foundation.

## Current Status Summary

We are through the monorepo move and the first Rust sidecar skeleton.

Done:

- Electron desktop UI path is `apps/user-application/`.
- Rust local engine path is `apps/data-service/`.
- Shared domain/contracts package path is `packages/data-ops/`.
- Rust installs and runs locally.
- `cargo fmt`, `cargo check`, and `cargo run` pass for `apps/data-service/Cargo.toml`.
- `/v1/health`, `/v1/readiness`, and `/v1/version` respond locally.
- `/v1/events` accepts WebSocket connections.
- `engine.ping` returns `engine.ready`.
- `packages/data-ops` now contains first Zod contracts for `EngineCommand`, `EngineEvent`, and `ProjectContext`.
- `apps/user-application` now imports `@stage/data-ops`.
- Desktop selected project context is shaped through `projectContextSchema`.
- Dashboard and critique mocks consume the validated selected `ProjectContext`.
- Desktop auth/deep-link plan is documented in `apps/user-application/docs/05-06-desktop-auth-deep-link-plan.md`.

Not done yet:

- Desktop auth launcher and `stage://auth` callback implementation.
- Secure desktop session storage.
- Live Convex-backed project context subscription in the desktop app.
- Electron sidecar supervisor.
- Renderer engine status bridge.
- Provider detection, file scanner, design critique, voice, Figma, and Notion layers.

Next safe step:

```txt
Add Electron sidecar supervisor before provider/deep-integration work.
```

## Next Agent Task

Goal:

```txt
Add the Electron sidecar supervisor for apps/data-service, without starting provider execution yet.
```

Recommended order:

1. Read `apps/user-application/docs/05-05-stage-monorepo-architecture.md`.
2. Read this tracker.
3. Inspect `apps/user-application/electron/main.ts`, `windows.ts`, `ipc.ts`, and `preload.ts`.
4. Inspect `apps/data-service/README.md` and `apps/data-service/src/config/mod.rs`.
5. Add an Electron main-process sidecar manager with start, readiness polling, and shutdown.
6. Keep the renderer behind the preload bridge; do not expose shell/process access.
7. Do not mix desktop auth/deep-link implementation into the sidecar supervisor change.
8. Add the smallest IPC/status surface needed for the renderer bridge in Step 19.
9. Run:

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
