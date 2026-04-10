# React File Map

This file maps each in-scope HTML prototype to the exact React files that should be updated.

## Dashboard

HTML:
- `v2/dev-handoff/Copy of dashboard-prototype.html`

Routes:
- `app/src/routes/_authed/dashboard.tsx`

Main page:
- `app/src/components/dashboard/DashboardPage.tsx`

Supporting components:
- `app/src/components/dashboard/DashboardStats.tsx`
- `app/src/components/dashboard/UpcomingTasksCard.tsx`
- `app/src/components/dashboard/RecentActivityCard.tsx`
- `app/src/components/dashboard/PaymentsCard.tsx`
- `app/src/components/dashboard/ProjectBentoGrid.tsx`
- `app/src/components/dashboard/Timeline.tsx`
- `app/src/components/dashboard/ProjectDock.tsx`
- `app/src/components/dashboard/DashboardEmptyState.tsx`

Do change:
- page hierarchy
- spacing rhythm
- card treatment
- visual density
- stronger dashboard composition

Do not change:
- dashboard data hooks
- onboarding/paywall logic
- billing behavior

## Project Detail

HTML:
- `v2/dev-handoff/Copy of project-detail-prototype.html`

Routes:
- `app/src/routes/_authed/project.$id.tsx`

Main page:
- `app/src/components/project/ProjectDetailPage.tsx`

Supporting components:
- `app/src/components/project/ProjectHeader.tsx`
- `app/src/components/project/PhaseNavigation.tsx`
- `app/src/components/project/TaskChecklist.tsx`
- `app/src/components/project/ProjectDialogs.tsx`

Do change:
- project top header layout
- metadata presentation
- overall page structure
- visual relationship between project info, phases, and tasks

Do not change:
- project fetching logic
- mutation behavior
- share/edit/delete flow semantics

## Settings

HTML:
- `v2/dev-handoff/Copy of settings-prototype.html`

Routes:
- `app/src/routes/_authed/settings.tsx`

Main page:
- `app/src/components/settings/SettingsPage.tsx`

Supporting components:
- `app/src/components/settings/GeneralTab.tsx`
- `app/src/components/settings/BillingTab.tsx`
- `app/src/components/settings/IntegrationsTab.tsx`
- `app/src/components/settings/PortalTab.tsx`
- `app/src/components/settings/DeveloperTab.tsx`
- `app/src/components/settings/SettingsIcons.tsx`
- `app/src/styles/settings.css`

Do change:
- page shell
- sidebar/content relationship
- card styling
- spacing and section rhythm

Do not change:
- current tab logic
- billing behavior
- developer key behavior
- portal save behavior

## Client Portal

HTML:
- `v2/dev-handoff/Copy of client-portal-prototype.html`

Routes:
- `app/src/routes/portal.$token.tsx`
- `app/src/routes/portal.$token.task.$taskId.tsx`

Main pages:
- `app/src/components/portal/ClientPortalPage.tsx`
- `app/src/components/portal/ClientPortalTaskPage.tsx`

Do change:
- client-facing layout polish
- progress presentation
- spacing and typography
- visual clarity of tasks and phase status

Do not change:
- share-token access model
- portal preview mode behavior
- live edit permissions logic

## Generate / Stitch

HTML:
- `v2/dev-handoff/Copy of generate-prototype.html`

Routes:
- `app/src/routes/_authed/project.$id.stitch.tsx`

Main page:
- `app/src/components/project/ProjectStitchPage.tsx`

Do change:
- visual structure
- empty state quality
- preview area treatment
- stronger relation between project and generation workspace

Do not change:
- current Stitch backend contract assumptions
- real sync behavior beyond what already exists

## Planned Later: Research

HTML:
- `v2/dev-handoff/Copy of research-prototype.html`

Current route:
- none

Suggested future files:
- `app/src/routes/_authed/project.$id.research.tsx`
- `app/src/components/project/ProjectResearchPage.tsx`

## Planned Later: Strategy

HTML:
- `v2/dev-handoff/Copy of strategy-prototype.html`

Current route:
- none

Suggested future files:
- `app/src/routes/_authed/project.$id.strategy.tsx`
- `app/src/components/project/ProjectStrategyPage.tsx`

## Planned Later: Assets

HTML:
- `v2/dev-handoff/Copy of assets-prototype.html`

Current route:
- none

Suggested future files:
- `app/src/routes/_authed/project.$id.assets.tsx`
- `app/src/components/project/ProjectAssetsPage.tsx`

## Planned Later: Project Integrations

HTML:
- `v2/dev-handoff/Copy of integrations-prototype.html`

Current closest file:
- `app/src/components/settings/IntegrationsTab.tsx`

Likely future files:
- `app/src/routes/_authed/project.$id.integrations.tsx`
- `app/src/components/project/ProjectIntegrationsPage.tsx`

## Explicitly Out Of Scope For This Pass

### Landing
- `v2/dev-handoff/Copy of landing-prototype.html`
- current files:
  - `app/src/components/landing/LandingPage.tsx`
  - `app/src/components/landing/sections/*`

### Auth
- `v2/dev-handoff/Copy of auth-prototype.html`
- current files:
  - `app/src/components/auth/AuthPage.tsx`

### Task Detail
- `v2/dev-handoff/Copy of task-detail-prototype.html`
- current files:
  - `app/src/components/task/TaskDetailPage.tsx`

### Project Creation Modal
- `v2/dev-handoff/Copy of project-creation-modal.html`
- current files:
  - `app/src/components/creation/ProjectCreationPage.tsx`
  - `app/src/components/creation/steps/*`
