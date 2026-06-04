# Stage V1 Voice Plan: ChatGPT/Codex Session Transcription Bridge

## Summary

Stage V1 voice uses the same class of bridge as Synara:

```txt
Renderer microphone capture
-> 24 kHz mono WAV base64 payload
-> Electron IPC
-> Codex app-server auth discovery
-> ChatGPT session token
-> POST https://chatgpt.com/backend-api/transcribe
-> transcript text
-> Stage chat/workflow composer
-> selected Claude/Codex reasoning provider
```

This is the V1 decision. Voxtral/OpenRouter is no longer the V1 default for
voice transcription. Voxtral/OpenRouter can remain a future fallback/provider
option, but the first shipped Stage voice path should use the user's local
ChatGPT-authenticated Codex session.

## Product Decision

V1 default:

```txt
Transcription provider: ChatGPT Codex session bridge
Auth source: local Codex app-server ChatGPT auth token
Reasoning provider after transcript: selected Stage provider, Claude or Codex
Transcript behavior: insert into Stage composer/chat pipeline first
```

Do not use Mistral/Voxtral as the V1 default.

Do not attempt a Claude-private transcription bridge for V1. Claude can be the
reasoning provider after transcript creation, but not the speech-to-text
provider.

## Source Findings

Synara does voice this way:

```txt
Browser/Web Audio records microphone audio.
Audio is normalized to mono 24 kHz WAV.
WAV bytes are sent as base64 to Electron.
Electron starts `codex app-server`.
Electron requests ChatGPT auth status and token through JSON-RPC.
Electron posts the audio file to ChatGPT's backend transcription endpoint.
The returned transcript is inserted into the chat composer.
```

Important Synara reference files from the linked repo:

```txt
/tmp/synara/apps/web/src/lib/voiceRecorder.ts
/tmp/synara/apps/web/src/components/chat/useComposerVoiceController.ts
/tmp/synara/apps/desktop/src/voiceTranscription.ts
```

The key upstream endpoint used by Synara:

```txt
https://chatgpt.com/backend-api/transcribe
```

This endpoint is a private/session-based ChatGPT backend endpoint. It is not the
official OpenAI Audio API. That is acceptable for Stage V1 because the product
decision is to prioritize using the user's existing ChatGPT/Codex login for
voice, matching Synara's behavior.

## Current Stage State

Stage already has voice-shaped contracts, but they are currently
OpenRouter/Voxtral-shaped:

```txt
packages/data-ops/src/contracts/engine-voice.ts
apps/stage-engine/src/models/voice.rs
```

Those contracts should be updated to make the ChatGPT/Codex session bridge the
default V1 provider while leaving room for future providers.

Existing AI workflow docs also mention Voxtral:

```txt
apps/user-application/docs/AI/STAGE_AI_WORKFLOW_CONTEXT_PLAN.md
apps/user-application/docs/05-29/05-29-claude-codex-provider-layer.md
```

Those docs should later be updated to mark the Voxtral decision as superseded by
this plan for V1.

## Claude Feasibility

Claude can be used after transcription, but Claude should not be treated as the
V1 transcription provider.

Findings:

```txt
Claude Mobile has voice mode.
Claude Mobile has dictation.
Claude Code CLI and SDK are text/tool oriented.
No comparable Claude Code transcription bridge was found.
No official Anthropic speech-to-text API equivalent was found for this V1 path.
```

Therefore:

```txt
Stage voice recording
-> ChatGPT/Codex transcription bridge
-> transcript
-> selected reasoning provider
-> Claude or Codex run
```

This lets a Claude user still use voice in Stage, because the voice input is
converted to text before the Claude run begins.

## Public Interfaces And Types

Update the TypeScript voice provider contract from the current single-provider
shape:

```ts
provider: "openrouter";
model: "mistralai/voxtral-mini-transcribe";
```

to this V1-compatible shape:

```ts
provider:
  | "chatgpt-codex-session"
  | "openrouter"
  | "mistral"
  | "openai-audio-api";

model:
  | "chatgpt-backend-transcribe"
  | "mistralai/voxtral-mini-transcribe"
  | "voxtral-mini-latest"
  | "gpt-4o-transcribe"
  | "gpt-4o-mini-transcribe";
```

