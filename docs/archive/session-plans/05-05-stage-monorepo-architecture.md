# Stage Desktop Monorepo Architecture

Date: May 5, 2026  
Status: Architecture planning document  
Scope: Desktop architecture, Rust local engine, local Codex/Claude execution, design critique, voice input, and monorepo migration

**Current product UI facts (Convex wiring, auth, deploy):** use
`apps/user-application/docs/05-10/05-10-current-state.md` and
`apps/user-application/docs/05-11/05-11-session-summary.md` — section 2 below
described the repo at migration time and is not the live checklist.

## 1. Executive Summary

Stage Desktop should become a native macOS-first desktop application with:

- Electron + React for the desktop user interface.
- A Rust sidecar process for local heavy work.
- Convex as the cloud source of truth for Stage project data.
- Local Codex and Claude CLI execution as the first AI execution path.
- Deep local file search and `.codex` / `.claude` discovery.
- Design critique based on screen context + Stage project context.
- Voice input using a cloud-based transcription / LLM model.

The strategic model is:

```txt
T3 Code is a generic GUI for local coding agents.
Stage is a project-aware design companion that runs local Codex/Claude agents,
understands local files, sees the screen, and injects Stage project context.
```

This is close to the Codex/T3 Code strategy, but Stage adds design-specific context:

- Client brief
- Brand strategy
- Approved visual direction
- Project assets
- Screen or Figma context
- Voice-triggered design critique

## 2. Current Repository State

The repository now uses the first clean `apps/` monorepo layout. This keeps the
existing web application separate from the new desktop application and the Rust
local engine.

Current important folders:

```txt
stage_mvp/
├── apps/
│   ├── web-application/   # Current web/cloud app with Convex
│   ├── user-application/  # Electron desktop UI app
│   └── stage-engine/      # Rust local engine sidecar
├── .agents/      # Installed agent skills
├── .claude/      # Local Claude config/worktrees
└── skills/       # Installed skills symlinks/copies
```

Current desktop facts:

- `apps/user-application/` contains Electron + React + Vite.
- `apps/user-application/electron/main.ts` owns the Electron lifecycle.
- `apps/user-application/electron/windows.ts` owns `BrowserWindow` creation.
- `apps/user-application/electron/preload.ts` exposes the safe renderer bridge.
- `apps/user-application/electron/ipc.ts` owns IPC handlers.
- `apps/user-application/shared/models/desktop.ts` already uses Zod.
- `apps/user-application/shared/ipc/channels.ts` centralizes IPC channel names.
- `apps/user-application/src/` contains mock UI for dashboard, projects, settings, companion, and critique panel.

Current Electron security baseline is good and should be preserved:

```txt
contextIsolation: true
nodeIntegration: false
sandbox: true
preload bridge only
```

## 3. Core Architecture Decision

Use this architecture:

```txt
Electron + React = UI, routing, windows, user interaction
Rust sidecar = local engine, file search, agent execution, queues, native work
Convex = cloud source of truth for Stage project data
Codex/Claude CLI = first AI execution route
Cloud transcription/LLM = first voice conversion route
```

Do not make Rust the UI.

Do not let React directly touch Node, filesystem, shell commands, Codex, Claude, or native macOS APIs.

The safe flow is:

```txt
React Renderer
  -> preload bridge
  -> Electron main process
  -> Rust sidecar
  -> local provider process / filesystem / native APIs
  -> Rust sidecar events
  -> Electron main process
  -> preload-safe renderer events
  -> React UI
```

## 4. OpenAI Codex-RS Learnings Applied To Stage

OpenAI Codex-RS is useful as an architecture reference because it solves a similar class of problem:

```txt
local agent UI
local execution
streaming output
provider/tool boundaries
file search
process supervision
safe contracts
```

Do not copy Codex-RS one-to-one. Codex is a mature, broad coding-agent system. Stage needs a smaller production V1 architecture that can grow in the same direction.

The concrete learnings we should apply:

| Codex-RS Pattern | Stage Decision |
|---|---|
| Cargo workspace split by capability | Start with clear Rust modules, split into crates only once module boundaries are proven |
| `core/` separate from `tui/`, `cli/`, and `exec/` | Keep Stage engine logic independent from Electron/React |
| `app-server`, `app-server-client`, `app-server-protocol`, `app-server-transport` | Treat protocol, transport, server, and client as separate concepts |
| `file-search` as its own crate | Make file scanning its own Rust module from day one |
| `protocol` and typed app protocol crates | Put command/event envelopes first, not after UI work |
| `utils/stream-parser`, `utils/output-truncation`, `utils/pty` | Treat CLI streaming, truncation, and child-process output as real product infrastructure |
| `utils/readiness` | Add readiness beside health before wiring real features |
| `secrets` and `keyring-store` | Keep secrets out of the renderer and isolate local/provider auth concerns |
| `sandboxing`, `execpolicy`, `shell-escalation` | Model permissions early, but do not build a full sandbox in production V1 |
| `skills` and `core-skills` | Keep agent skills as a first-class local/project concept |
| `otel`, `rollout`, `rollout-trace` | Add structured tracing/logging early; defer heavy telemetry |
| `exec` headless mode | Add a future headless/debug runner for engine jobs |

Recommended Stage interpretation:

