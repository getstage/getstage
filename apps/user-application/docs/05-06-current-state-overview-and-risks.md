# Stage Desktop Current State Overview And Risks

Date: May 6, 2026  
Branch: `monorepo`  
Status: Stabilization before provider/file-scanner work

## Executive Summary

Stage Desktop has moved from a mock-only Electron app into the first real desktop architecture path:

```txt
apps/web-application    # Website, Convex, auth, onboarding, billing, API routes
apps/user-application   # Electron desktop UI
apps/data-service       # Rust local sidecar engine
packages/data-ops       # Shared TypeScript/Zod contracts and domain models
```

The desktop app now has the core architecture needed for dynamic data:

- A Rust sidecar with `/v1` health/readiness/version and WebSocket basics.
- A shared `packages/data-ops` contract layer for `ProjectContext`, `EngineCommand`, and `EngineEvent`.
- Electron main-process supervision of the Rust sidecar.
- Renderer-safe engine status via preload/IPC.
- Desktop auth launcher and local dev / `stage://auth` callback handling.
- Secure Electron-main session storage using `safeStorage`.
- A main-process path for fetching selected project context from the Stage website API.
- A tested Convex Auth JWT handoff from `testing.getstage.co` into local Electron.
- A preload-safe session-changed event so desktop auth state and project context refresh without manual reload.

This means the app can now become dynamic through the website API once a desktop session exists. If auth or API data is unavailable, the desktop app still falls back to validated mock project context so the UI does not break.

## Current Completed Steps

From the monorepo implementation tracker:

```txt
1-16  Monorepo layout, Rust sidecar skeleton, /v1 routes, WebSocket ping, data-ops contracts
17    Desktop selected project context consumes packages/data-ops contracts
18    Electron sidecar supervisor exists
19    Renderer can read engine status
20    Desktop auth launcher and stage://auth callback exist
21    Secure Electron-main session storage exists
22    Desktop API-key login bridge has been replaced with Convex Auth JWT handoff
23    Live selected project context can be fetched through the website API when a session token exists
```

## What Is Dynamic Now

The desktop app is dynamic at the architecture level and the desktop auth handoff has now been tested against `testing.getstage.co`.

The dynamic flow is:

```txt
User opens desktop Account settings
  -> clicks "Log in with Stage"
  -> Electron opens testing.getstage.co/auth/desktop
  -> website handles normal auth/onboarding/account state
  -> website reads the Convex Auth JWT from the signed-in session
  -> local dev website submits { code, state } to http://127.0.0.1:48224/auth
  -> packaged builds use stage://auth?code=...&state=...
  -> Electron validates state
  -> Electron verifies the token with GET /api/v1/me
  -> Electron stores credential in safeStorage encrypted userData
  -> renderer receives only redacted session status
  -> renderer refreshes after auth:session-changed
  -> Electron main calls website /api/v1 routes with stored token
  -> response is shaped through packages/data-ops ProjectContext
  -> dashboard/critique UI can use live context
```

If any part fails, the desktop keeps using the fallback mock `ProjectContext`.

## Onboarding Boundary

Onboarding remains website-owned.

Your partner can redesign onboarding in:

```txt
apps/web-application
```

The desktop app should not duplicate onboarding screens right now. Desktop should open the website-owned login/onboarding/account flows in the browser and only receive a desktop session after the website flow is complete.

This keeps ownership clean:

```txt
Website:
  auth
  onboarding
  billing/payments
  account management
  Convex source of truth
  desktop handoff route

Desktop:
  native shell
  login launcher
  stage://auth callback
  secure local session storage
  selected project context display
  sidecar lifecycle
```

## What Is Not Done Yet

These are still open:

- Token refresh and logout.
- Direct Convex subscription in the desktop renderer.
- WebSocket event forwarding from Rust through Electron to renderer.
- Replace remaining visible demo-only desktop UI with live/loading/empty/fallback states.
- Fake provider runner.
- Codex/Claude provider detection.
- Deep file scanner.
- `.codex`, `.claude`, `AGENTS.md`, and `CLAUDE.md` discovery.
- Design critique job pipeline.
- Voice transcription flow.
- Basic Figma integration.
- Basic Notion integration.

## Main Doubts And Risks

### 1. Current Desktop Auth Uses Convex Auth JWT Handoff

The desktop login no longer uses developer API keys. The website route `/auth/desktop`
uses the signed-in Convex Auth session token and hands it to Electron main.

Current state:

```txt
Works:
  testing.getstage.co -> local Electron callback
  Electron validates state
  Electron verifies token through /api/v1/me
  Electron stores only the main-process session
  renderer receives redacted session status

Still not production-final:
  the callback carries a bearer token during handoff
  token refresh/expiry/logout are not finished
```

Recommendation:

```txt
Use this for the current testing bridge.
Before production, evaluate a true one-time desktop auth code exchange.
```

### 2. True One-Time Desktop Auth Exchange Is Not Final

The desired production flow is:

```txt
website creates short-lived desktop auth code
Electron receives code through stage://auth
Electron exchanges code with backend endpoint
backend returns desktop session/token
code becomes unusable immediately
```

Open question:

```txt
Which Convex/API table or endpoint owns one-time desktop auth codes?
```

### 3. Token Refresh And Logout Are Missing

Secure storage exists, but session lifecycle is not complete.

Missing:

```txt
logout
token expiry handling
refresh behavior
expired credential UX
```

Risk:

```txt
Desktop can still get stuck with a stale token until storage is manually cleared or logout/refresh UX is added.
```

### 4. Live Convex Path Is Through Website API, Not Direct Convex

The desktop currently asks Electron main to call website `/api/v1` routes using the stored token.

This is good for token safety because React does not own the token.

Open question:

```txt
Should desktop eventually use direct Convex subscriptions for realtime UI,
or should Electron/main/API proxy remain the default for sensitive data?
```

Recommendation for now:

```txt
Keep sensitive token usage in Electron main.
Use website API for selected project context until auth/session behavior is stable.
Only add direct Convex subscriptions if we are confident about token handling.
```

### 5. Website API Route Shape Must Match Desktop Expectations

Electron project-context fetch expects website API routes similar to:

```txt
GET /api/v1/projects
GET /api/v1/projects/:id/phases
GET /api/v1/phases/:id/tasks
```

Risk:

```txt
Docs may mention routes that exist differently in implementation.
The desktop mapper may need small adjustments after real testing.
```

### 6. Rust Sidecar Is Still Minimal

Rust currently proves the boundary, not the product behavior.

Done:

```txt
/v1/health
/v1/readiness
/v1/version
WS /v1/events
engine.ping -> engine.ready
```

Not done:

```txt
provider runner
job queue
cancellation
file scanning
context ranking
design critique jobs
voice events
```

Risk:

```txt
Calling the app "agent-ready" would be premature.
```

### 7. Electron Sidecar Supervisor Needs More Runtime Hardening

Electron can start/check the Rust sidecar, but more runtime behavior is still open.

Open:

```txt
WebSocket event forwarding
restart policy after crash
port collision strategy
packaged binary path instead of cargo run
production logging
```

### 8. Packages/Data-Ops Is New And Must Stay The Contract Source

`packages/data-ops` is now the intended shared TypeScript contract/domain layer.

Risk:

```txt
If desktop, web, and Rust start inventing separate project context shapes,
the integration will become messy quickly.
```

Rule:

```txt
ProjectContext starts in packages/data-ops.
Desktop consumes it.
Rust mirrors stable shapes with serde.
Convex/backend data should be mapped into it.
```

### 9. Onboarding Work Should Not Block Desktop Runtime Work

Partner onboarding redesign can proceed in `apps/web-application`.

Risk:

```txt
If onboarding routes and desktop auth routes conflict, the handoff flow can break.
```

Important:

```txt
/auth/desktop must remain a clean website-owned handoff path.
Normal onboarding can change, but desktop login redirect should still return to /auth/desktop after website auth/onboarding is complete.
```

### 10. Figma And Notion Are Not Next

Figma and Notion remain production V1 scope, but they should not be the next implementation focus.

Current priority:

```txt
auth/session stability
live project context validation
sidecar event forwarding
fake provider
provider detection
file scanner
then design critique/Figma/Notion
```

## Recommended Immediate Next Step

Do not build new features yet. Stabilize and test Steps 21 and 22.

Recommended test checklist:

```txt
1. Run typechecks/builds.
2. Start desktop app.
3. Click Account settings -> Log in with Stage.
4. Complete testing.getstage.co login.
5. Confirm stage://auth returns to desktop.
6. Confirm Account settings shows connected session.
7. Confirm desktop can fetch selected project context from website API.
8. Confirm fallback context still works when logged out.
9. Record whether API key generation is blocked by account plan.
```

If the OAuth/OTP redirect path lands on `/dashboard` instead of returning to Electron,
use the explicit website shortcut while debugging the redirect:

```txt
testing.getstage.co/settings
-> Account
-> Stage Desktop
-> Open Stage Desktop
```

Expected local Electron logs:

```txt
[stage-auth] registered stage:// protocol for dev app: ok
[stage-auth] received desktop auth callback
[stage-auth] accepting web-initiated desktop callback
[stage-auth] accepting desktop API-key credential
[stage-auth] desktop auth callback accepted
```

If clicking the website button opens the generic Electron welcome screen, macOS has
registered `stage://` to the Electron binary instead of the Stage dev app. Stop the dev
app and restart `pnpm run dev` from `apps/user-application`; startup should re-register
the protocol with the local app path.

If `apps/web-application/convex/auth.ts` changes, deploy the Convex functions for the
testing deployment as well as the Cloudflare Worker assets.

Suggested commands:

```bash
cd packages/data-ops
pnpm run typecheck

cd ../../apps/user-application
pnpm run typecheck
pnpm run build

cd ../web-application
pnpm run typecheck
pnpm run build:testing

cd ../data-service
cargo check --manifest-path Cargo.toml
```

## Recommended Next Engineering Sequence

After testing:

```txt
1. Commit current Step 21/22 work if tests pass.
2. If auth fails because API key generation is blocked, decide:
   a. temporarily allow API key desktop handoff for testing, or
   b. build one-time desktop auth code exchange now.
3. Add logout + token expiry handling.
4. Add Electron -> Rust WebSocket event forwarding.
5. Add fake provider runner using ProjectContext.
6. Add Codex/Claude provider detection.
7. Add file scanner and local context discovery.
8. Then continue toward design critique, voice, Figma, and Notion.
```

## One-Line Status For Notion

Stage Desktop now has the core monorepo, Rust sidecar, shared data contracts, desktop auth handoff, secure main-process session storage, and a dynamic selected-project-context path through the website API; the next milestone is to test and harden auth/session behavior before moving into provider execution and local file intelligence.
