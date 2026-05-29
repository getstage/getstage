# Frontend Architecture Cleanup Plan

Date: May 29, 2026  
Status: Cleanup plan  
Scope: `apps/user-application/src`

## Caption: Why this exists

The current frontend works, but the architecture is drifting.

The main problem is not one bad component. The problem is unclear ownership:
routes, auth, queries, feature UI, fake data, helpers, and types are too often
mixed inside the same files.

The target is simple:

```txt
A new developer should be able to open the repo, read the route tree, open a
feature folder, and understand where data, UI, types, helpers, and mutations
live without reverse-engineering a 900-line component.
```

## Caption: Skills used as the standard

Use these local skills as the quality bar:

```txt
.agents/skills/tanstack-router-best-practices/SKILL.md
.agents/skills/tanstack-query-best-practices/SKILL.md
.agents/skills/electron/SKILL.md
.agents/skills/stage-monorepo-architect/SKILL.md
```

Router principle:

```txt
TanStack Router handles navigation, route guards, redirects, route-level
loading, and layout selection.
```

Query principle:

```txt
TanStack Query handles desktop/server state, cache keys, refresh, mutations, and
invalidation.
```

Component principle:

```txt
Components render UI and manage local UI state only.
```

## Caption: Current problems found

### 1. Settings is a monolith

Current file:

```txt
apps/user-application/src/settings/components/SettingsPageView.tsx
```

Problem:

```txt
The file contains route/tab selection, settings layout, profile form, billing,
clients, developer panel, account/session UI, delete account dialog, and until
the latest cleanup also provider integration mapping.
```

This makes it hard to review, test, or safely change.

### 2. Auth/session logic leaks into screens

Examples:

```txt
Settings Account panel calls desktop.auth.getSession.
Auth view calls desktop.auth.getSession and subscribes to session changes.
Workspace frame calls desktop.auth.getSession.
Onboarding gate calls desktop.auth.getSession.
Root route subscribes to session changes.
```

Some of this is valid, but it must be centralized:

```txt
Route guard:
_authed.beforeLoad owns "can this route mount?"

Session query:
useDesktopSession owns "what session should this component display?"

Session subscription:
one app-level listener invalidates session query cache.
```

A settings component should not perform its own auth request just to figure out
whether the user can be on the page. The route already answered that.

### 3. Fake snapshot data is mixed with live app flows

Current snapshot/mock files or usages include:

```txt
settings/data/settingsSnapshot.ts
project/data/projectSnapshot.ts
project/data/projectOverviewSnapshot.ts
project-context/data/selectedProjectContext.ts
project/components/ProjectDetailsView.tsx
project/components/tabs/StrategyTab.tsx
client-portal/components/ClientPortalPreviewView.tsx
```

Problem:

```txt
Some snapshots are useful as fixtures, but they are currently used like runtime
product data. This makes it unclear whether a screen is live, placeholder, or
fallback.
```

Rule:

```txt
Runtime screens use live hooks first.
Fixtures live under data/fixtures or dev-only names.
Fallback data must be explicitly named fallback/dev/fixture.
```

### 4. Large UI files hide domain boundaries

Largest files found:

```txt
project/components/CreateProjectView.tsx              1521 lines
components/onboarding/OnboardingStepRenderer.tsx      1257 lines
project/components/tabs/FlowsTab.tsx                   922 lines
project/components/tabs/ResearchTab.tsx                828 lines
tasks/components/TasksPageView.tsx                     805 lines
project/components/tabs/StrategyTab.tsx                772 lines
project/components/tabs/WireframesTab.tsx              771 lines
dashboard/components/StageSidebar.tsx                  754 lines
settings/components/SettingsPageView.tsx               722 lines after partial cleanup
project/components/ProjectHeader.tsx                   647 lines
project/components/tabs/MoodboardTab.tsx               615 lines
project/components/KanbanBoard.tsx                     576 lines
```