```txt
Production V1:
  simple Rust sidecar
  module-based architecture
  stable /v1 protocol
  deep file scanner
  Codex/Claude provider runners
  streaming + cancellation
  readiness + health
  tracing logs

V1.1:
  stronger output parsing
  improved provider detection
  better file ranking
  more native macOS permissions

V2:
  split stable modules into separate Rust crates
  generated Rust/TypeScript contracts
  deeper sandbox/policy system
  local persistence
  native ScreenCaptureKit/AVFoundation bridges
```

The most important lesson:

```txt
Do not let the UI become the engine.
Do not let the transport become the protocol.
Do not let provider-specific parsing leak into the app-wide command model.
```

## 4.1 Rust Clean Architecture References

These repositories are useful Rust/Axum clean-architecture references while the Stage Rust sidecar grows:

- https://github.com/Thodin/axum-clean-architecture/
- https://github.com/kigawas/clean-axum
- https://github.com/codemountains/axum-ddd-explicit-architecture

How Stage should apply them:

- Keep the current sidecar small while it only owns health, readiness, WebSocket skeletons, and process supervision.
- Add clearer `domain`, `application`, `adapters`, and `infra` folders once the sidecar owns real engine behavior such as provider execution, file search, project-context ingestion, and critique jobs.
- Do not introduce repository/database-style layers until there is real persistence or external storage behind them.
- Keep HTTP/WebSocket transport separate from engine logic so future tests can exercise the engine without Axum.

## 5. Target Monorepo Shape

Final target:

```txt
stage_mvp/
├── apps/
│   ├── user-application/
│   │   ├── electron/
│   │   ├── src/
│   │   ├── shared/
│   │   └── package.json
│   │
│   └── stage-engine/
│       ├── Cargo.toml
│       └── src/
│
├── packages/
│   └── data-ops/
│       ├── convex/
│       ├── contracts/
│       ├── domain/
│       └── package.json
│
└── docs/
    └── architecture/
```

Important: avoid another big-bang migration after this app-level move. The app
folders are now separated; the remaining migration work should happen in smaller
package-level steps.

Recommended migration path from here:

```txt
Phase 0: Keep apps/user-application/ and apps/web-application/ working.
Phase 1: Write architecture docs.
Phase 2: Add Rust sidecar as apps/stage-engine/.
Phase 3: Prove the first runtime boundary: health/readiness/version, WebSocket, engine.ping -> engine.ready.
Phase 4: Create packages/data-ops for shared Zod contracts and domain models. # started
Phase 5: Wire Convex-backed project context through data-ops into the desktop app.
Phase 6: Add Electron sidecar supervisor using the established contracts.
```

## 6. Data-Ops Clarification

`data-ops` should not be a simple `shared-types` folder.

Better mental model:

```txt
data-ops = cloud/domain package
contracts = typed communication layer
Rust models = serde mirror of contracts
```

Current decision:

```txt
Convex remains the cloud source of truth.
packages/data-ops becomes the clean shared TypeScript layer for domain models and Zod contracts.
apps/user-application consumes project context through data-ops.
apps/stage-engine mirrors only the stable command/event/context shapes with serde.
```

Current implementation note, May 6:

```txt
packages/data-ops now exists with:
  contracts/engine-command.ts
  contracts/engine-event.ts
  contracts/project-context.ts
  domain/project-context.ts
  domain/design-critique.ts

It is now wired into apps/user-application as the desktop ProjectContext contract.
apps/web-application remains the owner of deployed Convex functions and HTTP API routes.
It was pushed on monorepo in commit ce6aba9.
```

This keeps Convex, desktop, and Rust aligned without letting React or Rust invent separate project-context models.

### Convex Integration Boundary

Convex is the cloud source of truth, but the desktop integration must be precise:

```txt
apps/web-application
  owns Convex Auth
  owns onboarding/payments/account state
  owns deployed Convex functions
  owns /auth/desktop
  owns /api/v1 routes backed by Convex

apps/user-application Electron main
  owns stage:// callback handling
  owns secure desktop session storage
  owns API-token usage
  fetches selected ProjectContext through website /api/v1 routes

apps/user-application renderer
  owns UI rendering
  receives only redacted auth status and sanitized ProjectContext on the
  Electron-main API path
  may use direct Convex for product data after the desktop-first migration is
  verified
  must not store raw tokens or call privileged APIs

apps/stage-engine Rust
  owns local engine work
  receives stable ProjectContext payloads when jobs need cloud context
```

Current desktop Convex status:

```txt
Done:
  website route /auth/desktop exists
  website Settings -> Account can explicitly open Stage Desktop for testing
  Convex Auth redirect callback is explicit in apps/web-application/convex/auth.ts
  Electron stage:// callback path exists
  Electron safeStorage session path exists
  desktop API-key bridge has been replaced with Convex Auth JWT handoff
  Electron verifies the token through GET /api/v1/me before storing a session
  local dev handoff works through http://127.0.0.1:48224/auth form POST
  auth:session-changed updates renderer session/project-context queries without manual reload
  Electron main can request selected ProjectContext through /api/v1
  ProjectContext is validated through packages/data-ops
  logout clears safeStorage and broadcasts auth:session-changed
  no-session desktop boot shows a native sign-in launcher screen
  30-day JWT stopgap is the chosen launch path

Not done:
  optional final one-time desktop auth code exchange for production hardening
  true refresh-token rotation (deferred beyond launch test cycle)
  full direct desktop Convex migration for all cloud product data
```

