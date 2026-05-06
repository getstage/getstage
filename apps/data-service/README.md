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

## Run Locally

Rust is required before this can be run:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
rustup default stable
cargo --version
```

Then run the sidecar:

```bash
cargo run --manifest-path apps/data-service/Cargo.toml
```

Optional port override:

```bash
STAGE_ENGINE_PORT=48221 cargo run --manifest-path apps/data-service/Cargo.toml
```

Test the endpoints:

```bash
curl http://127.0.0.1:48221/v1/health
curl http://127.0.0.1:48221/v1/readiness
curl http://127.0.0.1:48221/v1/version
```

## Current Limitation

On this machine, `cargo` was not available when the skeleton was created. The code is structured for Rust, but it still needs a local Rust toolchain before `cargo check` can verify it.

After Rust is installed, run:

```bash
cargo fmt --manifest-path apps/data-service/Cargo.toml
cargo check --manifest-path apps/data-service/Cargo.toml
```