Rule:

```txt
Over 350 lines means "inspect for extraction".
Over 600 lines means "must be split before adding features".
Over 900 lines means "architecture debt, no new feature work in that file".
```

### 5. Route files are mostly thin, but layout rules are implicit

Current route files are mostly small. This is good.

But app chrome decisions are currently spread through layout components using
pathname checks.

Examples:

```txt
AuthedWorkspaceLayout decides whether to render WorkspaceFrame based on pathname.
WorkspaceFrame owns sidebar and account display.
Root route owns session-change subscription.
```

This can work, but the rules need to be documented and centralized.

## Caption: Target folder convention

Every feature folder should use this structure when it grows beyond one or two
small files:

```txt
src/<feature>/
  components/     React components only
  pages/          route-level page composition when useful
  hooks/          feature-specific React hooks
  queries/        TanStack Query options, keys, and query helpers
  mutations/      mutation hooks or mutation helpers when complex
  helpers/        pure functions; no React
  types/          TypeScript view/domain types
  models/         Zod schemas and domain models
  data/           static data only
  data/fixtures/  mock/demo/dev fixtures only
```

Use existing repo convention:

```txt
helpers/
```

Not:

```txt
help/
```

Reason: `dashboard/helpers` and `tasks/helpers` already exist.

## Caption: Route architecture

Route files should stay thin.

Allowed in route files:

```txt
createFileRoute
beforeLoad
redirect
validateSearch
loader or query prefetch if needed
render one page/layout component
```

Not allowed in route files:

```txt
feature UI trees
business mapping
form logic
provider-specific logic
raw Electron calls except tiny non-React helpers used by beforeLoad
```

Current good pattern:

```txt
apps/user-application/src/routes/_authed.tsx
```

This should remain the tier-1 auth gate.

Target concept:

```tsx
export const Route = createFileRoute("/_authed")({
  beforeLoad: async ({ location }) => {
    const session = await getDesktopSession();
    if (!session?.hasAccessToken) {
      throw redirect({ to: "/auth", search: buildRedirectSearch(location) });
    }
  },
  component: AuthedWorkspaceLayout,
});
```

## Caption: Auth/session architecture

There are three separate concepts.

### 1. Route access

Owned by:

```txt
routes/_authed.tsx
routes/auth.tsx
```

Rule:

```txt
If the user is not authenticated, protected routes do not mount.
```

### 2. Session display

Owned by:

```txt
hooks/engine/useDesktopSession.ts
lib/desktopSession.ts
```

Used by:

```txt
WorkspaceFrame
AccountPanel
AuthView
Onboarding gate, if it needs user name
```

Rule:

```txt
Components that only display session info use useDesktopSession.
They do not call desktop.auth.getSession manually.
```

### 3. Session-change subscription

Owned by one app-level hook:

```txt
app/hooks/useDesktopSessionInvalidation.ts
```

Rule:

```txt
It listens to desktop.auth.onSessionChanged and invalidates:
desktopSessionQueryKey
other session-scoped desktop query keys
```

This is a valid `useEffect`, because it is a subscription, not data fetching.

## Caption: TanStack Query architecture

Use query key factories and query option helpers for desktop/engine state.

Target files:

```txt
hooks/engine/queryKeys.ts
hooks/engine/useDesktopSession.ts
hooks/engine/useProviderStatus.ts
hooks/engine/providerQueries.ts
```

Rules:

```txt
Query keys are arrays.
Query keys live in one place per domain.
Mutation success invalidates exact related keys.
Components do not invent inline query keys.
Components do not use useEffect for fetch/get/load.
```

Example:

```ts
export const engineQueryKeys = {
  all: ["desktop", "engine"] as const,
  providers: () => [...engineQueryKeys.all, "providers"] as const,
  session: () => ["desktop", "session"] as const,
};
```

## Caption: UseEffect rule

Allowed `useEffect`:

```txt
DOM event listener
Electron event subscription
timer/animation lifecycle
syncing local form draft after server value changes
focus/scroll/resize logic
```

Not allowed `useEffect`:

```txt
fetching session
fetching provider status
fetching engine status
duplicating route auth checks
deriving state that can be computed from query results
opening paywall/onboarding in multiple screens
```

## Caption: Feature cleanup plan

### Phase 1: Settings and Integrations

Files to create/keep:

```txt
settings/components/SettingsPageView.tsx
settings/components/SettingsShell.tsx
settings/components/ProfilePanel.tsx
settings/components/BillingPanel.tsx
settings/components/ClientsPanel.tsx
settings/components/DeveloperPanel.tsx
settings/components/AccountPanel.tsx
settings/components/DeleteAccountDialog.tsx
settings/components/IntegrationsPage.tsx
settings/helpers/providerIntegrationRows.ts
settings/types/integrations.ts
settings/models/settings.ts
settings/data/settingsSnapshot.ts
```

Rules:

```txt
SettingsPageView composes panels only.
AccountPanel uses useDesktopSession, not raw desktop.auth.getSession.
IntegrationsPage uses useProviderStatus and useProviderUpdate.
Provider mapping lives in helpers.
Provider row types live in types.
No local fake connected/available provider state.
```

Acceptance:

```txt
SettingsPageView under 250 lines.
No provider types/helper functions in SettingsPageView.
No auth getSession useEffect inside settings components.
```

### Phase 2: App shell and routing

Files:

```txt
routes/_authed.tsx
routes/auth.tsx
routes/__root.tsx
app/AuthedWorkspaceLayout.tsx
app/WorkspaceFrame.tsx
app/hooks/useDesktopSessionInvalidation.ts
app/layout/chromeRules.ts
```

Rules:

```txt
_authed.beforeLoad is the protected-route gate.
auth.beforeLoad redirects authenticated users away from auth page.
Root route owns only shell and global subscriptions.
Fullscreen/chrome route rules move to a small helper.
WorkspaceFrame displays session via useDesktopSession.
```

Acceptance:

```txt
No screen-level auth redirects.
No duplicated desktop.auth.getSession calls outside shared helpers/hooks.
```

### Phase 3: Dashboard

Files to inspect:

```txt
dashboard/components/StageSidebar.tsx
dashboard/components/ActivityTimelineChart.tsx
dashboard/components/DashboardHeader.tsx
app/DashboardContextView.tsx
dashboard/helpers/projectContextDashboard.ts
dashboard/models/dashboard.ts
```

Refactor target:

```txt
dashboard/components/sidebar/
dashboard/components/cards/
dashboard/components/charts/
dashboard/helpers/
dashboard/types/
```

Rules:

```txt
Sidebar is split into navigation, project list, account menu, and collapse logic.
DashboardContextView composes data-derived sections only.
Chart components keep rendering logic, not project business mapping.
```

Acceptance:

```txt
StageSidebar under 300 lines.
Dashboard data transforms stay in helpers.
```

### Phase 4: Project area

Large files:

```txt
project/components/CreateProjectView.tsx
project/components/ProjectHeader.tsx
project/components/KanbanBoard.tsx
project/components/tabs/ResearchTab.tsx
project/components/tabs/StrategyTab.tsx
project/components/tabs/FlowsTab.tsx
project/components/tabs/WireframesTab.tsx
project/components/tabs/MoodboardTab.tsx
```

Target:

```txt
project/components/create/
project/components/header/
project/components/kanban/
project/components/tabs/<tab-name>/
project/hooks/
project/helpers/
project/types/
project/data/fixtures/
```

Rules:

```txt
Tabs compose sections.
Section data transforms move to helpers.
Editing form state moves to hooks.
Mock/snapshot data moves to fixtures or is replaced by live hooks.
```

Acceptance:

```txt
No tab file over 350 lines.
No "Regenerated mock update" in production-visible flow.
```