Important wording rule:

```txt
"Convex connected" means the desktop has a working cloud data path through
Electron main and the website API. It does not yet mean that every desktop UI
panel is realtime or free of fallback data.

For the current testing bridge, the website may open Electron directly from Account settings
or from the desktop login launcher. The bridge uses the signed-in Convex Auth JWT, not
developer API keys. The final production path may still become a one-time desktop auth
code exchange if we want the callback to avoid carrying a bearer token.
```

Recommended future structure:

```txt
packages/data-ops/
├── convex/
│   ├── schema.ts
│   ├── auth.ts
│   ├── projects.ts
│   ├── projectAi.ts
│   ├── r2.ts
│   └── _generated/
│
├── contracts/
│   ├── engine-commands.ts
│   ├── engine-events.ts
│   ├── agent-provider.ts
│   ├── file-context.ts
│   ├── screen-context.ts
│   └── voice.ts
│
├── domain/
│   ├── project-context.ts
│   ├── design-critique.ts
│   └── agent-session.ts
│
└── package.json
```

Phase 1 contract strategy:

- TypeScript uses Zod schemas.
- Rust manually mirrors these with `serde` structs.
- Keep this simple and understandable first.

Phase 2 contract strategy:

- Add schema/code generation once contracts stabilize.
- Possible future options:
  - TypeScript Zod to JSON Schema to Rust
  - Rust structs to TypeScript
  - OpenAPI/JSON Schema as a neutral contract layer

Do not introduce codegen on day one.

### Data-Ops Extraction Order

Create `packages/data-ops` before deep provider, file-search, Figma, or Notion work.

First extraction should be intentionally small:

```txt
packages/data-ops/
├── contracts/
│   ├── engine-command.ts
│   ├── engine-event.ts
│   └── project-context.ts
├── domain/
│   ├── project-context.ts
│   └── design-critique.ts
└── package.json
```

Do not move the full Convex backend immediately. Keep deployed Convex functions in `apps/web-application/convex` until the package boundaries are stable.

Later, move Convex code in smaller pieces:

```txt
apps/web-application/convex -> packages/data-ops/convex
```

The first useful goal is:

```txt
Convex project data
  -> data-ops ProjectContext Zod schema
  -> website /api/v1 selected project-context reads
  -> Electron main authenticated fetch
  -> desktop selected ProjectContext
  -> engine command payload
  -> Rust serde mirror
```

## 7. First Product Scope

In scope now:

- Desktop UI mock/design migration
- Full desktop monorepo migration before production V1 release
- Companion chat UI
- Voice input for companion commands/chat
- Cloud-based voice transcription / LLM conversion
- Local Codex CLI execution
- Local Claude CLI execution
- Provider switching
- Deep local file search
- `.codex` discovery
- `.claude` discovery
- `AGENTS.md` / `CLAUDE.md` discovery
- Project context injection from Convex
- Design critique from screen capture + project context
- Streaming responses
- Job cancellation
- Provider process supervision
- Permission status display
- Basic Figma integration for production V1
- Basic Notion integration for production V1

Out of scope for the first architecture build:

- SQLite-first local database
- Local AI inference
- Ambient research mode
- Focus sessions
- Full offline-first sync
- `napi-rs` native module
- Embedded Rust concepts like RTOS, `no_std`, `embedded-hal`, `probe-rs`, `heapless`, `embassy`
- Desktop billing/account/business flows
- Desktop onboarding flows
- Advanced Figma automation beyond the production V1 integration
- Advanced Notion handoff automation beyond the production V1 integration

Billing, account, business flows, and onboarding remain website responsibilities unless explicitly moved later.

## 8. Electron Responsibilities

Electron main process owns:

```txt
apps/user-application/electron/
├── main.ts
├── windows.ts
├── ipc.ts
├── preload.ts
├── tray.ts
├── shortcuts.ts
├── deep-links.ts
├── permissions.ts
├── sidecar/
│   ├── process.ts
│   ├── health.ts
│   ├── restart.ts
│   └── websocket.ts
└── helpers/
    ├── logger.ts
    └── env.ts
```

Electron must handle:

- App lifecycle
- Single instance lock
- Main window
- Companion window
- Floating overlay window
- Global shortcuts
- Tray/menu
- Deep links
- Opening browser auth
- Spawning Rust sidecar
- Restarting Rust sidecar
- Validating IPC requests
- Forwarding safe events to renderer

Electron must not:

- Run heavy file indexing itself
- Run Codex/Claude directly from React
- Expose unrestricted `ipcRenderer`
- Expose filesystem access directly to renderer
- Store long-lived OAuth/provider secrets in renderer

## 9. React Renderer Responsibilities

React owns:

```txt
apps/user-application/src/
├── app/
├── companion/
├── dashboard/
├── project/
├── settings/
├── integrations/
├── agent-chat/
├── design-critique/
├── hooks/
├── models/
├── data/
├── lib/
└── styles/
```

React must handle:

- UI rendering
- TanStack Router routes
- TanStack Query client state
- Desktop cloud state derived from preload-safe IPC calls
- Chat thread display
- Streaming token display
- Voice state UI
- Critique panel
- Provider selector
- Permission status UI
- Explicit empty/loading/fallback states while live desktop data is unavailable

