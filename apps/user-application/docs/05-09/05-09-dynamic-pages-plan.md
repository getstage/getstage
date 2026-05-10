# Stage Desktop Dynamic Pages Plan

Date: May 9, 2026
Branch: `monorepo`
Scope: Replace remaining dummy data on every desktop page with live Convex data through the existing Electron-main + website `/api/v1` boundary.
Status: Planning document - not yet implemented.

## Hard Rules

These are non-negotiable for this pass:

```txt
1. Renderer never talks to Convex directly.
2. Token stays in Electron main; no token in renderer storage.
3. No new Convex tables.
4. No moving auth/onboarding/billing into desktop.
5. No realtime Convex subscriptions in the desktop renderer yet.
6. No giant aggregated "getDashboardEverything" endpoint.
7. Lightweight only. One narrow endpoint per page.
8. List endpoints return projections; no nested phases/tasks/assets in lists.
9. Detail endpoints only fire on navigation into that project.
10. Honest empty/loading/error states. No silent fallback to mock data when live data is expected.
```

## Architecture Boundary (unchanged)

```txt
Renderer (React)
  -> preload bridge
  -> Electron main IPC
  -> Electron main fetch with stored token
  -> apps/web-application /api/v1 routes
  -> Convex
  -> packages/data-ops Zod validation
  -> sanitized payload back to renderer
```

## Lightweight Fetching Rules

```txt
1. One narrow endpoint per page.
2. List endpoints return projections only:
   id, name, status, type, createdAt
3. Detail endpoints fire only on navigation into a project.
4. No prefetching siblings.
5. Pagination/limit caps:
   projects: limit 50
   tasks: limit 100
6. TanStack Query cache keyed per route.
7. Invalidate only on auth:session-changed and explicit mutations.
8. No polling.
9. No realtime subscriptions in renderer.
10. Empty/loading/error states are required, not optional.
```

## Pages To Wire (in order)

1. Sidebar projects list
   - `GET /api/v1/projects?fields=id,name`
   - Smallest payload possible.
2. Projects page
   - `GET /api/v1/projects?fields=id,name,status,type,createdAt&limit=50`
3. Project detail
   - `GET /api/v1/projects/:id` (full)
   - Lazy `GET /api/v1/projects/:id/phases` and `GET /api/v1/phases/:id/tasks` only when those tabs open.
4. Tasks page (kanban)
   - `GET /api/v1/tasks?assignee=me&limit=100`
   - Renderer groups by priority, no extra calls.
5. Dashboard
   - Composed from already-cached Projects + Tasks queries.
   - No new endpoint unless metrics require one.
6. Settings -> Account
   - Already uses session.
   - Verify name/email/avatar all come from `/api/v1/me`.
7. Client Portal / Integrations
   - Audit, replace hardcoded entries with empty states until backend exists.

## What Gets Added To `packages/data-ops`

Thin list-shape contracts, separate from full `ProjectContext`:

```ts
ProjectListItem  // id, name, status, type, createdAt
TaskListItem     // id, title, priority, status, projectId, createdAt
```

Full `ProjectContext` stays as-is for the project detail path.

## Pre-Implementation Steps

Before writing renderer code:

1. Read `apps/web-application/convex/api/index.ts` and route files. Confirm which `/api/v1` routes exist.
2. Read `apps/web-application/convex/schema.ts`. Confirm project/task field shape.
3. Read desktop pages to identify every dummy-data spot.
4. Extend `packages/data-ops` with `ProjectListItem` and `TaskListItem` Zod contracts.
5. Add narrow `/api/v1` projections only if missing.

## What This Pass Will Not Do

```txt
no new Convex tables
no auth/onboarding/billing changes
no direct Convex client in renderer
no aggregated dashboard endpoint
no realtime subscriptions
no logout / token refresh (separate Step 23 item)
no provider runner / file scanner / Figma / Notion
```

## Move Log

Every move during this pass will be appended below with a one-line entry:

```txt
<timestamp> <area> <change> <verification>
```

- 2026-05-09 plan created `apps/user-application/docs/05-09/05-09-dynamic-pages-plan.md`
- 2026-05-09 audited `apps/web-application/convex/api/index.ts` and route files
- 2026-05-09 audited `apps/web-application/convex/schema.ts`
- 2026-05-09 audited `apps/web-application/convex/domain/projects/apiReadModel.ts`

