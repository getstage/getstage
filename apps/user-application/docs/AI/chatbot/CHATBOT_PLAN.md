# Stage Chatbot Plan

Last updated: 2026-06-07

This document is the single source of truth for the current Stage chatbot work.
Keep everything chatbot-related here instead of splitting it across multiple
small files.

## Product Goal

Stage chat should feel like a reliable product surface, not a technical demo.
Users must be able to use voice, open chat quickly, continue recent chats, and
resize the chat panel when they need more room. Technical provider details must
not leak into the UI.

## Scope For This Build

Build now:

- Safe voice/chat errors: no raw OpenRouter/provider text in the UI.
- Clean chat output: readable paragraphs, bullets, and bold text where needed.
- Resizable Stage chat panel: default stays compact, user can make it wider or
  larger.
- Keyboard shortcut settings: editable voice note and open-chat shortcuts in
  Settings.
- Chat history: save chats locally, open latest chat, create a new chat, and
  show recent chats in Stage style.

Do later:

- Outside-Stage / Figma topbar integration.
- Project-aware design critique from Figma or another active app.
- Screenshot capture plus pinned project context.
- Any artifact mutation from chat. Chat may suggest actions later, but must not
  silently save project changes.

## Naming Rules

- User-facing copy says `chat`, `new chat`, `recent chats`, and `latest chat`.
- Do not call this feature `thread` in UI.
- Existing internal files can be migrated carefully, but new user-facing work
  should use chat terminology.
- Do not describe the history UI as Synara-style. It should look and feel like
  Stage.

## Reliability And Security Rules

Use a Rust mindset even in TypeScript:

- Zod validates every persisted chatbot shape.
- Zod validates every IPC payload before main-process use.
- Treat `localStorage`, files under `userData`, provider responses, and IPC args
  as untrusted.
- Prefer calm user-facing errors and technical console logs.
- Do not use `as any`, `@ts-ignore`, or unvalidated JSON to make types pass.
- Effects that subscribe to IPC, browser events, or storage changes must clean
  up listeners.
- Double-clicks and repeated shortcut presses must not create duplicate windows
  or corrupt chat state.

SQL injection is not the primary risk for local JSON storage, but the same
principle applies: never trust raw input. The chat and shortcut data must be
parsed at the boundary before the UI or Electron main process uses it.

## Data Contracts

Chat data must be modeled with Zod, not plain TypeScript only.

Recommended shape:

```ts
const stageChatMessageSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["user", "stage"]),
  content: z.array(z.string()).max(200),
  createdAt: z.number().int().positive(),
  source: z.string().min(1).optional(),
  tone: z.enum(["error"]).optional(),
});

const stageChatSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(120),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
  messages: z.array(stageChatMessageSchema).max(200),
});
```

Shortcut settings must also be Zod-validated:

```ts
const desktopShortcutSettingsSchema = z.object({
  voiceNoteShortcut: z.string().min(1).max(80),
  aiChatShortcut: z.string().min(1).max(80),
});
```

## Architecture

```txt
Electron main
  owns global shortcut registration
  validates shortcut settings with Zod
  stores shortcut settings under app userData
  sends shortcut intent events to renderer

Preload
  exposes narrow voice settings IPC methods
  exposes shortcut event subscriptions

Renderer
  owns chat UI, resize state, and chat history UI
  validates persisted chats with Zod
  renders clean chat content
  inserts voice transcript into the active chat composer
```

## Build Order

1. Create and maintain this `CHATBOT_PLAN.md`.
2. Add shared Zod contracts for shortcut settings and chat storage.
3. Fix OpenRouter/provider error leaking.
4. Improve chat rendering and streaming display.
5. Make chat panel resizable with local size persistence.
6. Add editable keyboard shortcuts in Settings.
7. Persist chats locally and support latest chat/new chat/recent chats.
8. Run lints/type checks for changed files.

## Acceptance Criteria

- OpenRouter/raw provider errors never appear in the UI.
- Chat answers render cleanly with paragraphs, bullets, and bold text.
- The chat panel default size stays close to today, but user can resize it.
- Resized chat size is remembered locally.
- Settings contains editable shortcuts for voice note and opening chat.
- Shortcut conflicts are visible to the user.
- Voice shortcut starts/stops the voice note according to settings.
- Chat shortcut opens the latest chat or creates an empty chat if none exists.
- Recent chats are visible from the Stage chat UI.
- All persisted chat and shortcut data is Zod-validated before use.

