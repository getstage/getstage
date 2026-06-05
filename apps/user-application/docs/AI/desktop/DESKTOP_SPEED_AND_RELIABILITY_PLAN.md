# Desktop speed & reliability plan

> **Status:** active plan — juni 2026  
> **Priority:** P0 blockers first, then startup/runtime speed (user-critical)  
> **Scope:** Electron desktop (`apps/user-application`) + shared Convex/R2 (`packages/data-ops`)

---

## What’s broken today

| Symptom | User impact | Root cause (confirmed) |
|---------|-------------|------------------------|
| CORS error on avatar upload | Project creation fails | Renderer at `app://stage` does `fetch(PUT)` to `*.r2.cloudflarestorage.com`; R2 bucket CORS has no `Access-Control-Allow-Origin` for that origin |
| “We could not reach the server…” on Create Project | Misleading; blocks onboarding | `uploadFileToR2` fails → `failed to fetch` / CORS → `NETWORK_PATTERN` in `errors.ts` maps to generic network message |
| App feels slow (cold start + clicks) | Poor desktop UX | ~3.1MB main bundle, no route splitting, sidecar starts on launch, aggressive router preload, duplicate Convex queries |

**Important:** Web (`https://testing.getstage.co`) is unaffected — browsers use normal HTTPS origins that R2 CORS already allows. **Only packaged Electron** (`app://stage`) hits this.

---

## Goals

| Area | Target (M1 Mac, packaged DMG) |
|------|-------------------------------|
| Project creation | Avatar + marker upload succeeds; clear error if upload fails |
| Window visible | < 2s cold start |
| Dashboard interactive | < 4s cold start |
| Normal navigation | No perceptible lag on dashboard / project list |
| AI features | Sidecar starts on demand; first AI action may wait ≤ 3s for engine |

---

## Phase 0 — P0: Fix project creation (1–2 days)

### Problem chain

```
Create Project wizard
  → createProjectFromDraft.ts
  → uploadFileToR2 (renderer fetch PUT)
  → signed R2 URL (*.r2.cloudflarestorage.com)
  → CORS preflight blocked (origin: app://stage)
  → generic “could not reach server”
```

Key files:

- `src/lib/r2Uploads.ts` — direct `fetch(uploadUrl, { method: "PUT" })`
- `src/features/project-creation/createProjectFromDraft.ts` — client avatar + project marker
- `src/lib/errors.ts` — `NETWORK_PATTERN` hides real cause
- `packages/data-ops/convex/r2.ts` — `generateUploadUrl` (unchanged contract)

### Recommended fix: main-process upload IPC

**Why:** Node/Electron main has no browser CORS. One IPC path fixes **all** desktop uploads (onboarding profile, project creation, tasks, assets, moodboard).

| Step | Work |
|------|------|
| 0.1 | Add `electron/helpers/r2-upload.ts` — `PUT` signed URL with `fetch` or `net` from main |
| 0.2 | IPC channel `r2:upload` — args: `{ uploadUrl, mimeType, filePath \| ArrayBuffer }` |
| 0.3 | `uploadFileToR2` — if `window.stage?.isDesktop`, read file → IPC upload; else keep renderer `fetch` (web parity) |
| 0.4 | Map CORS/upload failures to user message: *“Could not upload this file. Try again.”* (not “server unreachable”) |
| 0.5 | Smoke test DMG: onboarding avatar, create project with client photo + marker, task attachment |

### Alternative (infra-only, weaker)

Add R2 bucket CORS rule for `app://stage`. **Risk:** many S3-compatible stores reject non-HTTP origins; may not work. Custom domain PUT + CORS is a second option but still needs `app://stage` in allowed origins.

**Decision:** Prefer IPC (reliable). Document R2 CORS as optional belt-and-suspenders for `https://testing.getstage.co` only.

### Acceptance

- [ ] Create Project with client avatar succeeds on packaged app
- [ ] No CORS errors in DevTools for R2 PUT
- [ ] Failure shows upload-specific message, not “check your connection”
- [ ] Web app uploads unchanged

**Release:** `v0.1.51` (hotfix)

---

## Phase 1 — Startup speed (3–5 days)

### 1.1 Measure baseline first

Add lightweight timestamps (dev + optional `STAGE_PERF_LOG=1` in packaged):

| Marker | Where |
|--------|-------|
| `app.ready` | `electron/main.ts` |
| `window.ready-to-show` | `electron/windows.ts` |
| `renderer.first-paint` | small hook in root layout |
| `convex.first-subscription` | Convex provider |
| `dashboard.interactive` | `DashboardContextView` mount + data ready |

Log to console; later → Help → Show Logs.

### 1.2 Renderer bundle diet

| Action | File / approach | Expected win |
|--------|-----------------|--------------|
| Route-level `React.lazy` | `src/routes/**` — project, settings, onboarding, create flow | −40–60% initial JS |
| `manualChunks` in Vite | `electron.vite.config.ts` — `convex`, `radix`, `emoji-picker`, `tanstack` | Better caching, smaller first chunk |
| Keep emoji picker lazy | Already in `StrategySectionCard.tsx` — extend pattern | Avoid 568KB on dashboard |
| Audit barrel imports | `components/ui`, hooks index | Tree-shake leaks |

### 1.3 Router preload

Current (`src/router.tsx`):

```ts
defaultPreload: "intent",
defaultPreloadStaleTime: 0,
```

