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
  direct Convex websocket subscription inside desktop
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
  Convex client initialization after session exists
```

The renderer must never receive raw Node, shell, or keychain access.

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
Main process or a constrained auth provider supplies tokens to the Convex client.
Long-lived or refresh-capable secrets stay outside renderer storage.
```

If Convex later requires a token in renderer memory, keep it short-lived, never persist it in web storage, and refresh it through Electron main.

## Implementation Steps

1. Add Electron custom protocol registration for `stage://`.
2. Add single-instance callback handling so deep links focus the running app.
3. Add auth attempt state/nonce generation in Electron main.
4. Change `auth.openLogin` from `https://getstage.co/auth` to the desktop login URL.
5. Add protocol URL parsing and validation in Electron main.
6. Add a placeholder session exchange function with a typed interface.
7. Add secure local session storage.
8. Add `auth.getSession` implementation with redacted renderer session.
9. Add renderer authenticated boot state.
10. Add live Stage API selected project context after session works.

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
- No tokens are stored in renderer web storage.