### Phase 5: Tasks

Large files:

```txt
tasks/components/TasksPageView.tsx
tasks/components/TaskDetailsView.tsx
tasks/components/CreateTaskDialog.tsx
```

Target:

```txt
tasks/components/board/
tasks/components/details/
tasks/components/dialogs/
tasks/hooks/
tasks/helpers/
tasks/types/
```

Rules:

```txt
Board drag/drop state isolated.
Task mutation hooks stay in hooks/convex-data or tasks/mutations.
Details view does not own board state.
```

### Phase 6: Companion and provider picker

Files:

```txt
companion/CritiquePanel.tsx
companion/VoiceControlBar.tsx
companion/hooks/
companion/models/
```

Rules:

```txt
Provider picker must read provider snapshots.
No hardcoded newest Claude/Codex model names in React.
Voice capture is separate from provider execution.
Provider execution is not implemented directly in UI components.
```

Acceptance:

```txt
CritiquePanel under 300 lines.
Provider/model mapping lives in helpers/hooks.
Voice state lives in companion hooks.
```

### Phase 7: Onboarding

Large files:

```txt
components/onboarding/OnboardingStepRenderer.tsx
features/onboarding/useOnboardingController.ts
components/onboarding/OnboardingAnimations.tsx
```

Rules:

```txt
Step components split by step.
Controller owns flow state only.
Animation components split by animation family.
Derived onboarding visibility should be computed from query results where
possible; useEffect only for one-time user interaction or side effects.
```

## Caption: Data and fixtures rule

Use this naming:

```txt
fixtureProject
fallbackProjectContext
devSettingsSnapshot
```

Do not use:

```txt
mockProject
settingsSnapshot
selectedProjectContext
```

unless the file is clearly under:

```txt
data/fixtures/
```

## Caption: Review checklist for every frontend PR

Before merging:

```txt
Does a route file stay thin?
Does auth live in beforeLoad or a shared auth hook?
Does server/desktop state use TanStack Query?
Are query keys centralized?
Are provider/model values contract-driven?
Are large components split?
Are pure functions outside UI components?
Are view-specific types in types/?
Are Zod/domain schemas in models/?
Is fake data clearly marked as fixtures?
Does pnpm typecheck pass?
Does pnpm build pass?
```

## Caption: useQuery vs local form state

Do not confuse server state with wizard form state.

```txt
useQuery / useMutation (TanStack Query or Convex):
  session, clients list, projects, provider status, settings overview

useReducer or one draft hook (useProjectDraft):
  multi-step create-project wizard before submit

useState (small, local only):
  dropdown open, step index if not in URL, file input refs

useEffect (allowed only):
  DOM/event subscriptions, object URL cleanup, focus traps
```

Create project must NOT use 20 separate useState calls. Reuse:

```txt
hooks/convex-data/useClientsQuery.ts
features/project-creation/useProjectDraft.ts
features/project-creation/createProjectFromDraft.ts
useMutation(api.desktop.createProject)
```

Do not add useCreateProjectWizard-style hooks that duplicate draft state.

## Caption: Electron push streams (session + engine)

For desktop push events, never store stream data in component `useState`.

```txt
useEffect subscription (one per stream, app-level):
  onSessionChanged  → queryClient.invalidateQueries(desktopSessionQueryKey)
  onRunEvent        → queryClient.setQueryData(engineQueryKeys.runEvents(runId), append)

Read with useQuery:
  useDesktopSession()
  useProviderRunEvents(runId)
```

Hooks like `useProviderRun` expose `useMutation` for start/cancel only — not local event arrays.

## Caption: Immediate next work

Progress (May 29, 2026):

