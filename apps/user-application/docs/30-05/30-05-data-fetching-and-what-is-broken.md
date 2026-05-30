# Desktop app: where data lives, what's broken, what's next

**Date:** 30 May 2026  
**App:** `apps/user-application`

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
| Settings name/avatar | inline `api.settings.updateProfile` + R2 in `SettingsPageView` |
| Onboarding | Convex mutations in `useOnboardingController` |

---

## What is broken (root cause: UI never calls write APIs)

Same pattern everywhere: **UI updates local React state or shows mock data. Convex is never called.**

### Project header modals (`ProjectDetailView` + `ProjectHeader`)

| Action | What happens now | What should happen |
|--------|------------------|-------------------|
| Edit project name | `setProject({ ...name })` | `api.projects.update` |
| Edit client | `setClientName` local | `api.projects.update` |
| Project/client photo reupload/remove | Buttons have no handlers | R2 upload + `api.projects.update` |
| Timeline | `setTimeline` local | `api.projects.update` with parsed dates |
| Phases | local list + fake `phase-${Date.now()}` ids | `api.projects.syncPhases` |
| Pause | local status | `api.projects.update({ status: "paused" })` |
| Delete | `navigate("/projects")` only | `api.projects.deleteById` then navigate |

Backend mutations **exist** in `packages/data-ops/convex/projects.ts`. Desktop never calls them from the project page.

### Kanban assign person

- Hardcoded `ASSIGNEES` array in `KanbanBoard.tsx`
- Assign updates local column state only
- Backend: `api.tasks.getProjectMembers`, `api.tasks.setAssignees` — **exist, unused**

### Settings role

- Role picker uses mock `settingsSnapshot`, not `useSettingsOverviewQuery().data.profile.role`
- Save button has **no `onClick`**
- Backend: `users.role` is read in `getOverview`; `updateProfile` does **not** accept `role` yet

### Project tabs (Research → Assets)

- Hardcoded mock content or local `useState`
- `useLiveProject` zeroes out tab fields (`research`, `flows`, `assets`, etc.)
- Web app uses `api.projectAi.*` + R2 `project-asset` — **desktop tabs don't call it**

### File upload on project page

- `AssetsTab` dropzone is a `<button>` with no file input
- No R2, no persistence

---

## Hooks inventory (`src/hooks/`)

**Queries (reuse as-is):**

- `useProjectsQuery`, `useProjectQuery`, `useProjectPhasesQuery`, `usePhaseTasksQuery`
- `useUserTasksQuery`, `useClientsQuery`, `useSettingsOverviewQuery`, `useOnboardingStateQuery`

**Mutations (partial):**

- `useCreateTaskMutation`, `useDeleteTaskMutation`, `useSetTaskPriorityMutation`
- **Missing:** project update/sync/delete, task assignees

**Not in `src/hooks/` but relevant:**

- `project/hooks/useLiveProject.ts` — project page read model
- `lib/r2Uploads.ts` — upload helpers (used in create/settings, not project edit modals)

Do **not** rebuild query hooks. Do **not** move Convex reads to router loaders. Add **thin mutation hooks** where task pattern applies; wire components.

---

## What needs to happen next (order)

### 1. Wire project header writes (highest impact)

**Files:** `ProjectDetailView.tsx`, `ProjectHeader.tsx`, new `hooks/convex-data/useProjectMutations.ts`  
**APIs:** `api.projects.update`, `syncPhases`, `deleteById`, existing R2 helpers  
**Reference:** `apps/web-application/src/features/project-detail/useProjectDialogs.ts`

### 2. Settings role

**Files:** `packages/data-ops/convex/settings.ts`, `SettingsPageView.tsx`  
Add `role` to `updateProfile`. Wire Save. Init from `overview.data.profile.role`.

### 3. Task assign

**Files:** `KanbanBoard.tsx`, extend `useTaskMutations.ts` with `useSetTaskAssigneesMutation`  
**APIs:** `api.tasks.getProjectMembers`, `api.tasks.setAssignees`

### 4. Assets upload

**Files:** `AssetsTab.tsx`, maybe `r2Uploads.ts`  
Port upload/list pattern from web `AssetsTab`.

### 5. All project tabs

**Files:** `project/components/tabs/*.tsx`  
Port persistence from `apps/web-application/src/components/project/*` using `api.projectAi.*`. Largest chunk.

### 6. Verify

Each action must survive page refresh. Run `pnpm exec tsc --noEmit` in `apps/user-application`.

---

## Decisions we are **not** making

- **Not** moving Convex `useQuery` into route `loader`/`beforeLoad` — wrong tool for reactive Convex.
- **Not** duplicating query hooks — they work.
- **Not** adding TanStack Query for Convex unless we have a concrete prefetch UX problem worth the complexity.

---

## Related docs

- [05-11-tanstack-router-auth-en-data.md](../05-11/05-11-tanstack-router-auth-en-data.md) — router vs mutations split, session tiers
- Plan: `.cursor/plans/fix_project_actions_58e4340a.plan.md` — file-level implementation checklist
