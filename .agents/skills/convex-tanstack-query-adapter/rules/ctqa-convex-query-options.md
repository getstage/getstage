# ctqa-convex-query-options: Use convexQuery() everywhere TanStack Query accepts queryOptions

## Priority: HIGH

## Explanation

`convexQuery(api.foo, args)` returns a plain TanStack `queryOptions` object (`queryKey` + `queryFn` backed by Convex). Use it anywhere TanStack Query accepts options: `useQuery`, `ensureQueryData`, `prefetchQuery`, `useSuspenseQuery`, `fetchQuery`. Because Convex owns the live WebSocket subscription, several normal TanStack options are ignored or always-false — they exist for `fetch`-backed queries that don't apply here.

## Bad Example

```tsx
// Stays on convex/react — loader can't await, flash remains.
import { useQuery } from "convex/react";
const data = useQuery(api.tasks.list, isAuthenticated ? {} : "skip");
//                          ^ undefined on first render → component paints empty/setup state
```

```tsx
// Building queryOptions by hand with a stale-time-based retry — wasted; Convex is already live.
useQuery({
  queryKey: ["tasks"],
  queryFn: () => someFetchFn(),
  staleTime: 30_000,
  retry: 3,
  refetchOnWindowFocus: true,  // ignored by Convex anyway
});
```

## Good Example

```tsx
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@/lib/convexApi";

// Component
const { data, isPending } = useQuery({
  ...convexQuery(api.tasks.list, { projectId }),
  enabled: Boolean(projectId),   // disable while projectId unknown — no "skip" sentinel
});

// Loader (await the first fetch so isPending is false when the component mounts)
await queryClient.ensureQueryData(convexQuery(api.tasks.list, { projectId }));
```

## Spreading additional options

```tsx
const { data } = useQuery({
  ...convexQuery(api.messages.list, { roomId }),
  initialData: [],                 // seed an empty list so data is never undefined
  gcTime: 10_000,                  // keep subscription 10s after last unmount
  // staleTime/retry/refetch* are accepted but inert for Convex-backed queries.
});
```

## Options invariants for Convex-backed queries

| Option | Behavior with Convex |
|--------|----------------------|
| `isStale` (return) | Always `false` — Convex is always current |
| `refetchOnWindowFocus`, `refetchOnReconnect`, `refetchOnMount` | No-ops |
| `retry` / `retryDelay` | Ignored — Convex has its own WebSocket retry |
| `gcTime` | Honored — controls how long the live subscription stays active after last observer unmount (default 5 min) |
| `enabled`, `initialData`, `placeholderData`, `select`, `staleTime` | Honored |
| `notifyOnChangeProps`, `notifyOnChangeCallbacks` | Honored (optimization) |

## Context

- Use the `"skip"` sentinel from convex/react only if you're not adopting the adapter. With `convexQuery`, use `enabled` instead — cleaner tri-state.
- The loader's `ensureQueryData` args **must match exactly** the component's hook args (same `projectId` shape) so the TanStack Query key hits the same observer. Centralize arg construction to avoid key drift.
- `isPending` (TanStack Query v5) replaces the old `isLoading`; with Convex data, `isPending` is only true before the first fetch resolves — exactly the window we eliminate with a loader.