React must not:

- Call local CLIs directly
- Read files directly
- Access Node APIs
- Access raw IPC
- Store raw Stage/API/Convex tokens
- Own provider process lifecycle

Direct Convex React hooks are allowed in `apps/web-application`. In the desktop
renderer they should only be introduced later if the token model is short-lived,
well-scoped, and still respects the Electron security boundary.

## 10. Rust Sidecar Responsibilities

Rust sidecar owns:

```txt
apps/stage-engine/
├── Cargo.toml
└── src/
    ├── main.rs
    ├── app.rs
    ├── config/
    │   └── mod.rs
    ├── models/
    │   ├── mod.rs
    │   ├── commands.rs
    │   ├── events.rs
    │   ├── jobs.rs
    │   ├── providers.rs
    │   ├── file_context.rs
    │   ├── screen_context.rs
    │   ├── voice.rs
    │   └── errors.rs
    ├── server/
    │   ├── mod.rs
    │   ├── health.rs
    │   └── websocket.rs
    ├── runtime/
    │   ├── mod.rs
    │   ├── queue.rs
    │   ├── supervisor.rs
    │   ├── cancellation.rs
    │   └── backpressure.rs
    ├── providers/
    │   ├── mod.rs
    │   ├── codex.rs
    │   ├── claude.rs
    │   ├── process.rs
    │   └── parser.rs
    ├── context/
    │   ├── mod.rs
    │   ├── scanner.rs
    │   ├── ignore_rules.rs
    │   ├── project_detector.rs
    │   ├── codex_config.rs
    │   ├── claude_config.rs
    │   ├── ranking.rs
    │   └── budget.rs
    ├── critique/
    │   ├── mod.rs
    │   ├── job.rs
    │   ├── prompt.rs
    │   └── payload.rs
    ├── voice/
    │   ├── mod.rs
    │   ├── input.rs
    │   ├── transcription.rs
    │   └── events.rs
    ├── macos/
    │   ├── mod.rs
    │   ├── permissions.rs
    │   ├── screen_capture.rs
    │   ├── active_app.rs
    │   ├── accessibility.rs
    │   └── audio.rs
    ├── convex/
    │   ├── mod.rs
    │   ├── client.rs
    │   └── project_context.rs
    ├── observability/
    │   ├── mod.rs
    │   ├── tracing.rs
    │   └── logs.rs
    └── helpers/
        ├── mod.rs
        ├── paths.rs
        └── ids.rs
```

Rust must handle:

- Local WebSocket server
- Health endpoint
- Typed command parsing
- Typed event streaming
- Tokio runtime
- mpsc job queues
- Provider process lifecycle
- Streaming stdout/stderr from Codex/Claude
- Killing/canceling provider jobs
- Deep file search
- `.codex` and `.claude` discovery
- Context ranking and token budgeting
- Cloud transcription request orchestration when needed
- Screen capture later
- Audio capture later
- Structured tracing logs
- Crash-resistant error handling

## 11. Electron To Rust Communication

Recommended first transport:

```txt
Rust sidecar + local WebSocket
```

Why:

- Better for streaming than stdio
- Better for multiple parallel jobs
- Better for progress events
- Better for cancellation
- Better for health checks
- Rust crash does not kill Electron
- Electron can restart Rust

Startup flow:

```txt
Electron starts.
Electron generates random sidecar auth token.
Electron spawns Rust binary.
Rust binds to 127.0.0.1 on a random or configured local port.
Electron waits for /health.
Electron opens WebSocket.
React UI becomes engine-ready.
```

Security rule:

```txt
Never expose the sidecar publicly.
Bind only to 127.0.0.1.
Require a random per-session auth token.
Reject unauthenticated messages.
```

## 12. API And Release Versioning Strategy

Versioning in this architecture means public/release/API versioning, not a tiny internal prototype.

When we say V1, we mean the first production release contract. It should be reflected in local engine routes and message contracts.

Use this rule:

```txt
V1 = first production release and stable local engine API contract
V1.1 = additive improvements that do not break V1 clients
V2 = breaking architecture/API changes or major capability expansion
```

The local Rust service should expose versioned routes from the start:

```txt
GET  /v1/health
GET  /v1/readiness
GET  /v1/version
WS   /v1/events
POST /v1/commands       # optional if we use HTTP commands beside WebSocket
```

Current implementation note, May 6:

```txt
Implemented:
  GET /v1/health
  GET /v1/readiness
  GET /v1/version
  WS  /v1/events
  engine.ping -> engine.ready

Not implemented yet:
  sidecar auth token
  Electron sidecar supervisor
  renderer engine bridge
  provider runner
  file scanner
```

This means the Rust transport boundary exists, but Electron should still treat the engine as not integrated until the sidecar supervisor is added.

The WebSocket message envelope should also include an API version:

```ts
type EngineEnvelope = {
  apiVersion: "v1";
  id: string;
  type: string;
  payload: unknown;
  createdAt: number;
};
```

### Production V1 Scope

Production V1 should include:

