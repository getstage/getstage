# Stage Desktop Auth And Deep Link Plan

Date: May 6, 2026  
Status: Planning document  
Scope: Desktop login launcher, `stage://auth` callback, secure session storage, and authenticated Convex access

Current implementation note:

```txt
Done:
  Electron registers stage://
  auth.openLogin opens testing.getstage.co in local dev and getstage.co in packaged builds
  STAGE_DESKTOP_AUTH_URL can override the desktop auth URL
  Electron handles stage://auth callbacks for running and queued startup paths
  short-lived state nonce is persisted in Electron user data
  Account settings has a visible Log in with Stage launcher
  desktop session is stored through Electron main using safeStorage encrypted userData file
  renderer receives redacted session status only, not the stored access token
  desktop project context is fetched through Electron main against the website /api/v1 routes
  testing website route /auth/desktop can hand the desktop back through stage://auth

Not done:
  final one-time backend code exchange table/endpoint
  token refresh and logout
  session changed renderer event
  direct Convex websocket subscription inside desktop
  full replacement of dashboard/sidebar mock data with live ProjectContext/API data
```

## Summary

The desktop app needs an authenticated Stage session before it can consume live Convex data. Auth, onboarding, billing, account management, and payments remain owned by `apps/web-application`.

The desktop app should not embed login screens or duplicate website-only flows. It should open the website login flow in the user's default browser, receive a short-lived callback through a custom protocol, exchange that callback for a desktop session, and store the resulting session securely outside renderer state.

## Ownership Boundary

Website owns:

```txt
apps/web-application
  auth pages
  onboarding
  billing/payments
  account management
  desktop auth handoff endpoint/page
  Convex cloud source of truth
```

Desktop owns:

```txt
apps/user-application
  login launcher
  stage:// protocol registration
  protocol callback handling
  desktop session read/write through Electron main
  authenticated renderer boot state
  authenticated project-context reads through Electron main
  optional future Convex client initialization only after the token model is safe
```

The renderer must never receive raw Node, shell, or keychain access.

## Convex Integration Reality Check

There are two different meanings of "Convex integration":

```txt
1. Cloud source connected:
   Website Convex data is available to desktop through authenticated /api/v1 routes.
   This is the current target for Step 22.

2. Realtime desktop Convex client:
   Desktop renderer subscribes directly to Convex.
   This is not done and should not be added until token handling is settled.
```

Current preferred path:

```txt
Convex
  -> apps/web-application /api/v1
  -> Electron main fetch with stored credential
  -> packages/data-ops ProjectContext validation
  -> preload-safe renderer data
```

This keeps Electron aligned with security best practices:

```txt
contextIsolation stays on
nodeIntegration stays off
raw tokens stay out of React state/localStorage/sessionStorage
all privileged token use remains in Electron main
```

Desktop UI rule:

```txt
If live ProjectContext is unavailable, the UI should show loading, not connected,
or empty states. It should not present static demo projects or fixed metrics as if
they were live Convex data.
```

## Primary Flow

1. Renderer calls `window.stageDesktop.auth.openLogin()`.
2. Electron main opens the default browser to:

```txt
https://testing.getstage.co/auth/desktop?state=...&redirect_uri=stage://auth
```

For packaged production builds, the default host changes to:

```txt
https://getstage.co/auth/desktop?state=...&redirect_uri=stage://auth
```

`STAGE_DESKTOP_AUTH_URL` can override the host for local or staging tests.

3. The website handles normal Stage login.
4. The website redirects to:

```txt
stage://auth?code=...&state=...
```

5. Electron receives the protocol callback.
6. Electron validates the `state` value.
7. Electron exchanges the short-lived `code` with the Stage backend / Convex-backed endpoint.
8. Electron stores the desktop session securely.
9. Renderer calls `window.stageDesktop.auth.getSession()`.
10. Renderer asks Electron main for selected project context.
11. Electron main queries the Stage website API with the stored token and returns sanitized project context.

Current implementation note:

```txt
The first testable website handoff uses the existing Stage API key system as the desktop
access credential. The website route generates the credential after normal Convex Auth
login and sends it back to Electron through stage://auth.

This is enough to test dynamic project data against testing.getstage.co and Convex-backed
/api/v1 routes. The next hardening pass should replace that with a true one-time desktop
code exchange so raw credentials are never present in the callback URL.

Known risk:
  api.developer.apiKeys.generate currently requires Stage Pro.
  A non-Pro testing account can fail the desktop handoff before desktop receives a credential.
```

