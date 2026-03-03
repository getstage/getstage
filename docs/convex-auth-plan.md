# Convex Auth Plan for Stage

Short implementation plan for moving Stage from placeholder auth to **Convex Auth** with:

- `Email OTP` (6-digit code)
- `Google OAuth`
- `React + Vite SPA`
- `Convex` as the backend

---

## Decision

Stage will use **Convex Auth** for authentication.

This matches the current product direction:

- one unified auth entry
- passwordless email flow
- Google sign-in
- React/Vite SPA

Important note:

- Convex's official docs currently describe **Convex Auth as beta**
- for this repo that is acceptable, but we should keep auth isolated behind `app/src/lib/auth.ts`

Sources:

- [Convex Auth overview](https://docs.convex.dev/auth/convex-auth)
- [Convex Authentication docs](https://docs.convex.dev/auth)

---

## Current repo state

Right now auth is **not actually integrated**.

Current files:

- [auth.ts](/Users/wernerjohannesdieben/stage_mvp/app/src/lib/auth.ts)
- [AuthPage.tsx](/Users/wernerjohannesdieben/stage_mvp/app/src/components/auth/AuthPage.tsx)
- [\_app.tsx](/Users/wernerjohannesdieben/stage_mvp/app/src/routes/_app.tsx)

What is true today:

- auth is still placeholder/mock
- `AUTH_BYPASS_ENABLED = true`
- email OTP is simulated locally
- Google auth is simulated locally
- route protection is still bypass-based

So:

- `Convex data is started`
- `Convex auth is not started yet`

---

## Target auth behavior

### Login methods

1. **Email OTP**
   - user enters email
   - Stage sends a 6-digit code
   - user enters code
   - existing user goes to dashboard
   - new user goes to onboarding or dashboard depending on final product choice

2. **Google OAuth**
   - user clicks Continue with Google
   - Google sign-in completes
   - user returns authenticated to Stage

### UX rules

This should stay aligned with [01-auth-flow.md](/Users/wernerjohannesdieben/stage_mvp/docs/01-auth-flow.md):

- one auth screen
- no separate sign in / sign up split
- 6-digit email code
- smooth routing after success

Only product change:

- add a **Google sign-in button** to the same auth screen

---

## Files to add

These are the files I expect to add when implementing Convex Auth:

### Convex auth server files

- `app/convex/auth.config.ts`
- `app/convex/auth.ts`
- `app/convex/http.ts`

### Client auth integration files

- `app/src/lib/auth-client.ts`

Possible extra helper file if needed:

- `app/src/components/providers/AuthProvider.tsx`

---

## Files to change

### Existing frontend files

- [main.tsx](/Users/wernerjohannesdieben/stage_mvp/app/src/main.tsx)
  - wrap app with the correct Convex auth provider

- [auth.ts](/Users/wernerjohannesdieben/stage_mvp/app/src/lib/auth.ts)
  - replace placeholder logic with real Convex Auth adapter
  - keep this as the single frontend auth abstraction

- [AuthPage.tsx](/Users/wernerjohannesdieben/stage_mvp/app/src/components/auth/AuthPage.tsx)
  - switch from fake OTP methods to real auth calls
  - add Google button
  - keep the current visual structure as much as possible

- [\_app.tsx](/Users/wernerjohannesdieben/stage_mvp/app/src/routes/_app.tsx)
  - remove bypass logic
  - use real session check

- [Navbar.tsx](/Users/wernerjohannesdieben/stage_mvp/app/src/components/shared/Navbar.tsx)
- [ProfileDropdown.tsx](/Users/wernerjohannesdieben/stage_mvp/app/src/components/shared/ProfileDropdown.tsx)
  - use real sign-out

### Package/config files

- [package.json](/Users/wernerjohannesdieben/stage_mvp/app/package.json)
  - add Convex Auth package(s)

- `.env.local`
  - add public client auth env values if required

- Convex deployment env vars
  - add secrets for Google and email provider

---

## Expected environment variables

At minimum we should expect variables in two groups.

### Frontend / local env

- `VITE_CONVEX_URL`
- `VITE_CONVEX_SITE_URL`

### Convex deployment env

- auth secret(s) required by Convex Auth
- Google client id
- Google client secret
- email provider credentials
- site URL values used for callbacks and auth redirects

Exact names depend on the final official Convex Auth setup guide used during implementation.

---

## Google auth plan

Yes, **Google auth is part of the plan**.

Implementation requirements:

1. Create Google OAuth credentials
2. Add the correct callback URL(s)
3. Configure Convex Auth provider for Google
4. Add one Google button to the auth screen
5. Route successful Google users through the same Stage session flow as OTP users

Important detail for React/Vite SPA auth:

- callback URLs should be validated very carefully against the actual Convex/HTTP auth endpoint used by Convex Auth
- this is the part most likely to break if configured casually

---

## Email OTP plan

Stage will use:

- email entry
- 6-digit code verification

That means the implementation must support:

- sending OTP
- verifying OTP
- resending OTP
- cooldown
- invalid code error
- expired code handling

The UI already has most of the right structure.
The work is mostly replacing simulated state with real auth actions.

---

## Recommended implementation order

1. **Install and configure Convex Auth**
   - add server auth files
   - wire Convex auth routes

2. **Configure Google provider**
   - callback URLs
   - secrets

3. **Configure email OTP provider**
   - provider credentials
   - OTP send/verify flow

4. **Replace frontend auth adapter**
   - rewrite `app/src/lib/auth.ts`

5. **Upgrade AuthPage**
   - real OTP flow
   - Google button

6. **Remove auth bypass**
   - update protected routes
   - update sign-out

7. **Store/resolve user identity**
   - make sure authenticated users map to `users` table records consistently

---

## Data model note

Auth and app profile data should stay logically separate.

Recommended rule:

- Convex Auth manages authentication/session identity
- Stage `users` table stores app-level profile data such as:
  - `name`
  - `avatarUrl`
  - `role`
  - `plan`

So after successful auth:

- ensure a Stage `users` record exists
- attach product-specific profile fields there

---

## Risk notes

1. **Convex Auth beta**
   - acceptable, but keep auth logic isolated behind `app/src/lib/auth.ts`

2. **Google callback misconfiguration**
   - very common
   - must be configured carefully in both Google and Convex

3. **OTP provider setup**
   - sending codes is simple only after provider credentials are correct

4. **Route guard migration**
   - current app still assumes bypass auth
   - replacing that must be done carefully to avoid locking the app out during development

---

## Acceptance criteria

Convex Auth integration is complete when:

- email OTP works end-to-end
- Google auth works end-to-end
- `AUTH_BYPASS_ENABLED` is removed or no longer used
- protected routes use real auth state
- logout works
- `AuthPage.tsx` uses real auth calls
- authenticated users resolve to Stage user records consistently

---

## Recommended next step

Implement auth in this order:

1. Convex Auth server setup
2. Google provider
3. Email OTP provider
4. frontend auth adapter
5. Auth page UI hookup

That keeps risk low and makes debugging much easier than changing UI first.