- Rust sidecar process
- Axum local server
- `/v1/health` endpoint
- `/v1/readiness` endpoint
- `/v1/version` endpoint
- local WebSocket endpoint
- per-session auth token
- typed command/event messages
- Tokio runtime
- mpsc job queue
- structured tracing logs
- fake provider runner
- Codex provider detection
- Claude provider detection
- local provider process spawning
- stdout/stderr streaming
- cancellation
- timeout handling
- simple deep file scanner
- `.claude` and `.codex` discovery
- `AGENTS.md` and `CLAUDE.md` discovery
- real Rust file scanner
- design critique pipeline
- simple screen capture path first
- cloud-based voice transcription/conversion
- full desktop monorepo migration
- basic Figma integration
- basic Notion integration
- release-ready Electron desktop app structure

Production V1 should not include:

- SQLite
- local AI inference
- production-grade native ScreenCaptureKit bridge
- native AVFoundation audio pipeline
- advanced Figma plugin automation
- advanced Notion handoff automation
- overly complex ranking algorithms
- code generation between TypeScript and Rust
- `napi-rs`
- offline-first sync
- local model/GPU workers
- desktop billing/account/onboarding flows

Production V1 success means:

```txt
Electron can start Rust.
Electron can recover if Rust crashes.
React can send a command.
Rust can run a local provider.
Rust can stream tokens back.
Rust can scan a project folder.
Rust can discover .claude/.codex context.
The desktop app can run the production V1 chat/design critique flow.
The desktop app can use cloud voice transcription.
The desktop app has the final monorepo folder shape for release.
Basic Figma/Notion integrations are available.
```

### V1.1 Scope

V1.1 should only add capabilities without breaking V1 commands/events/routes.

V1.1 may include:

- better project context ranking
- token budgeting
- provider-specific output parsers
- improved screen capture integration
- permission status integration
- better cancellation and backpressure
- persistent job logs
- more complete error taxonomy
- optional local cache
- better Figma/Notion automation

### V2 Scope

V2 is for breaking or deeper architectural changes.

V2 may introduce:

- SQLite for local job persistence or local-first behavior
- generated contracts between TypeScript and Rust
- deeper macOS APIs
- first Swift/Objective-C bridge experiments
- local AI inference
- model process isolation
- GPU/Metal acceleration
- local vector/index storage
- SQLite-first or hybrid local-first data
- ScreenCaptureKit production bridge
- AVFoundation production audio bridge
- Accessibility API context extraction
- more advanced macOS window/app awareness

### Why Versioning Matters

Without API/release versioning, the desktop app and Rust sidecar will become difficult to evolve safely.

The first production goal is to create a stable V1 local engine boundary that feels like Codex/T3 Code:

```txt
local GUI
local provider execution
deep project context
streaming output
clear failures
restartable engine
```

Once production V1 is stable, we can add V1.1 improvements without breaking the app, and reserve V2 for larger changes.

## 13. Command And Event Model

All commands must have:

```ts
type EngineCommand = {
  apiVersion: "v1";
  id: string;
  type: string;
  payload: unknown;
  createdAt: number;
};
```

All events must have:

```ts
type EngineEvent = {
  apiVersion: "v1";
  id: string;
  commandId?: string;
  jobId?: string;
  type: string;
  payload: unknown;
  createdAt: number;
};
```

Core commands:

```txt
engine.ping
provider.detect
provider.startChat
provider.cancelJob
context.scanProject
context.getProjectSummary
critique.start
voice.startListening
voice.stopListening
voice.transcribeCloud
permissions.getStatus
```

Core events:

```txt
engine.ready
engine.error
provider.detected
provider.unavailable
job.accepted
job.progress
job.token
job.completed
job.failed
job.cancelled
context.scanStarted
context.fileDiscovered
context.scanCompleted
critique.started
critique.completed
voice.listening
voice.transcriptPartial
voice.transcriptFinal
```

## 14. Local Provider Execution

All AI execution should initially happen through local Codex/Claude CLI providers.

Provider detection should check:

```txt
codex binary available
claude binary available
provider version
provider auth state if detectable
workspace config
.codex folder
.claude folder
AGENTS.md
CLAUDE.md
```

Provider runner responsibilities:

- Spawn provider process
- Pass prompt/context safely
- Stream output
- Parse provider events if available
- Capture stderr
- Enforce cancellation
- Enforce timeout
- Report exit code
- Preserve logs for debugging

Do not build direct OpenAI/Anthropic API execution first.

Direct API calls can become a fallback later.

## 15. Deep File Research

The local context engine should support:

```txt
Selected project root
Workspace folders
Git root detection
Ignore rules
File size limits
Binary file detection
Safe text extraction
.codex discovery
.claude discovery
AGENTS.md discovery
CLAUDE.md discovery
README discovery
package.json discovery
Cargo.toml discovery
tsconfig/vite/electron config discovery
```

Scanner rules:

- Never scan `node_modules`.
- Never scan `.git`.
- Never scan build output by default.
- Never read huge files without explicit limits.
- Respect `.gitignore` where possible.
- Support cancellation.
- Stream progress to UI.
- Return summarized project context, not raw everything.

Recommended first file context output:

```txt
ProjectRootSummary
ProviderConfigSummary
ImportantFiles
DetectedFrameworks
PotentialEntryPoints
ArchitectureHints
Warnings
```

## 16. Design Critique Flow

First design critique flow:

