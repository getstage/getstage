# Stage Desktop Companion Plan

Date: 2026-05-03

## Summary

Build a new `desktop/` Electron app next to the existing `app/` web app.

The first desktop version reuses the existing Stage dashboard/app UI as the baseline, then adds the native companion/chat layer on top:

- The current `.tsx` dashboard/app screens are already close to the desired dashboard design and should be copied/adapted into the desktop renderer.
- The desktop dashboard should visually match the current Stage dashboard experience.
- The extra Figma designs are mainly the native desktop companion additions: voice/audio bar, draggable chat/critique panel, thinking/response states, and related overlay behavior.
- The native companion flow sits on top of the dashboard/app UI.
- Login stays on `getstage.co`.
- Convex remains the source of truth.
- Figma and Notion remain part of the architecture through OAuth/API/plugin boundaries.

Important clarification: the dashboard is not a placeholder. It should reuse the existing working dashboard/components from the web app. The caution is only about not moving website-only responsibilities such as billing, public auth pages, and account portal logic into Electron unless the desktop product explicitly needs them.

## Key Decisions

- Desktop framework: Electron
- Renderer: React + Vite
- Routing: TanStack Router
- Server/action state: TanStack Query where useful
- Realtime/app data: Convex
- Auth entry point: existing website login on `getstage.co`
- Desktop auth return: `stage://auth` deep link
- Native strategy: Electron/JavaScript proof of concept first, Swift modules only where needed after measurement
- First product target: existing dashboard/app UI inside Electron plus Design Critique on Demand companion flow
- Electron implementation reference skill: `electron` from `https://github.com/teachingai/full-stack-skills`

## Repository Shape

```text
stage_mvp/
├── app/                         # Existing Stage web app
├── agent-mode/                  # Existing Stage skill/plugin for Claude/Codex/Cursor
└── desktop/                     # New macOS Electron app
    ├── electron/                # Electron main/preload/native bridge
    ├── src/                     # React renderer
    ├── shared/                  # Shared desktop helpers/types
    ├── docs/                    # Desktop-specific documentation
    └── package.json
```

## Proposed Desktop Directory Structure

```text
desktop/
├── electron/
│   ├── main.ts
│   ├── preload.ts
│   ├── ipc.ts
│   ├── windows.ts
│   ├── shortcuts.ts
│   ├── tray.ts
│   ├── auth.ts
│   └── native/
│       ├── active-app.ts
│       ├── screen-capture.ts
│       ├── microphone.ts
│       └── permissions.ts
├── src/
│   ├── main.tsx
│   ├── router.tsx
│   ├── app/
│   │   ├── DesktopShell.tsx
│   │   ├── AuthGate.tsx
│   │   └── DashboardContextView.tsx
│   ├── companion/
│   │   ├── CompanionOrb.tsx
│   │   ├── VoiceControlBar.tsx
│   │   ├── CritiquePanel.tsx
│   │   └── CommandPalette.tsx
│   ├── integrations/
│   │   └── IntegrationStatus.tsx
│   ├── lib/
│   │   ├── convex.ts
│   │   ├── desktop-api.ts
│   │   └── stage-api.ts
│   └── styles/
│       └── desktop.css
├── docs/
│   ├── auth-flow.md
│   ├── native-permissions.md
│   ├── ipc-security.md
│   └── figma-notion-boundaries.md
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## What Stays In The Website

The existing web app remains responsible for:

- Login
- Account management
- Billing
- Developer API keys
- Agentic API documentation
- Full project management
- Client portal
- Figma OAuth connect flow
- Notion OAuth connect flow
- Public routes and marketing/account pages

## What Stays In Convex

Convex remains the source of truth for:

- Users
- Projects
- Clients
- Phases
- Tasks
- Project AI context
- AI runs
- AI artifacts
- Artifact destinations
- R2 upload metadata
- Agent connections
- Native integration connections
- API keys
- Billing/subscription data

The Electron app should not duplicate this data model.

## What Electron Owns

Electron owns the macOS desktop layer:

- Local app shell
- Global shortcuts
- Floating companion window
- Audio/input bar
- Draggable critique/chat panel
- Screen/window capture
- Active app detection
- Optional local folder/context detection later
- Secure bridge between native APIs and React UI
- Local desktop preferences such as window position and active project

## First Working Version Scope

Build these first:

1. Electron app launches on macOS.
2. Renderer loads React/Vite/TanStack app.
3. Secure preload bridge exists.
4. Main desktop window opens.
5. Existing Stage dashboard/app UI baseline renders in Electron.
6. Companion UI can open via global shortcut.
7. Voice/input bar supports idle, listening, processing states.
8. Critique panel opens, closes, drags, and shows thinking/response states.
9. Website login launcher opens `getstage.co`.
10. `stage://auth` protocol handler is prepared.
11. Permission status UI exists.
12. Active app detection proof of concept exists behind IPC.
13. Screen capture proof of concept exists behind IPC.

