# ctqa-auth-gate-in-loader: Await auth before child loaders fire Convex ensureQueryData

## Priority: HIGH

## Explanation

Convex queries are typically gated on `isAuthenticated` (server-side `ctx.auth` + client-side `enabled` / `"skip"`). A route loader that calls `ensureQueryData(convexQuery(api.X, args))` for an auth-gated query **must not fire until auth is known**, otherwise the subscription starts unauthenticated and either errors out or returns undefined/skip-shaped data that flashes again. The clean way: an upstream `beforeLoad` on the auth route (e.g. `_authed`) already awaits the session before any descendant loader runs — child loaders inherit that guarantee for free.

## Bad Example

```tsx
// Child loader fires Convex query before auth resolves.
export const Route = createFileRoute("/_authed/projects/$projectId")({
  loader: async ({ params, context: { queryClient } }) => {
    // If auth isn't ready, this fires an unauthenticated Convex query:
    await queryClient.ensureQueryData(convexQuery(api.projects.get, { projectId }));
  },
  component: ProjectView,
});

// _authed does the session check independently — loaders don't wait for it.
export const AuthedRoute = createFileRoute("/_authed")({
  beforeLoad: async () => (await getSession()) ? {} : throw redirect({ to: "/auth" }),
});
```

## Good Example

```tsx
// _authed beforeLoad awaits session FIRST — its thrown redirect stops child loaders from running unauthed.
export const AuthedRoute = createFileRoute("/_authed")({
  beforeLoad: async ({ location }) => {
    const session = await getDesktopSessionCached();
    if (!session?.hasAccessToken) throw redirect({ to: "/auth" });
    // Auth is resolved here. Any child loader running afterward is post-auth.
  },
});

// Child loader inherited parent's guarantee — safe to ensureQueryData an auth-gated query.
export const Route = createFileRoute("/_authed/projects/$projectId")({
  loader: async ({ params, context: { queryClient } }) => {
    await queryClient.ensureQueryData(convexQuery(api.projects.get, { projectId }));
  },
  component: ProjectView,
});
```

## Hook still guards enabled — robustness, not paranoia

```tsx
// Hook keeps its enabled guard so an unauthed component can't fire a stray subscription
// (e.g. if used outside _authed, or in Strict Mode).
export function useProject(projectId: string | undefined) {
  const { isAuthenticated, isLoading: isAuthLoading } = useDesktopAuth();
  const { data, isPending } = useQuery({
    ...convexQuery(api.projects.get, { projectId }),
    enabled: isAuthenticated && Boolean(projectId),
  });
  return { data, isLoading: isAuthLoading || isPending };
}
```

## Context

- TanStack Router runs `beforeLoad` sequentially down the route tree — a thrown `redirect` (or any awaited promise) in `_authed.beforeLoad` blocks every descendant `beforeLoad`/`loader`. That's the gate; no extra promise wiring needed.
- The hook-level `enabled: isAuthenticated && ...` is still required: loaders run once, but Strict Mode double-mounts effects, and the hook may be used outside the gated route tree. Keep both layers.
- Do NOT expose `authReady` promises via router context unless the existing `beforeLoad` genuinely doesn't block children (verify with the router docs — it does). Adding redundant promise machinery is a code smell.
- If a session can expire mid-session, the `onSessionChanged` listener in the auth provider invalidates the `getDesktopSessionCached` cache; the next navigation re-runs `_authed.beforeLoad` against fresh auth.