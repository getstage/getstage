# Stage Data Service

Status: Rust sidecar skeleton for the Stage Desktop monorepo.

This service is the local engine that will eventually own:

- local Codex/Claude CLI execution
- deep file search
- `.codex` / `.claude` discovery
- design critique jobs
- cloud voice transcription orchestration
- future macOS native bridges

The current first boundary is intentionally small:

```txt
GET /v1/health
GET /v1/readiness
GET /v1/version
```

## Install Rust

Rust is required before this service can be run. On macOS, install it with `rustup`:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
rustup default stable
cargo --version
rustc --version
```

When the installer asks what to do, choose the standard installation by pressing `Enter`.

If `cargo` is still not found after installation, open a new terminal or run:

```bash
source "$HOME/.cargo/env"
```

## Run Locally

From the repository root, run:

```bash
cargo fmt --manifest-path apps/data-service/Cargo.toml
cargo check --manifest-path apps/data-service/Cargo.toml
cargo run --manifest-path apps/data-service/Cargo.toml
```

The sidecar listens on `127.0.0.1:48221` by default.

Optional port override:

```bash
STAGE_ENGINE_PORT=48222 cargo run --manifest-path apps/data-service/Cargo.toml
```

Test the endpoints in another terminal:

```bash
curl http://127.0.0.1:48221/v1/health
curl http://127.0.0.1:48221/v1/readiness
curl http://127.0.0.1:48221/v1/version
```

Expected current state:

- `/v1/health` returns `status: "ok"`.
- `/v1/readiness` returns `ready: true`.
- `providerRuntimeReady` and `websocketReady` are still intentionally `false` until provider runtime and WebSocket support are implemented.
- `/v1/version` returns the crate version and Rust edition.

## CI Commands

Use this app path in GitHub Actions or other CI jobs:

```bash
cargo fmt --manifest-path apps/data-service/Cargo.toml --check
cargo check --manifest-path apps/data-service/Cargo.toml
```

For a local smoke test only:

```bash
cargo run --manifest-path apps/data-service/Cargo.toml
```