```txt
User opens companion.
User says or types: "Critique this layout."
Electron/Rust captures screen or active window.
Rust creates critique job.
Rust gathers active Stage project context from Convex or Electron.
Rust packages screenshot + context.
Rust sends task to local Codex/Claude provider.
Provider streams critique response.
UI shows response in chat panel.
```

MVP can start with mocked screenshot/capture if native capture is not ready.

The important architecture is the job pipeline.

## 17. Voice Flow

Voice is in scope.

Voice conversion/transcription should use a cloud-based LLM/transcription model for now.

First voice architecture:

```txt
Voice UI starts listening.
Audio is captured by Electron or Rust.
Audio is sent to a cloud transcription / LLM model.
Transcript returns to Stage.
Transcript becomes a normal chat command.
Command enters the same engine pipeline as typed input.
```

Recommended first implementation:

- Keep voice UI state in React.
- Use Electron/Rust only as the permission/native bridge.
- Send audio/transcription requests through a controlled backend or engine command.
- Convert final transcript into a normal `provider.startChat` command.
- Do not build complex continuous audio pipelines first.

Later implementation:

- Rust handles microphone/audio stream.
- Tokio channel streams audio chunks.
- Backpressure prevents memory growth.
- Partial transcripts stream to UI.

## 18. Rust Concepts We Will Actually Use

Use now:

```txt
Tokio
mpsc channels
serde
thiserror
anyhow
tracing
Axum
WebSocket
child process management
filesystem walking
cancellation tokens
bounded queues
Result-based error handling
```

Use later:

```txt
macOS FFI
unsafe Rust
ScreenCaptureKit bridge
AVFoundation bridge
Accessibility API bridge
local model inference
GPU/model process isolation
SQLite
```

Do not use now:

```txt
Actix
Diesel
SeaORM
sqlx
RTOS
no_std
embedded-hal
probe-rs
heapless
embassy
memory-mapped IO
```

Reason:

```txt
Stage is a local desktop backend service, not embedded firmware.
```

## 19. Feature To Rust Concept Mapping

| Feature | Rust Concepts | Why |
|---|---|---|
| Codex/Claude chat | process spawning, stdout/stderr streaming, cancellation, tracing | Runs local providers like a professional agent GUI |
| Deep file search | filesystem walking, ignore rules, bounded queues, cancellation | Finds project context safely |
| `.codex`/`.claude` discovery | deterministic scanner, config parsers, serde models | Detects local provider configuration |
| Design critique | job queue, screen context, provider process, streaming events | Converts screen/project context into critique |
| Voice input | audio permissions, cloud transcription command, transcript events | Turns spoken commands into normal chat commands |
| Provider switching | provider registry, process supervisor, typed commands | Lets user switch between Codex and Claude |
| Long-running jobs | Tokio tasks, job IDs, cancellation tokens | Prevents UI freezing |
| Debugging | tracing spans, structured logs | Makes failures understandable |
| Future native capture | unsafe Rust, FFI, ScreenCaptureKit | Required for high-quality macOS capture |

## 20. Permissions

Permissions that must be represented in the UI and engine:

```txt
screen-recording
microphone
accessibility
notifications
files
```

Permission model should exist in TypeScript and Rust.

Electron can open System Settings.

Rust/macOS layer can later detect true permission states.

Do not block the whole app if one permission is missing. Instead:

```txt
Feature unavailable
Clear explanation
Open settings button
Retry button
```

## 21. Failure Modes

| Failure | Expected behavior |
|---|---|
| Rust sidecar fails to start | UI shows engine unavailable and retry |
| Rust sidecar crashes | Electron restarts it and shows toast/status |
| Codex CLI missing | Provider marked unavailable |
| Claude CLI missing | Provider marked unavailable |
| Provider not authenticated | UI says provider needs local login |
| File scan too large | Scanner stops and reports limit |
| User cancels job | Rust kills provider process and emits `job.cancelled` |
| Provider hangs | Timeout and kill process |
| WebSocket disconnects | Electron reconnects or restarts engine |
| Screen permission missing | Critique uses explanation state, not crash |
| Voice permission missing | Voice button disabled with permission CTA |
| Cloud transcription fails | UI shows retry and keeps raw voice state if possible |

## 22. Testing Plan

Electron tests:

- preload exposes only approved APIs
- IPC validates invalid payloads
- main process starts sidecar
- main process handles sidecar crash
- main process opens auth URL externally
- renderer never has Node access

Rust tests:

- command JSON parses correctly
- invalid command returns structured error
- provider detector handles missing binaries
- scanner ignores `node_modules` and `.git`
- scanner finds `.codex`
- scanner finds `.claude`
- job cancellation emits correct event
- provider process timeout kills child process
- tracing initializes without panic

Integration tests:

- Electron starts Rust
- `/health` returns ok
- WebSocket connects
- `engine.ping` returns `engine.ready`
- fake provider streams tokens
- fake provider failure emits `job.failed`
- file scan streams progress
- cancel scan emits `job.cancelled`

Manual acceptance scenarios:

- Open desktop app
- See mock dashboard
- Open companion chat
- Select provider: Codex or Claude
- Scan current project
- See `.claude` detected in this repo
- Send prompt to provider
- See streaming response
- Cancel response mid-stream
- Trigger design critique flow with mocked capture
- Start voice input UI and convert transcript into chat command

