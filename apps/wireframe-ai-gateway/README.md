# Wireframe AI gateway

Stateless Rust gateway for Stage wireframe generation. It receives one authenticated batch from the local `stage-engine`, uses Rig with Nebius Token Factory, and returns typed TSX screens that share the supplied Stage design context. Retrieval, R2 access, per-screen validation, rendering and persistence remain local.

## Required environment

- `NEBIUS_API_KEY`
- `NEBIUS_MODEL`
- `STAGE_API_BASE_URL`

Optional configuration includes `PORT`, `NEBIUS_BASE_URL`, `NEBIUS_MAX_TOKENS` (default `32768`; omit this and Nebius may cap output at 8192; the gateway also sends `max_completion_tokens` and `reasoning_effort=minimal` so thinking cannot consume the whole budget), `MAX_CONCURRENT_GENERATIONS`, `MAX_REQUEST_BYTES`, `MAX_COMPONENT_BUNDLES`, `MAX_SOURCE_BYTES`, `WIREFRAME_PROVIDER_TIMEOUT_SECONDS` and `STAGE_AUTH_TIMEOUT_SECONDS`.

Run locally:

```bash
cargo run --manifest-path apps/wireframe-ai-gateway/Cargo.toml
```

Run the isolated live Nebius proof from the repository root after exporting
`NEBIUS_API_KEY` and `NEBIUS_MODEL` in the current shell:

```bash
cargo test --manifest-path apps/wireframe-ai-gateway/Cargo.toml \
  --test live_nebius -- --ignored --nocapture
```

The live test bypasses Stage authentication, Convex, R2 and the frontend. It proves only the typed Rig-to-Nebius batch boundary and intentionally performs one billable provider call.

The service binds to `0.0.0.0:$PORT` (default `48231` locally) for Railway compatibility. Deployment is intentionally not configured or performed yet.
