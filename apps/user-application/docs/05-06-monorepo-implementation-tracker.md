# Stage Monorepo Implementation Tracker

Date: May 6, 2026  
Branch: `monorepo`  
Status: In progress

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
- [ ] 17. Wire desktop to consume Convex-backed project context through `data-ops` contracts.
- [ ] 18. Add Electron sidecar supervisor.
- [ ] 19. Add renderer engine status bridge.
- [ ] 20. Add fake provider runner that receives typed project context.
- [ ] 21. Add Codex/Claude provider detection.
- [ ] 22. Add deep file scanner.
- [ ] 23. Add `.codex` / `.claude` discovery.
- [ ] 24. Add design critique job pipeline.
- [ ] 25. Add cloud voice transcription flow.
- [ ] 26. Add basic Figma integration layer.
- [ ] 27. Add basic Notion integration layer.

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
```

## Current App Layout

```txt
apps/
├── web-application/   # Existing Stage web/cloud app with Convex and Wrangler
├── user-application/  # Electron + React desktop UI
└── data-service/      # Rust local engine sidecar
```

Planned shared package:

```txt
packages/data-ops/      # Shared Stage cloud/domain/contracts layer; not created yet
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

## Notes

- This is intentionally not connected to Electron yet.
- The Rust WebSocket boundary now exists, but it is intentionally minimal.
- The next safe implementation step is `packages/data-ops` contracts/domain setup, so Convex-backed project context has a clean typed path before provider work.
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

Not done yet:

- Convex-backed project context consumed through `data-ops`.
- Electron sidecar supervisor.
- Renderer engine status bridge.
- Provider detection, file scanner, design critique, voice, Figma, and Notion layers.

Next safe step:

```txt
Wire desktop Convex project context through packages/data-ops before provider/deep-integration work.
```
