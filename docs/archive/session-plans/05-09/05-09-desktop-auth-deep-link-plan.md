# Stage Desktop Auth And Deep Link Plan

Date: May 9, 2026  
Status: Planning document  
Scope: Desktop login launcher, `stage://auth` callback, secure session storage, and authenticated Convex access

## 09-05 Approved Direction

This section is the current source of truth for connecting the web login to the desktop app.

Decision:

```txt
Do not add new Convex tables, desktop auth schemas, or production auth endpoints yet.
Do not keep using developer API keys as desktop login credentials.
Do not treat deep linking itself as authentication.
Use Convex Auth's existing signed-in web session to hand a JWT to Electron main.
```

Reason:

```txt
The current test bridge accidentally uses developer API-key generation for desktop login.
That is why repeated testing can hit "max active API keys" and why Electron can fall back
to a fake local identity such as desktop-dev-user.

API keys are for developer/API access. They are not the user's web login session.
```

Official Convex docs checked:

```txt
Convex Auth:
https://docs.convex.dev/auth/convex-auth

Convex Authentication overview:
https://docs.convex.dev/auth

Convex HTTP Actions:
https://docs.convex.dev/functions/http-actions
```

Important interpretation from those docs:

```txt
Convex Auth supports client-side React web apps and React Native clients.
Convex HTTP actions can read authenticated identity when called with a valid JWT bearer token.
Electron local main-process code does not automatically receive the browser's Convex Auth session.
Therefore a desktop deep link can open Electron, but it cannot magically transfer auth by itself.
```

Current approved architecture boundary:

```txt
Website:
  owns login, onboarding, billing, account state, and Convex Auth session.

Electron main:
  may receive a short handoff result after website login.
  stores any desktop credential securely.
  calls backend/project APIs on behalf of the renderer.

Renderer:
  never stores raw tokens.
  only sees safe session status and user display info.
```

Chosen handoff method:

```txt
1. Electron starts the flow and generates a state nonce.
2. Electron opens the website desktop auth route in the browser.
3. Website completes normal Convex Auth login.
4. Website reads the current Convex Auth JWT with useAuthToken().
5. Website redirects to the Electron callback with code=<jwt> and the original state.
6. Electron validates state before accepting the callback.
7. Electron main stores the JWT through safeStorage.
8. Renderer receives only redacted session/user display info.
9. Electron main calls website/Convex HTTP routes with Authorization: Bearer <jwt>.
10. Backend verifies identity with ctx.auth.getUserIdentity().
```

Security rules for this implementation:

```txt
No developer API keys for desktop login.
No raw token in renderer storage.
No token in React localStorage/sessionStorage.
No new Convex auth tables in this pass.
No desktop-owned account/onboarding/billing.
If JWT expires, desktop asks the user to sign in again.
```

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
  /auth/desktop route is no longer swallowed by the parent /auth route
  local dev uses form POST to http://127.0.0.1:48224/auth instead of browser fetch
  Electron local callback accepts JSON and form-encoded handoff payloads
  auth:session-changed refreshes renderer session/project-context queries after login
  desktop logged-out route guard shows a sign-in screen when no session exists
  the desktop sign-in screen opens the web-owned auth/signup/onboarding/billing flow

Not done:
  true refresh-token rotation (deferred by Option A launch decision)
  direct Convex websocket subscription inside desktop
```

Current clean status, 09-05:

```txt
Changed in this pass:
  website /auth/desktop uses the existing Convex Auth web session token
  website no longer generates developer API keys for desktop login
  Electron rejects developer API keys as desktop login credentials
  Electron validates the auth callback payload with Zod
  Electron verifies the token through /api/v1/me before storing a desktop session
  renderer still receives only safe session/user display fields
  local callback server allows the browser private-network CORS preflight
  /auth preserves local desktop redirect_uri values without relying only on localStorage
  /auth renders /auth/desktop through an Outlet so the handoff route actually runs
  local dev handoff uses form POST instead of fetch to avoid localhost browser fetch failures
  Electron emits auth:session-changed so the desktop updates without a manual reload
  desktop account UI displays name/email before falling back to user id