V1 transcription input:

```ts
type VoiceTranscriptionInput = {
  apiVersion: "v1";
  provider: "chatgpt-codex-session";
  model: "chatgpt-backend-transcribe";
  mode: "batch";
  audioMimeType: "audio/wav";
  audioBase64: string;
  audioSizeBytes: number;
  sampleRateHz: 24000;
  durationMs: number;
  cwd?: string;
  threadId?: string;
  context?: {
    projectId?: string;
    source?: "companion" | "chat" | "research" | "generation";
    selectedReasoningProvider?: "claude" | "codex";
  };
};
```

V1 transcription response:

```ts
type VoiceTranscriptResponse = {
  apiVersion: "v1";
  transcriptionId: string;
  provider: "chatgpt-codex-session";
  model: "chatgpt-backend-transcribe";
  mode: "batch";
  status: "completed";
  text: string;
  durationMs?: number;
  createdAt: number;
};
```

Update the Rust mirror similarly:

```rust
enum VoiceTranscriptionProvider {
    ChatgptCodexSession,
    Openrouter,
    Mistral,
    OpenaiAudioApi,
}
```

## Electron And Preload API

Expose only typed voice methods through preload.

Renderer-facing API:

```ts
desktop.voice.transcribe(input: VoiceTranscriptionInput): Promise<VoiceTranscriptResponse>;
desktop.voice.getStatus(): Promise<VoiceTranscriptionStatus>;
```

Electron IPC channel:

```txt
desktop:voice-transcribe
```

The renderer must never receive:

```txt
ChatGPT session token
raw Codex app-server auth response
private transcription URL unless needed for diagnostics
```

## Recording Implementation

Add a renderer hook based on Synara's pattern:

```txt
navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } })
AudioContext
MediaStreamAudioSourceNode
ScriptProcessorNode or AudioWorklet if already available locally
mono merge
linear resample to 24 kHz
16-bit PCM WAV encode
base64 payload
duration label
waveform levels
```

Recommended files:

```txt
apps/user-application/src/companion/hooks/useVoiceRecorder.ts
apps/user-application/src/companion/hooks/useVoiceTranscript.ts
apps/user-application/src/companion/models/voice.ts
```

The first implementation should remain push-to-talk:

```txt
start recording
stop/submit recording
transcribe complete audio file
insert transcript
```

Out of scope for V1:

```txt
always-on listening
streaming transcription
partial transcripts
auto voice activity detection
barge-in/interruption logic
native Rust audio capture
AVFoundation bridge
```

## Electron Transcription Bridge

Add a desktop transcription module:

```txt
apps/user-application/electron/desktop-api/voice-transcription.ts
```

Responsibilities:

```txt
Validate audio payload.
Discover Codex ChatGPT auth.
Upload WAV file to ChatGPT transcription endpoint.
Parse transcript response.
Return typed response to renderer.
Map failures to user-safe errors.
```

Validation rules:

```txt
audioMimeType must be "audio/wav"
sampleRateHz must be 24000
durationMs must be positive
durationMs must be <= 120000
audioSizeBytes must be <= 10485760
base64 must decode cleanly
decoded bytes must have RIFF/WAVE header
```

Codex auth discovery:

```txt
spawn `codex app-server`
send JSON-RPC initialize
send initialized notification
send getAuthStatus with:
  includeToken: true
  refreshToken: true
require authMethod:
  chatgpt
  chatgptAuthTokens
read authToken
read transcriptionUrl if Codex returns one
fallback transcription URL:
  https://chatgpt.com/backend-api/transcribe
```

Network upload:

```txt
POST multipart/form-data
field name: file
filename: voice.wav
Content-Type: audio/wav
Authorization: Bearer <ChatGPT token>
```

Response parsing:

```txt
accept payload.text
accept payload.transcript
reject empty transcript
```

## UI Behavior

The existing visual entry point remains:

```txt
apps/user-application/src/components/companion/VoiceControlBar.tsx
```

V1 states:

```txt
idle
listening
processing
transcript-ready
failed
```

Composer behavior:

```txt
If transcript succeeds, insert transcript text into the composer.
Do not auto-submit by default.
User reviews and sends.
The selected provider for reasoning remains Claude or Codex.
```