```txt
Done:
  Phase 1 — Settings split
  Phase 2 — Session centralization
  Phase 3 — StageSidebar, ActivityTimelineChart helpers, engine hooks
  Phase 4 — CreateProjectView, ProjectHeader, KanbanBoard, all project tabs
            (Flows/Research/Strategy/Wireframes/Moodboard — multi-file subfolders)
  Phase 5 — TasksPageView split
  Phase 7 (partial) — OnboardingStepRenderer → steps/ + preview panels

Next (optional polish):
  Phase 6 — Companion CritiquePanel provider picker
  client-portal/ClientPortalPreviewView fixture review
  features/onboarding/useOnboardingController thinning
```

Do this next, in order:

```txt
D. Run typecheck + build after each phase (passing)
E. Phase 6 CritiquePanel — only if shipping companion work this sprint
```

Do not start provider model picker or lib/auth/access.ts until companion baseline is needed.

Deferred explicitly:

```txt
lib/auth/access.ts          — paid access gate (after access source of truth is settled)
useCreateProjectWizard      — rejected; use useProjectDraft instead
```

## Caption: File audit table

Last updated: May 29, 2026

Thresholds:

```txt
>350 lines  → inspect for extraction
>600 lines  → must split before new features
>900 lines  → no new feature work in that file
```

