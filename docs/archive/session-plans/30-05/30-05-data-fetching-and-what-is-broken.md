# Desktop app: where data lives, what's broken, what's next

**Date:** 30 May 2026 (updated)  
**App:** `apps/user-application`

---

## Fix progress (Notion list)

| # | Item | Status | Commit / notes |
|---|------|--------|----------------|
| 1 | Edit project + client + photos | **Done** (await partner test) | `15ef653` — `useProjectMutations`, `useProjectHeaderActions` |
| 2 | Assign person to task | **Done** (await partner test) | `ec31392` — `useSetTaskAssigneesMutation`, real members |
| 3 | Settings role save | **Done** (await partner test) | `71f49b7` — `updateProfile` accepts `role` |
| 4 | Timeline save | **Done** (part of #1) | Same as project header |
| 5 | Upload file on project details | **Done** (await partner test) | `AssetsTab` → R2 `project-asset` upload |
| 6 | All project tab actions | Not started | Needs `api.projectAi.*` port from web |
| 7 | Task checkbox bug | Not started | Separate from assign |

**Audit note:** This table tracks the Notion bug-fix list. The [file audit table](../05-29/05-29-frontend-architecture-cleanup-plan.md#caption-file-audit-table) in `05-29-frontend-architecture-cleanup-plan.md` tracks architecture refactor / line-count phases — it was **not** updated for this fix work.

---

## Short answer

| Concern | Where it belongs today | Why |
|--------|-------------------------|-----|
| **Am I logged in?** | Router `beforeLoad` on `_authed` | Plain async, no React. Redirect to `/auth` if no token. |
| **Read project/tasks/settings** | Convex `useQuery` in hooks/components | Real-time subscriptions. Not a one-shot fetch. |
| **Save / delete / upload** | `useMutation` in hooks or view | Side effects + UI errors. Never in `beforeLoad`. |

We **do not** load Convex data in route `beforeLoad` or `loader` today. That is intentional for this stack, not an accident.

---

## Why query hooks instead of `beforeLoad`?

### `beforeLoad` is for gates, not Convex reads

`beforeLoad` runs **outside React**. You cannot call:

- `useQuery` from `convex/react`
- `useMutation`
- any React hook

Today it only does session checks:

```ts
// src/routes/_authed.tsx
beforeLoad: async () => {
  const session = await getDesktopSession();
  if (!session?.hasAccessToken) throw redirect({ to: "/auth" });
}
```

That is the correct use: **binary access decision before the tree mounts**.

### Convex queries are subscriptions, not route fetches

`hooks/convex-data/useProjectsQuery.ts` wraps:

```ts
const projects = useQuery(api.desktop.listProjects, isAuthenticated ? {} : "skip");
```

When data changes on the server, the UI updates automatically. No cache invalidation, no refetch on navigation.

A TanStack Router `loader` + `ensureQueryData` pattern (common with REST + TanStack Query) assumes:

1. Fetch once on navigation
2. Store in a client cache
3. Invalidate after mutations

Convex already does (1) and (3) via its client. Moving reads into `beforeLoad` would require a **second data layer** (HTTP/action bridge or TanStack Query wrapping Convex) for no gain on a desktop app that stays mounted.

### What route files actually do

Route files are thin. Example:

```ts
// src/routes/_authed/project.$projectId.tsx
export const Route = createFileRoute("/_authed/project/$projectId")({
  component: ProjectRoute, // renders ProjectDetailView
});
```

No `loader`. No data. The view calls `useLiveProject(projectId)`.

### When router loaders *would* make sense

Only if we explicitly add:

- TanStack Query as a Convex prefetch/cache wrapper, **or**
- a non-React Convex client callable from `beforeLoad` (actions/HTTP)

Neither exists in the desktop app today. Documented as optional in `docs/05-11/05-11-tanstack-router-auth-en-data.md` — not the current path.

---

## Architecture (as implemented)

```
Router beforeLoad          → session token only
        ↓
AuthedWorkspaceLayout      → onboarding/paywall gate (Convex queries in hook)
        ↓
Route component            → shell / outlet
        ↓
Feature view               → useQuery hooks (read), useMutation (write)
        ↓
Convex backend             → auth in every public function
```

**Reads:** `src/hooks/convex-data/*` + `src/project/hooks/useLiveProject.ts`  
**Writes:** `src/hooks/convex-data/useTaskMutations.ts` (tasks only) + inline `useMutation` in settings/onboarding/create

---

## What works today

| Area | Status |
|------|--------|
| Auth redirect | `_authed.beforeLoad`, `/auth` inverse redirect |
| List projects | `useProjectsQuery` → `api.desktop.listProjects` |
| Project detail **read** | `useLiveProject` → `api.desktop.getProjectData` |
| Create project | `useCreateProjectFlow` → `api.desktop.createProject` + R2 |
| Create/delete/priority tasks | `useTaskMutations` |
| Settings name/avatar/role | `ProfilePanel` → `api.settings.updateProfile` + R2 |
| Project header saves | `useProjectHeaderActions` → `api.projects.*` + R2 |
| Kanban assign | `useSetTaskAssigneesMutation` + `useProjectMembersQuery` |
| Assets upload (session) | `AssetsTab` → R2 `project-asset` (files in R2; list is in-memory like web) |
| Onboarding | Convex mutations in `useOnboardingController` |

---

## What is still broken

Same pattern on remaining items: **UI uses mock/local state instead of Convex write APIs.**

### Project header modals — **fixed** (partner test pending)

Wired via `useProjectHeaderActions` + `useProjectMutations`.

### Kanban assign — **fixed** (partner test pending)

Real project members + `api.tasks.setAssignees`.

### Settings role — **fixed** (partner test pending)

`ProfilePanel` loads/saves `role` via `updateProfile`.

### File upload on project page — **fixed** (partner test pending)

`AssetsTab` dropzone uploads to R2 (`project-asset`). Uploaded tab shows files for the current session. **Not persisted to a DB table yet** — same limitation as web `AssetsTab`.

### Project tabs (Research → Wireframes) — **not started**

- Hardcoded mock content or local `useState`
- `useLiveProject` zeroes out tab fields (`research`, `flows`, `assets`, etc.)
- Web app uses `api.projectAi.*` + R2 `project-asset` — **desktop tabs don't call projectAi yet**

### Task checkbox bug (#7)

- Checkbox state disappears after moving another task — **not investigated**

## Hooks inventory (`src/hooks/`)

**Queries (reuse as-is):**

- `useProjectsQuery`, `useProjectQuery`, `useProjectPhasesQuery`, `usePhaseTasksQuery`
- `useUserTasksQuery`, `useClientsQuery`, `useSettingsOverviewQuery`, `useOnboardingStateQuery`

**Mutations:**

- `useProjectMutations` — update, syncPhases, delete
- `useTaskMutations` — create, delete, priority, setAssignees
- `useProjectMembersQuery` — kanban assign picker

**Not in `src/hooks/` but relevant:**

- `project/hooks/useLiveProject.ts` — project page read model
- `project/hooks/useProjectHeaderActions.ts` — header modal saves + R2
- `lib/r2Uploads.ts` — upload helpers (create, settings, project header, assets tab)

Do **not** rebuild query hooks. Do **not** move Convex reads to router loaders. Add **thin mutation hooks** where task pattern applies; wire components.

---

## What needs to happen next (order)

### 1. All project tabs

**Files:** `project/components/tabs/*.tsx`  
Port persistence from `apps/web-application/src/components/project/*` using `api.projectAi.*`. Largest chunk.

### 2. Task checkbox bug

Investigate kanban drag vs checkbox state.

### 3. Verify + partner test

Refresh persistence for header/settings/assign. Assets survive in R2 but uploaded list resets on refresh (web parity). Run `pnpm exec tsc --noEmit` in `apps/user-application`.

---

## Decisions we are **not** making

- **Not** moving Convex `useQuery` into route `loader`/`beforeLoad` — wrong tool for reactive Convex.
- **Not** duplicating query hooks — they work.
- **Not** adding TanStack Query for Convex unless we have a concrete prefetch UX problem worth the complexity.

---

## Related docs

- [05-11-tanstack-router-auth-en-data.md](../05-11/05-11-tanstack-router-auth-en-data.md) — router vs mutations split, session tiers
- Plan: `.cursor/plans/fix_project_actions_58e4340a.plan.md` — file-level implementation checklist
