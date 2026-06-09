# Stage Desktop Auth And Step 23 Summary

Date: May 9, 2026  
Status: Auth handoff working locally; Step 23 core path complete

## What Changed

The desktop auth bridge no longer uses developer API keys.

Current flow:

```txt
Electron opens testing.getstage.co/auth/desktop
Website uses the signed-in Convex Auth session
Website hands the Convex Auth JWT to Electron main
Electron validates the state nonce
Electron verifies the token through GET /api/v1/me
Electron stores the session through safeStorage
Renderer receives only redacted user/session data
Electron main fetches selected project context through /api/v1
No desktop session renders a desktop sign-in screen that opens web auth
```

Important fixes made during stabilization:

```txt
apps/web-application/src/routes/auth.tsx
  lets /auth/desktop render as a real child route instead of being swallowed by /auth

apps/web-application/src/routes/auth.desktop.tsx
  uses useAuthToken()
  no longer generates developer API keys
  uses form POST for local dev handoff to avoid browser fetch-to-localhost failures

apps/user-application/electron/helpers/auth-callback-server.ts
  accepts JSON and form-encoded local callback payloads

apps/web-application/convex/api/index.ts
  adds GET /api/v1/me for token verification

apps/web-application/convex/api/auth.ts
  accepts developer API keys for developer routes and Convex Auth bearer tokens for desktop-backed reads

apps/user-application/electron/auth.ts
  rejects developer API keys for desktop login
  verifies the bearer token before storage
  emits auth:session-changed after successful login

apps/user-application/src/app/WorkspaceFrame.tsx
  shows name/email before falling back to user id
  refreshes auth/project-context queries after login

apps/user-application/src/auth/DesktopAuthView.tsx
  provides the desktop logged-out screen
  opens the web-owned login/signup/onboarding/billing flow

apps/user-application/src/router.tsx
  guards desktop product routes when no desktop session exists
```

## Current Step Status

Step 23 is complete for the core architecture:

```txt
Desktop auth works against testing.getstage.co
Electron stores a real signed-in user session
Desktop no longer falls back to desktop-dev-user
Electron main can fetch live selected project context through website /api/v1
ProjectContext still flows through packages/data-ops
```

Step 23 still needs verification before Step 24:

```txt
No-session desktop boot shows the sign-in screen
Browser login returns to desktop without manual reload
Logout returns to the sign-in screen
Direct Convex subscriptions are a desktop-first migration, not a blocker for the auth test
```

## What Not To Start Yet

Do not start these until Step 23 stabilization is committed:

```txt
fake provider runner
Codex/Claude provider detection
deep file scanner
design critique job pipeline
voice
Figma
Notion
```

## Verification Already Run

```bash
cd packages/data-ops && pnpm run typecheck
cd apps/user-application && pnpm run typecheck && pnpm run build
cd apps/web-application && pnpm run typecheck && pnpm run build:testing
git diff --check
```

Manual test also passed:

```txt
testing.getstage.co -> local Electron callback -> real desktop session
```
