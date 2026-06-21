# Stage Chatbot Plan

Last updated: 2026-06-14

This document is the single source of truth for the current Stage chatbot work.
Keep everything chatbot-related here instead of splitting it across multiple
small files.

## Product Goal

Stage chat should feel like a reliable product surface, not a technical demo.
Users must be able to use voice, open chat quickly, continue recent chats, and
resize the chat panel when they need more room. Technical provider details must
not leak into the UI.

The next product boundary is a project-aware design companion. A user working
in Figma or a browser can pin `@Limora`, attach or capture the visible design,
and ask Stage to critique it against Limora's real brief, strategy, phases,
tasks, and latest AI artifacts. Stage must ask for a project instead of guessing
when a critique or project-dependent request has no pinned project.

## Current Shipped Scope

- Safe voice/chat errors: no raw OpenRouter/provider text in the UI.
- Clean chat output: readable paragraphs, bullets, and bold text where needed.
- Resizable Stage chat panel: default stays compact, user can make it wider or
  larger.
- Keyboard shortcut settings: editable voice note and open-chat shortcuts in
  Settings.
- Chat history: save chats locally, open latest chat, create a new chat, and
  show recent chats in Stage style.

## Next Build: Project-Aware Vision Chat

Build in branch `feat/stage-chat-project-context-vision`:

- One pinned Stage project per chat, selected through `@project`.
- Searchable, access-controlled project picker.
- Project-required request guard: image critique and project-dependent prompts
  do not call the AI until the user selects a project.
- Authoritative, bounded project context loaded from Convex by Stage Engine.
- Paste, drag-and-drop, and file-picker image attachments.
- Visible, user-confirmed current-window capture for Figma Desktop and browser
  windows. Never capture continuously or silently.
- Text critique and design directions grounded in the selected project.
- Local-first screenshot storage under Electron `userData`; delete attachments
  with the owning chat.
- Provider image delivery for Codex and Claude.

Do later:

- Generated redesign images or annotated screenshots.
- Multiple pinned projects in one chat.
- Cloud-synced chat history or R2 screenshot storage.
- Automatic browser-tab identification.
- Any artifact mutation from chat. Chat may suggest actions later, but must not
  silently save project changes.

## Large Database And Fast Search Strategy

Stage must not load a user's full project database into the renderer or provider
prompt. Fast `@project` lookup and rich project context are separate read paths.

### 1. Fast `@project` lookup

Add normalized searchable fields to projects:

- `searchName`: lowercase normalized project name.
- `searchText`: bounded normalized project name plus client name.

Add Convex indexes:

- `projects.by_user_search_name` on `[userId, searchName]` for exact and
  deterministic project resolution.
- A Convex search index over `searchText`, filtered by `userId`, for prefix/text
  suggestions.

Expose a paginated `searchProjectsForChat` query:

- Minimum query length: 1 character after `@`.
- Return at most 10 lightweight project references.
- Include project ID, name, client name, status, and updated time only.
- Never fetch phases, tasks, or artifacts for picker suggestions.
- Debounce renderer requests and cancel stale searches.
- Resolve a selected project by ID, never by name.
- Backfill existing projects in bounded batches with
  `maintenance:backfillProjectSearchText` after deployment.

For an empty `@` query, return a small indexed list of recently updated active
projects. Never collect and sort every project in memory.

### 2. Bounded authoritative chat context

The first production slice uses one access-controlled, bounded Convex query per
chat run. It reads the selected project by ID, capped phase/task summaries, and
the latest artifact per module through compound indexes. It never scans the
user's full database and is simpler to keep correct because every answer uses
authoritative current records.

Add a materialized `projectChatContexts` snapshot only after measurements show
the bounded query is too slow. A snapshot requires complete invalidation across
every project, phase, task, AI context, run, and artifact mutation; introducing
it before that contract exists risks fast but stale answers.

Future snapshot shape:

The snapshot would contain:

- Project identity and summary.
- Current phase plus compact phase summaries.
- Open, overdue, and recently completed task summaries.
- Project AI context and brief.
- Latest relevant artifact summaries for research, strategy, moodboard, flows,
  wireframes, and delivery.
- Source update timestamps and truncation/omission counts.
- `contextVersion`, `createdAt`, and `updatedAt`.

Add indexes:

- `projectChatContexts.by_project` on `[projectId]`.
- `projectChatContexts.by_user_updated_at` on `[userId, updatedAt]`.

Update or mark the snapshot stale when project, phase, task, AI context, run, or
artifact mutations complete. Rebuild asynchronously after writes where
possible. On chat read, return the existing snapshot immediately; rebuild only
when missing or stale beyond the accepted freshness window.

This avoids the current anti-pattern of collecting all artifacts for a project
and sorting them in memory. Add compound indexes such as
`projectAiArtifacts.by_project_module_created_at` and query only the latest
bounded records required for the snapshot.

### 3. Bounded context and targeted drill-down

- Keep provider-ready context below 80,000 characters.
- Prefer summaries over full artifact JSON or Markdown.
- Include explicit omitted-item counts so the model knows the view is bounded.
- Treat all project content as untrusted reference data inside clear
  delimiters.
- Add targeted indexed drill-down queries later for questions that need a
  specific task or artifact; do not expand the default snapshot.
- Cache the last resolved snapshot in Stage Engine by project ID and
  `contextVersion` for the active chat run only.

### 4. Scale acceptance targets

- `@project` suggestions return within 250 ms at p95 for a user with 10,000
  projects.
- Loading a pinned project's context uses one bounded, access-controlled query
  in the normal path.
- Provider-ready context remains below 100 KB.
- No chat query performs an unbounded `.collect()` across a user's projects,
  tasks, runs, or artifacts.
- Access is validated by project ID before returning picker results or context.

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
  owns local image attachment storage and window capture
  validates shortcut settings with Zod
  stores shortcut settings under app userData
  sends shortcut intent events to renderer

Preload
  exposes narrow voice settings IPC methods
  exposes shortcut event subscriptions
  exposes narrow image import, preview, delete, and capture IPC

Renderer
  owns chat UI, resize state, and chat history UI
  validates persisted chats with Zod
  owns @project picker and pinned-project presentation
  renders clean chat content
  inserts voice transcript into the active chat composer

Convex
  owns access-controlled project search
  owns the bounded authoritative project-context query

Stage Engine
  loads the selected project's bounded context
  builds a grounded provider prompt
  resolves validated local image attachments for provider vision
```

## Build Order

1. Add indexed project search and bounded chat-context contracts/read model.
2. Add `@project` picker, per-chat pinning, and missing-project guard.
3. Add local image attachment store plus paste, drop, and upload UX.
4. Add visible window-source selection and on-send capture.
5. Add Stage Engine chat-context loading and grounded prompt construction.
6. Add Codex and Claude image delivery.
7. Add scale, access-control, attachment-lifecycle, and end-to-end tests.
8. Update this plan, `PROJECT_STATUS.md`, and the linked Notion task with proof.

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
- Typing `@` returns fast, access-controlled project suggestions.
- A selected project remains pinned to its chat and is resolved by project ID.
- Project-dependent requests without a project are blocked before provider use.
- Image critique uses the selected project's bounded Convex context.
- Screenshots can be pasted, dropped, uploaded, or captured with confirmation.
- Screenshots remain local and are deleted with their owning chat.
- Normal project-context loading never scans the user's complete database.

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
| 11 | Project-aware vision chat | Renderer, Electron, Convex, Stage Engine, provider adapters, this plan, linked Notion task, `PROJECT_STATUS.md` | Added pinned `@project` context, guarded project-dependent prompts, local image lifecycle, visible window capture, provider vision, and bounded Convex search/context architecture. | Stage chat must critique visible work against authoritative project information without loading a user's full database. | Done locally | Typecheck, build, Convex dev codegen, Rust check, and focused Rust tests pass; no push, merge, tag, or release without Werner approval. |
