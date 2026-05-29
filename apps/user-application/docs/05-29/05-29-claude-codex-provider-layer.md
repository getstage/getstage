# Claude and Codex Provider Layer

Date: May 29, 2026  
Status: Architecture decision draft  
Scope: Stage Desktop provider detection, local agent execution, voice workflows,
research workflows, and generation workflows

## Caption: The goal

Stage should let users use their existing Claude and Codex subscriptions directly
inside Stage.

The user should not need to paste API keys for the first V1 provider flow. If the
user already has Claude Code or Codex CLI installed and authenticated locally,
Stage should detect that setup and make it available as a provider.

The inspiration is T3 Code's local provider model: detect local coding-agent CLIs,
show provider status, and let the user choose which provider to run. Stage narrows
that idea to Claude and Codex only for now.

Reference:

```txt
https://github.com/pingdotgg/t3code
```

## Caption: Provider scope

V1 provider scope:

```txt
Claude
Codex
```

Out of scope for now:

```txt
Cursor
OpenCode
GitHub Copilot
browser-only chat providers
direct API-key provider setup
local model providers
```

This matters because Stage is not trying to become a generic provider marketplace
yet. The immediate value is simple: if a user already pays for Claude or Codex,
Stage can use that authenticated local tool.

## Caption: Clean architecture boundary

The provider layer is local desktop work, not cloud product data.

```txt
React renderer
  -> preload IPC
  -> Electron main
  -> Stage Engine
  -> local Claude/Codex CLI
```

React must not directly access:

```txt
shell commands
local files
Claude CLI
Codex CLI
macOS APIs
provider auth files
```

Electron owns the bridge and supervision. Stage Engine owns provider detection,
process execution, streaming, cancellation, and local file context.

## Caption: Why this is different from Convex

Product data remains direct Convex:

```txt
React renderer
  -> Convex React client
  -> Convex cloud
  -> packages/data-ops/convex
```

Provider execution remains local:

```txt
React renderer
  -> Electron IPC
  -> Stage Engine
  -> Claude/Codex CLI
```

Do not route local provider execution through Convex. Convex can store resulting
artifacts, project metadata, and user preferences, but it should not execute the
local CLIs.

## Caption: Provider detection workflow

Stage Engine should expose provider detection through the V1 engine API.

```txt
GET /v1/providers
```

Expected response shape:

```json
{
  "apiVersion": "v1",
  "providers": [
    {
      "id": "claude",
      "label": "Claude",
      "kind": "cli",
      "installed": true,
      "authenticated": true,
      "version": "2.1.154",
      "status": "ready",
      "models": [
        { "id": "opus", "label": "Claude Opus" },
        { "id": "sonnet", "label": "Claude Sonnet" }
      ]
    },
    {
      "id": "codex",
      "label": "Codex",
      "kind": "cli",
      "installed": true,
      "authenticated": true,
      "version": "0.135.0",
      "status": "ready",
      "models": [
        { "id": "gpt-5.5", "label": "GPT-5.5" },
        { "id": "gpt-5.4", "label": "GPT-5.4" }
      ]
    }
  ]
}
```

The exact model IDs are placeholders until provider-specific execution is
implemented. The UI should treat them as displayable provider options, not as
hardcoded business logic.

## Caption: Detection responsibilities

Stage Engine detection should check:

```txt
CLI binary exists on PATH
CLI version can be read
provider appears authenticated
provider can accept a non-destructive readiness command
provider config folders are discoverable when needed
```

Suggested commands:

```txt
claude --version
codex --version
```

Authentication detection must be conservative. If Stage cannot confidently prove
the provider is authenticated, it should return `authenticated: false` with a
clear setup hint instead of trying to repair auth automatically.

## Caption: Settings UI behavior

Settings should show a Providers page with only:

```txt
Claude
Codex
```

Each row should show:

```txt
installed / missing
authenticated / not authenticated
version
enabled toggle
refresh action
setup hint when missing
```

The model picker in chat, voice, research, and generation should only show enabled
and ready providers.

## Caption: Runtime workflow

For a local agent run:

