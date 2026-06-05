# Desktop testing & first release — plan

> **Status:** active plan (June 2026)  
> **Scope:** `apps/user-application` (Electron), auth bridge via `apps/web-application`, Convex `packages/data-ops`  
> **Related:** [`../05-09/05-09-auth-and-step-23-summary.md`](../05-09/05-09-auth-and-step-23-summary.md), [`../05-09/05-09-desktop-auth-deep-link-plan.md`](../05-09/05-09-desktop-auth-deep-link-plan.md)

---

## Open priorities

| Item | Doc |
|------|-----|
| **Performance, slowness, CORS, engine/chat, action plan** | [`DESKTOP_PERFORMANCE.md`](./DESKTOP_PERFORMANCE.md) |
| **All desktop docs index** | [`README.md`](./README.md) |

---

## Short answers

| Question | Answer |
|----------|--------|
| **Can we build and test now?** | **Yes** — with `pnpm desktop:dev` on your Mac. No Apple Developer account needed. |
| **Can we ship a DMG to customers now?** | **Limited** — unsigned DMG works, but macOS blocks/warns. For serious customer testing: Apple ID or only your own machines. |
| **Apple Developer before first test?** | **No.** Only before “download from website/GitHub without friction”. |

---

## Three phases (what when)

```txt
Phase A — Dev test (NOW)        → no Apple, no DMG required
Phase B — Packaged smoke test   → optional locally, still no Apple for internal
Phase C — Customer / public DMG → Apple Developer ID + notarization + CI (Synara-style)
```

---

## Phase A — Test now (recommended start)

### What you need

1. **Terminal 1:** Convex  
   `cd packages/data-ops && npx convex dev`

2. **Terminal 2:** Desktop  
   `cd apps/user-application && pnpm dev`  
   (builds `data-ops` + Rust sidecar automatically)

3. **Web auth** must be reachable on **testing**:  
   `https://testing.getstage.co` (default in dev — see `electron/helpers/auth.ts`)

4. Optional **Terminal 3:** local web-app only if you debug web routes yourself; deployed testing is enough for desktop auth.

### Auth flow (dev)

```txt
Electron (not packaged)
  → opens browser: testing.getstage.co/auth/desktop?redirect_uri=http://127.0.0.1:48224/auth&state=...
  → not logged in → /auth with desktop_redirect_uri + desktop_state
  → sign in (OTP or Google)
  → back to /auth/desktop → JWT handoff
  → localhost callback (48224) → Electron session
```

**Do not** expect to land on the **web dashboard** after login — that is wrong. You should hit `/auth/desktop` and then return to Electron.

### Phase A checklist

- [ ] `curl http://127.0.0.1:48221/v1/readiness` → `ready: true`
- [ ] Desktop starts without crash; logged out → sign-in screen
- [ ] Login opens browser on **testing.getstage.co** (not accidentally only getstage.co/auth without desktop params)
- [ ] After login: Electron shows real user (not `desktop-dev-user`)
- [ ] Project load via sidecar/API works
- [ ] Logout → sign-in screen again
- [ ] (Feature-specific) see `RESEARCH_TESTING.md`, `STRATEGY_TESTING.md`, `FLOWS_TESTING.md`, `MOODBOARD_TESTING.md`

### Known pitfalls (auth → dashboard)

| Symptom | Likely cause |
|---------|--------------|
| After login **web dashboard** instead of Electron | Login via `/auth` without `desktop_redirect_uri` / `desktop_state`; or Google OAuth loses redirect; or Convex `SITE_URL` ≠ testing hostname |
| Handoff fails silently | Browser blocks POST to `127.0.0.1:48224`; Electron not running; wrong `state` |
| API 401 after login | Token not stored; wrong API base URL |

**Debug:** browser URL after login must include `/auth/desktop?...`. Convex `SITE_URL` must match `https://testing.getstage.co` when testing against testing.

---

## Phase B — Local packaged build (optional, before Apple)

**Goal:** verify `electron-vite build` + preview behaves like production, without shipping a DMG.

### Current tooling

- `pnpm --filter stage-user-application run build` → compiles main/preload/renderer
- `pnpm --filter stage-user-application run preview` → packaged-like run (still **no** `electron-builder`, **no** DMG in repo)

### Still missing in repo (intentionally later)

- `electron-builder` config
- GitHub Actions release workflow
- `latest-mac.yml` for auto-update
- Code sign + notarize scripts

### Phase B tasks (engineering)

1. [ ] `build` + `preview` on clean Mac — app starts, auth URL = production default (`getstage.co`) unless `STAGE_DESKTOP_AUTH_URL` set
2. [ ] `stage://auth` protocol after packaged preview (unlike dev localhost callback)
3. [ ] Env/production API URLs (`PRODUCTION_DESKTOP_API_URL` in helpers) match deployed Convex + web

**Apple:** still not required for Phase B on **your own** machine (Right-click → Open for Gatekeeper).

---

## Phase C — Release DMG + GitHub (Synara-style)

Goal: tag `v0.1.0` → GitHub Actions → **Stage-0.1.0-arm64.dmg** + **Stage-0.1.0-x64.dmg** + `latest-mac.yml` → GitHub Releases.

### Step 1 — Apple (customer account recommended)

