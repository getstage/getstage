# Accelero Frontend HTML Sync Plan

Date: 2026-04-09
Scope: Frontend only
Purpose: Map the Accelero HTML handoff files to the real React files in Stage, decide what should be updated now, and clearly mark what should not be updated in this pass.

## Goal

Take the completed Accelero HTML designs from dashboard through strategy and turn them into a clean implementation plan for the real frontend.

This document is not a backend build plan.
This document is also not a feature-complete integration plan.

The immediate goal is:

- make the logged-in product UI look great
- align the real React app with the HTML handoff
- avoid accidentally redesigning unrelated areas
- separate frontend visual work from backend/integration work

## Source HTML Files

Reference folder:
- `v2/dev-handoff/`

Files found there:

- `Copy of dashboard-prototype.html`
- `Copy of project-detail-prototype.html`
- `Copy of project-creation-modal.html`
- `Copy of landing-prototype.html`
- `Copy of task-detail-prototype.html`
- `Copy of settings-prototype.html`
- `Copy of integrations-prototype.html`
- `Copy of assets-prototype.html`
- `Copy of client-portal-prototype.html`
- `Copy of generate-prototype.html`
- `Copy of research-prototype.html`
- `Copy of strategy-prototype.html`
- `Copy of auth-prototype.html`

## Important Rule

These HTML files are design references, not production code.

So the work is:

- translate layout, hierarchy, spacing, card structure, states, and visual patterns
- keep the real React routes, hooks, and product logic intact
- only create new routes/components when the prototype clearly represents a missing surface

Do not treat the prototype HTML as something to directly paste into the app.

## Current Real Frontend Surfaces

These are the real route-backed pages/components that already exist:

- Dashboard
  - `app/src/routes/_authed/dashboard.tsx`
  - `app/src/components/dashboard/DashboardPage.tsx`

- Project Detail
  - `app/src/routes/_authed/project.$id.tsx`
  - `app/src/components/project/ProjectDetailPage.tsx`
  - `app/src/components/project/ProjectHeader.tsx`
  - `app/src/components/project/PhaseNavigation.tsx`
  - `app/src/components/project/TaskChecklist.tsx`
  - `app/src/components/project/ProjectDialogs.tsx`

- Task Detail
  - `app/src/routes/_authed/project.$id.task.$taskId.tsx`
  - `app/src/components/task/TaskDetailPage.tsx`

- Project Creation
  - `app/src/routes/_authed/new-project.tsx`
  - `app/src/components/creation/ProjectCreationPage.tsx`
  - `app/src/components/creation/CreationChrome.tsx`
  - `app/src/components/creation/steps/*`

- Settings
  - `app/src/routes/_authed/settings.tsx`
  - `app/src/components/settings/SettingsPage.tsx`
  - `app/src/components/settings/GeneralTab.tsx`
  - `app/src/components/settings/BillingTab.tsx`
  - `app/src/components/settings/IntegrationsTab.tsx`
  - `app/src/components/settings/PortalTab.tsx`
  - `app/src/components/settings/DeveloperTab.tsx`

- Client Portal
  - `app/src/routes/portal.$token.tsx`
  - `app/src/components/portal/ClientPortalPage.tsx`
  - `app/src/routes/portal.$token.task.$taskId.tsx`
  - `app/src/components/portal/ClientPortalTaskPage.tsx`

- Public marketing
  - `app/src/routes/index.tsx`
  - `app/src/components/landing/LandingPage.tsx`

- Auth
  - `app/src/routes/auth.tsx`
  - `app/src/components/auth/AuthPage.tsx`

## What Should Be Updated Now

These are the HTML files that should be used in the first frontend sync pass.

### 1. Dashboard

Prototype:
- `v2/dev-handoff/Copy of dashboard-prototype.html`

Real files to update:
- `app/src/components/dashboard/DashboardPage.tsx`
- `app/src/components/dashboard/DashboardStats.tsx`
- `app/src/components/dashboard/UpcomingTasksCard.tsx`
- `app/src/components/dashboard/RecentActivityCard.tsx`
- `app/src/components/dashboard/PaymentsCard.tsx`
- `app/src/components/dashboard/ProjectBentoGrid.tsx`
- `app/src/components/dashboard/Timeline.tsx`
- `app/src/components/dashboard/ProjectDock.tsx`

What to carry over from HTML:
- overall spacing and page rhythm
- stronger card composition
- clearer dashboard hierarchy
- improved visual grouping of timeline, progress, upcoming work, and recent activity

What not to do here:
- do not rewrite dashboard data logic
- do not change onboarding/paywall behavior in this pass

### 2. Project Detail

Prototype:
- `v2/dev-handoff/Copy of project-detail-prototype.html`

Real files to update:
- `app/src/components/project/ProjectDetailPage.tsx`
- `app/src/components/project/ProjectHeader.tsx`
- `app/src/components/project/PhaseNavigation.tsx`
- `app/src/components/project/TaskChecklist.tsx`
- `app/src/components/project/ProjectDialogs.tsx`