## Available `/api/v1` endpoints (confirmed)

```txt
GET  /api/v1/me
GET  /api/v1/projects                  // list of project summaries (id, name, clientName, type, status, startDate, endDate, progress, projectImageUrl)
GET  /api/v1/projects/:id              // project detail (+ phaseCount/taskCount/completedTaskCount/accessRole)
GET  /api/v1/projects/:id/phases       // list of phase summaries (id, name, order, status, progress, taskCount, completedTaskCount)
GET  /api/v1/projects/:id/ai/context   // AI brief context (clientWebsite, competitorUrls, brief, notes...)
GET  /api/v1/projects/:id/ai/runs
GET  /api/v1/projects/:id/ai/artifacts
GET  /api/v1/phases/:id/tasks          // list of task summaries (id, phaseId, title, isCompleted, dueDate, assignees, attachmentCount, order)
GET  /api/v1/tasks/:id                 // task detail (+ content, attachments)
POST /api/v1/tasks/:id/toggle
```

The list endpoints are already lightweight enough; no projection-only variants are needed for v1. List shapes are already ProjectContext-friendly.

## Schema findings that change the UI plan

```txt
Tasks table fields:
  phaseId, title, isCompleted, content, dueDate, assigneeIds, order, createdAt, updatedAt

Tasks have NO priority field.
The current Tasks kanban screenshot (High/Medium/Low/Backlog) is dummy.
Per hard rules (no new tables/fields, no silent fallback to mock), the kanban grouping must change to a real schema-backed grouping.
```

Decision required from user before wiring the Tasks page:

```txt
Option A: group by phase status (completed / active / upcoming) - matches phase.status in schema
Option B: group by isCompleted + dueDate buckets (Overdue / Today / This Week / Later / Done)
Option C: group by project (one column per active project, capped)
Option D: drop kanban; show a flat list grouped by project, sorted by dueDate
```

Until the user chooses, the Tasks page will be left in mocked-but-marked state.

## Endpoints that may need to be added

```txt
GET /api/v1/me/tasks?limit=100   // current user's tasks across projects, for the Tasks page
                                  // Only added if the chosen grouping needs cross-project tasks.
                                  // Otherwise the existing /projects/:id/phases + /phases/:id/tasks chain is enough per project.
```

Do not add this endpoint until the kanban grouping decision is made.

## Implementation log (2026-05-09 pass 1)

### Files added

```txt
packages/data-ops/src/contracts/desktop-api.ts
  Zod schemas for the live API list/detail shapes:
    projectSummarySchema      - GET /api/v1/projects items
    projectDetailSchema       - GET /api/v1/projects/:id
    phaseSummarySchema        - GET /api/v1/projects/:id/phases items
    taskSummarySchema         - GET /api/v1/phases/:id/tasks items
    desktopMeSchema           - GET /api/v1/me
  Plus enums: projectStatusSchema, projectTypeSchema, phaseStatusSchema.
  Inferred TS types are exported alongside.

apps/user-application/electron/desktop-api.ts
  Electron-main wrappers around fetchDesktopApiJson + Zod validation:
    listProjects(authController)
    getProject(authController, projectId)
    listProjectPhases(authController, projectId)
    listPhaseTasks(authController, phaseId)
  Each requires a stored desktop session token (throws if missing)
  and validates the API response against the data-ops Zod schemas
  before returning to IPC.

apps/user-application/src/hooks/useDesktopApi.ts
  Renderer-side TanStack Query hooks:
    useProjectsQuery()
    useProjectQuery(projectId)
    useProjectPhasesQuery(projectId)
    usePhaseTasksQuery(phaseId)
    useDesktopApiInvalidation()  -> invalidates ["desktop","api"] on auth:session-changed
  Each calls window.stageDesktop.api.* and re-validates the payload with Zod.

apps/user-application/src/hooks/useLiveProject.ts
  Composite hook for the project detail page:
    fetches ProjectDetail + phases + tasks-for-each-phase
    maps API shapes into the renderer's existing Project model
    (research/moodboard/flows/screens/assets fields are returned empty
    because they are not yet wired to live data; see "Still mock" below)
```

### Files updated

