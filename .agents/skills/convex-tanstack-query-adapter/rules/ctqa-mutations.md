# ctqa-mutations: useConvexMutation as the TanStack useMutation mutationFn

## Priority: MEDIUM

## Explanation

Convex mutations don't need the TanStack Query cache-invalidating routine — Convex already pushes live updates to every subscribed client, so any `useQuery(convexQuery(...))` observer automatically refetches the moment a mutation lands. Use `useConvexMutation(api.X)` (re-exported by `@convex-dev/react-query`) as the `mutationFn` inside TanStack's `useMutation` to get TanStack's UX (`isPending`, `onSuccess`, `onError`, `mutateAsync`) while staying on Convex's optimistic live channel.

## Bad Example

```tsx
// Hand-rolled invalidation of a Convex-backed query — pointless, Convex is already live.
const mutate = useMutation({
  mutationFn: (input: { name: string }) => api.projects.create(input),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
});
//       ^^^ invalidateQueries against a Convex observer is a no-op at best, a re-subscription cost at worst.
```

## Good Example

```tsx
import { useMutation } from "@tanstack/react-query";
import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@/lib/convexApi";

export function useCreateProject() {
  return useMutation({
    mutationFn: useConvexMutation(api.projects.create),
    // No invalidateQueries — the list observer receives the delta live.
    onError: (error) => console.error(error),
  });
}

// Caller
const createProject = useCreateProject();
await createProject.mutateAsync({ name: "Acme" });
// Every mounted `useQuery(convexQuery(api.projects.list, {}))` updates reactively.
```

## Coexistence with plain convex/react mutations

Plain `useMutation as useConvexMutation` from `convex/react` still works after the adapter is wired — you don't have to migrate every mutation hook. Migrate when you want TanStack's `onMutate` optimistic-update machinery or cross-component state coordination (`useMutationState`); otherwise leave the existing hook alone.

## Context

- `retry` / `retryDelay` on a Convex-backed `useMutation` are inert — Convex handles transient failures over its WebSocket.
- For optimistic UI, use TanStack's `onMutate` + `onError` rollback pattern as you would for any mutation; but skip the `invalidateQueries` step at the end. Live subscriptions already refresh.
- Mutations don't flash (they're user-triggered), so they're out of scope for the flash-kill migration. Keep them on `convex/react` unless you need TanStack's lifecycle hooks.