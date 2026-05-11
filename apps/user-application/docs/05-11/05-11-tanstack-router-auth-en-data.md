# TanStack Router: auth, redirects, and where mutations belong

**Date:** May 11, 2026 (`2026-05-11`)

## Purpose

One clear line for the **Stage desktop app** (`apps/user-application`): navigation and access rules drive where users land; screens handle interaction and presentation.

## Agent skills

Detailed rule packs live under:

- `.agents/skills/tanstack-router-best-practices/` — routing, loaders, search params, navigation.
- `.agents/skills/tanstack-query-best-practices/` — query keys, cache, mutations, invalidation.

Pair with Convex: `.agents/skills/convex-quickstart/` and `.agents/skills/convex-setup-auth/`.

## Rules (summary)

| Layer | Responsibility |
|--------|----------------|
| **TanStack Router** (`beforeLoad`, `redirect`, optional `loader`) | Session/access checks; **no** access → redirect; preload minimal data when needed before render; avoid scattering global rules across individual views. |
| **Components + thin hooks** | **Mutations** (Convex/React Query `useMutation`, forms, dialogs); local UI state; no per-screen “if not logged in, bounce to login” spaghetti. |

This matches the pattern elsewhere: **fetch/constraints in routes**, **mutations in the UI layer**.

---

## Current state (facts in code)

**File:** `apps/user-application/src/router.tsx`

1. **`RootRoute`** wraps everything in `DesktopShell`, runs TanStack Query `useQuery` for `desktop.auth.getSession()`, and **replaces `<Outlet />` with `<DesktopAuthView />`** when `!isAuthRoute && (!hasAccessToken || loading)`. That is an implicit guard implemented in JSX, not `beforeLoad`.
2. **`/auth`** duplicates `DesktopAuthView` as its own route while the root layout may also render it — same UX, two paths into the same screen.
3. **`DashboardContextView`** duplicates a session query (`queryKey` …`dashboard-onboarding`) and uses **`useEffect`** to open `OnboardingModal` based on Convex-backed `useProjectsQuery` + `useSettingsOverviewQuery` (plan). That is **product/onboarding UX**, not pure auth, but it sits next to dashboard rendering.

**Desktop session source:** `useDesktopBridge()` → `window.stageDesktop.auth.getSession()` is available **outside React** in the Electron renderer (same `window`), so `beforeLoad` can call it without hooks.

---

## Target architecture

### Route tree (conceptual)

Keep **`createRoute` / programmatic** setup (no mandate to migrate to file-based routing unless you want codegen).

```
root (DesktopShell only — thin shell + global subscriptions)
├── /auth                    → DesktopAuthView (public)
└── _authed (pathless layout)
    ├── beforeLoad           → session (+ optional “logged-in user must not see /auth” inversion on auth route only)
    ├── component            → <Outlet /> (or shared chrome later)
    ├── /
    ├── /projects, /tasks, … → all current app routes move here
```

- **`_authed`** is a **pathless layout route** (`id: '_authed'`, no `path`) so children keep familiar absolute paths like `/projects`.
- **Public:** only `/auth` (and any future marketing/deeplink exceptions you explicitly list).

### Two tiers of gates (important)

| Tier | Question | Where | Notes |
|------|-----------|--------|--------|
| **1 — Transport/session** | Do we have a valid desktop session / token? | `_authed.beforeLoad` | Call `window.stageDesktop.auth.getSession()` (via a tiny helper). `throw redirect({ to: '/auth' })` if not OK. |
| **2 — Product / billing / onboarding** | Pro vs free? Force paywall? First-run modal? | Prefer **dedicated route(s)** or **layout child** with loaders — not duplicate `useEffect` in every screen | Today this uses Convex queries (`useSettingsOverviewQuery`, etc.). Convex **React** hooks do not run inside `beforeLoad`. Options: (a) keep tier‑2 in an **`_authed` layout component** with suspense/query + **no redirects**, only modals; (b) add a **`/onboarding` or `/upgrade`** route and navigate there from a single effect or loader once you can **prefetch** the same data with `queryClient.ensureQueryData` + shared `queryFn`; (c) expose a **small HTTP or Convex action** callable from `beforeLoad` if you ever need a hard redirect based on plan without mounting providers (heavier). |

