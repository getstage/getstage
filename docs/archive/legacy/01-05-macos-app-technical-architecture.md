# 01-05-2026 — Stage macOS App: Technical Architecture

## Technology Decision

**Electron** is the recommended starting point. The reasoning:

- Stage web app is already React + Tailwind + Convex — Electron lets you reuse this directly
- Chromium (bundled in Electron) is the most tested rendering engine in the world — 15+ years, billions of users, pixel-perfect retina, flawless markdown/rich text/emoji/media rendering
- Screen Studio, Linear, Figma, Notion, Slack, Cursor, Claude Desktop all use Electron
- The apps that feel "most native" on macOS (Raycast, CleanShot X, Clicky) use Swift — but that requires rebuilding everything from scratch in a new language
- If Electron doesn't feel good enough → you'll know exactly what to rebuild in Swift

**Bundle size trade-off:** Electron apps are 300-800MB (Cursor 839MB, Claude 728MB, Notion 280MB). This is because Chromium is bundled. Native Swift apps are 5-130MB. This is the cost of using a web engine — but users accept it (every major desktop app does it).

## What Chromium gives you

Chromium is the open-source engine behind Google Chrome. In Electron, your app window contains a Chromium browser that renders your React app locally. It's not a website — it's your app.

```
macOS Window
  └── Chromium browser (bundled, no internet needed)
       └── Your React app
            └── Looks and behaves like a desktop app
```

What it does well:
- **Rendering** — HTML, CSS, text, fonts, images, video, markdown, emoji, RTL, complex layouts. Everything. Always correct.
- **Retina** — Handles 2x/3x pixel density perfectly. Text is sharp, images are sharp. WKWebView (Safari/Tauri) has known issues here.
- **DevTools** — Debug your desktop app with Chrome DevTools. Same workflow you already know.

What it does poorly:
- **Size** — You bundle a whole browser. 300-800MB.
- **RAM** — Each window is a separate process. 150-400MB baseline.
- **Startup** — Chromium needs to boot. 1-3 seconds.

## Why not Tauri?