## Fallback Flow

If custom protocol handling fails in development or on first-run installs:

1. Website displays a short device code.
2. User pastes the code into Electron.
3. Electron exchanges the device code for a desktop session.
4. Electron stores the desktop session securely.

This fallback should exist for supportability, but the main user path should be the deep link.

## Security Rules

- No embedded login webview.
- No password entry inside Electron.
- No OAuth/session tokens in React component state.
- No OAuth/session tokens in `localStorage`.
- No OAuth/session tokens in `sessionStorage`.
- No raw token exchange from the renderer.
- Electron main owns session exchange and storage.
- Use `state`/nonce validation for every login attempt.
- Store sensitive local values with Electron `safeStorage` or an OS keychain-compatible storage path.
- Expose only typed session status through preload.

## Preload Surface

The existing preload shape is the right public surface:

```ts
window.stageDesktop.auth.openLogin(): Promise<void>
window.stageDesktop.auth.getSession(): Promise<DesktopSession | null>
```

Later additions may include:

```ts
window.stageDesktop.auth.logout(): Promise<void>
window.stageDesktop.auth.onSessionChanged(callback): Unsubscribe
```

Do not expose token exchange, protocol parsing, filesystem paths, keychain access, or raw `ipcRenderer` to React.

## Desktop Session Shape

The current `DesktopSession` model is intentionally small:

```ts
type DesktopSession = {
  userId: string;
  hasAccessToken: boolean;
  expiresAt?: number;
};
```

The renderer should not receive `accessToken`. Current direction:

```txt
Renderer receives auth status and user identity.
Electron main uses the stored credential for /api/v1 calls.
Long-lived or refresh-capable secrets stay outside renderer storage.
```

If direct Convex subscriptions later require a token in renderer memory, keep it short-lived,
never persist it in web storage, and refresh it through Electron main.

## Implementation Steps

Done:

1. Add Electron custom protocol registration for `stage://`.
2. Add single-instance callback handling so deep links focus the running app.
3. Add auth attempt state/nonce generation in Electron main.
4. Change `auth.openLogin` from `https://getstage.co/auth` to the desktop login URL.
5. Add protocol URL parsing and validation in Electron main.
6. Add secure local session storage.
7. Add `auth.getSession` implementation with redacted renderer session.
8. Add website `/auth/desktop` route for the first test handoff.
9. Add Electron-main selected ProjectContext fetch through website `/api/v1`.

Next:

1. Test `testing.getstage.co/auth/desktop` with a real testing account.
2. Confirm whether API key generation is blocked by the account plan.
3. Replace visible desktop dashboard mock data with live/empty/loading states.
4. Add logout and token expiry handling.
5. Add `auth.onSessionChanged` through preload-safe IPC.
6. Replace API-key handoff with a true one-time desktop auth code exchange.
7. Decide whether direct Convex subscriptions belong in desktop V1 or stay behind the website API.

## Development Notes

Development needs an explicit deep-link test path:

```txt
stage://auth?code=dev-code&state=expected-state
```

The app should log sanitized auth state transitions in development, but never log tokens or full callback URLs in production.

## Open Questions

- What exact website route should own desktop login: `/auth/desktop`, `/desktop/login`, or another route?
- Which backend endpoint/table should replace the current API-key callback with a true one-time desktop code exchange?
- Should the desktop eventually use a Convex auth token directly in renderer memory, or keep all cloud reads behind Electron main?
- What is the production custom protocol name: `stage://` only, or environment-specific schemes such as `stage-dev://`?

## Done Criteria

- `window.stageDesktop.auth.openLogin()` opens the desktop website login URL.
- `stage://auth` callback is received in a running desktop app.
- Cold-start deep-link callback works when the app is not running.
- Invalid or mismatched `state` values are rejected.
- A desktop session can be read through `auth.getSession()`.
- Live Convex project context can initialize after session exists.
- Dashboard/sidebar visible data no longer presents static demo values as live data.
- Logged-out users see an explicit connect/loading/empty state.
- No tokens are stored in renderer web storage.