```txt
1. User chooses Claude or Codex in the Stage UI.
2. React sends a typed request to Electron through preload IPC.
3. Electron forwards the request to Stage Engine over localhost-only /v1 API.
4. Stage Engine validates provider, model, working directory, and permissions.
5. Stage Engine starts the selected CLI as a child process.
6. Stage Engine streams structured events back to Electron.
7. Electron forwards events to the renderer.
8. React renders output, progress, errors, and cancellation state.
```

The renderer never receives secrets or raw provider auth files.

## Caption: Voice workflow

Voice uses the same provider layer after transcription.

```txt
1. User speaks into Stage.
2. Stage converts voice to text.
3. Stage builds a task-specific prompt.
4. User-selected provider runs the prompt.
5. Stage streams the answer into the relevant UI surface.
```

Voice is not a separate provider system. It is an input mode for the same Claude
and Codex provider layer.

## Caption: Research and generation workflow

Research and generation can use the same provider runner when the work benefits
from local project context or user-owned CLI subscriptions.

Examples:

```txt
research brief generation
strategy generation
design critique
project-aware chat
file-aware generation
local codebase exploration
```

For workflows that require cloud storage, image assets, or shared team artifacts,
Convex stores the result after the local provider run completes.

## Caption: Styleguide generation note

The styleguide generation feature has two possible execution modes:

```txt
Cloud mode:
React -> Convex/data-ops -> Claude API vision -> DB -> React

Local provider mode:
React -> Electron -> Stage Engine -> Claude/Codex CLI -> DB/artifact save
```

V1 should not mix these casually. The first implementation should choose one mode
per feature and document why.

For uploaded moodboard images and persistent Direction artifacts, cloud mode is
likely cleaner. For local project-aware critique and conversational generation,
local provider mode is likely cleaner.

## Caption: Implementation order

Build the provider layer in this order:

```txt
1. Stage Engine /v1/health and /v1/readiness.
2. Stage Engine provider types and response envelopes.
3. Claude and Codex detection only.
4. Electron IPC bridge for provider status.
5. Settings Providers view wired to live detection.
6. Typed fake run with streamed events.
7. Real Claude CLI run.
8. Real Codex CLI run.
9. Cancellation and timeout handling.
10. Persist provider preference in Convex or local settings.
```

Do not start with real generation. First prove detection, status, IPC, streaming,
and cancellation.

## Caption: Non-negotiable rules

```txt
Only Claude and Codex for now.
No provider execution in the renderer.
No product-data IPC regression.
No API keys in the renderer.
No local file reads in React.
No generic provider abstraction before Claude and Codex are proven.
No Cursor or OpenCode until the V1 provider contract is stable.
```

## Caption: Open decisions

These need a later implementation decision:

```txt
Where provider enabled/disabled state is stored.
Whether default provider preference is per user or per device.
How Stage detects Claude/Codex authentication without leaking sensitive paths.
How much local file context is included by default.
Whether voice defaults to Claude, Codex, or last-used provider.
Whether styleguide generation starts cloud-first or local-provider-first.
```

## Caption: Skills used for this architecture

This plan must be implemented using these local skills as the quality bar:

```txt
.agents/skills/stage-monorepo-architect/SKILL.md
.agents/skills/electron/SKILL.md
.agents/skills/rust-engineer/SKILL.md
.agents/skills/rust-async-patterns/SKILL.md
.agents/skills/rust-best-practices/SKILL.md
```

How they apply:

```txt
stage-monorepo-architect:
Desktop-first boundaries, Stage Engine ownership, Convex ownership, V1 scope.

electron:
Secure preload APIs, typed IPC, context isolation, no Node access in React.

rust-engineer:
Idiomatic Rust modules, Result<T, E>, no unwrap/expect in production paths.

rust-async-patterns:
Tokio tasks, bounded channels, cancellation, timeouts, child process supervision.

rust-best-practices:
serde contracts, thiserror error taxonomy, small modules, tests, explicit failures.
```

## Caption: Complete provider plan

The provider layer is built in three milestones.

Milestone 1 proves provider detection:

```txt
React settings UI
  -> preload IPC
  -> Electron main
  -> Stage Engine /v1/providers
  -> Claude/Codex detection
```

Milestone 2 proves typed provider runs:

```txt
React chat/voice/research UI
  -> preload IPC
  -> Electron main
  -> Stage Engine /v1/runs
  -> fake streamed run events
```