```txt
packages/data-ops/src/index.ts
packages/data-ops/src/contracts/index.ts
  Re-export the new desktop-api contracts.

apps/user-application/shared/ipc/channels.ts
  Adds 4 channel names:
    desktop-api:list-projects
    desktop-api:get-project
    desktop-api:list-project-phases
    desktop-api:list-phase-tasks

apps/user-application/electron/ipc.ts
  Registers handlers for the 4 new channels.
  Validates the projectId/phaseId argument as a non-empty string before calling.

apps/user-application/electron/preload.ts
  Adds window.stageDesktop.api.{listProjects, getProject, listProjectPhases, listPhaseTasks}.

apps/user-application/src/types/stage-desktop.d.ts
  Adds the matching TypeScript surface for window.stageDesktop.api.

apps/user-application/src/app/WorkspaceFrame.tsx
  Sidebar now uses live useProjectsQuery() + buildSidebarProjectsFromSummaries()
  instead of the single-project fallback ProjectContext.
  Also calls useDesktopApiInvalidation() so api queries refresh after login.

apps/user-application/src/dashboard/helpers/projectContextDashboard.ts
  Adds buildSidebarProjectsFromSummaries(summaries) for live sidebar mapping.
  Adds optional activeProjectCount param to buildDashboardMetrics so the
  "Active Projects" KPI uses the live projects list.

apps/user-application/src/app/DashboardContextView.tsx
  Pulls useProjectsQuery and passes activeProjectCount into buildDashboardMetrics.
  Subheading copy now reflects "you have N active projects" when no project
  context is loaded yet (instead of always "Connect Stage to load live data").

apps/user-application/src/project/components/ProjectsOverviewView.tsx
  REMOVED reliance on src/project/data/projectOverviewSnapshot.ts.
  Now reads useProjectsQuery() and renders ProjectSummary rows.
  Status/type are mapped from schema enums to display labels.
  Created column uses startDate (Convex `projects.startDate`).
  Adds loading + error + empty states.

apps/user-application/src/project/components/ProjectDetailView.tsx
  REMOVED reliance on mockProject.
  Reads projectId from the route (useParams) and feeds it through useLiveProject.
  Project header, timeline, KanbanBoard now use live data.
  Loading / error states added.
  NOTE: research/strategy/moodboard/flows/wireframes/assets tabs still render
  empty live data (the model fields exist but aren't yet wired to /api/v1/projects/:id/ai/*).
  See "Still mock" below.

apps/user-application/src/client-portal/components/ClientPortalProjectsView.tsx
  REMOVED reliance on projectOverviewRows.
  Same live ProjectSummary path as the Projects page.
  Loading / error / empty states added.
  Preview Portal button is disabled when no projects are loaded.
```

### Files NOT touched in this pass

```txt
apps/user-application/src/project/data/projectOverviewSnapshot.ts
  Still on disk; no longer imported by anything. Safe to delete in a follow-up.

apps/user-application/src/project/data/projectSnapshot.ts (mockProject)
  Still on disk; no longer imported. Safe to delete in a follow-up.

apps/user-application/src/tasks/components/TasksPageView.tsx
  Tasks kanban page - BLOCKED on grouping decision (priority field does not exist).

apps/user-application/src/project/components/ProjectDetailsView.tsx
  Hardcoded `mockProjectDetails` task detail page. Out of scope for this pass.

apps/user-application/src/settings/...
  AccountPanel already reads the live session via useDesktopBridge().getSession().
  No live-data swap required in this pass.

apps/user-application/src/project/components/tabs/*.tsx
  Research/Strategy/Moodboard/Flows/Wireframes/Assets tabs - still mock.
  Wiring them needs /api/v1/projects/:id/ai/context, /ai/runs, /ai/artifacts
  and is intentionally deferred.
```

### IPC + bridge surface (final shape after this pass)

```ts
window.stageDesktop.api.listProjects():        Promise<ProjectSummary[]>
window.stageDesktop.api.getProject(id):        Promise<ProjectDetail>
window.stageDesktop.api.listProjectPhases(id): Promise<PhaseSummary[]>
window.stageDesktop.api.listPhaseTasks(id):    Promise<TaskSummary[]>
```

### Verification (run on 2026-05-09)