## 23. Implementation Phases

### Phase 0: Documentation And Decisions

- Write this architecture document.
- Keep the existing web app behavior unchanged while moving it to `apps/web-application/`.
- Keep the desktop mock/design behavior unchanged while moving it to `apps/user-application/`.
- Decide first sidecar transport: local WebSocket.
- Decide first data source: Convex first.
- Decide first AI route: local Codex/Claude CLI first.
- Decide voice conversion: cloud-based transcription / LLM model.

### Phase 1: Rust Sidecar POC

Create the Rust local engine beside the web and desktop apps.

Minimum behavior:

```txt
cargo run starts local server
GET /health returns ok
WebSocket accepts connection
engine.ping returns engine.ready
```

No AI yet.

### Phase 2: Data-Ops Contracts And Convex Project Context

Add the shared TypeScript domain/contract package before deeper provider work.

Minimum behavior:

```txt
packages/data-ops exists
ProjectContext Zod schema exists
EngineCommand / EngineEvent Zod schemas exist
Desktop can import these contracts
Convex-backed selected project context can be shaped through ProjectContext
```

Keep full Convex backend files in `apps/web-application/convex` for now. Move them into `packages/data-ops/convex` later, after contract boundaries are stable.

Current Phase 2 status:

```txt
Done:
  packages/data-ops exists
  ProjectContext Zod schema exists
  EngineCommand / EngineEvent Zod schemas exist
  data-ops typecheck passed locally
  apps/user-application typecheck/build passed after package creation
  link apps/user-application to packages/data-ops
  map selected Convex project/read-model data into ProjectContext
  validate the selected context with projectContextSchema
  dashboard and critique mocks consume validated ProjectContext
  desktop auth handoff works with testing.getstage.co
  Electron main fetches live selected ProjectContext through website /api/v1 after session exists

Next:
  replace remaining visible demo-only areas with live/loading/empty/fallback states
  add token refresh/logout behavior
  keep direct realtime Convex desktop subscriptions deferred
```

The first connection should be read-oriented. Do not move mutations or the full Convex backend into `packages/data-ops` yet.

Live Convex-backed desktop data requires desktop auth first. The current auth plan lives in:

```txt
apps/user-application/docs/05-09/05-09-desktop-auth-deep-link-plan.md
```

Website login, onboarding, billing, payments, and account flows stay in `apps/web-application`. Desktop should show only a native sign-in launcher when disconnected, launch the website login flow, receive the callback, store the desktop session securely through Electron main, and then continue product work in the desktop UI.

Current auth status:

```txt
Done:
  stage:// protocol registration
  website desktop auth launcher
  state nonce generation and validation
  running-app and queued startup callback handling
  visible account settings login launcher
  Electron auth helpers extracted to electron/helpers/
  secure Electron-main-owned storage
  authenticated renderer boot/session state
  Convex Auth JWT handoff from website to Electron main
  local dev form POST callback server
  /api/v1/me token verification
  auth:session-changed renderer refresh
  live selected ProjectContext fetch after session exists
  logout/token-expiry session clear
  logged-out route guard + desktop sign-in launcher
  30-day JWT launch stopgap accepted

Next:
  verify auth/session behavior end-to-end after deploy/restart/re-login
  continue desktop-first direct Convex migration for cloud data
```

### Phase 3: Electron Sidecar Supervisor

Add Electron main-process sidecar manager.

Minimum behavior:

```txt
Electron spawns Rust
Electron waits for health
Electron connects WebSocket
Electron forwards engine status to renderer
Electron restarts Rust after crash
```

Current Phase 3 status:

```txt
Done:
  Electron main has SidecarSupervisor
  supervisor reuses an already-running ready service
  supervisor spawns cargo run for apps/stage-engine when needed
  supervisor polls /v1/readiness
  supervisor shuts down owned child process on app quit
  sidecar helpers extracted to electron/helpers/
  renderer-safe engine status bridge exists
  dashboard displays engine readiness status
  desktop typecheck/build passed
  cargo check passed

Next:
  connect WebSocket from Electron main
  forward engine events to renderer
  decide restart policy after crash
```

### Phase 4: Typed Rust Mirrors

Mirror the stable TypeScript contracts in Rust.

TypeScript:

```txt
packages/data-ops/contracts/
```

Rust:

```txt
apps/stage-engine/src/models/
```

Start with manual Zod + serde mirror.

### Phase 5: Local Provider Runner

Add fake provider first.

Then add:

```txt
Codex provider
Claude provider
provider detection
streaming output
cancellation
timeouts
stderr capture
```

### Phase 6: Deep File Context

Add project scanner.

First scan:

```txt
root files
package.json
Cargo.toml
README
.claude
.codex
AGENTS.md
CLAUDE.md
```

Then add:

```txt
ignore rules
file size limits
ranking
summaries
token budget
```

### Phase 7: Agent Chat UI Integration

Connect current companion/chat UI to engine events.

Minimum UI:

```txt
provider selector
scan status
thread messages
streaming response
cancel button
error state
```

### Phase 8: Design Critique Pipeline

First with mocked capture.

Then:

```txt
active app context
screen/window capture
project context
critique prompt
streamed critique response
```

### Phase 9: Voice Input

First:

