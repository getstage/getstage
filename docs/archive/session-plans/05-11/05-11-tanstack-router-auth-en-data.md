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

1. **`RootRoute`** renders `DesktopShell` + `<Outlet />` only. Session churn is handled by **`onSessionChanged` → invalidate** `desktopSessionQueryKey` from `src/lib/desktopSession.ts`.
2. **Pathless `_authed` layout** (`id: '_authed'`) wraps every authenticated route. Its **`beforeLoad`** calls `getDesktopSession()` and **`throw redirect({ to: '/auth' })`** when there is no `hasAccessToken`.
3. **`/auth`** uses **`beforeLoad`** to **`redirect({ to: '/' })`** when already signed in (no duplicate root-level auth swap).
4. **Tier 2 (non‑Pro onboarding/paywall):** **`AuthedWorkspaceLayout`** (`src/app/AuthedWorkspaceLayout.tsx`) wraps `<Outlet />` + **`OnboardingModal`**. Logic lives in **`useNonProOnboardingGate`** (`src/features/onboarding/useNonProOnboardingGate.ts`): Convex **`useProjectsQuery`** / **`useSettingsOverviewQuery`** for plan + project count, React Query + **`desktopSessionQueryKey`** for display name — aligned with **Convex auth in functions** + **TanStack Query key discipline** (see agent skills).
5. **`DashboardContextView`** is dashboard UI only (no onboarding `useEffect`).

**Typed routes:** Layout nesting exposes internal IDs like `/_authed/project/$projectId` for `useParams` / `useSearch` `from` — URLs in the browser remain `/project/...`.

**Desktop session source:** `getDesktopSession()` in `src/lib/desktopSession.ts` wraps `window.stageDesktop.auth.getSession()` for use in `beforeLoad`.

---

## Target architecture

### Route tree (conceptual)

Keep **`createRoute` / programmatic** setup (no mandate to migrate to file-based routing unless you want codegen).

```
root (DesktopShell only — thin shell + global subscriptions)
├── /auth                    → DesktopAuthView (public)
└── _authed (pathless layout)
    ├── beforeLoad           → session (+ optional “logged-in user must not see /auth” inversion on auth route only)
    ├── component            → AuthedWorkspaceLayout (`<Outlet />` + global onboarding modal)
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

### Phase A — Session guard only ✅ (implemented)

1. **`src/lib/desktopSession.ts`** — `desktopSessionQueryKey`, `getDesktopSession()`.
2. **`authedLayoutRoute`** (`id: '_authed'`) — `beforeLoad` → redirect to `/auth` if no `hasAccessToken`.
3. **All app routes** reparented under `_authed`; **`/auth`** stays on root.
4. **`RootRoute`** — `DesktopShell` + `<Outlet />`; **only** `onSessionChanged` invalidation (no session `useQuery` in root).
5. **`/auth`** — `beforeLoad` redirects to `/` when already authenticated.

**Acceptance:** Met — `_authed` children never mount without passing session `beforeLoad`; dashboard uses shared `desktopSessionQueryKey`.

### Phase B — Query key hygiene ✅ (partial)

1. **`desktopSessionQueryKey`** in **`src/lib/desktopSession.ts`** — **`WorkspaceFrame`**, **`useNonProOnboardingGate`** ( **`DashboardContextView`** no longer duplicates session for onboarding).
2. Optionally audit **`SettingsPageView`** and other files for inline session keys if any remain.

### Phase C — Onboarding / paywall (tier 2) ✅ (implemented — modal path)

1. **`useNonProOnboardingGate`** — single hook for Convex-derived plan/projects + React Query session; **`useEffect`** only here (tier‑2 is not a router redirect — Convex **`ctx.auth`** still backs mutations/queries per **`convex-setup-auth`**).
2. **`AuthedWorkspaceLayout`** — `_authed` route component: **`<Outlet />`** + **`OnboardingModal`** so paywall/welcome applies on **any** authed screen, not only `/`.
3. **Decision:** **Modal-first** for non‑Pro; optional future **`/upgrade`** route + navigate from modal remains compatible without removing the hook.

Optional later: **`loader`** + **`ensureQueryData`** for overview prefetch per **`tanstack-query-best-practices`** when you want less “flash before Convex resolves”.

### Phase D (optional) — File-based routing

If you want parity with `apps/web-application/src/routes`, migrate to **`@tanstack/router-plugin`** file routes and generated `routeTree`. Behavior stays the same; only organization changes. Not required for Phase A–C.

---

## `useEffect` and session churn

A **`useEffect` that listens to `desktop.auth.onSessionChanged` and invalidates query caches** is **not** a substitute for routing guards; it is a **subscription** to fix staleness. Keep it at **root** after Phase A.

**Tier 2:** A **`useEffect`** that opens onboarding when Convex says “not Pro” belongs in **one hook** (`useNonProOnboardingGate`), not in every screen — still not a router `beforeLoad` (Convex React hooks do not run there without extra plumbing).

---

## Pitfalls

- **`beforeLoad` must not import React hooks** — only plain async + `redirect`.
- **Loading state:** Session checks run in **`beforeLoad`** (async). Confirm default **pending** UX or set **`pendingComponent`** on **`createRouter`** / `_authed` if needed.
- **`DesktopShell`** should wrap **both** public and authed trees unless you intentionally remove chrome on `/auth`.

---

## File touch list (checklist)

| Step | Files |
|------|--------|
| Phase A | ✅ `src/router.tsx`, `src/lib/desktopSession.ts` |
| Phase B | ✅ `WorkspaceFrame.tsx`, `useNonProOnboardingGate.ts`; grep for stray session key literals |
| Phase C | ✅ `src/app/AuthedWorkspaceLayout.tsx`, `src/features/onboarding/useNonProOnboardingGate.ts`; slim `DashboardContextView.tsx` |

---

## References in this repo

- Router implementation: `apps/user-application/src/router.tsx`
- Authed layout + modal shell: `apps/user-application/src/app/AuthedWorkspaceLayout.tsx`
- Non‑Pro gate hook: `apps/user-application/src/features/onboarding/useNonProOnboardingGate.ts`
- Web app comparison (file routes): `apps/web-application/src/routes/_authed.tsx` — still hook-heavy; desktop **target** remains **`beforeLoad`** for tier‑1 session.