```txt
packages/data-ops          pnpm run typecheck   PASS
apps/user-application      pnpm run typecheck   PASS
apps/user-application      pnpm run build       PASS (electron-vite, 711 renderer modules)
```

After adding desktop-api contracts to packages/data-ops, the `file:` pnpm link
needed `pnpm install` from `apps/user-application` to surface the new
exports - without that, tsc reported "no exported member" errors. Future
agents who add new exports to `packages/data-ops` must run `pnpm install`
in `apps/user-application` (and `apps/web-application` if it consumes the
package) before typechecking.

### What is now live vs still mock

```txt
LIVE (Convex via /api/v1):
  Sidebar projects list                        -> WorkspaceFrame
  Projects page (table)                        -> ProjectsOverviewView
  Project detail page header                   -> ProjectDetailView
  Project detail kanban (phases + tasks)       -> ProjectDetailView + KanbanBoard
  Dashboard "Active Projects" metric           -> DashboardContextView
  Dashboard subheading copy                    -> DashboardContextView
  Client Portal projects table                 -> ClientPortalProjectsView
  Settings -> Account session display          -> already live (pre-existing)

STILL MOCK (deliberately deferred):
  Tasks kanban page                            -> blocked on grouping decision (A/B/C/D)
  Project detail Research / Strategy /         -> needs /api/v1/projects/:id/ai/* wiring
    Moodboard / Flows / Wireframes / Assets
    tabs
  Project detail "task details" page           -> /project/:id/details (mockProjectDetails)
  Dashboard chart / pipeline / revenue cards   -> still derived from
                                                  selectedProjectContext only;
                                                  revenue is intentionally
                                                  "Not synced".
  Recent Activity card (project detail)        -> derived from live tasks
                                                  but the placeholder copy
                                                  is unchanged.
```

### Rules carried forward (do not violate in next pass)

```txt
1. Do NOT add direct Convex client to renderer.
2. Do NOT add token to renderer storage.
3. Do NOT add new Convex tables.
4. Do NOT add aggregated /api/v1/dashboard endpoints.
5. Do NOT add realtime subscriptions to the desktop app.
6. Always Zod-validate at the IPC boundary (electron/desktop-api.ts) AND the
   query boundary (src/hooks/useDesktopApi.ts) so both sides catch drift.
7. New /api/v1 lists must keep the existing summary-shape pattern; do not add
   nested phases/tasks to project lists.
8. After editing packages/data-ops, run `pnpm install` in
   apps/user-application before typechecking.
```

## Implementation log (2026-05-09 pass 2 - folder restructure)

Goal: clean per-resource folder layout from day 1, so files are easy to
navigate without grep. No behaviour change.

### File moves

```txt
packages/data-ops/src/contracts/desktop-api.ts
  -> packages/data-ops/src/contracts/desktop-api/
       project.ts        # projectStatusSchema, projectTypeSchema, projectSummarySchema, projectDetailSchema
       phase.ts          # phaseStatusSchema, phaseSummarySchema
       task.ts           # taskAssigneeSchema, taskSummarySchema
       me.ts             # desktopMeSchema
       index.ts          # barrel

apps/user-application/electron/desktop-api.ts
  -> apps/user-application/electron/desktop-api/
       client.ts         # requireDesktopAccessToken (the in-memory token gate)
       projects.ts       # listProjects, getProject
       phases.ts         # listProjectPhases
       tasks.ts          # listPhaseTasks
       index.ts          # barrel

apps/user-application/src/hooks/useDesktopApi.ts
  -> apps/user-application/src/hooks/desktop-api/
       invalidation.ts          # useDesktopApiInvalidation
       useProjectsQuery.ts
       useProjectQuery.ts
       useProjectPhasesQuery.ts
       usePhaseTasksQuery.ts
       index.ts                 # barrel

apps/user-application/src/hooks/useLiveProject.ts
  -> apps/user-application/src/project/hooks/
       useLiveProject.ts
       index.ts
  Reason: useLiveProject is project-feature-specific. Co-locate with
  src/project/{components,data,models,hooks} so the project feature
  owns its own hook surface.
```

### Renames

```txt
electron/desktop-api/client.ts
  requireToken (private, ambiguous name) -> requireDesktopAccessToken (public, explicit)
  Reason: it does NOT make a network call; it reads the in-memory cached
  session and throws if missing. The new name makes that obvious.
  Imports: only used inside electron/desktop-api/*.
```