```txt
voice UI state
cloud transcript request
transcript enters chat pipeline
```

Later:

```txt
microphone permission
audio capture
partial transcript streaming
voice-to-command routing
```

### Phase 10: Package-Level Extraction

The first app-level monorepo restructure is now done:

```txt
apps/web-application/ stays current Stage web/cloud app
apps/user-application/ stays Electron desktop UI
apps/stage-engine/ stays Rust engine
```

The later package-level extraction is still future work:

```txt
apps/web-application/convex -> packages/data-ops/convex/
shared TypeScript contracts -> package or app-local contract folders once boundaries settle
```

Do future package extraction with minimal behavior changes.

## 24. Public Interfaces And Types

Initial TypeScript contract files:

```txt
apps/user-application/shared/contracts/engine-command.ts
apps/user-application/shared/contracts/engine-event.ts
apps/user-application/shared/contracts/provider.ts
apps/user-application/shared/contracts/file-context.ts
apps/user-application/shared/contracts/critique.ts
apps/user-application/shared/contracts/voice.ts
```

Initial Rust model files:

```txt
apps/stage-engine/src/models/commands.rs
apps/stage-engine/src/models/events.rs
apps/stage-engine/src/models/providers.rs
apps/stage-engine/src/models/file_context.rs
apps/stage-engine/src/models/critique.rs
apps/stage-engine/src/models/voice.rs
```

Initial IPC additions:

```txt
engine:get-status
engine:send-command
engine:subscribe-events
engine:restart
provider:detect
context:scan
```

Renderer API should look like:

```ts
window.stageDesktop.engine.getStatus()
window.stageDesktop.engine.sendCommand(command)
window.stageDesktop.engine.onEvent(callback)
window.stageDesktop.engine.restart()
```

## 25. Explicit Defaults

Chosen defaults:

- Language in documentation: English
- Conversation language with Werner: Dutch
- UI framework: Electron + React + Vite
- Router: TanStack Router
- Server state: Convex first
- Local engine: Rust sidecar
- Rust transport: local WebSocket
- AI execution: local Codex/Claude CLI first
- Voice transcription/conversion: cloud-based LLM/transcription model
- Direct API execution: later fallback
- SQLite: later, not first
- `napi-rs`: later, not first
- Native macOS FFI: later, behind Rust modules
- Embedded Rust concepts: not relevant for current Stage architecture
- Existing UI mock/design work: accepted as good baseline

## 26. Important Risks

- Local provider CLIs may change output formats.
- Provider auth state may be hard to detect reliably.
- Screen capture permissions can be confusing on macOS.
- Long file scans can become expensive without limits.
- WebSocket sidecar must be secured to localhost + session token.
- Cloud voice conversion adds latency and requires network access.
- `rust-mcp-server-generator` skill was installed but showed a critical risk warning during installation; review before using it deeply.
- Big-bang repo migration is risky and should wait until sidecar fundamentals work.

## 27. Branch And Collaboration Workflow

Current workflow:

```txt
1. Development has been pushed.
2. The monorepo branch exists and is the architecture branch.
3. Use this architecture document as source of truth.
4. Restart T3 Code / Codex so the new skills are picked up cleanly.
5. Start with Rust sidecar POC on the monorepo branch.
```

Useful commands:

```bash
git checkout monorepo
git pull origin monorepo
```

Do not continue architecture work on the pure design/mock branch.

## 28. Next Implementation Plan For Codex

When work starts on the `monorepo` branch, follow this order:

1. Verify repo status and branch.
2. Confirm `apps/user-application/` still typechecks and builds.
3. Create a minimal Rust sidecar skeleton.
4. Add `Cargo.toml` and Rust module layout.
5. Add Axum `/health`.
6. Add `/v1/readiness`.
7. Add WebSocket `/v1/events`.
8. Add typed `engine.ping` command and `engine.ready` event.
9. Add stream parser and output truncation helpers before real provider work.
10. Add Electron sidecar supervisor.
11. Add renderer engine status UI.
12. Add fake provider runner.
13. Add provider detection for Codex and Claude.
14. Add deep file scanner.
15. Add `.claude` and `.codex` discovery.
16. Add streaming chat integration.
17. Add design critique job pipeline.
18. Add cloud voice transcription flow.

Every step should be validated before moving to the next.

## 29. Installed Skills

Installed local skills:

```txt
.agents/skills/electron
.agents/skills/rust-engineer
.agents/skills/rust-best-practices
.agents/skills/rust-async-patterns
.agents/skills/rust-mcp-server-generator
.agents/skills/m15-anti-pattern
.agents/skills/stage-monorepo-architect
```

Important note:

```txt
Restart T3 Code / Codex after this document is committed so the new skills are picked up cleanly.
```

Security note:

```txt
The rust-mcp-server-generator skill showed a critical risk warning during installation.
Review before using it for implementation.
```

## 30. Success Criteria

This architecture is successful when:

- The current desktop UI still works.
- Electron can start and supervise Rust.
- Rust can stream typed events to Electron.
- The UI can run a local Codex/Claude-style chat.
- The engine can scan a local project.
- The engine can find `.claude` and `.codex` style context.
- A design critique can be triggered from chat.
- Voice input can enter the same chat pipeline through cloud transcription.
- Failures are visible, recoverable, and do not crash the UI.