Possible additional supporting files:
- `app/src/components/dashboard/ProjectDock.tsx`

What to carry over from HTML:
- better project top section
- better project metadata layout
- stronger phase/timeline presentation
- improved checklist area layout
- clearer separation between primary work, phase view, and secondary controls

Important note:
The prototype shows tab-like navigation for areas such as overview, research, strategy, generate, and assets.

That should not be interpreted as “build five full routes immediately.”
For this first pass, use it as a layout and navigation direction for the project shell.

### 3. Settings

Prototype:
- `v2/dev-handoff/Copy of settings-prototype.html`

Real files to update:
- `app/src/components/settings/SettingsPage.tsx`
- `app/src/components/settings/GeneralTab.tsx`
- `app/src/components/settings/BillingTab.tsx`
- `app/src/components/settings/PortalTab.tsx`
- `app/src/components/settings/DeveloperTab.tsx`
- `app/src/components/settings/IntegrationsTab.tsx`
- `app/src/components/settings/SettingsIcons.tsx`
- `app/src/styles/settings.css`

What to carry over from HTML:
- cleaner settings layout
- stronger sidebar/content hierarchy
- better card spacing
- better visual polish on save areas, avatar/profile sections, and account-level actions

Important note:
The prototype screenshots include IA variants that do not exactly match the current real settings tabs.

Do not blindly rename tabs from the prototype unless there is a product decision.
Use the prototype mainly for visual treatment, not for changing current information architecture without approval.

### 4. Integrations

Prototype:
- `v2/dev-handoff/Copy of integrations-prototype.html`

Real files to update now:
- `app/src/components/settings/IntegrationsTab.tsx`

Files likely to be added later:
- project-level integrations surface under `app/src/components/project/`

Important note:
This prototype is not a direct match for the current app.

Current real app:
- app-level integrations live in Settings

Prototype:
- shows project-level design/AI integrations

Decision for now:
- use the prototype to guide future UI direction
- do not force the entire project-level integrations model into the current app in this first pass unless explicitly approved

Recommended output for this pass:
- visually improve `IntegrationsTab.tsx`
- prepare a follow-up task for a project-level integrations page

### 5. Client Portal

Prototype:
- `v2/dev-handoff/Copy of client-portal-prototype.html`

Real files to update:
- `app/src/components/portal/ClientPortalPage.tsx`
- `app/src/components/portal/ClientPortalTaskPage.tsx`

What to carry over from HTML:
- stronger portal layout
- better progress presentation
- better typography and spacing
- more polished client-facing experience

Important note:
The current client portal is structurally different from the prototype.
This is not a tiny styling pass.

Treat it as a controlled redesign of the client-facing portal pages, but do not break the existing route behavior or token/share flow.

### 6. Generate

Prototype:
- `v2/dev-handoff/Copy of generate-prototype.html`

Current nearest real files:
- `app/src/components/project/ProjectStitchPage.tsx`
- `app/src/routes/_authed/project.$id.stitch.tsx`

Decision:
- update this surface now only as a design direction for the Stitch/project generation area
- do not invent a fully new generation engine in frontend

What to do:
- align `ProjectStitchPage.tsx` visually with the prototype direction where it makes sense
- keep the real product truth: Stitch/project generation is still backend/integration dependent

### 7. Research

Prototype:
- `v2/dev-handoff/Copy of research-prototype.html`

Current real route:
- none

Decision:
- plan now
- do not fully implement now unless explicitly chosen as part of the frontend batch

Recommended next frontend action:
- define the route and shell structure first
- decide whether research lives as:
  - a project subpage
  - or a project tab route

Suggested future files:
- `app/src/routes/_authed/project.$id.research.tsx`
- `app/src/components/project/ProjectResearchPage.tsx`

### 8. Strategy

Prototype:
- `v2/dev-handoff/Copy of strategy-prototype.html`

Current real route:
- none

Decision:
- plan now
- do not fully implement now unless explicitly chosen as part of the frontend batch

Suggested future files:
- `app/src/routes/_authed/project.$id.strategy.tsx`
- `app/src/components/project/ProjectStrategyPage.tsx`

## What Should Not Be Updated In This First Pass

These files should not be part of the immediate frontend sync unless specifically re-approved.

### 1. Landing

Prototype:
- `v2/dev-handoff/Copy of landing-prototype.html`

Real files:
- `app/src/components/landing/LandingPage.tsx`
- `app/src/components/landing/sections/*`

Decision:
- not part of the logged-in product sync pass
- separate marketing/public site track

### 2. Auth

Prototype:
- `v2/dev-handoff/Copy of auth-prototype.html`

Real files:
- `app/src/components/auth/AuthPage.tsx`