This keeps voice as an input method, not a separate AI workflow.

## Voice Settings And Shortcuts

Stage V1 voice must have a settings surface. Voice should not depend only on a
visible composer button, because the intended desktop behavior is:

```txt
User presses a keyboard shortcut anywhere.
Stage opens the floating voice bar.
Stage starts recording.
The waveform moves while recording.
User presses the shortcut again or clicks submit.
Stage transcribes the clip.
The transcript enters the Stage composer/chat pipeline.
```

Add a Voice settings section under Settings. If a dedicated Settings tab is too
large for the first pass, place it under Settings -> Integrations near the
Claude/Codex connection status.

Recommended settings route:

```txt
apps/user-application/src/components/settings/VoiceSettingsPanel.tsx
apps/user-application/src/routes/_authed/settings.voice.tsx
```

Recommended default shortcuts:

```txt
Start/stop voice note: CmdOrCtrl+Shift+V
Open latest AI chat thread: CmdOrCtrl+Shift+A
Cancel active voice recording: Escape, when the voice overlay is focused
```

Shortcut 1: start/stop voice note.

```txt
Idle:
  register shortcut
  show companion overlay
  set state to listening
  request microphone permission if needed
  begin recording immediately after permission succeeds

Listening:
  same shortcut stops recording
  set state to processing
  transcribe audio
  insert transcript into composer
```

Shortcut 2: open AI chat latest thread.

```txt
If latest Stage chat thread exists:
  open companion chat panel with latest thread

If no thread exists:
  open companion chat panel with a new empty thread

This shortcut does not start recording.
It only opens the AI chat surface.
```

Settings controls:

```txt
Microphone input:
  system default
  detected input devices, if browser device labels are available after permission

Voice shortcut:
  editable shortcut recorder
  reset to default
  conflict warning if Electron cannot register it

AI chat shortcut:
  editable shortcut recorder
  reset to default
  conflict warning if Electron cannot register it

Recording behavior:
  push-to-talk toggle off by default
  start/stop toggle behavior on by default
  max recording length fixed at 120 seconds for V1

Voice provider status:
  Codex installed
  Codex ChatGPT login available
  microphone permission status
  last transcription error, if any
```

Shortcut storage should be local desktop settings, not Convex project data.
Shortcuts are machine-specific and should not sync between users or devices in
V1.

Recommended local setting shape:

```ts
type VoiceShortcutSettings = {
  voiceNoteShortcut: string; // default "CommandOrControl+Shift+V"
  aiChatShortcut: string; // default "CommandOrControl+Shift+A"
  microphoneDeviceId?: string;
  recordingMode: "toggle";
  maxDurationMs: 120000;
};
```

Electron ownership:

```txt
Electron:
  stores local voice shortcut settings
  registers/unregisters globalShortcut bindings
  opens companion BrowserWindow
  sends voice intent event to renderer

Renderer:
  owns recording UI and waveform state
  requests microphone capture
  submits audio through preload IPC
  inserts transcript into composer/chat
```

Add IPC/event channels:

```txt
voice:get-settings
voice:update-settings
voice:get-shortcut-status
voice:register-shortcuts
voice:shortcut-start-stop-recording
voice:shortcut-open-latest-chat
```

The shortcut action should be routed into the existing companion window when
possible. It should not create a second duplicate voice window.

## Recording Motion And Feedback

The moving bars are not decorative. They are the primary user feedback that
Stage is recording.

Visual requirement:

```txt
When idle:
  show a compact bar or inactive microphone control

When listening:
  expand the floating recorder bar
  animate waveform bars from live microphone RMS levels
  show active red recording button
  keep the Stage mark visible in the center

When processing:
  stop live waveform input
  switch bars to a slower loading pulse
  keep the bar visible until transcript or error

When transcript-ready:
  briefly confirm success
  collapse only after transcript has been inserted into composer

When failed:
  show error state and keep retry/cancel available
```

The waveform should use real microphone amplitude when recording:

```txt
Audio process callback
-> calculate RMS per chunk
-> normalize level to 0..1
-> keep last 24-48 levels for compact bar
-> map each level to bar height
-> update at roughly 30-45 ms intervals
```

Fallback animation:

```txt
If live levels are unavailable but recording is active:
  use deterministic staggered pulse animation
  do not leave bars static
```

CSS behavior:

```txt
.voice-control-bar[data-state="listening"] .voice-wave-button span
  height should be driven by CSS variables or inline style from waveform levels

.voice-control-bar[data-state="processing"] .voice-wave-button span
  should use a low-frequency pulse animation

Respect prefers-reduced-motion:
  show live level changes without additional looping animation
```

Accessibility:

```txt
aria-label should include current state:
  "Recording voice note"
  "Transcribing voice note"
  "Voice transcription failed"

Do not rely on motion only.
Use stateful button labels and tooltips.
Expose Escape to cancel when focused.
```

Window behavior:

```txt
Use the existing companion always-on-top BrowserWindow.
Anchor the recorder bar bottom-center.
Keep it visible over other apps.
Set ignoreMouseEvents(false) only while the bar/chat is interactive.
Return ignoreMouseEvents(true, { forward: true }) after hiding/collapsing.
```

## Failure Modes

Show clear UI states for:

```txt
Microphone permission denied
No microphone found
Microphone busy/unavailable
Recording too long
Audio too large
Invalid WAV payload
Codex CLI missing
Codex app-server failed to start
Codex auth discovery timed out
Codex not authenticated
Codex authenticated with API key only, not ChatGPT session
ChatGPT token expired
ChatGPT transcription endpoint returned 401/403/5xx
Empty transcript response
User changed thread/provider while transcription was in flight
```

Recommended user-facing auth failure copy:

```txt
Voice transcription uses your ChatGPT login in Codex. Sign in to Codex with
ChatGPT and retry.
```

Recommended Claude-specific clarification:

```txt
Claude can answer after the transcript is created, but voice transcription uses
your ChatGPT/Codex login in Stage V1.
```

## Testing Plan

Unit tests:

```txt
WAV/base64 validation accepts valid 24 kHz WAV.
Validation rejects non-WAV input.
Validation rejects wrong sample rate.
Validation rejects zero duration.
Validation rejects duration above 120 seconds.
Validation rejects payload above 10 MB.
Auth parser accepts ChatGPT auth.
Auth parser rejects API-key-only auth for voice.
Response parser accepts `text`.
Response parser accepts `transcript`.
Response parser rejects empty transcript.
Error sanitizer hides raw tokens and stack details.
```

Renderer tests:

```txt
Start recording requests microphone.
Stop recording returns WAV payload.
Cancel recording stops media tracks and clears state.
Transcript inserts into composer.
Stale transcription result is ignored after thread/provider change.
Voice control disables submit while processing.
```

Electron tests:

```txt
IPC handler never returns auth token.
Upload includes multipart file body.
Upload includes bearer token only in Electron main.
401 maps to sign-in-again error.
403 maps to forbidden transcription error.
Missing `codex` maps to setup error.
Timed out auth discovery maps to retryable auth status error.
```

Manual acceptance:

```txt
User signs into Codex with ChatGPT.
User opens Stage.
User clicks mic.
macOS microphone permission prompt appears.
User records voice.
User stops recording.
Transcript appears in Stage composer.
User submits transcript to Claude successfully.
User submits transcript to Codex successfully.
Missing ChatGPT auth gives a clear recovery message.
API-key-only Codex auth gives a clear "ChatGPT login required" message.
```

## Rollout

Gate behind one local feature flag first:

```txt
VITE_STAGE_CHATGPT_VOICE_BRIDGE=true
```

Once stable locally, enable by default for desktop V1 if:

```txt
Codex is installed.
Codex ChatGPT auth is available.
Microphone permission is granted or promptable.
```

If unavailable, keep the microphone control visible but disabled with setup copy.

## Assumptions

```txt
Stage V1 intentionally uses the private ChatGPT transcription bridge.
This is a product decision, not only an experiment.
The bridge may break if ChatGPT/Codex changes its internal endpoint or auth shape.
Claude is supported as the reasoning provider after transcription.
Claude is not supported as the V1 transcription provider.
Voxtral/OpenRouter is not removed forever; it is simply not the V1 default.
No always-on microphone in V1.
No streaming transcription in V1.
No automatic artifact mutation from voice in V1.
```
