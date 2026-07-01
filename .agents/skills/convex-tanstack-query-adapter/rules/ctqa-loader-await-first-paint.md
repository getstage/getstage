# ctqa-loader-await-first-paint: Await ensureQueryData in the route loader

## Priority: CRITICAL

## Explanation

This is the whole reason the adapter exists. A Convex `useQuery` first render is `undefined` — the component paints an "empty / setup / config" screen for a split second, then corrects when the data lands. The fix: a route `loader` calls `queryClient.ensureQueryData(convexQuery(api.X, args))` so the route renders only once the first result is in the cache. The component then reads the warm cache (via `useQuery` or `useSuspenseQuery`) and never sees `undefined`. **You have not slowed Convex down** — the live subscription stays active after first paint; you only gave the first fetch a place to be awaited instead of letting it paint undefined.

## Bad Example

```tsx
// No loader — component paints `undefined`, then setup screen, then real data.
export const Route = createFileRoute("/projects/$projectId")({
  component: ProjectView,
});

function ProjectView() {
  const { data } = useQuery(convexQuery(api.projects.get, { projectId }));
  //                         ^ first render: data=undefined → flash
  return data ? <ProjectDetail project={data} /> : <ProjectSetupLayout />;
  //   ^^^^^^^^ Setup screen paints for a frame even on a project that has data.
}
```

## Good Example

```tsx
const projectQuery = (projectId: string) =>
  convexQuery(api.projects.get, { projectId });

export const Route = createFileRoute("/projects/$projectId")({
  loader: async ({ params, context: { queryClient } }) => {
    await queryClient.ensureQueryData(projectQuery(params.projectId));
  },
  component: ProjectView,
});

function ProjectView() {
  const { projectId } = Route.useParams();
  const { data } = useQuery(projectQuery(projectId));
  // First render runs AFTER the loader → cache is warm → data is defined.
  return <ProjectDetail project={data!} />;
}
```

## Router wiring

```tsx
// src/router.tsx
export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPendingComponent: () => <NeutralSpinner />,   // shown while the loader runs
  defaultPreload: "intent",
  defaultPreloadStaleTime: 30_000,
});
```

The `defaultPendingComponent` is what the user sees during the await window — a real loader replaces the old "flash of setup screen."

## Parallel loaders (multiple queries)

```tsx
loader: async ({ params, context: { queryClient } }) => {
  await Promise.all([
    queryClient.ensureQueryData(convexQuery(api.desktop.getProjectData, { projectId: params.projectId })),
    queryClient.ensureQueryData(convexQuery(api.desktop.listProjectPhases, { projectId: params.projectId })),
    queryClient.ensureQueryData(convexQuery(api.projectAi.getLatestMoodboardArtifact, { projectId })),
  ]);
},
```

In-component tabs that aren't separate routes (e.g. Research/Strategy/Moodboard/Flows/Wireframes/Assets under one `project.$projectId` route) share one parent loader — prefetch every tab's artifact query there.

## ensureQueryData vs prefetchQuery

| Method | Returns | Throws | Awaits | Use |
|--------|---------|--------|--------|-----|
| `ensureQueryData` | data | yes | yes | Route loaders (recommended) |
| `prefetchQuery` | void | no | yes | Background prefetch on hover |
| `fetchQuery` | data | yes | yes | Inside non-loader code needing data now |

Use `ensureQueryData` in loaders: it returns the data, awaits completion, and propagates errors to the route error boundary.

## Context

- Pair with `useSuspenseQuery(convexQuery(...))` in components for guaranteed-non-undefined data when a loader has awaited — fully auth-safe if combined with `ctqa-auth-gate-in-loader`.
- The loader must use **identical args** to the component hook; a mismatch creates two cache entries and the component is still loading. Centralize args (no inline shape drift).
- A loader's error throws into the route's error boundary — that's the intended UX. Don't `.catch(() => {})` silently.
- This does NOT disable Convex live updates. After first paint the subscription keeps pushing deltas; the component re-renders on every change exactly as before.