## Audit Table

| # | Area | Files | Change | Reason | Status | Notes |
|---|---|---|---|---|---|---|
| 1 | Planning | `apps/user-application/docs/AI/chatbot/CHATBOT_PLAN.md` | Created one central chatbot plan with scope, data contracts, reliability rules, build order, acceptance criteria, and audit table. | User requested one clear plan file before implementation continues. | Done | Keep this table updated for every substantive change. |
| 2 | Shortcut contract prep | `apps/user-application/shared/models/desktop.ts`, `apps/user-application/shared/ipc/channels.ts` | Added initial Zod shortcut settings/result schemas and IPC channel names. | Needed validated Electron shortcut settings boundary. | Started | This happened before this plan file; continue only after this audit entry is recorded. |
| 3 | Electron shortcut prep | `apps/user-application/electron/voice/shortcuts.ts` | Added initial local shortcut settings module with Zod parsing and Electron registration helpers. | Needed local per-machine shortcut persistence and conflict reporting. | Started | Must review carefully before wiring into `main.ts` and preload. |
| 4 | Shortcut IPC wiring | `apps/user-application/electron/voice/index.ts`, `apps/user-application/electron/main.ts`, `apps/user-application/electron/preload.ts`, `apps/user-application/src/types/stage-desktop.d.ts` | Wired Zod-validated shortcut settings through main/preload/renderer types and moved registration ownership out of hardcoded `main.ts` logic. | Settings needs a safe Electron-owned boundary for editable global shortcuts. | Done locally | Shortcut settings UI still pending. |
| 5 | Chat contracts | `apps/user-application/src/models/companion/chat.ts`, `apps/user-application/src/lib/companion/stageChats.ts` | Added Zod contracts for chat messages, chats, chat store, panel size, and safe local storage helpers. | Persisted chat/history data must be validated before UI use. | Done locally | UI integration still pending. |
| 6 | Voice error hygiene | `apps/user-application/electron/voice/errors.ts`, `apps/user-application/electron/voice/index.ts`, `apps/user-application/electron/voice/route.ts`, `apps/user-application/electron/voice/openrouter.ts`, `apps/user-application/src/hooks/companion/useVoiceTranscription.ts` | Mapped technical transcription/provider errors to calm user-facing copy and moved detailed failures to logs. | Users should never see raw OpenRouter/provider text or setup internals in the UI. | Done locally | Needs manual failed-transcription verification. |
| 7 | Chat UI and history | `apps/user-application/src/components/companion/CritiquePanel.tsx`, `apps/user-application/src/styles/desktop.css` | Added local chat persistence integration, recent chats UI, new chat action, latest chat shortcut behavior, safe message creation, simple formatted rendering, and resizable chat panel. | Users need adjustable chat size and chat history without changing the core Stage look. | Done locally | Needs lint/typecheck and manual UI verification. |
| 8 | Shortcut settings UI | `apps/user-application/src/components/settings/ShortcutsPanel.tsx`, `apps/user-application/src/components/settings/SettingsPageView.tsx`, `apps/user-application/src/routes/_authed/settings.shortcuts.tsx`, `apps/user-application/src/lib/settings/settingsTabs.ts`, `apps/user-application/src/models/settings/settings.ts` | Added Settings -> Shortcuts with shortcut recorder, save/reset actions, and registration conflict feedback. | Users need to customize voice and chat keyboard shortcuts. | Done locally | Needs route/typecheck verification. |
| 9 | Router registration | `apps/user-application/src/routeTree.gen.ts` | Added `/settings/shortcuts` to the generated route tree because the router generator CLI is not available in this app. | TypeScript route types must know about the new Settings route. | Done locally | `pnpm --dir apps/user-application exec tsr generate` failed because `tsr` is not installed. |
| 10 | Verification | Changed files | Ran IDE lints and `pnpm --dir apps/user-application typecheck`. | Confirm TypeScript and visible diagnostics are clean after the chatbot changes. | Done locally | Typecheck passed; ReadLints reported no errors on changed files. |