Do not rebuild the dashboard from scratch. Reuse/copy the existing `.tsx` dashboard/app components that already match the intended design, then adapt only the browser-specific behavior for Electron.

## Dashboard Clarification

There should be a dashboard in Electron.

The distinction is:

### Dashboard/app UI to copy/adapt

This means copying/adapting the existing authenticated Stage app UI that is already represented in `.tsx` files:

- sidebar
- dashboard overview
- projects list/context
- project detail surfaces where needed
- tasks/recent activity
- integrations/status surfaces where needed
- existing cards, charts, lists, and app shell styling

This is the baseline for desktop. It should stay visually aligned with the current Stage dashboard design.

### Website-only flows to keep out of Electron initially

These should remain website-owned unless we intentionally add them later:

- login page UI
- billing checkout/portal flows
- public marketing pages
- full client portal
- developer API docs
- onboarding/paywall flows

Electron can open these flows in the browser.

### Extra desktop-only Figma designs

These are not already covered by the existing dashboard `.tsx` files and must be added:

- audio idle state
- audio active/listening state
- processing/thinking state
- draggable critique/chat panel
- response state
- follow-up input state
- companion orb/window behavior
- permission states for screen/audio access

The desktop app should feel like Stage because it reuses the Stage dashboard, but it becomes a macOS app because of these native companion layers.

## Existing TSX Reuse Plan

The desktop renderer should start by reusing/copying the current app UI instead of asking the UI partner to recreate it from zero.

Candidate source areas:

```text
app/src/components/shared/
app/src/components/dashboard/
app/src/components/project/
app/src/components/settings/
app/src/features/dashboard/
app/src/features/project-detail/
app/src/features/settings/
app/src/styles/
```

Adaptation rules:

- keep visual styling as close as possible to current `.tsx` implementation
- replace web-only navigation with TanStack Router desktop routes where needed
- replace `window.location.assign(...)` with desktop-safe helpers where needed
- keep Convex queries/mutations when they already work in renderer
- avoid importing web-only routes that belong to public/auth/billing flows
- isolate desktop-only companion UI under `desktop/src/companion/`

The UI partner should mainly work on:

- converting extra Figma companion/chat designs into `desktop/src/companion/`
- polishing copied dashboard screens inside `desktop/src/app/`
- keeping one-to-one visual parity with Figma/current Stage dashboard

## Public Interfaces / Types To Add

Add a single typed preload surface.

```ts
type DesktopSession = {
  userId: string;
  accessToken?: string;
  expiresAt?: number;
};

type ActiveAppInfo = {
  name: string;
  bundleId?: string;
  path?: string;
  windowTitle?: string;
};

type CaptureResult = {
  imageDataUrl: string;
  width: number;
  height: number;
  source: "screen" | "window" | "region";
};

type PermissionKind =
  | "screen-recording"
  | "microphone"
  | "accessibility"
  | "notifications"
  | "files";

type PermissionState = "granted" | "denied" | "not-determined" | "unknown";

type DesktopPermissionStatus = Record<PermissionKind, PermissionState>;

type CompanionState =
  | "idle"
  | "listening"
  | "processing"
  | "thinking"
  | "response"
  | "error";
```

Expose only this API to React:

```ts
window.stageDesktop = {
  auth: {
    openLogin: () => Promise<void>;
    getSession: () => Promise<DesktopSession | null>;
  };
  companion: {
    show: () => Promise<void>;
    hide: () => Promise<void>;
    setState: (state: CompanionState) => Promise<void>;
  };
  screen: {
    getActiveApp: () => Promise<ActiveAppInfo>;
    captureActiveWindow: () => Promise<CaptureResult>;
  };
  permissions: {
    getStatus: () => Promise<DesktopPermissionStatus>;
    openSystemSettings: (permission: PermissionKind) => Promise<void>;
  };
};
```

No direct `ipcRenderer` usage in React components.

## Electron Security Rules