### Import updates

```txt
apps/user-application/electron/ipc.ts
  no path change - "./desktop-api" resolves to ./desktop-api/index.ts.

apps/user-application/src/app/WorkspaceFrame.tsx
  "@/hooks/useDesktopApi" -> "@/hooks/desktop-api"

apps/user-application/src/app/DashboardContextView.tsx
  "../hooks/useDesktopApi" -> "../hooks/desktop-api"

apps/user-application/src/project/components/ProjectsOverviewView.tsx
  "@/hooks/useDesktopApi" -> "@/hooks/desktop-api"

apps/user-application/src/project/components/ProjectDetailView.tsx
  "@/hooks/useLiveProject" -> "@/project/hooks"

apps/user-application/src/client-portal/components/ClientPortalProjectsView.tsx
  "@/hooks/useDesktopApi" -> "@/hooks/desktop-api"
```

### Public surface (unchanged)

The `@stage/data-ops` barrel still re-exports every type/schema by name,
so consumers do not need to know about the new sub-folders:

```ts
import {
  projectSummarySchema, type ProjectSummary,
  phaseSummarySchema,   type PhaseSummary,
  taskSummarySchema,    type TaskSummary,
  desktopMeSchema,      type DesktopMe,
} from "@stage/data-ops";
```

The `window.stageDesktop.api` shape is also unchanged.

### Verification (re-run on 2026-05-09 after restructure)

```txt
packages/data-ops          pnpm run typecheck   PASS
apps/user-application      pnpm run typecheck   PASS
apps/user-application      pnpm run build       PASS (721 renderer modules)
```

Required step after editing packages/data-ops contents (still applies):

```bash
cd apps/user-application && pnpm install
```

### Folder layout rule going forward

```txt
packages/data-ops/src/contracts/<resource-family>/<resource>.ts
  one file per resource (project, phase, task, me, ...).
  index.ts barrels the whole family.
  For new resource families (e.g. ai), create a sibling sibling folder
  packages/data-ops/src/contracts/<new-family>/ - do not bloat existing
  per-resource files with unrelated schemas.

apps/user-application/electron/desktop-api/<resource>.ts
  one file per resource. client.ts owns shared concerns
  (requireDesktopAccessToken). Add new resources as siblings, never as
  long methods inside an existing one.

apps/user-application/src/hooks/desktop-api/<useXyzQuery>.ts
  one file per hook. Mutations in the future go in
  src/hooks/desktop-api/useXyzMutation.ts.

apps/user-application/src/<feature>/hooks/<useXyz>.ts
  feature-specific hooks live with their feature, not in /src/hooks/.
  Generic / cross-feature hooks stay in /src/hooks/.
  Rule of thumb: if the hook only ever has one caller (or all callers
  live under src/<feature>/), it belongs in src/<feature>/hooks/.
```

This restructure is a behaviour-free change. No /api/v1 routes, no IPC
channels, no Convex shapes were modified.

## Implementation log (2026-05-09 pass 3 - bugfixes)

### Fix: infinite render loop in ProjectDetailView

Symptom in DevTools / terminal:

```txt
Maximum update depth exceeded. This can happen when a component calls
setState inside useEffect, but useEffect either doesn't have a dependency
array, or one of the dependencies changes on every render.
```

Root cause:

```txt
useLiveProject() built the Project object via mapProject(...) on every
render inside an IIFE. That returned a NEW object reference every render
even when the underlying React Query data was unchanged. ProjectDetailView
mirrored live.project into local state via useEffect([live.project]) so
in-place edits (rename/pause/etc.) keep working. The new reference each
render re-fired the effect -> setState -> re-render -> new reference -> loop.
```

Fix in src/project/hooks/useLiveProject.ts:

```ts
// Before:
const project = (() => {
  if (!projectQuery.data || !phasesAndTasksQuery.data) return null;
  return mapProject({...});  // new object every render
})();

// After:
const project = useMemo<Project | null>(() => {
  if (!projectQuery.data || !phasesAndTasksQuery.data) return null;
  return mapProject({...});
}, [projectQuery.data, phasesAndTasksQuery.data]);
```

Also stabilised the empty-default returns so the reference does not flip
on every render when no data has loaded yet:

```ts
const EMPTY_PHASES: PhaseSummary[] = [];
const EMPTY_TASKS_BY_PHASE: Record<string, TaskSummary[]> = {};
// ...
phases: phasesAndTasksQuery.data?.phases ?? EMPTY_PHASES,
tasksByPhaseId: phasesAndTasksQuery.data?.tasksByPhaseId ?? EMPTY_TASKS_BY_PHASE,
```

Rule for future hooks that mirror live API data into local state:

```txt
Any hook that returns a derived object MUST stabilise the reference
with useMemo (or shallow-equal selector). Otherwise downstream
useEffect([derived]) consumers fire forever. Use module-level
const EMPTY_X for the empty-default branch so the "no data yet"
case is also referentially stable.
```

### Fix: dev DevTools were unreachable

Symptom:

```txt
Cmd+Option+I did not toggle DevTools.
Renderer errors were invisible from the terminal.
```

Cause:

```txt
electron/windows.ts never registered an Electron Menu with the
'toggledevtools' role and never opened DevTools programmatically,
so the keyboard shortcut had no handler.
```

Fix in electron/windows.ts:

```ts
mainWindow.once("ready-to-show", () => {
  mainWindow?.show();
  if (!app.isPackaged) {
    mainWindow?.webContents.openDevTools({ mode: "detach" });
  }
});

if (!app.isPackaged) {
  // forward render-process crashes, did-fail-load and console-message
  // to the terminal so renderer errors are visible without DevTools.
  mainWindow.webContents.on("render-process-gone", ...);
  mainWindow.webContents.on("did-fail-load", ...);
  mainWindow.webContents.on("console-message", ...);
}
```

This is dev-only behaviour. `app.isPackaged` is true in production builds
so DevTools and console forwarding never ship.

### Observed but NOT fixed in this pass: stale token returns 400

Logs:

```txt
[stage-project-context] fetching projects from Stage API
Error occurred in handler for 'project-context:get-selected':
  Error: Stage API request failed with 400.
Error occurred in handler for 'desktop-api:list-projects':
  Error: Stage API request failed with 400.
```

What is happening:

```txt
On app start, the in-memory session is empty so loadStoredSession() reads
the encrypted file in safeStorage. If that file holds an EXPIRED Convex
Auth JWT from a previous session, the desktop happily attaches it as a
Bearer token and the website API rejects it (400/401).
After the user re-runs Log in with Stage, /api/v1/me succeeds, the new
token replaces the old one in safeStorage, and subsequent requests work.
```

Why we did NOT fix it now:

```txt
This is the logout / token-expiry behaviour explicitly listed as
"Step 23 stabilization" in 05-09-monorepo-implementation-tracker.md.
Fixing it requires:
  - detect 401/403 (and maybe 400) in helpers/desktop-api.fetchDesktopApiJson
  - call authController.clearSession() and emit auth:session-changed
  - renderer drops to "not connected" state automatically
That is a deliberate, separate piece of work; rushing it inside the
"make pages dynamic" pass would muddy two changes together.
```

Until that lands, the workaround is:

```txt
rm "$HOME/Library/Application Support/Stage/desktop-auth-session.json"
restart desktop, log in again
```

Or just hit Log in with Stage from Account settings, which currently
overwrites the stale token on success.

### Verification (2026-05-09 pass 3)

```txt
apps/user-application      pnpm run typecheck    PASS
```

### Known follow-ups for the next agent

```txt
1. Decide Tasks kanban grouping (A/B/C/D in the section above) and wire it.
2. Delete dead mock files once nothing imports them:
     apps/user-application/src/project/data/projectOverviewSnapshot.ts
     apps/user-application/src/project/data/projectSnapshot.ts (mockProject)
3. Wire the Research/Strategy/Moodboard tabs against /api/v1/projects/:id/ai/*.
4. Replace ProjectDetailsView (/project/:id/details) mockProjectDetails with
   a real task-detail fetch (probably swap to /tasks/:id route already in router).
5. Add logout / token expiry handling (Step 23 stabilization, separate work).
6. Decide whether to also pre-fetch the selected ProjectContext from the
   sidebar's first project (currently project-context fetch is independent
   of useProjectsQuery and may pick a different "selected" project).
```