Tauri uses WKWebView (Safari's engine) instead of Chromium. It's smaller (~5-15MB) but:
- WKWebView has known retina rendering issues in desktop apps (blurry screen captures, CSS inconsistencies)
- No major apps use Tauri — zero proven track record
- Developers who try Tauri frequently switch to Electron (documented in Syntax podcast, YouTube comments, blog posts)
- The Hopp blog (gethopp.app) shows startup time is comparable between Electron and Tauri, so the main Tauri advantage (performance) is minimal

## Why not Swift?

Swift + AppKit gives the best possible macOS experience. Raycast, CleanShot X, and Clicky all use it. But:
- You'd rebuild your entire UI from scratch in a new language (SwiftUI/AppKit instead of React)
- No code sharing with Stage web app — two completely separate codebases
- SwiftUI has its own learning curve (3-6 months to be productive)
- Requires a dedicated macOS/iOS developer

**The native macOS APIs (ScreenCaptureKit, AVAudioEngine, NSWorkspace) work the same regardless of framework.** Electron calls them via Node native modules. Swift calls them directly. Same result. The only difference is how you render the UI.

## Native macOS APIs needed (only 5)

These 5 APIs power all 10 features. They are macOS system APIs — not tied to any framework:

| macOS API | What it does | Features |
|---|---|---|
| `ScreenCaptureKit` | Capture screen/window/region | 2, 3, 4 |
| `AVAudioEngine` | Microphone access + audio stream | 5 |
| `NSWorkspace` | Detect active app + window title | 2, 10 |
| `CGEvent` / `NSEvent.addGlobalMonitorForEvents` | Global keyboard shortcuts | 1, 3, 8, 9 |
| `NSWindow` / `NSPanel` | Floating always-on-top window | 1, 9 |

In Electron, these are accessed via:
- `desktopCapturer` (Chromium's built-in screen capture, uses ScreenCaptureKit internally)
- `navigator.mediaDevices.getUserMedia()` (Web Audio API for mic, uses AVAudioEngine internally)
- `active-win` npm package (uses NSWorkspace internally)
- `globalShortcut.register()` (Electron built-in, uses CGEvent internally)
- `new BrowserWindow({ alwaysOnTop: true })` (uses NSWindow internally)

## App structure

```
stage-desktop/
├── package.json
├── electron/
│   ├── main.ts                ← Electron main process
│   ├── shortcuts.ts           ← Global shortcut registration
│   ├── windows.ts             ← Floating window management
│   ├── tray.ts                ← Menu bar icon
│   └── native/
│       ├── screen-capture.ts  ← desktopCapturer wrapper
│       ├── active-app.ts      ← active-win npm package
│       └── audio.ts           ← mic access via Web Audio API
│
├── src/                       ← React app (reuse from Stage web)
│   ├── App.tsx
│   ├── components/
│   │   ├── CommandPalette.tsx  ← Feature 9
│   │   ├── CursorCompanion.tsx ← Feature 1
│   │   ├── CaptureOverlay.tsx  ← Feature 3
│   │   ├── CritiquePanel.tsx   ← Feature 4
│   │   ├── VoiceBrief.tsx      ← Feature 5
│   │   ├── Moodboard.tsx       ← Feature 6 (display only)
│   │   ├── HandoffExport.tsx   ← Feature 8
│   │   └── FocusTracker.tsx    ← Feature 10
│   ├── hooks/
│   │   ├── useScreenCapture.ts
│   │   ├── useActiveApp.ts
│   │   ├── useVoiceRecording.ts
│   │   └── useProjectContext.ts ← Convex queries (reuse from Stage)
│   └── lib/
│       └── convex.ts           ← Same Convex client as web app
│
└── build/                      ← DMG output
```

## Feature-by-feature implementation

### Feature 1: Cursor Companion (floating AI window)

**What it does:** Small floating window triggered by `Cmd+Shift+Space`. Text or voice input. Claude responds with project-aware answers.

**Electron main process:**
```typescript
const companionWindow = new BrowserWindow({
  width: 400,
  height: 300,
  alwaysOnTop: true,
  transparent: true,
  frame: false,
  vibrancy: 'popover',  // native macOS blur effect
})

globalShortcut.register('Cmd+Shift+Space', () => {
  companionWindow.isVisible() ? companionWindow.hide() : companionWindow.show()
})
```

**React component:**
- Text input field
- Send to Claude API with project context from Convex
- Render markdown response
- A mini chat component — same UI pattern as Stage web

---

### Feature 2: Context-Aware Screen Reading

**What it does:** Stage detects which app is active and analyzes what's on screen.

**Implementation:**
```typescript
// Detect active app
import activeWin from 'active-win'
const window = await activeWin()
// → { owner: { name: 'Figma' }, title: 'ClientX.fig' }

// Capture screenshot of active window
const sources = await desktopCapturer.getSources({ types: ['window'] })
const figmaSource = sources.find(s => s.name.includes('Figma'))
// → screenshot as NativeImage

// Send to Claude Vision API
// → "Analyze this Figma design against our brand guidelines: {project context}"
```

---

### Feature 3: Quick Capture (screenshot → project)

**What it does:** `Cmd+Shift+C` activates selection mode. User drags to select a region. Stage captures, classifies, and saves it.

**Electron main process:**
```typescript
globalShortcut.register('Cmd+Shift+C', () => {
  const captureWindow = new BrowserWindow({
    fullscreen: true,
    transparent: true,
    frame: false,
  })
  captureWindow.loadURL('app://capture')
})
```

**React component (CaptureOverlay.tsx):**
- Fullscreen transparent canvas
- User drags to select region (crosshair cursor)
- Crop screenshot to selection
- Upload to R2 (reuse `uploadFileToR2()` from Stage web)
- Claude Vision classifies it (reference/color/typography/UI pattern)
- Save to Convex project with AI-generated tags

---

### Feature 4: Design Critique on Demand

**What it does:** Trigger Stage while in Figma. It screenshots your current design and compares against your brief/brand strategy.

**Implementation:** Combines feature 2 (screenshot) + feature 1 (show response):
- Capture current screen via `desktopCapturer`
- Load project context from Convex (brief, brand strategy, approved design direction)
- Send both to Claude Vision: "Critique this design against this brief"
- Show response in companion window

---

### Feature 5: Voice-to-Brief

**What it does:** Start recording during a client call. Stage transcribes and structures it into a project brief.

**Implementation:**
```typescript
// Mic access works out of the box in Electron (Chromium Web Audio API)
const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

// Stream audio chunks to Whisper/Deepgram API for real-time transcription
// Get transcription back
// Send to Claude: "Structure this conversation as a project brief with:
//   goals, preferences, constraints, timeline, key decisions"
// Save to Convex project
```

No native module needed — `navigator.mediaDevices` works in Electron because Chromium has full Web Audio API support.

---

### Feature 6: Ambient Research Mode

**What it does:** Toggle "Research Mode", browse the web, Stage silently captures screenshots/colors/layouts, generates a moodboard.

**This requires a browser extension (separate project):**
```
// Chrome extension (separate project, Chrome Manifest V3):
chrome.tabs.onActivated → capture tab screenshot
chrome.tabs.onUpdated → capture URL + page metadata
→ Send captures to Convex backend
```

**Desktop app only displays the collected moodboard:**
```typescript
// Moodboard.tsx
const captures = useQuery(api.research.getAmbientCaptures)
// → Render grid of collected screenshots
// → Approve/discard buttons per item
// → Generate final moodboard from approved items
```

---

### Feature 7: Push-to-Figma

**What it does:** Push Stage-generated design assets (colors, typography, wireframes) directly into Figma.

**This requires a Figma Plugin (separate project):**
```typescript
// Figma plugin (separate TypeScript project, runs inside Figma's sandbox):
// Polls Convex backend for generated assets, then:

figma.createPaintStyle()  // → push color styles
figma.createTextStyle()   // → push typography styles
figma.createFrame()       // → push wireframe layouts
figma.createComponent()   // → push component structures

// Assets arrive in a "Stage Generated" page inside the Figma file
```

**Requires Figma OAuth review** for public distribution (users need to authorize Stage to access their Figma files).

---

### Feature 8: Smart Handoff Packages

**What it does:** `Cmd+Shift+H` packages your entire project for client delivery.

**Electron main process:**
```typescript
globalShortcut.register('Cmd+Shift+H', () => {
  handoffWindow.show()
})
```

**React component (HandoffExport.tsx):**
- Select what to include (research, strategy, assets, designs)
- Select format:
  - **PDF**: Render HTML template → `window.print()` or Puppeteer (Chromium makes this easy)
  - **Notion**: Call Notion API with OAuth token from Convex (requires Notion OAuth review)
  - **Portal**: Generate portal link (already exists in Stage web)
- Compile and deliver

---

### Feature 9: Keyboard-First Command Palette

**What it does:** `Cmd+Shift+S` opens a Spotlight-style command palette.

**Implementation:** Same window pattern as feature 1:
```typescript
globalShortcut.register('Cmd+Shift+S', () => {
  paletteWindow.show()
})
```

**React component (CommandPalette.tsx):**
- Text input with fuzzy search (use `fuse.js` or similar)
- Match against commands: `research`, `critique`, `capture`, `switch project`, `show colors`, etc.
- Route to the corresponding feature handler
- UI: input field + results list (same pattern as Raycast)

---

### Feature 10: Focus Sessions & Auto-Tracking

**What it does:** Stage detects which project you're working on, tracks time, generates end-of-session report.

**Implementation:**
```typescript
// Poll active app every 30 seconds
import activeWin from 'active-win'

setInterval(async () => {
  const window = await activeWin()
  // Log: { app: 'Figma', title: 'ClientX.fig', timestamp: Date.now() }
  // Match window title to Stage projects in Convex
  // Track time per project
}, 30_000)

// End of session:
// Send activity log to Claude → generate summary
// Save timesheet entry to Convex
```

**React component (FocusTracker.tsx):**
- Show current active project (auto-detected)
- Time tracked today per project
- End-of-session report with accomplishments + suggested next steps

---

## What you reuse from Stage web app

- `useQuery` / `useMutation` hooks — same Convex client
- Project context queries (brief, research, strategy, brand assets)
- `uploadFileToR2()` — same upload flow
- Types (`Phase`, `Task`, `Project`, `PortalConfig`)
- Tailwind config + design tokens
- Component patterns (cards, badges, buttons, inputs)
- Authentication (Convex auth tokens)

## What's new (Electron-specific)

Only ~200-300 lines of Electron-specific code:
- `main.ts` — window creation + shortcuts (~80 lines)
- `screen-capture.ts` — desktopCapturer wrapper (~30 lines)
- `active-app.ts` — active-win wrapper (~20 lines)
- Window management + IPC (~50 lines)
- Tray/menu bar icon (~30 lines)

Everything else is React components — which you already know how to build.

## Three separate projects

| Project | Tech | Approval needed |
|---|---|---|
| **Desktop app** (features 1-5, 8-10) | Electron + React | Apple notarization only (automated, no review) |
| **Browser extension** (feature 6) | Chrome Manifest V3 / Safari Web Extension | Chrome Web Store review |
| **Figma plugin** (feature 7) | TypeScript in Figma sandbox | Figma OAuth review |

## OAuth requirements

| Service | What you need | Approval process |
|---|---|---|
| **Figma** | OAuth app for Push-to-Figma + structured design reading | Register at figma.com/developers → submit for review (required for public apps with >50 users) |
| **Notion** | OAuth integration for Smart Handoff → Notion export | Register at notion.so/my-integrations → submit for Notion integration gallery review |
| **Apple** | Developer certificate for DMG distribution | $99/year Apple Developer Program → automated notarization (not App Store review) |

## Distribution

DMG via website download (same as Raycast, Figma, Linear, CleanShot X, etc.):
- Build with `electron-builder`
- Code sign with Apple Developer certificate
- Notarize via Apple's automated service (Electron supports this out of the box)
- Host DMG on your website
- Auto-updates via `electron-updater`
- No App Store needed, no 30% Apple cut

## Suggested build order

1. **MVP**: Features 1 + 3 + 9 (floating window + quick capture + command palette) — proves the core value
2. **Screen intelligence**: Features 2 + 4 (screen reading + design critique) — adds screenshot + Vision on top of MVP
3. **Voice**: Feature 5 (voice-to-brief) — mic module addition
4. **Tracking**: Feature 10 (focus sessions) — background tracking
5. **Export**: Feature 8 (smart handoff) — packaging + PDF generation
6. **Browser extension**: Feature 6 (ambient research) — separate project, can be built in parallel
7. **Figma plugin**: Feature 7 (push-to-figma) — separate project, can be built in parallel