Use these defaults:

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true` unless a specific blocker is found
- all native actions go through `preload.ts`
- all IPC payloads must be validated
- no raw Node APIs exposed to the renderer
- no OAuth tokens in React state
- no OAuth tokens in `localStorage`
- no OAuth tokens in `sessionStorage`
- sensitive local values use Electron safeStorage or OS keychain-compatible storage

## Auth Flow

Primary flow:

1. User clicks "Log in with Stage" in Electron.
2. Electron opens the default browser to `https://getstage.co/auth/desktop?...`.
3. Website handles the normal login.
4. Website redirects to `stage://auth?code=...`.
5. Electron receives the protocol callback.
6. Electron exchanges the code with Stage backend/Convex endpoint.
7. Electron stores the desktop session securely.
8. Renderer initializes authenticated Stage/Convex access.

Fallback flow:

1. Website shows a short device code.
2. User pastes the code into Electron.
3. Electron exchanges the code for a session.

Rules:

- no embedded login webview
- no passwords inside Electron
- OAuth remains browser-based
- long-lived secrets must not be stored in the renderer

## macOS Permissions

Implement permission UX for the following.

| Permission | Needed For | First Version |
|---|---|---|
| Screen Recording | screen/window capture for critique | yes |
| Microphone | voice input / Voice-to-Brief | yes, at least status/mock |
| Accessibility | future automation/focus control | document, not required first |
| Notifications | reminders/status updates | optional |
| Files/Folders | local project folder indexing | later |
| Camera | not needed | no |

Also include:

- `stage://` custom protocol registration
- Info.plist usage descriptions for microphone/screen-related flows
- code signing
- hardened runtime
- Apple notarization
- future auto-update strategy

## Permission Details

### Screen Recording

Required for:

- capturing Figma screen/window
- capturing browser inspiration/reference screens
- Design Critique on Demand
- Quick Capture

UX requirement:

- If missing, show clear "Enable Screen Recording" state.
- Provide a button to open macOS System Settings.
- Do not silently fail.

### Microphone

Required for:

- voice input
- Voice-to-Brief
- audio-driven companion bar

UX requirement:

- show visible recording state
- show explicit stop/cancel controls
- ask only after user intent

### Accessibility

Not required for first build unless active automation/focus control needs it.

Future use:

- app control
- focus sessions
- more advanced global interaction
- possible active window automation

### Notifications

Optional for first build.

Future use:

- capture complete
- critique ready
- focus session ended
- sync/export complete

### Files/Folders

Not first build.

Future use:

- local project folder scan
- `.claude` detection
- `.codex` detection
- local asset indexing
- local context packaging

## TanStack In Electron

TanStack Router and TanStack Query can be used in Electron.

Reason:

- Electron renderer is a normal browser-like React runtime.
- Vite works normally for the renderer.
- TanStack Router works for local renderer routes.
- TanStack Query works for API/action state.

Adjustments needed:

- avoid blind `window.location.assign(...)` for desktop-only navigation
- wrap external browser opens through preload/main process
- keep web-only routes out of the first desktop renderer
- use desktop-specific routes for companion/dashboard/auth states

Recommended first desktop routes:

```text
/
/auth
/dashboard
/companion
/settings/integrations
```

These are renderer routes, not public website routes.

## Native / Swift Strategy

Do not start with Swift modules immediately.

First implementation:

- Electron `globalShortcut`
- Electron `BrowserWindow`
- Electron `desktopCapturer` proof of concept
- JavaScript package or simple helper for active app detection
- browser media APIs for first audio state

Swift upgrade points:

- `NSWorkspace` for reliable event-based active app detection
- `ScreenCaptureKit` for better screen/window capture performance
- `AVAudioEngine` for robust microphone/audio capture
- native permission helpers if Electron APIs are not enough

This keeps the first app buildable while preserving the correct native path.

## Design Critique Flow

Target flow:

```text
Cmd+Shift+Space
→ show VoiceControlBar
→ user speaks or types critique request
→ state: processing
→ capture active screen/window
→ fetch active Stage project context from Convex
→ send screenshot + brief/research/strategy context to AI layer
→ state: thinking
→ show draggable CritiquePanel
→ stream/display response
→ allow follow-up
```

First version may mock the AI response, but the interfaces must match the real flow.

## Figma Boundary

Figma remains required.

Use three separate concepts:

1. Figma OAuth/API: account/file metadata and connected status.
2. Figma Plugin: creating frames, components, styles, design tokens.
3. Desktop companion: orchestration, screen context, and user trigger.

Electron should not pretend it can directly manipulate Figma documents without plugin/API support.

The existing system already has native Figma connection concepts in Convex. The desktop app should display and reuse that connection state rather than creating a separate token model.

## Notion Boundary

Notion remains required.

Rules:

- OAuth remains server-side through the existing Stage flow.
- Desktop opens connect flow in browser if needed.
- Tokens stay out of renderer.
- Smart handoff/export writes back to the existing artifact destination model.

