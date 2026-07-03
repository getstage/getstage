# ctqa-setup: Wire ConvexQueryClient into QueryClient

## Priority: CRITICAL

## Explanation

`@convex-dev/react-query` does not replace Convex — it routes Convex queries through TanStack Query so loaders can await the first fetch. The wiring is a one-time setup: create a `ConvexQueryClient` wrapping the `ConvexReactClient`, hand two of `QueryClient`'s defaults (`queryKeyHashFn` and `queryFn`) to it, then call `connect(queryClient)`. You **must** keep the `ConvexProvider` (or `ConvexProviderWithAuth`) so plain `convex/react` hooks (`useQuery`, `useMutation`, `useAction`, `useConvexAuth`) still work alongside the adapter.

## Bad Example

```tsx
// Two disconnected clients — Convex queries never enter TanStack Query's cache.
const convex = new ConvexReactClient(VITE_CONVEX_URL);
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000 } },
});

// Routes can't ensureQueryData(Convex) — Convex isn't in the cache.
// Components keep flashing `undefined` on the first paint.
<ConvexProvider client={convex}>
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
</ConvexProvider>
```

## Good Example

```tsx
// src/lib/queryClient.ts
import { QueryClient } from "@tanstack/react-query";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { convex } from "./convex";

const convexQueryClient = new ConvexQueryClient(convex);
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      queryKeyHashFn: convexQueryClient.hashFn(),
      queryFn: convexQueryClient.queryFn(),
    },
  },
});
convexQueryClient.connect(queryClient);

export { queryClient, convexQueryClient };
```

```tsx
// src/main.tsx
import { ConvexProviderWithAuth } from "convex/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { convex } from "@/lib/convex";

<ConvexProviderWithAuth client={convex} useAuth={useAuth}>
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
</ConvexProviderWithAuth>;
```

## Context

- Order does not matter: ConvexProvider can wrap QueryClientProvider or vice versa, as long as both are ancestors of anything using `convex/*` or `@tanstack/react-query` hooks.
- Keep `staleTime`/`refetchOnWindowFocus` defaults you already had — they still apply. `refetchOnWindowFocus` for Convex-backed queries is a no-op (Convex is always live), but harmless.
- The adapter is beta; pin its version to match your installed `convex` major (e.g. `convex@1.32` ↔ latest adapter release in the 0.x line).
- Plain `convex/react` hooks (`useMutation`, `useAction`, `useConvexAuth`) remain the idiomatic choice for one-shot operations — you do **not** have to migrate everything to TanStack Query. Coexistence is the whole point.