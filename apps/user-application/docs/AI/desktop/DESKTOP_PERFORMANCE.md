# Desktop — performance, bugs & action plan

> **Status:** open, high priority (June 2026)  
> **Scope:** `apps/user-application` (Electron + renderer + sidecar)  
> **Index:** [`README.md`](./README.md)

---

## Contents

1. [Summary](#summary)
2. [Changelog (already fixed)](#changelog-already-fixed)
3. [2026-06-06 notes (Werner)](#2026-06-06-notes-werner)
4. [Open blockers](#open-blockers)
5. [Diagnosis — where is the slowness?](#diagnosis--where-is-the-slowness)
6. [Action plan](#action-plan)
7. [Debug & observability](#debug--observability)
8. [Known errors (engine / chat / DMG)](#known-errors-engine--chat--dmg)
9. [Files to change](#files-to-change)

---

## Summary

The app feels slow because of **multiple layers at once**, not a single bug.

| Rank | Problem | Cold-start impact |
|------|---------|-------------------|
| **1** | Window waits for `stage-engine` before `createMainWindow` | +1–5s (DMG), +minutes (dev) |
| **2** | No code splitting (~3MB JS in one load) | +1–3s parse after window |
| **3** | Dashboard: too many Convex queries at once | +0.5–2s until “live” |

**Targets (M1 Mac, DMG):** window < 2s · dashboard usable < 4s · `stage-engine` only after first AI action.

---

## Changelog (already fixed)

### v0.1.50 — Codex chat (June 2026)

| Change | File |
|--------|------|
| `--skip-git-repo-check` on Codex runs | `apps/stage-engine/src/providers/codex.rs` |

Chat/AI works in DMG outside a git checkout.

### v0.1.49 — polling & engine status (June 2026)

| Change | File | Effect |
|--------|------|--------|
| Engine badge + 2s poll removed from dashboard | `DashboardContextView.tsx`, `useEngineStatus.ts` | Less localhost traffic |
| `useEngineStatus` off by default | `useEngineStatus.ts` | Only when AI UI needs it |
| Provider poll 10s → 5 min cache | `useProviderStatus.ts` | Fewer engine calls |
| `active-app` query removed | `DashboardContextView.tsx` | Fewer fetches |
| Health check instead of stale cache | `sidecar.ts` → `getLiveStatus()` | No false “Engine ready” |

---

## 2026-06-06 notes (Werner)

| Item | Status |
|------|--------|
| arm64 DMG installed | `file .../stage-engine` → **arm64** ✓ |
| Create Project + avatar | **Fixed** — R2 CORS `app://stage` (see below) |
| chmod EPERM in Terminal | Fix in repo (`sidecar.ts`), **not in v0.1.50 DMG** → needs v0.1.51 |
| About panel arch | Fix in repo (`main.ts`), not released yet |
| Startup benchmark | Targets T1 < 2s, T2 < 4s — see [Debug](#debug--observability) |
| Moodboard error after create | `Project not found` in console — separate, investigate later |

**Cold-start test (Werner):** `killall Stage` → `echo "START $(date '+%H:%M:%S')"` → `open -a Stage` (or `Contents/MacOS/Stage` for logs). Repeat 3×, note T1 window / T2 dashboard.

---

## Open blockers

### P0 — Create project / R2 upload — **fixed 2026-06-06 (infra)**

| Was | Fix |
|-----|-----|
| OPTIONS **403** on `*.r2.cloudflarestorage.com` | R2 bucket CORS: add **`app://stage`**, remove **`file://`** |
| “We could not reach the server…” | Was CORS — not network |

**Check origin:** DevTools → `window.location.origin` → `'app://stage'` (not `file://`).

**CORS JSON + bucket steps:** [`../infra/R2_PUBLIC_DOMAIN_AUDIT.md`](../infra/R2_PUBLIC_DOMAIN_AUDIT.md#cors-for-desktop-uploads).

**Custom domain** (`assets-testing.getstage.co`) = **reads only**. Uploads still go to signed `*.r2.cloudflarestorage.com`.

#### IPC upload — **planned after v0.1.51 deploy**

Alternative if CORS is painful on prod: renderer sends file to **Electron main** via IPC → main does `PUT` (no browser CORS).

| | Renderer PUT (now) | IPC upload (later) |
|--|-------------------|-------------------|
| Needs R2 CORS for `app://stage` | Yes | No |
| Files | — | `electron/ipc.ts`, `electron/helpers/r2-upload.ts`, `src/lib/r2Uploads.ts` |

Not started. Current fix is CORS-only. This is the next desktop reliability task after shipping v0.1.51.

---

## Diagnosis — where is the slowness?

### Layer 1 — Main process (biggest win)

**Critical:** `electron/main.ts` opens the window only **after** sidecar starts:

```ts
sidecarSupervisor.start().finally(() => {
  createMainWindow();
});
```

The user sees nothing until the Rust engine is ready. IPC already starts the engine on first AI action — starting at launch is redundant and blocks the UI.

- Sidecar poll: 500ms × max 240 = up to 120s timeout
- RAM: ~100–200MB extra process at launch
- Auto-update: **not** a blocker (`initAutoUpdates` does not check on startup)

### Layer 2 — Renderer bundle

- All 21 routes static in `routeTree.gen.ts` — no lazy routes
- `ProjectDetailView` imports all tabs directly (Research, Strategy, Moodboard, …)
- No `manualChunks` in `electron.vite.config.ts`
- ~3.1 MB main JS; emoji-picker (~568 KB) only lazy in strategy tab

### Layer 3 — Data on dashboard

| Hook / component | Query |
|------------------|-------|
| `WorkspaceFrame` | `listProjects` + settings |
| `DashboardContextView` | `listProjects` |
| `useSelectedProjectContext` | `listProjects` + heavy `getProjectData` |
| `useNonProOnboardingGate` | `listProjects` + settings |

Convex dedupes the WebSocket, but 4× Zod parse + re-renders. `getProjectData` on the dashboard is too heavy.

### Layer 4 — Router

`src/router.tsx`: `defaultPreload: "intent"` + `defaultPreloadStaleTime: 0` → hover reloads routes.

### Layer 5 — Other (smaller)

- Auth: duplicate IPC `getSession` (`beforeLoad` + `useElectronAuthForConvex`)
- `React.StrictMode` in dev: double effects
- Dashboard charts: no lazy load

---

## Action plan

### P1 — Startup & bundle (`v0.1.52`)

| # | Action | Files |
|---|--------|-------|
| 1 | Open window immediately; **no** sidecar at launch | `electron/main.ts` |
| 2 | Sidecar only on first `engine:*` IPC | `electron/ipc.ts` (partially there already) |
| 3 | Relax router preload | `src/router.tsx` |
| 4 | Lazy routes + `manualChunks` | `src/routes/*`, `electron.vite.config.ts` |
| 5 | Lazy project tabs | `ProjectDetailView.tsx` |
| 6 | Dashboard skeleton | `DashboardContextView.tsx` |
| 7 | Perf markers (optional) | `main.ts`, `windows.ts` |

### P2 — Runtime (`v0.1.53`)

| # | Action |
|---|--------|
| 1 | Shared projects/settings context (no 4× `listProjects`) |
| 2 | No `getProjectData` on dashboard |
| 3 | Single IPC path for auth session |

### P3 — Observability (`v0.1.54`)

| # | Action |
|---|--------|
| 1 | Error copy: upload vs engine vs auth (`errors.ts`) |
| 2 | Help → Show Logs |
| 3 | UI: “Starting AI engine…” on first AI action |

### Order

```
P1 sidecar + window + bundle → P2 queries → P3 logs → IPC upload (optional)
```

### Test (P1)

1. Cold launch: window < 2s, no `stage-engine` in Activity Monitor
2. Dashboard clickable < 4s
3. First chat/research: engine starts, readiness OK
4. No regression on web uploads

---

## Debug & observability

### Quick

```bash
curl -s http://127.0.0.1:48221/v1/readiness
/Applications/Stage.app/Contents/MacOS/Stage   # main + sidecar logs
```

### Steps

1. **Engine?** `curl` readiness → `ready: true` or connection refused
2. **Logs:** launch from Terminal or Console.app → filter `stage-engine`
3. **Renderer:** View → Developer Tools → Console / Network
4. **RAM/CPU:** Activity Monitor → `Stage`, `Stage Helper`, `stage-engine`
5. **Binary in DMG:**

```bash
ls -la /Applications/Stage.app/Contents/Resources/stage-engine/stage-engine
file /Applications/Stage.app/Contents/Resources/stage-engine/stage-engine
```

6. **Zombie port:** `lsof -i :48221`

### Logging — still open

| What | Now | Should be |
|------|-----|-----------|
| Main / sidecar | Console.app / Terminal | Help → Logs folder |
| Renderer | DevTools | OK, but users don’t know |

---

## Known errors (engine / chat / DMG)

### Packaged vs local

| | `pnpm dev` | DMG |
|--|------------|-----|
| Engine | `cargo run` | `Resources/stage-engine/stage-engine` |
| Secrets | `.env` | `runtime-secrets.env` in bundle |

Engine still starts at app launch (`main.ts`) — P1 will change that.

### `fetch failed` in chat

Main cannot HTTP to `127.0.0.1:48221` → engine down, crashed, or timeout (2s in `sidecar.ts`).

### Codex `Provider CLI process I/O failed`

Fixed in v0.1.50: Codex refused outside a git repo. Not the same as macOS file access (`~/.codex/auth.json`).

### macOS “access to your files”

Engine reads `~/.claude/`, `~/.codex/` for provider auth. Allow when prompted.

---

## Files to change

| Phase | Path |
|-------|------|
| IPC upload (later) | `electron/ipc.ts`, `electron/helpers/r2-upload.ts`, `src/lib/r2Uploads.ts` |
| v0.1.51 | `electron/sidecar.ts` (chmod), `electron/main.ts` (About arch) |
| P1 | `electron/main.ts`, `electron.vite.config.ts`, `src/router.tsx`, `src/routes/*` |
| P2 | `WorkspaceFrame.tsx`, `DashboardContextView.tsx`, `useSelectedProjectContext.ts` |
| P3 | `errors.ts`, `electron/main.ts` (logs menu) |

**Related code:** `electron/sidecar.ts`, `electron/windows.ts`, `electron/helpers/auto-update.ts`

**Release/test:** [`DESKTOP_RELEASE_AND_TESTING_PLAN.md`](./DESKTOP_RELEASE_AND_TESTING_PLAN.md)

**Upload infra:** [`../infra/R2_PUBLIC_DOMAIN_AUDIT.md`](../infra/R2_PUBLIC_DOMAIN_AUDIT.md)