Milestone 3 switches fake runs to real provider adapters:

```txt
Stage Engine
  -> Claude adapter
  -> Codex adapter
  -> canonical Stage RunEvent stream
```

The most important rule is that the UI only knows about Stage contracts. It does
not know provider-native process formats.

## Caption: T3 Code source audit first

Before implementing real provider execution, do a focused T3 Code audit.

Reference:

```txt
https://github.com/pingdotgg/t3code
```

Only inspect the provider-relevant parts:

```txt
provider contracts
model contracts
provider settings metadata
provider status detection
provider service/facade
provider adapters
runtime event streaming
Claude provider behavior
Codex provider behavior
```

Patterns to copy conceptually:

```txt
provider-specific adapters
provider-aware model selection
declarative provider metadata
canonical provider runtime events
typed shared contracts
model picker driven by provider status
```

Patterns not to copy blindly:

```txt
Node server architecture
web-first assumptions
all-provider marketplace abstractions
any routes that bypass Stage Engine
```

Stage is desktop-first. T3 Code is inspiration, not the source of truth.

## Caption: T3 Code audit notes

Focused source audit completed against:

```txt
https://github.com/pingdotgg/t3code
local audit path: /tmp/t3code-audit
```

Files inspected:

```txt
AGENTS.md
.docs/provider-architecture.md
packages/contracts/src/provider.ts
packages/contracts/src/providerRuntime.ts
packages/contracts/src/providerInstance.ts
packages/contracts/src/model.ts
apps/server/src/provider/ProviderDriver.ts
apps/server/src/provider/providerSnapshot.ts
apps/server/src/provider/providerStatusCache.ts
apps/server/src/provider/builtInDrivers.ts
apps/server/src/provider/Drivers/CodexDriver.ts
apps/server/src/provider/Drivers/ClaudeDriver.ts
apps/server/src/provider/Layers/CodexProvider.ts
apps/server/src/provider/Layers/ClaudeProvider.ts
apps/server/src/provider/Services/ProviderAdapter.ts
apps/server/src/provider/Layers/ProviderService.ts
```

Patterns to carry into Stage:

```txt
Contracts first:
T3 keeps provider/session/runtime schemas in packages/contracts. Stage should
keep provider/run/voice Zod contracts in packages/data-ops before UI wiring.

Driver versus instance:
T3 separates provider driver kind from provider instance id. Stage V1 only needs
one Claude and one Codex instance, but the contract should still leave room for
future per-device or work/personal instances.

Provider snapshots:
T3 normalizes installed/auth/version/status/models into a provider snapshot.
Stage should expose the same concept from /v1/providers.

Provider-first models:
T3 requests Codex models from the provider runtime and merges custom/fallback
models. Stage should keep provider IDs strict but model IDs flexible.

Adapter boundary:
T3 adapters own provider protocol details while ProviderService owns routing and
canonical event streams. Stage Engine should mirror that as providers/*
adapters plus a runs/manager.

Canonical events:
T3 translates provider-native events into app-owned runtime events. Stage should
never leak raw Claude/Codex output formats directly into React.

Status cache idea:
T3 caches provider snapshots to keep settings responsive. Stage can add this
later, but should not block the V1 contract on cache persistence.

Conservative auth:
T3 treats missing auth and missing binaries as status states, not fatal app
errors. Stage should do the same.
```

Patterns intentionally not copied:

```txt
Effect runtime architecture.
Multi-provider marketplace surface.
OpenCode/Cursor support.
Multiple provider instances in V1 UI.
SQLite/session database model.
WebSocket-first browser transport.
```

## Caption: Model update strategy

Claude and Codex model names change often, so model IDs must not be hardcoded
deeply into React.

Use a provider-first model strategy:

```txt
1. Ask the local provider where possible.
2. Use Stage Engine detection/defaults when the provider cannot list models.
3. Use a tiny fallback registry only for labels and safe defaults.
```

Strict values:

```txt
providerId: "claude" | "codex"
```

Flexible values:

```txt
modelId: string
```

This is deliberate. Provider IDs are product architecture. Model IDs are external
provider metadata.

Unknown model IDs are allowed if they come from a ready provider. The UI should
display them with a generated label instead of failing.

