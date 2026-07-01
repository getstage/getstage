# ctqa-strip-band-aids: Remove === undefined / isLoading guards once a loader covers the screen

## Priority: MEDIUM

## Explanation

Before loaders existed, each component manually suppressed the flash with fire-extinguishers: `=== undefined` checks ("still loading, treat as loading"), `if (isLoading) return null` early returns, and the `"skip"` tri-state (`isAuthLoading || (isAuthenticated && data === undefined)`). Once a route loader has awaited `ensureQueryData(convexQuery(...))`, the cache is warm before the component mounts, so these guards become dead branches. Leaving them is technical debt and obscures the real "empty" state. Strip them per screen as each loader lands.

## Bad Example

```tsx
// Hook returns three-state isLoading that a component never reads correctly.
export function useProject(projectId: string | undefined) {
  const { isAuthenticated, isLoading: isAuthLoading } = useDesktopAuth();
  const data = useQuery(api.projects.get, isAuthenticated && projectId ? { projectId } : "skip");
  return {
    data,
    isLoading: isAuthLoading || (isAuthenticated && Boolean(projectId) && data === undefined),
  };
}

// Component guesses "loading vs empty" manually — flashes setup on undefined.
function ProjectView() {
  const project = useProject(useParams().projectId);
  if (project.isLoading) return null;
  if (!project.data) return <ProjectSetup />;
  return <ProjectDetail project={project.data} />;
}
```

## Good Example

```tsx
// Loader awaits the fetch — component never sees undefined.
export const Route = createFileRoute("/projects/$projectId")({
  loader: async ({ params, context: { queryClient } }) => {
    await queryClient.ensureQueryData(convexQuery(api.projects.get, { projectId: params.projectId }));
  },
  component: ProjectView,
});

// Hook becomes the TanStack Query shape — isPending replaces the hand-rolled isLoading.
export function useProject(projectId: string | undefined) {
  const { isAuthenticated, isLoading: isAuthLoading } = useDesktopAuth();
  const { data, isPending } = useQuery({
    ...convexQuery(api.projects.get, { projectId }),
    enabled: Boolean(projectId),
  });
  return { data, isPending: isAuthLoading || isPending };
}

// Component: no more isLoading guard — empty is genuinely empty.
function ProjectView() {
  const project = useProject(Route.useParams().projectId);
  if (!project.data) return <ProjectSetup />;   // truly empty — no flash, just the setup CTA
  return <ProjectDetail project={project.data} />;
}
```

## What to delete per screen

- `if (isLoading) return null;` early returns
- `=== undefined` tri-state branches (`if (data === undefined) ...`)
- `isAuthLoading || (isAuthenticated && data === undefined)` in returned `isLoading` (replace with `isAuthLoading || isPending`)
- The `"skip"` sentinel from `convex/react` (replaced by `enabled`)
- `isRunsLoading` / `isStyleGuideRunsLoading` style of "is the durable-run query resolved yet" guards (covered by the parent loader)

## What NOT to delete

- `enabled: isAuthenticated && ...` in the hook — loaders guarantee auth once, but Strict Mode and cross-route-tree reuse still need it.
- Empty-state rendering (`if (!data) return <SetupCTA/>`) once `isLoading` is gone — `!data` after a loader genuinely means empty, which is the correct UX.
- Any `parseError` / error-handling branches — those aren't loading guards.

## Context

- Strip incrementally: one screen's guards at a time, **after** its loader has shipped and a build verifies the cache key matches. Big-bang stripping is how you reintroduce a flash on a screen whose loader is subtly wrong.
- Keep loaders + hooks in lock-step: if you add a Convex query to a hook, add it to the parent loader the same commit, or you've reintroduced the flash on a screen you thought was fixed.
- If a screen has multiple in-component tabs (e.g. project tabs), prefetch each tab's query in the single parent loader — don't add per-tab sub-loaders, those aren't separate routes.