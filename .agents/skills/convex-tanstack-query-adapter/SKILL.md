---
name: convex-tanstack-query-adapter
description: Route Convex queries through TanStack Query using @convex-dev/react-query (ConvexQueryClient + convexQuery). Use when integrating Convex with TanStack Query, killing loading flashes / "flash on load" in a Convex+React app, adding route loaders for Convex queries, wiring ConvexQueryClient, converting useQuery from convex/react to convexQuery, awaiting the first paint via ensureQueryData, or removing === undefined / isLoading band-aids once a loader covers a screen.
---

# Convex ↔ TanStack Query Adapter (@convex-dev/react-query)

## Purpose

Kill loading flashes in Convex + React apps. Convex's `useQuery` (from `convex/react`) is a live WebSocket subscription that returns `undefined` on the very first render — so a component paints "empty / setup / config" for a split second before the data lands. This adapter routes Convex queries through TanStack Query's cache so a **route loader** can await the first fetch and the component only paints real data.

## Related skills (Stage monorepo)

- **TanStack Query (generic):** `.agents/skills/tanstack-query-best-practices/SKILL.md`
- **TanStack Router (generic):** `.agents/skills/tanstack-router-best-practices/SKILL.md`
- **Convex backend & provider:** `.agents/skills/convex-quickstart/SKILL.md`
- **Auth in Convex functions:** `.agents/skills/convex-setup-auth/SKILL.md`

Keep **Convex identity/auth in Convex functions**; TanStack Query only owns client cache + first-paint gating. Do not replace server-side auth with trust-the-client.

## The key idea

- `ConvexQueryClient` wraps the `ConvexReactClient` and steals two of `QueryClient`'s defaults (`queryKeyHashFn`, `queryFn`). After `connect(queryClient)`, Convex queries flow through TanStack Query's cache while staying live.
- `convexQuery(api.foo, args)` returns a normal TanStack `queryOptions` → usable in `useQuery`, `ensureQueryData`, `prefetchQuery`. Because it's a TanStack Query, the adapter creates a **live subscription** that the route loader canawait.
- Component reads the warmed cache instantly after the first paint, and keeps receiving real-time pushes. The adapter does **not** slow Convex down — it only gives the first fetch a place to be awaited instead of letting the component paint `undefined`.

## Rule quick reference (Prefix: `ctqa-`)

- `ctqa-setup` — wire `ConvexQueryClient` into `QueryClient` (hashFn/queryFn/connect), keep `ConvexProvider` so plain hooks still work.
- `ctqa-convex-query-options` — `convexQuery(api.X, args)` usage; `isStale`/retry/refetch ignored (Convex owns live updates).
- `ctqa-loader-await-first-paint` — route `loader` calls `ensureQueryData(convexQuery(...))` + `defaultPendingComponent` so first paint isn't `undefined`.
- `ctqa-auth-gate-in-loader` — child loaders of auth-gated Convex queries must run only after auth is known; rely on an upstream `beforeLoad` session check.
- `ctqa-mutations` — `useConvexMutation(api.X)` as `mutationFn`; no manual invalidation (live server push).
- `ctqa-strip-band-aids` — once a loader covers a screen, delete `=== undefined` / `isLoading ? null` / "skip" tri-state guards.

## How to use

Each rule file in `rules/` contains:
1. **Explanation** — why the pattern matters
2. **Bad Example** — anti-pattern to avoid
3. **Good Example** — recommended implementation
4. **Context** — when to apply or skip

## Acknowledged beta status

`@convex-dev/react-query` is currently a [beta feature](https://docs.convex.dev/production/state#beta-features) of Convex. Live updates remain real-time; the contract surface (setup wiring) is stable. Match the installed `convex` major version when pinning the adapter.