## Caption: Type safety plan

The system is contract-first.

TypeScript contracts live in:

```txt
packages/data-ops/src/contracts/engine-provider.ts
packages/data-ops/src/contracts/engine-run.ts
packages/data-ops/src/contracts/engine-voice.ts
```

These contracts use Zod and cover:

```txt
EngineEnvelopeSchema
ProviderIdSchema
ProviderStatusSchema
ProviderModelSchema
ProviderListResponseSchema
StartRunRequestSchema
StartRunResponseSchema
RunEventSchema
CancelRunResponseSchema
VoiceCaptureRequestSchema
VoiceTranscriptResponseSchema
EngineErrorSchema
```

Electron must validate:

```txt
all renderer input before forwarding
all Stage Engine responses before returning to React
all streamed events before emitting them to React
```

Rust mirrors the contracts with serde:

```txt
apps/stage-engine/src/models/providers.rs
apps/stage-engine/src/models/runs.rs
apps/stage-engine/src/models/voice.rs
apps/stage-engine/src/models/errors.rs
```

Rust uses:

```txt
serde::{Serialize, Deserialize}
thiserror
Result<T, E>
strict enums for stable Stage values
strings for provider-owned model IDs
```

Contract fixtures should be shared conceptually between TypeScript and Rust:

```txt
packages/data-ops/src/contracts/__fixtures__/provider-list.ready.json
packages/data-ops/src/contracts/__fixtures__/provider-list.missing-claude.json
packages/data-ops/src/contracts/__fixtures__/run-event.delta.json
packages/data-ops/src/contracts/__fixtures__/voice-transcript.completed.json
```

## Caption: Public Stage Engine API

Provider endpoints:

```txt
GET /v1/providers
POST /v1/providers/refresh
POST /v1/runs
GET /v1/runs/:runId/events
POST /v1/runs/:runId/cancel
```

Voice endpoints, if transcription is routed through Stage Engine:

```txt
POST /v1/voice/transcriptions
GET /v1/voice/transcriptions/:transcriptionId/events
POST /v1/voice/transcriptions/:transcriptionId/cancel
```

The voice endpoints are optional for the first small UI pass. The first
implementation can capture audio in React and send it through a backend
transcription route, but the public contract still needs to be documented now so
we do not invent a second voice system later.

All responses use:

```json
{
  "apiVersion": "v1"
}
```

## Caption: Voice recognition strategy

Voice recognition is not Claude or Codex provider execution.

Voice is an input pipeline:

```txt
microphone audio
  -> transcription
  -> text prompt
  -> selected Claude/Codex provider
  -> streamed answer
```

V1 default:

```txt
Batch cloud transcription.
Record complete utterance first.
Preserve pauses inside the recording.
Upload one complete audio file after submit.
No local Whisper.
No streaming transcription for V1.
No AVFoundation FFI.
No Rust-native audio capture yet.
```

This matches the Stage V1 boundary: cloud-based voice transcription is in scope;
local AI inference and advanced native macOS audio bridges are not.

Chosen transcription provider for V1:

```txt
Provider: OpenRouter
Endpoint: POST https://openrouter.ai/api/v1/audio/transcriptions
Model: mistralai/voxtral-mini-transcribe
Credential: OPENROUTER_API_KEY
Mode: batch upload after user submits recording
Pricing reference on provider page: $0.003/min
Provider-published benchmark reference: 3.7% word error rate
```

Official reference:

```txt
https://openrouter.ai/mistralai/voxtral-mini-transcribe/api
```

Why:

```txt
single OpenRouter billing/provider surface
cheap enough for frequent voice commands
good published WER for short prompt transcription
simple batch API fits push-to-talk UX
keeps voice independent from Claude/Codex CLI subscriptions
lets Claude/Codex focus on reasoning after transcript creation
```

Important boundary:

```txt
The user can use their Claude/Codex subscription for reasoning.
Voice transcription still needs a Stage-managed transcription provider or a
later user-provided transcription key.
```

Do not pretend Claude/Codex CLI subscription automatically solves speech-to-text.
It does not give us a clean desktop microphone transcription layer by itself.

## Caption: Batch transcription behavior

The V1 voice behavior is Whisper-style batch transcription:

```txt
1. User starts recording.
2. User speaks naturally, including pauses.
3. Stage does not stop automatically on silence.
4. User stops/submits the recording.
5. Stage uploads the complete audio file to OpenRouter.
6. OpenRouter returns the final transcript.
7. Stage sends the transcript as prompt text to the selected Claude/Codex provider.
```

Out of scope for V1:

```txt
live captions
partial transcripts
speech activity auto-stop
WebSocket transcription
barge-in/interruption logic
always-on microphone capture
```

## Caption: Voice file map

Existing UI entry:

```txt
apps/user-application/src/companion/VoiceControlBar.tsx
```

This remains the visual control for voice state.

Add or evolve React voice files:

```txt
apps/user-application/src/companion/hooks/useVoiceCapture.ts
apps/user-application/src/companion/hooks/useVoiceTranscript.ts
apps/user-application/src/companion/models/voice.ts
```

Use browser/Electron renderer APIs for initial capture:

```txt
navigator.mediaDevices.getUserMedia({ audio: true })
MediaRecorder
webm or wav blob
```

Electron permission/status files:

```txt
apps/user-application/shared/models/desktop.ts
apps/user-application/electron/preload.ts
apps/user-application/electron/ipc.ts
apps/user-application/electron/helpers/permissions.ts
```

Add IPC only if the renderer needs Electron help for permissions or upload
handoff. The renderer must still not get shell or filesystem access.

Shared voice contracts:

```txt
packages/data-ops/src/contracts/engine-voice.ts
```

Possible cloud transcription backend files:

```txt
packages/data-ops/convex/voice.ts
packages/data-ops/convex/aiCredentials.ts
packages/data-ops/convex/lib/credentialVault.ts
```

Possible Stage Engine voice files, if transcription is proxied by the sidecar:

```txt
apps/stage-engine/src/models/voice.rs
apps/stage-engine/src/server/voice.rs
apps/stage-engine/src/voice/mod.rs
apps/stage-engine/src/voice/transcription.rs
```

V1 recommendation:

```txt
React captures push-to-talk audio until user submits.
Pauses remain part of the recording.
Cloud backend sends the complete audio file to OpenRouter Voxtral Mini Transcribe.
Stage turns transcript into a provider run request.
Claude/Codex handles reasoning.
```

Do not start V1 with always-on streaming microphone capture. Start with
push-to-talk because it is easier to reason about privacy, cost, and UI state.

## Caption: Integrations page boundary

Existing route:

```txt
apps/user-application/src/routes/_authed/integrations.tsx
apps/user-application/src/settings/components/SettingsPageView.tsx
```

The Integrations page is where users manage external connections and local
provider readiness.

It should show:

```txt
Claude provider status
Codex provider status
Figma connection
Notion connection
Google Sheets connection
voice transcription provider status if user-visible
```

It should not execute generation itself.

Integrations is configuration/status, not workflow execution.

## Caption: Voice UI boundary

Existing file:

```txt
apps/user-application/src/companion/VoiceControlBar.tsx
```

The voice UI owns:

```txt
idle/listening/processing/thinking/response/error state
microphone permission prompt state
push-to-talk start/stop
transcription progress
handoff to selected provider
displaying the final answer or opening the chat panel
```

The voice UI does not own:

```txt
provider detection
Claude/Codex process spawning
local file search
provider auth detection
transcription credentials
```

## Caption: Moodboard boundary

Existing file:

```txt
apps/user-application/src/project/components/tabs/MoodboardTab.tsx
```

Moodboard owns:

```txt
image upload UI
Figma link UI
Direction grouping
selecting images
showing generated styleguide output later
```

Moodboard should not directly call Claude/Codex CLI.

When styleguide generation is added, the clean flow is:

```txt
MoodboardTab
  -> typed action/hook
  -> chosen execution mode
  -> generated StyleGuide artifact
  -> Convex stores result against Direction
  -> Moodboard renders Style Guide View
```

For image-heavy styleguide generation, default to cloud mode first:

```txt
React
  -> Convex/data-ops action
  -> vision-capable model API
  -> Convex artifact
  -> React Style Guide View
```

For local project-aware critique, use local provider mode:

```txt
React
  -> Electron
  -> Stage Engine
  -> Claude/Codex CLI
  -> streamed critique
```