**Recommendation:** Move **tier 1** to `beforeLoad` first (big win, low ambiguity). Refactor **tier 2** from scattered `useEffect` toward either a **single onboarding layout** or explicit **`/upgrade`** — align with how Stripe/checkout flows should behave.

---

## Implementation plan (phased)

### Phase A — Session guard only (ship first)

1. Add **`lib/desktopSession.ts`** (or similar) exporting:
   - `getDesktopSession()` → `Promise` wrapping `window.stageDesktop.auth.getSession()` with a narrow type / null handling.
   - Optional: `throw redirect` helpers that preserve `redirect` search param if you add deep-link return URLs later.
2. Introduce **`authedLayoutRoute`** (`id: '_authed'`) with `beforeLoad`:
   - Await `getDesktopSession()`.
   - If no `hasAccessToken` (or whatever field equals “logged in” today), `throw redirect({ to: '/auth' })`.
3. Reparent **all routes except `/auth`** from `rootRoute` to **`authedLayoutRoute`** (same path strings as today).
4. Slim **`RootRoute`** to:
   - `DesktopShell` + `<Outlet />` **always**.
   - Keep **only** the `useEffect` **`onSessionChanged` → invalidate** `["desktop","auth","session"]` (and any aliased keys — consolidate keys so dashboard does not define a second session key).
5. **`/auth` route:** optional `beforeLoad`: if session already valid → `redirect({ to: '/' })` (stops double-mount weirdness).

**Acceptance:** No route under `_authed` mounts without passing `beforeLoad`; no session query duplication for “can render app shell”.

### Phase B — Query key hygiene

1. Single **`desktopSessionQueryKey`** exported from one module; router prefetch (if any) and dashboard use the same key.
2. Remove `DashboardContextView`’s duplicate session query **unless** it needs different stale policy — if so, document why; default is **one key**.

### Phase C — Onboarding / paywall (tier 2)

1. Extract current `useEffect` logic from **`DashboardContextView`** into either:
   - **`useDashboardOnboardingGate()`** hook used only by dashboard (minimal move), or
   - **`OnboardingGate`** layout component under `_authed` that wraps `<Outlet />` and only handles modal + navigation to `/upgrade` — better if multiple screens should share the same rules later.
2. Decide explicitly: **modal-only** vs **route `/upgrade`**. Document the decision in a one-line ADR in this file’s changelog section when chosen.
3. If you add **`loader`** + `queryClient.ensureQueryData` for Convex-backed overview query, follow `.agents/skills/tanstack-query-best-practices/` for keys and invalidation.

### Phase D (optional) — File-based routing

If you want parity with `apps/web-application/src/routes`, migrate to **`@tanstack/router-plugin`** file routes and generated `routeTree`. Behavior stays the same; only organization changes. Not required for Phase A–C.

---

## `useEffect` and session churn

A **`useEffect` that listens to `desktop.auth.onSessionChanged` and invalidates query caches** is **not** a substitute for routing guards; it is a **subscription** to fix staleness. Keep it at **root** after Phase A.

---

## Pitfalls

- **`beforeLoad` must not import React hooks** — only plain async + `redirect`.
- **Loading state:** Today root blocks UI by swapping `DesktopAuthView`. With `beforeLoad`, TanStack Router shows transition/pending — confirm default pending UI is acceptable or set **`pendingMs` / `pendingComponent`** on the router or `_authed` route.
- **`DesktopShell`** should wrap **both** public and authed trees unless you intentionally remove chrome on `/auth`.

---

## File touch list (checklist)

| Step | Files |
|------|--------|
| Phase A | `src/router.tsx`, new `src/lib/desktopSession.ts` (or `auth/desktopSession.ts`), possibly `src/main.tsx` / router creation if pending UI is configured globally |
| Phase B | `src/app/DashboardContextView.tsx`, session key module |
| Phase C | `DashboardContextView` or new `src/app/AuthedWorkspaceLayout.tsx`, onboarding hooks/components |

---

## References in this repo

- Router implementation: `apps/user-application/src/router.tsx`
- Dashboard onboarding logic today: `apps/user-application/src/app/DashboardContextView.tsx` (`useEffect` ~lines 124–157)
- Web app comparison (file routes): `apps/web-application/src/routes/_authed.tsx` — still hook-heavy; desktop **target** remains **`beforeLoad`** for tier‑1 session.
