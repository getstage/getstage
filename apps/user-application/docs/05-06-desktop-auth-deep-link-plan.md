# Stage Desktop Auth And Deep Link Plan

Date: May 6, 2026  
Status: Planning document  
Scope: Desktop login launcher, `stage://auth` callback, secure session storage, and authenticated Convex access

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
https://getstage.co/auth/desktop?state=...&redirect_uri=stage://auth
```

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
10. Renderer initializes authenticated Convex access and project context queries.

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
  accessToken?: string;
  expiresAt?: number;
};
```

Before implementation, decide whether the desktop renderer should ever receive `accessToken`. Preferred direction:

```txt
Renderer receives auth status and user identity.
Main process or a constrained auth provider supplies tokens to the Convex client.
Long-lived or refresh-capable secrets stay outside renderer storage.
```

If Convex requires a token in renderer memory, keep it short-lived, never persist it in web storage, and refresh it through Electron main.

## Implementation Steps

1. Add Electron custom protocol registration for `stage://`.
2. Add single-instance callback handling so deep links focus the running app.
3. Add auth attempt state/nonce generation in Electron main.
4. Change `auth.openLogin` from `https://getstage.co/auth` to the desktop login URL.
5. Add protocol URL parsing and validation in Electron main.
6. Add a placeholder session exchange function with a typed interface.
7. Add secure local session storage.
8. Add `auth.getSession` implementation.
9. Add renderer authenticated boot state.
10. Add live Convex selected project context after session works.

## Development Notes

Development needs an explicit deep-link test path:

```txt
stage://auth?code=dev-code&state=expected-state
```

The app should log sanitized auth state transitions in development, but never log tokens or full callback URLs in production.

## Open Questions

- What exact website route should own desktop login: `/auth/desktop`, `/desktop/login`, or another route?
- Which backend endpoint exchanges the desktop code for a session?
- Should the desktop use a Convex auth token directly in renderer memory, or proxy token refresh through Electron main?
- Which storage API should be used first: Electron `safeStorage`, macOS Keychain wrapper, or a small encrypted file owned by Electron main?
- What is the production custom protocol name: `stage://` only, or environment-specific schemes such as `stage-dev://`?

## Done Criteria

- `window.stageDesktop.auth.openLogin()` opens the desktop website login URL.
- `stage://auth` callback is received in a running desktop app.
- Cold-start deep-link callback works when the app is not running.
- Invalid or mismatched `state` values are rejected.
- A desktop session can be read through `auth.getSession()`.
- Live Convex project context can initialize after session exists.
- No tokens are stored in renderer web storage.