1. [ ] Enroll [Apple Developer Program](https://developer.apple.com/programs/) ($99/year) under **customer legal entity**
2. [ ] **Certificates, Identifiers & Profiles** → create **Developer ID Application**
3. [ ] Download certificate and install in **Keychain Access** on build Mac
4. [ ] (Optional) **Developer ID Installer** for PKG; DMG often only needs Application cert
5. [ ] App-specific password for notarization: [appleid.apple.com](https://appleid.apple.com) → App-specific passwords
6. [ ] Note Team ID (Membership details)

### Step 2 — Repo: electron-builder

1. [ ] `electron-builder` + `electron-updater` as devDependencies in `apps/user-application`
2. [ ] `electron-builder.yml` (or `build` block in `package.json`):
   - `appId`: e.g. `co.getstage.desktop`
   - `productName`: `Stage`
   - `mac.target`: `dmg` (targets: `arm64`, `x64` or `universal`)
   - `publish`: `github` (owner/repo of **customer** or your org)
3. [ ] Scripts: `"dist:mac": "electron-vite build && electron-builder --mac"`
4. [ ] Icon `.icns`, entitlements plist (microphone/screen if needed later)
5. [ ] Test **once** locally unsigned; then signed + `notarize: true`

### Step 3 — Signing & notarization (env on CI)

| Secret / var | Use |
|--------------|-----|
| `APPLE_ID` | Apple ID email |
| `APPLE_APP_SPECIFIC_PASSWORD` | Notarization |
| `APPLE_TEAM_ID` | Team ID |
| `CSC_LINK` | Base64 `.p12` Developer ID cert |
| `CSC_KEY_PASSWORD` | p12 password |
| `GH_TOKEN` | GitHub release upload (fine-grained or classic with `contents: write`) |

Same locally via Keychain instead of `CSC_LINK`.

### Step 4 — GitHub Actions workflow

New file e.g. `.github/workflows/release-desktop.yml`:

```yaml
# Trigger: push tag v*
# Jobs: checkout → pnpm install → build data-ops + stage-engine + electron-vite
#       → electron-builder --mac --publish always
# Artifacts on Release: *.dmg, *.blockmap, latest-mac.yml
```

Checklist:

1. [ ] Runner: `macos-latest` (Apple build **must** run on macOS)
2. [ ] Build Rust sidecar in workflow (`cargo build --release`)
3. [ ] Convex/production URLs in build-time env (no `testing` in packaged default)
4. [ ] Push tag `v0.1.0` → Release draft/public with assets

### Step 5 — Web & auth (production)

1. [ ] Convex env: `SITE_URL=https://getstage.co` (and optionally `STAGE_TESTING_SITE_URL=https://testing.getstage.co`)
2. [ ] Deploy web to production before first DMG
3. [ ] Google OAuth redirect URIs: `https://getstage.co` + Convex Auth callback paths
4. [ ] Packaged app: `getstage.co/auth/desktop` + `stage://auth` protocol (no localhost callback)

### Step 6 — Download page

1. [ ] Landing page `/download` or hero CTA: **Download for Mac (Apple Silicon)** / **Intel**
2. [ ] Links to GitHub Release assets (or CDN mirror)
3. [ ] No DMG on `/auth/desktop` — only “Back to Stage Desktop…”

### Step 7 — First release

```bash
git tag v0.1.0
git push origin v0.1.0
# → CI creates Release; verify DMG on clean Mac (not your dev machine with Gatekeeper disabled)
```

### Requirements (summary)

| Item | Who |
|------|-----|
| Apple Developer Program | **Customer** (recommended) |
| GitHub repo + `GH_TOKEN` | You / customer |
| electron-builder + workflow | Engineering |
| Download page | Web |

**Auth page does not host DMG** — only handoff to `stage://auth`.

---

## What to do / not do today

### Do (testing)

```bash
cd packages/data-ops && npx convex dev
# new terminal:
cd apps/user-application && pnpm dev
```

Then in Electron: sign in and walk through features per feature-testing docs in this folder.

### Don’t block on now

- Apple Developer enrollment (unless customer **now** wants DMG to 10+ external Macs)
- App Store listing
- Full CI release pipeline (can run in parallel after first manual test)

### Capture in parallel (customer conversation)

- Who is **legal entity** on Apple Developer account?
- Test against **testing** or **production** Convex/web?
- Minimum macOS version and Apple Silicon-only vs Intel too

---

## Auth fix (desktop → no more dashboard)

**Implemented (June 2026):**

- Web: `buildDesktopAuthHandoffUrl()` → absolute URL on current origin (`testing` vs `getstage`)
- Convex: `redirectAfterSignIn` accepts `/auth/desktop` + multiple hosts (`SITE_URL`, `STAGE_TESTING_SITE_URL`, defaults)
- Pending redirect saved early before Google OAuth

**Convex env (deploy after code):**

```bash
SITE_URL=https://getstage.co
STAGE_TESTING_SITE_URL=https://testing.getstage.co
# optional: STAGE_ALLOWED_SITE_URLS=https://stage.getstage.co,https://localhost:5173
```

**Test:**

1. Electron → Sign in
2. After login: URL = `…/auth/desktop?redirect_uri=…&state=…` (not `/dashboard`)
3. Electron opens with session

See: `packages/data-ops/convex/auth.ts`, `apps/web-application/src/lib/desktopAuthRedirect.ts`, `AuthPage.tsx`, `auth.desktop.tsx`

---

## Recommended work order

```txt
1. Phase A auth + 1 feature (e.g. Research) green on testing
2. Fix auth dashboard bug if still present (SITE_URL + redirect params)
3. Phase B preview build on 1 Mac
4. Customer: Apple account + Phase C pipeline
5. Download page + first GitHub Release v0.1.0
```

---

## Verification commands

```bash
pnpm --dir packages/data-ops run typecheck
pnpm --filter stage-user-application run typecheck
pnpm --filter stage-user-application run build
pnpm --filter web-application run build:testing   # if testing web/auth too
curl -s http://127.0.0.1:48221/v1/readiness | head
```

---

## One-line summary

**Yes, build and test in dev now; Apple is only needed when you want a DMG on arbitrary customer Macs without macOS warnings — not for daily development on your own machine.**