The existing system already has native Notion connection concepts in Convex. The desktop app should display and reuse that connection state rather than creating a separate token model.

## Agent / Skills Boundary

`agent-mode/` remains important.

Desktop should eventually:

- show Claude/Codex/agent connection status
- help user install/use Stage skill
- use Stage API key flow where relevant
- optionally detect local `.claude` / `.codex` folders later

Important distinction:

- Claude/Codex local skills can read filesystem/project context.
- Figma/Notion are not treated like local `.claude` or `.codex` auth.
- Figma/Notion require OAuth/plugin/API paths.

## Local Files And Context

Later, not day one:

- choose local project folder
- detect `.claude`
- detect `.codex`
- scan local assets
- index relevant files
- package local context into AI requests

Do not block the first Electron app on this.

## Local Storage

Phase 1:

- desktop preferences
- active project id
- window positions
- permission hints

Storage options:

- Electron safeStorage for sensitive local values
- simple app config for non-sensitive preferences

Phase 2:

- SQLite for local-first/cache/job queue if needed

Do not start with a full local-first rewrite.

## Packaging

Needed:

- electron-builder
- macOS app bundle
- DMG build
- app icon
- hardened runtime
- code signing
- notarization

For local development:

- unsigned dev build is acceptable

For distribution:

- Apple Developer ID is required
- notarization pipeline is required

## Auto Update

Not day one, but reserve the architecture.

Options:

- electron-updater
- GitHub releases
- private update endpoint

Decision can happen later, but build setup should not block auto-update.

## UI Handoff For Partner

Partner should mostly work in:

```text
desktop/src/app/
desktop/src/companion/
desktop/src/integrations/
desktop/src/styles/
```

Partner should not need to work in:

```text
desktop/electron/
desktop/electron/native/
desktop/electron/ipc.ts
```

Create UI states early:

- idle
- listening
- processing
- thinking
- response
- error
- no permission
- no active project
- disconnected

## Implementation Order

1. Create Electron/Vite/React/TanStack skeleton.
2. Add secure preload IPC bridge.
3. Add main desktop window.
4. Add companion window/panel shell.
5. Add VoiceControlBar states.
6. Add CritiquePanel states and dragging.
7. Add limited dashboard context view.
8. Add website login launcher.
9. Add `stage://auth` protocol handler.
10. Add permission status UI.
11. Add global shortcut.
12. Add active app proof of concept.
13. Add screen capture proof of concept.
14. Connect Convex project context.
15. Connect real critique request flow.
16. Add Figma/Notion integration status display.
17. Plan separate Figma plugin workstream.

## Test Cases And Acceptance Scenarios

Manual acceptance:

- App opens on macOS.
- Renderer loads without Node access.
- Shortcut opens companion UI.
- Voice bar can switch states.
- Critique panel opens, closes, drags, and keeps position.
- Login button opens website, not embedded webview.
- `stage://auth` callback is received in development.
- Permission missing state is shown for screen recording.
- Active app detection returns current app name.
- Screen capture proof of concept returns image data.
- Dashboard context can show selected project data.
- Figma/Notion statuses display without exposing tokens.

Technical checks:

- TypeScript passes.
- Vite build passes.
- Electron main/preload build passes.
- No direct `ipcRenderer` imports in `src/`.
- No direct Node imports in renderer components.
- No OAuth token usage in localStorage/sessionStorage.
- IPC handlers validate input and return typed output.

## Explicit Assumptions

- The existing Stage web app remains the main account/billing/API portal.
- Convex remains the source of truth.
- The desktop app is a companion, not a full duplicate SaaS app.
- First build prioritizes companion flow plus a small dashboard/context view.
- Electron proof of concept comes before Swift native modules.
- Swift is reserved for performance/permission-sensitive native upgrades.
- Figma and Notion stay required and are included in the architecture.
- Partner UI work should happen mostly in `desktop/src/`, not `desktop/electron/`.

## Reference Docs

- Electron Security: https://www.electronjs.org/docs/latest/tutorial/security
- Electron IPC: https://www.electronjs.org/docs/latest/tutorial/ipc
- Electron globalShortcut: https://www.electronjs.org/docs/latest/api/global-shortcut
- Electron desktopCapturer: https://www.electronjs.org/docs/latest/api/desktop-capturer
- Electron Skill: https://skills.sh/teachingai/full-stack-skills/electron
- Installed with: `npx skills add https://github.com/teachingai/full-stack-skills --skill electron --yes`
- Installed path: `.agents/skills/electron`