| Change | Effect |
|--------|--------|
| `defaultPreloadStaleTime: 30_000` (or 60_000) | Stop re-fetching on every hover |
| `defaultPreload: false` on heavy routes (project detail, create) | Less work before first paint |
| Keep preload on dashboard-only routes if needed | Balance |

### 1.4 Defer sidecar boot

Today: `main.ts` calls `sidecarSupervisor.start()` on `app.whenReady`.

| Change | Effect |
|--------|--------|
| Do **not** start sidecar on cold launch | −200–400MB RAM, −1–3s CPU at startup |
| Start on first AI IPC (`chat`, `research`, `voice`, etc.) — already partially in `ipc.ts` | Pay cost only when needed |
| Show “Starting AI engine…” on first AI action | Clear UX |

Files: `electron/main.ts`, `electron/sidecar.ts`, `electron/ipc.ts`

### 1.5 First paint UX

- Show window + branded skeleton immediately (`ready-to-show` without waiting for Convex)
- Don’t block `createMainWindow` on sidecar or provider probe

**Release:** `v0.1.52`

---

## Phase 2 — Runtime / fetch efficiency (2–3 days)

### 2.1 Dedupe Convex queries

| Duplicate | Locations | Fix |
|-----------|-----------|-----|
| Projects list | `WorkspaceFrame` + dashboard context | Single provider or shared query key |
| Settings / profile | Multiple mounts on navigation | Lift to layout-level query with `staleTime` |
| Selected project | `useLiveProject` + route loaders | One subscription per project id |

### 2.2 Query policy defaults

- Dashboard: `staleTime: 30_000`, no `refetchInterval`
- Project detail: subscribe live; avoid refetch-on-window-focus for heavy queries
- Already done: engine 2s poll removed (v0.1.49), provider 5min cache

### 2.3 Main-process work off hot path

- Auth callback server: keep (required for login)
- Auto-update check: defer 30s after ready (not blocking first paint)
- Provider list probe at boot: remove or defer until settings/AI tab

**Release:** `v0.1.53`

---

## Phase 3 — Observability & errors (1–2 days)

| Item | Work |
|------|------|
| Error taxonomy | `errors.ts` — distinguish CORS, upload, Convex offline, engine offline |
| Engine offline copy | “AI engine is starting…” vs “Sign in again” |
| Log directory | `app.getPath('logs')` + menu **Help → Show Logs** |
| Perf summary | Optional footer in dev: last cold-start timings |

**Release:** `v0.1.54` or bundled with 1.52

---

## Implementation order (recommended)

```
Week 1
  P0  IPC R2 upload + error copy          → v0.1.51  (unblocks Wessel)
  P1  Sidecar defer + router preload      → v0.1.52  (biggest felt speed win)
  P1  Route lazy + manualChunks           → v0.1.52

Week 2
  P1  Baseline metrics + skeleton         → v0.1.52/53
  P2  Dedupe queries                      → v0.1.53
  P2  Better errors + logs menu           → v0.1.54
```

---

## Test plan (every release)

### P0 — Uploads (packaged DMG only)

1. Fresh install → sign in
2. Onboarding: upload profile avatar → save
3. Create project: client photo + optional marker → **Create Project** succeeds
4. Open project → attach file on task → succeeds
5. DevTools Console: no CORS on `r2.cloudflarestorage.com`

### P1 — Speed (compare before/after with stopwatch + perf logs)

1. Quit Stage completely → cold launch → window visible < 2s
2. Dashboard clickable < 4s
3. Activity Monitor: no `stage-engine` until first chat/research action
4. Navigate dashboard → project → back: no multi-second stalls

### Regression

- Web app uploads still work
- `curl http://127.0.0.1:48221/v1/readiness` after first AI action
- Chat works in DMG (Codex `--skip-git-repo-check`, v0.1.50)
- Updates still work (public repo feed)

---

## Out of scope (this plan)

- Production R2 domain (`assets.getstage.co`) — testing only for now
- Rewriting Convex data layer
- Native Swift/Electron window optimizations
- Cloudflare Worker in front of uploads

---

## Related docs

- [`DESKTOP_STARTUP_PERFORMANCE.md`](./DESKTOP_STARTUP_PERFORMANCE.md)
- [`DESKTOP_PERFORMANCE_AND_OBSERVABILITY.md`](./DESKTOP_PERFORMANCE_AND_OBSERVABILITY.md)
- [`R2_PUBLIC_DOMAIN_AUDIT.md`](../infra/R2_PUBLIC_DOMAIN_AUDIT.md) — reads use custom domain; **uploads still signed R2 URLs**
- [`DESKTOP_RELEASE_AND_TESTING_PLAN.md`](./DESKTOP_RELEASE_AND_TESTING_PLAN.md)

---

## Quick reference — files to touch

| Phase | Files |
|-------|-------|
| P0 | `electron/ipc.ts`, `electron/helpers/r2-upload.ts`, `src/lib/r2Uploads.ts`, `src/lib/errors.ts` |
| P1 startup | `electron/main.ts`, `electron/sidecar.ts`, `electron.vite.config.ts`, `src/router.tsx`, `src/routes/*` |
| P2 runtime | `WorkspaceFrame.tsx`, `DashboardContextView.tsx`, `hooks/convex-data/*` |
| P3 | `errors.ts`, `electron/main.ts` (logs menu), `DESKTOP_PERFORMANCE_AND_OBSERVABILITY.md` |
