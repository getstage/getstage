---
name: stage-monorepo-architect
description: Use when working on the Stage desktop monorepo architecture, especially Electron + React UI, Rust sidecar design, local Codex/Claude CLI execution, deep file search, design critique, voice input, and V1/V1.1/V2 release boundaries.
---

# Stage Monorepo Architect

This skill captures the project-specific architecture rules for Stage Desktop.

## Communication Rules

- Speak with Werner in concise German and briefly correct important German mistakes.
- Write every repository artifact, including Markdown, architecture documents, README files, code comments, and partner-facing plans, in English.
- Be strict and careful. Do not jump to implementation before the architecture boundary is clear.

## Product Boundary

Production V1 means the first live release and the first stable `/v1` engine API contract. It does not mean a rough prototype.

Production V1 includes:

- Full desktop monorepo migration.
- Electron + React + Vite + TanStack UI shell.
- Mock-first UI while architecture is still being decided.
- Rust sidecar process.
- Local Codex CLI execution.
- Local Claude CLI execution.
- Provider switching.
- Deep local file search.
- `.codex` discovery.
- `.claude` discovery.
- `AGENTS.md` and `CLAUDE.md` discovery.
- Design critique pipeline.
- Cloud-based voice transcription/conversion.
- Basic Figma integration.
- Basic Notion integration.

Production V1 excludes:

- SQLite.
- Local AI inference.
- Local model/GPU workers.
- `napi-rs`.
- Offline-first sync.
- Desktop billing/account/business flows.
- Desktop onboarding flows.
- Advanced native ScreenCaptureKit/AVFoundation bridges.

## Architecture Rules

- Electron owns the app lifecycle, windows, tray, shortcuts, preload bridge, and sidecar supervision.
- React owns UI rendering, routing, mock data, chat UI, streaming display, and permission states.
- Rust owns local heavy work: provider process execution, file scanning, queues, cancellation, and future native macOS bridges.
- Convex remains the cloud source of truth for Stage project data.
- The renderer must never directly access Node, local files, shell commands, Codex, Claude, or macOS APIs.
- The first Rust transport should be a localhost-only sidecar server with a per-session auth token.
- Use `/v1` routes and `apiVersion: "v1"` envelopes from the beginning.

## Codex-RS-Inspired Rules

Apply the OpenAI Codex-RS architecture lessons without copying its full scale:

- Keep protocol separate from transport.
- Keep core engine logic independent from UI.
- Treat file search as its own domain.
- Treat streaming output, output truncation, and child-process parsing as first-class infrastructure.
- Add `/v1/health` and `/v1/readiness` before real features.
- Keep secrets out of the renderer.
- Use structured tracing/logging from day one.
- Defer sandboxing/exec policy to later versions, but model permissions early.
- Start as modules in one Rust sidecar; split into crates only after boundaries are proven.

## Rust Defaults

Use now:

- Tokio
- mpsc channels
- serde
- thiserror
- anyhow
- tracing
- Axum
- WebSocket
- child process management
- bounded queues
- cancellation tokens

Use later:

- unsafe Rust
- FFI
- ScreenCaptureKit
- AVFoundation
- Accessibility API
- SQLite
- local model inference

Avoid now:

- Actix
- Diesel
- SeaORM
- sqlx
- embedded Rust concepts

## Implementation Style

- Prefer small folders/modules over large files.
- Put models/contracts in dedicated folders.
- Put helpers in dedicated folders.
- Add fake providers before real provider execution.
- Validate one boundary at a time: Rust health, readiness, WebSocket, typed ping, fake stream, real provider.
- Keep existing desktop mock/design work intact unless explicitly asked to change it.
