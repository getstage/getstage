# Session Auth Cleanup Plan

Date: May 29, 2026  
Status: **Complete** (session scope only)  
Scope: Stage Desktop session handling in `apps/user-application`

## Caption: Goal

Keep this simple.

For now we only clean up **session auth**, not paid access.

```txt
session = is this desktop app logged in?
access = is this logged-in user allowed into paid/protected areas?
```

Access can be added later. For now, only session gets a cached helper. !!!! needs to be added later

## Caption: Current issue

The app currently calls desktop session APIs from too many places:

```txt
routes/_authed.tsx
routes/auth.tsx
routes/__root.tsx
app/WorkspaceFrame.tsx
features/onboarding/useNonProOnboardingGate.ts
settings/components/SettingsPageView.tsx
auth/DesktopAuthView.tsx
lib/auth.tsx
```

Some of those calls are valid, but the ownership is unclear.

Rule going forward:

```txt
Routes use a plain cached helper.
Components use a TanStack Query hook for display.
Only one app-level subscription invalidates session state.
```

## Caption: Target architecture

```txt
TanStack Router beforeLoad
  -> getDesktopSessionCached()
  -> redirect or allow route

React components
  -> useDesktopSession()
  -> display current session only

Root/app subscription
  -> desktop.auth.onSessionChanged
  -> clearDesktopSessionCache()
  -> invalidate desktop session query
```

No settings/dashboard/project component should call:

```ts
window.stageDesktop.auth.getSession()
```

directly.

## Caption: Files to affect

### 1. Create session cache helper

Create:

```txt
apps/user-application/src/lib/auth/session.ts
```

Responsibilities:

```txt
getDesktopSessionCached()
clearDesktopSessionCache()
desktopSessionQueryKey
```

The helper is plain async TypeScript. It can be used from TanStack Router
`beforeLoad`, because it does not use React hooks.

Expected shape:

```ts
let sessionCache: { data: DesktopSession | null; timestamp: number } | null = null;
const SESSION_CACHE_TTL = 1000 * 60 * 5;

export async function getDesktopSessionCached() {
  // cached window.stageDesktop.auth.getSession()
}

export function clearDesktopSessionCache() {
  sessionCache = null;
}
```

### 2. Keep compatibility with existing helper

Update:

```txt
apps/user-application/src/lib/desktopSession.ts
```

Responsibilities after cleanup:

```txt
Either re-export from lib/auth/session.ts
or become deprecated and removed after imports are migrated.
```

Preferred short-term approach:

```ts
export {
  desktopSessionQueryKey,
  getDesktopSessionCached as getDesktopSession,
  clearDesktopSessionCache,
} from "@/lib/auth/session";
```

This avoids a huge one-shot rename.

### 3. Create or keep session query hook

Create or keep:

```txt
apps/user-application/src/hooks/engine/useDesktopSession.ts
```

Responsibilities:

```txt
Use TanStack Query for session display state.
Use desktopSessionQueryKey.
Use getDesktopSessionCached as queryFn.
No local useEffect.
```

Expected shape:

```ts
export function useDesktopSession() {
  return useQuery({
    queryKey: desktopSessionQueryKey,
    queryFn: getDesktopSessionCached,
    retry: false,
  });
}
```

### 4. Update protected route guard

Update:

```txt
apps/user-application/src/routes/_authed.tsx
```

Responsibilities:

```txt
Use getDesktopSessionCached().
Redirect to /auth if no hasAccessToken.
No paid access check yet.
```

Target:

```ts
const session = await getDesktopSessionCached();
if (!session?.hasAccessToken) throw redirect(...);
```

### 5. Update auth route redirect

Update:

```txt
apps/user-application/src/routes/auth.tsx
```

Responsibilities:

```txt
Use getDesktopSessionCached().
Redirect logged-in users away from /auth.
```

### 6. Centralize session-change invalidation

Create:

```txt
apps/user-application/src/app/hooks/useDesktopSessionInvalidation.ts
```

Responsibilities:

```txt
Subscribe to desktop.auth.onSessionChanged.
Clear desktop session cache.
Invalidate desktopSessionQueryKey.
Optionally navigate to /auth when session disappears.
```

This is a valid `useEffect`, because it is an event subscription, not data
fetching.

Then update:

```txt
apps/user-application/src/routes/__root.tsx
```

Responsibilities after cleanup:

```txt
Call useDesktopSessionInvalidation().
Keep root route layout/error boundary.
Stop owning raw subscription logic inline.
```

### 7. Update workspace frame

Update:

```txt
apps/user-application/src/app/WorkspaceFrame.tsx
```