Do not mix both modes inside the component. The component calls a single typed
hook and does not care whether the backend path is local or cloud.

## Caption: Provider file map

Shared contracts:

```txt
packages/data-ops/src/contracts/engine-provider.ts
packages/data-ops/src/contracts/engine-run.ts
packages/data-ops/src/contracts/index.ts
```

Electron bridge:

```txt
apps/user-application/shared/ipc/channels.ts
apps/user-application/shared/models/desktop.ts
apps/user-application/electron/preload.ts
apps/user-application/electron/ipc.ts
apps/user-application/electron/sidecar.ts
```

React hooks:

```txt
apps/user-application/src/hooks/useEngineStatus.ts
apps/user-application/src/hooks/engine/useProviderStatus.ts
apps/user-application/src/hooks/engine/useProviderRun.ts
```

Settings UI:

```txt
apps/user-application/src/routes/_authed/integrations.tsx
apps/user-application/src/settings/components/SettingsPageView.tsx
apps/user-application/src/settings/data/settingsSnapshot.ts
apps/user-application/src/settings/models/settings.ts
```

Stage Engine:

```txt
apps/stage-engine/src/models/providers.rs
apps/stage-engine/src/models/runs.rs
apps/stage-engine/src/models/errors.rs
apps/stage-engine/src/server/providers.rs
apps/stage-engine/src/server/runs.rs
apps/stage-engine/src/providers/mod.rs
apps/stage-engine/src/providers/detection.rs
apps/stage-engine/src/providers/claude.rs
apps/stage-engine/src/providers/codex.rs
apps/stage-engine/src/runs/mod.rs
apps/stage-engine/src/runs/manager.rs
```

## Caption: Exact implementation order

Do this in order:

```txt
1. Append this full plan to the provider architecture doc.
2. Audit T3 Code provider/model/runtime files and add short notes to this doc.
3. Add Zod contracts for provider/run/voice in packages/data-ops.
4. Add matching Rust serde models in apps/stage-engine.
5. Add static /v1/providers endpoint with fake Claude/Codex data.
6. Add typed Electron IPC for listProviders and refreshProviders.
7. Wire Integrations/Settings UI to live provider status.
8. Replace fake provider status with real CLI detection.
9. Add fake /v1/runs streaming events.
10. Wire voice UI to create transcript text and pass it into selected provider.
11. Implement real Claude adapter.
12. Implement real Codex adapter.
13. Add cancellation, timeouts, and provider-process error handling.
14. Connect research/generation workflows.
15. Connect Moodboard styleguide generation through one typed hook.
```

## Caption: Tests and scenarios

TypeScript:

```txt
Zod accepts valid provider responses.
Zod rejects invalid provider IDs.
Zod accepts unknown model IDs.
Zod rejects malformed run events.
Zod validates voice transcript responses.
```

Rust:

```txt
serde parses provider fixtures.
serde parses run event fixtures.
serde parses voice transcript fixtures.
missing binary maps to missing_binary.
version timeout maps to version_timeout.
cancelled run emits run_cancelled.
provider crash emits provider_process_failed.
```

Electron:

```txt
preload exposes only typed engine/voice methods.
renderer cannot access shell or filesystem.
IPC rejects invalid payloads.
IPC returns typed provider status.
```

Manual:

```txt
Claude installed and authenticated.
Claude installed but unauthenticated.
Claude missing.
Codex installed and authenticated.
Codex installed but unauthenticated.
Codex missing.
Voice permission denied.
Voice permission granted.
Voice transcript succeeds.
Voice transcript fails.
Provider run streams output.
Provider run is cancelled.
Unknown model ID appears and does not break UI.
```

## Caption: Resolved defaults

These defaults are now chosen:

```txt
Provider scope: Claude and Codex only.
Model strategy: provider-first.
Provider IDs: strict.
Model IDs: flexible strings.
Voice capture: push-to-talk first.
Voice transcription: OpenRouter Voxtral Mini Transcribe batch upload.
Reasoning provider after voice: selected Claude/Codex provider.
Integrations page: configuration and status only.
Moodboard: UI and artifact rendering only, no direct provider execution.
Stage Engine: local provider execution owner.
Convex: cloud product data and artifact owner.
```
