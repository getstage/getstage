# Research testing (desktop)

## What broke "Engine offline"

Electron starts Stage Engine with `cargo run`. On a cold machine that compile can take 1–3 minutes.

The sidecar only waited ~10 seconds for readiness, then killed the process (`SIGTERM`). Fix: `predev` now runs `cargo build` first, and readiness waits up to ~2 minutes.

## Quick test

```bash
# terminal 1 — once, or when Convex functions changed
cd packages/data-ops
npx convex dev

# terminal 2
cd apps/user-application
cp .env.example .env   # first time only — then add your token
pnpm dev
```

First run may take a few minutes while Rust builds. Later runs are fast.

## In the app

1. Log in
2. **Settings → Integrations** → enable **Claude** or **Codex**
3. Open a project → **Research** tab
4. Click **Run Research**

**Success:** sections fill with real data (not Zapier/Stripe fixtures).

**Failure:** red error on Research tab, or dashboard shows **Engine offline**. Check the terminal for `[stage-engine]` lines.

## If engine still offline

Pre-build manually, then start the app:

```bash
cd apps/stage-engine
cargo build
cd ../user-application
pnpm dev
```

Check readiness:

```bash
curl http://127.0.0.1:48221/v1/readiness
```

Should return `"ready": true`.

## Token note

Put `REFERO_MCP_TOKEN` in `apps/user-application/.env` (see `.env.example`). Electron loads it on startup and passes it to Stage Engine. Do not commit `.env`.
