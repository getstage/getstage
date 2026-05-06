# Stage Monorepo Implementation Tracker

Date: May 6, 2026  
Branch: `monorepo`  
Status: In progress

## Scope

This tracker follows the first real implementation pass for the Stage Desktop monorepo architecture.

Current goal:

```txt
Electron remains stable.
Rust sidecar boundary starts small.
No UI redesign work.
No Convex wiring.
No Figma/Notion implementation yet.
No SQLite.
No local AI inference.
```

## Step Tracker

- [x] 1. Confirm branch is `monorepo`.
- [x] 2. Confirm desktop TypeScript still typechecks.
- [x] 3. Create `apps/data-service/` Rust sidecar folder.
- [x] 4. Add Rust service skeleton with clear module folders.
- [x] 5. Add `/v1/health`, `/v1/readiness`, and `/v1/version` route code.
- [x] 6. Document how to run the Rust sidecar.
- [ ] 7. Install/verify local Rust toolchain.
- [ ] 8. Run `cargo fmt`.
- [ ] 9. Run `cargo check`.
- [ ] 10. Add WebSocket `/v1/events`.
- [ ] 11. Add typed `engine.ping -> engine.ready`.
- [ ] 12. Add Electron sidecar supervisor.
- [ ] 13. Add renderer engine status bridge.
- [ ] 14. Add fake provider runner.
- [ ] 15. Add Codex/Claude provider detection.
- [ ] 16. Add deep file scanner.
- [ ] 17. Add `.codex` / `.claude` discovery.
- [ ] 18. Add design critique job pipeline.
- [ ] 19. Add cloud voice transcription flow.
- [ ] 20. Add basic Figma integration layer.
- [ ] 21. Add basic Notion integration layer.

## Current Files Added

```txt
apps/data-service/Cargo.toml
apps/data-service/README.md
apps/data-service/src/main.rs
apps/data-service/src/app.rs
apps/data-service/src/config/mod.rs
apps/data-service/src/helpers/mod.rs
apps/data-service/src/helpers/time.rs
apps/data-service/src/models/mod.rs
apps/data-service/src/models/status.rs
apps/data-service/src/observability/mod.rs
apps/data-service/src/server/mod.rs
apps/data-service/src/server/status.rs
```

## Current Blocker

`cargo` is not installed or not available in the current shell:

```txt
zsh:1: command not found: cargo
```

So the Rust files are scaffolded but not yet validated by `cargo fmt` or `cargo check`.

Install Rust before the next Rust validation step:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
rustup default stable
cargo --version
```

## Intended First Runtime Contract

```txt
GET /v1/health
GET /v1/readiness
GET /v1/version
```

After Rust is available:

```bash
cargo fmt --manifest-path apps/data-service/Cargo.toml
cargo check --manifest-path apps/data-service/Cargo.toml
cargo run --manifest-path apps/data-service/Cargo.toml
curl http://127.0.0.1:48221/v1/health
curl http://127.0.0.1:48221/v1/readiness
curl http://127.0.0.1:48221/v1/version
```

## Verification Log

- `pnpm run typecheck` in `desktop/` passes after adding the Rust sidecar files.
- `pnpm run build` in `desktop/` passes after adding the Rust sidecar files.
- `cargo fmt` not run yet because `cargo` is unavailable.
- `cargo check` not run yet because `cargo` is unavailable.

## Notes

- This is intentionally not connected to Electron yet.
- The next safe implementation step is WebSocket + typed ping.
- Figma and Notion remain production V1 scope, but they should come after the sidecar/chat/file-search foundation.