Responsibilities:

```txt
Use useDesktopSession().
Remove direct desktop.auth.getSession query.
Remove direct desktop.auth.onSessionChanged subscription.
Only render account label/meta.
```

### 8. Update onboarding gate

Update:

```txt
apps/user-application/src/features/onboarding/useNonProOnboardingGate.ts
```

Responsibilities:

```txt
Use useDesktopSession().
Keep Convex product/onboarding logic here for now.
Do not call desktop.auth.getSession directly.
```

This hook can still use `useEffect` to open/close onboarding because that is
UI orchestration, not session fetching.

### 9. Update settings account panel

Update:

```txt
apps/user-application/src/settings/components/SettingsPageView.tsx
```

Short-term:

```txt
Use useDesktopSession() for display.
No raw desktop.auth.getSession.
No route access logic.
```

Better follow-up:

```txt
Move AccountPanel into:
apps/user-application/src/settings/components/AccountPanel.tsx
```

### 10. Update auth view

Update:

```txt
apps/user-application/src/auth/DesktopAuthView.tsx
```

Responsibilities:

```txt
Use useDesktopSession() for initial/display session.
Use desktop.auth.openLogin() for login action.
Do not manually fetch session in useEffect.
Either subscribe through root invalidation or keep a narrow auth-view listener
only for "continue after login" behavior.
```

Preferred:

```txt
Root invalidates session query.
Auth view watches useDesktopSession().data and navigates when hasAccessToken.
```

### 11. Update Convex auth provider only if needed

Inspect:

```txt
apps/user-application/src/lib/auth.tsx
```

This file powers `ConvexProviderWithAuth`, so it may legitimately subscribe to
desktop auth. Do not casually remove it.

Rule:

```txt
If Convex requires its own auth state hook, keep it here.
But do not let screens duplicate that logic.
```

## Caption: Files not affected yet

Do not add paid access helper yet:

```txt
apps/user-application/src/lib/auth/access.ts
```

Do not add this until Stage has a clear source for:

```txt
hasAccess
plan
subscription/payment status
upgrade redirect rules
```

For now, product access stays in:

```txt
apps/user-application/src/features/onboarding/useNonProOnboardingGate.ts
Convex functions with ctx.auth
```

## Caption: Implementation order

Do this in small commits/steps:

```txt
1. Add lib/auth/session.ts.
2. Re-export compatibility from lib/desktopSession.ts.
3. Update useDesktopSession to use cached helper.
4. Update routes/_authed.tsx and routes/auth.tsx.
5. Add app/hooks/useDesktopSessionInvalidation.ts.
6. Simplify routes/__root.tsx.
7. Simplify WorkspaceFrame.
8. Simplify useNonProOnboardingGate.
9. Simplify Settings AccountPanel.
10. Simplify DesktopAuthView.
11. Run typecheck/build.
```

## Caption: Acceptance checklist

```txt
No raw desktop.auth.getSession in settings components.
No raw desktop.auth.getSession in WorkspaceFrame.
No raw desktop.auth.getSession in onboarding gate.
Route guards use getDesktopSessionCached.
Components display session through useDesktopSession.
Only one app-level session-change invalidation hook exists.
pnpm --dir apps/user-application run typecheck passes.
pnpm --dir apps/user-application run build passes.
```

## Caption: Later access plan

When paid access is ready, add:

```txt
apps/user-application/src/lib/auth/access.ts
  getAccessCached()
  clearAccessCache()
```

Then `_authed.beforeLoad` can become:

```txt
1. Check session.
2. Skip access check on upgrade/subscriptions route.
3. Check access.
4. Redirect to /subscriptions if no access.
```

Do not implement this until the source of access truth is settled.

## Caption: Implementation status

Completed May 29, 2026:

```txt
lib/auth/session.ts              — getDesktopSessionCached, clearDesktopSessionCache, desktopSessionQueryKey
lib/desktopSession.ts            — re-exports session module
hooks/engine/useDesktopSession.ts
app/hooks/useDesktopSessionInvalidation.ts — single onSessionChanged on root
routes/_authed.tsx, routes/auth.tsx        — getDesktopSession in beforeLoad
routes/__root.tsx                            — invalidation hook only
app/WorkspaceFrame.tsx, auth/DesktopAuthView.tsx, useNonProOnboardingGate.ts — useDesktopSession
settings/components/SettingsPageView.tsx     — no raw getSession
```

Verification: no raw `desktop.auth.getSession` in UI components; typecheck passes.

Follow-up (out of scope for this doc): `lib/auth/access.ts` for paid access.