Still needs proof before this is called finished:
  confirm desktop project context uses live data or honest empty/loading states
  verify no-session boot -> desktop sign-in screen -> browser login -> auto-return
```

## Summary

The desktop app needs an authenticated Stage session before it can consume live Convex data. Auth, onboarding, billing, account management, and payments remain owned by `apps/web-application`.

The desktop app may show a native sign-in launcher screen when the user is not connected, but it must not duplicate website-owned auth/payment/onboarding logic. The button opens the website login flow in the user's default browser, receives a callback through the local callback/deep-link path, exchanges that callback for a desktop session, and stores the resulting session securely outside renderer state.

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
4. The website reads the current Convex Auth JWT with `useAuthToken()`.
5. In local development, the website submits a validated form payload to:

```txt
http://127.0.0.1:48224/auth
```

6. In packaged production, the website redirects to:

```txt
stage://auth?code=...&state=...
```

7. Electron receives the callback.
8. Electron validates the `state` value.
9. Electron verifies the JWT by calling `GET /api/v1/me`.
10. Electron stores the token securely only after `/api/v1/me` returns a real user.
11. Renderer calls `window.stageDesktop.auth.getSession()`.
12. Electron emits `auth:session-changed` to renderer windows.
13. Renderer refreshes auth/session and selected project context queries.
14. Renderer asks Electron main for selected project context.
15. Electron main queries the Stage website API with the stored token and returns sanitized project context.

Current implementation note:

```txt
09-05 implementation replaces the API-key test bridge with Convex Auth JWT handoff.
The website no longer calls api.developer.apiKeys.generate for desktop login.
Electron rejects developer API keys for desktop login.
Electron validates the callback payload with Zod and validates the token against /api/v1/me
before storing it.
The local dev route uses a normal form POST rather than fetch because browser fetches from
https://testing.getstage.co to http://127.0.0.1 can fail before Electron receives the payload.
```

## Testing Shortcut From Website

For local Electron testing while `apps/web-application` is deployed to testing, the website
also exposes an explicit shortcut in:

```txt
Settings -> Account -> Stage Desktop -> Open Stage Desktop
```

This button is a local development convenience:

```txt
1. User is already logged into testing.getstage.co through Convex Auth.
2. Website opens http://127.0.0.1:48224/login.
3. Local Electron starts the normal desktop login flow and generates a state nonce.
4. Website /auth/desktop reads the current Convex Auth JWT after login.
5. Website submits { code, state } to http://127.0.0.1:48224/auth.
6. Electron validates the payload with Zod and validates state.
7. Electron verifies the JWT against /api/v1/me before storing it.
```

Because `convex/auth.ts` owns the Convex Auth redirect callback, changes there require a
Convex deployment to the testing deployment, not only a Cloudflare Worker upload.

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
window.stageDesktop.auth.onSessionChanged(callback): Unsubscribe
```

Later additions may include:

```ts
window.stageDesktop.auth.logout(): Promise<void>
```

Do not expose token exchange, protocol parsing, filesystem paths, keychain access, or raw `ipcRenderer` to React.

## Desktop Session Shape

The current `DesktopSession` model is intentionally small:

```ts
type DesktopSession = {
  userId: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
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
10. Replace desktop API-key bridge with Convex Auth JWT handoff.
11. Add `/api/v1/me` token verification before Electron stores the session.
12. Fix `/auth` routing so `/auth/desktop` runs its own handoff component.
13. Use form POST for local dev handoff and accept form payloads in Electron.
14. Add `auth.onSessionChanged` through preload-safe IPC.

Next:

1. Replace visible desktop dashboard mock data with live/empty/loading states.
2. Add logout and token expiry handling.
3. Decide whether direct Convex subscriptions belong in desktop V1 or stay behind the website API.

## Development Notes

Development needs an explicit deep-link test path:

```txt
stage://auth?code=dev-code&state=expected-state
```

The app should log sanitized auth state transitions in development, but never log tokens or full callback URLs in production.

## Open Questions

- What exact website route should own desktop login: `/auth/desktop`, `/desktop/login`, or another route?
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