Decision:
- not part of the current “dashboard until strategy” sync pass
- separate auth/product entry flow track

### 3. Task Detail

Prototype:
- `v2/dev-handoff/Copy of task-detail-prototype.html`

Real files:
- `app/src/components/task/TaskDetailPage.tsx`

Decision:
- do not prioritize in the first pass
- only update after dashboard, project detail, settings, client portal, and project-level shells are aligned

Reason:
- task detail is lower leverage than the main app shell and project pages

### 4. Project Creation Modal

Prototype:
- `v2/dev-handoff/Copy of project-creation-modal.html`

Real files:
- `app/src/components/creation/ProjectCreationPage.tsx`
- `app/src/components/creation/CreationChrome.tsx`
- `app/src/components/creation/steps/*`

Decision:
- do not treat this as the first implementation target unless you explicitly decide the creation flow is part of this batch

Important nuance:
- creation is important
- but the main visual sync priority should still be the core logged-in surfaces first

## Recommended Implementation Groups

To keep this clean, the frontend work should be grouped like this:

### Group A: Core app shell

Update first:
- Dashboard
- Project Detail
- Settings

Why:
- these define the visual language of the app
- everything else should inherit from this quality level

### Group B: Client-facing and project-adjacent

Update second:
- Client Portal
- Generate/Stitch page

Why:
- they are important, but depend on the core shell feeling right first

### Group C: New project sub-surfaces

Plan now, implement after approval:
- Research
- Strategy
- Assets
- Project-level Integrations

Why:
- they likely need new routes or project sub-navigation structure
- this is not just restyling

## Prototype To Real File Mapping Summary

### Update now

- `Copy of dashboard-prototype.html`
  - `app/src/components/dashboard/*`

- `Copy of project-detail-prototype.html`
  - `app/src/components/project/ProjectDetailPage.tsx`
  - `app/src/components/project/ProjectHeader.tsx`
  - `app/src/components/project/PhaseNavigation.tsx`
  - `app/src/components/project/TaskChecklist.tsx`
  - `app/src/components/project/ProjectDialogs.tsx`

- `Copy of settings-prototype.html`
  - `app/src/components/settings/SettingsPage.tsx`
  - `app/src/components/settings/*`
  - `app/src/styles/settings.css`

- `Copy of client-portal-prototype.html`
  - `app/src/components/portal/ClientPortalPage.tsx`
  - `app/src/components/portal/ClientPortalTaskPage.tsx`

- `Copy of generate-prototype.html`
  - `app/src/components/project/ProjectStitchPage.tsx`

### Update later / plan only

- `Copy of integrations-prototype.html`
  - current partial mapping: `app/src/components/settings/IntegrationsTab.tsx`
  - future likely needs new project-level surface

- `Copy of assets-prototype.html`
  - future likely project-level surface

- `Copy of research-prototype.html`
  - future new route/page

- `Copy of strategy-prototype.html`
  - future new route/page

### Do not update in this pass

- `Copy of landing-prototype.html`
- `Copy of auth-prototype.html`
- `Copy of task-detail-prototype.html`
- `Copy of project-creation-modal.html`

## Backend / Integration Dependency Notes

These should not block the first frontend design pass.

### Research browser rendering

This likely needs backend/browser automation and orchestration later.

Frontend action now:
- design the research surface and states
- do not wait for final browser rendering implementation

Recommended states:
- empty
- generating
- results loaded
- error

### Cloth / cloud integration

This is still unclear product/architecture-wise.

Frontend action now:
- do not hardcode a final provider-specific UI
- use neutral “connected / syncing / error / configure” states where needed

### Figma

Relevant mainly to:
- project integrations
- assets/generate areas

Frontend action now:
- design connected file lists, sync state, and extraction actions
- backend wiring can happen later

### Notion

Same rule:
- do not block visual planning on final Notion architecture
- treat as future integration state design

### MCP

For now:
- do not make the frontend depend on MCP being shipped
- MCP is an access/integration layer, not the first visual dependency

## Frontend Principle For This Pass

The frontend should be allowed to get visually excellent before every integration is final.

So in this pass:

- prioritize layout, hierarchy, spacing, states, navigation, and reusable UI treatment
- avoid inventing backend behavior
- use realistic connected/loading/empty/error states for unfinished integrations

## Recommended Next Step After This Plan

After this document is approved:

1. start Group A
   - Dashboard
   - Project Detail
   - Settings

2. then move to Group B
   - Client Portal
   - Generate/Stitch page

3. after that, decide whether to implement:
   - Research
   - Strategy
   - Assets
   - project-level Integrations

## Final Decision Summary

### Should be updated now

- Dashboard
- Project Detail
- Settings
- Client Portal
- Generate/Stitch page

### Should be planned but not fully implemented yet

- Research
- Strategy
- Assets
- project-level Integrations

### Should not be updated in this pass

- Landing
- Auth
- Task Detail
- Project Creation Modal