| Path | Lines | Phase | Action | Status |
|------|------:|-------|--------|--------|
| `project/components/CreateProjectView.tsx` | ~150 | 4 | Thin shell + useCreateProjectFlow | done |
| `project/hooks/useCreateProjectFlow.ts` | ~220 | 4 | Step flow + useProjectDraft + create | done |
| `components/onboarding/OnboardingStepRenderer.tsx` | 359 | 7 | Orchestrator; steps in `steps/`, previews in `OnboardingPreviewPanels` | done |
| `components/onboarding/steps/OnboardingMethodStep.tsx` | 203 | 7 | Method + manual phase toggles | done |
| `components/onboarding/steps/OnboardingPhaseSelectStep.tsx` | 116 | 7 | Phase drag/rename/remove | done |
| `components/onboarding/OnboardingPreviewPanels.tsx` | 65 | 7 | Preview + Pro success panels | done |
| `components/onboarding/constants.ts` | 17 | 7 | Shared onboarding constants | done |
| `project/components/tabs/FlowsTab.tsx` | 1 | 4 | Re-export → `tabs/flows/FlowsTab.tsx` | done |
| `project/components/tabs/flows/FlowsTab.tsx` | 260 | 4 | Shell + step subcomponents in `tabs/flows/` | done |
| `project/components/tabs/ResearchTab.tsx` | 1 | 4 | Re-export → `tabs/research/` | done |
| `project/components/tabs/research/ResearchTab.tsx` | 71 | 4 | Shell; sections in `tabs/research/*` | done |
| `project/components/tabs/research/CompetitiveAnalysis.tsx` | 190 | 4 | Largest research section file | done |
| `project/types/researchTab.ts` | 18 | 4 | Tab-specific types | done |
| `project/components/tabs/StrategyTab.tsx` | 1 | 4 | Re-export → `tabs/strategy/` | done |
| `project/components/tabs/strategy/StrategyTab.tsx` | 189 | 4 | Shell; sections in `tabs/strategy/*` | done |
| `project/components/tabs/strategy/EditableStrategySection.tsx` | 211 | 4 | Largest strategy section file | done |
| `project/components/tabs/WireframesTab.tsx` | 1 | 4 | Re-export → `tabs/wireframes/` | done |
| `project/components/tabs/wireframes/WireframesTab.tsx` | 113 | 4 | Shell; steps in `tabs/wireframes/*` | done |
| `project/components/tabs/wireframes/ConfigureStep.tsx` | 119 | 4 | Largest wireframes step file | done |
| `project/components/tabs/MoodboardTab.tsx` | 1 | 4 | Re-export → `tabs/moodboard/` | done |
| `project/components/tabs/moodboard/MoodboardTab.tsx` | 194 | 4 | Shell; panels in `tabs/moodboard/*` | done |
| `tasks/components/TasksPageView.tsx` | ~85 | 5 | Shell + useTasksBoard | done |
| `tasks/hooks/useTasksBoard.ts` | ~220 | 5 | Board state + drag/mutations | done |
| `tasks/components/board/TasksPriorityBoard.tsx` | ~105 | 5 | Priority column grid | done |
| `tasks/components/dialogs/CreateTaskModal.tsx` | ~280 | 5 | Legacy mock modal (re-exported) | done |
| `dashboard/components/StageSidebar.tsx` | ~107 | 3 | Shell only; nav/search in helpers + hook | done |
| `dashboard/helpers/sidebarActions.ts` | ~60 | 3 | Nav + project open helpers | done |
| `dashboard/hooks/useSidebarSearch.ts` | ~55 | 3 | Search UI state + filter | done |
| `dashboard/components/ActivityTimelineChart.tsx` | 392 | 3 | Chart render; transforms in `helpers/activityTimelineChart.ts` | done |
| `hooks/engine/queryKeys.ts` | ~6 | 3 | Central engine query keys | done |
| `hooks/engine/useProviderRun.ts` | ~35 | 6 | Mutations + useProviderRunEvents | done |
| `app/hooks/useProviderRunInvalidation.ts` | ~22 | 6 | onRunEvent → setQueryData | done |
| `app/layout/chromeRules.ts` | ~8 | 3 | Workspace chrome visibility | done |
| `settings/components/SettingsPageView.tsx` | 34 | 1 | Shell only; extract panels | done |
| `project/components/ProjectHeader.tsx` | ~175 | 4 | Shell; modals in `header/` | done |
| `project/components/header/ProjectHeaderModals.tsx` | ~380 | 4 | Edit/pause/delete modals | done |
| `project/components/KanbanBoard.tsx` | 1 | 4 | Re-export → `kanban/KanbanBoard.tsx` + hook | done |
| `client-portal/components/ClientPortalPreviewView.tsx` | 544 | — | Review fixture vs live usage | todo |
| `features/onboarding/useOnboardingController.ts` | 535 | 7 | Keep controller thin; split step handlers | todo |
| `companion/CritiquePanel.tsx` | 439 | 6 | Provider picker from contracts, not hardcoded | todo |
| `settings/components/IntegrationsPage.tsx` | 162 | 1 | Keep; uses `useProviderStatus` | done |
| `settings/helpers/providerIntegrationRows.ts` | 29 | 1 | Keep | done |
| `settings/types/integrations.ts` | 10 | 1 | Keep | done |
| `hooks/engine/useDesktopSession.ts` | 11 | 2 | Wire to `getDesktopSessionCached` | done |
| `hooks/engine/useProviderStatus.ts` | 21 | 6 | Uses engineQueryKeys.providers() | done |
| `lib/desktopSession.ts` | 5 | 2 | Re-export from `lib/auth/session.ts` | done |
| `lib/auth/session.ts` | 37 | 2 | Cached session helper | done |
| `app/hooks/useDesktopSessionInvalidation.ts` | 55 | 2 | Single session subscription | done |
| `routes/__root.tsx` | 55 | 2 | Use invalidation hook only | done |
| `app/WorkspaceFrame.tsx` | 65 | 2 | Use `useDesktopSession`; remove subscription | done |
| `auth/DesktopAuthView.tsx` | 130 | 2 | Use `useDesktopSession`; no raw fetch | done |
| `features/onboarding/useNonProOnboardingGate.ts` | 75 | 2 | Use `useDesktopSession` | done |
| `routes/_authed.tsx` | 22 | 2 | Uses `getDesktopSession` in beforeLoad | done |
| `routes/auth.tsx` | 20 | 2 | Uses `getDesktopSession` in beforeLoad | done |

Phase legend:

```txt
1 = Settings
2 = Auth/session
3 = Dashboard
4 = Project
5 = Tasks
6 = Companion
7 = Onboarding
```
