# Accelero Sync Plan

Date: 2026-04-09
Scope: Frontend only
Purpose: One single handoff file that shows which Accelero HTML files map to which real React files, what should be updated now, what should be planned later, and what should not be changed in this pass.

## Goal

Use the completed Accelero HTML designs as the visual source for the frontend refresh from dashboard through strategy.

This is not a backend implementation plan.
This is not an MCP implementation plan.
This is not a Figma/Notion/Stitch backend wiring plan.

This is a frontend design sync plan.

## Source HTML Files

Reference folder:
- `v2/dev-handoff/`

Files found:

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

## Main Rule

The HTML files are design references.

So the work is:
- carry over layout
- carry over spacing
- carry over hierarchy
- carry over cards, sections, shells, states, and interaction patterns

Do not:
- paste the HTML directly into the app
- break route logic
- invent backend behavior
- change product behavior unless the current UI is clearly supposed to match the same restriction/state as the real app

## Current Real Frontend Surfaces

### Dashboard
- `app/src/routes/_authed/dashboard.tsx`
- `app/src/components/dashboard/DashboardPage.tsx`

### Project Detail
- `app/src/routes/_authed/project.$id.tsx`
- `app/src/components/project/ProjectDetailPage.tsx`
- `app/src/components/project/ProjectHeader.tsx`
- `app/src/components/project/PhaseNavigation.tsx`
- `app/src/components/project/TaskChecklist.tsx`
- `app/src/components/project/ProjectDialogs.tsx`

### Task Detail
- `app/src/routes/_authed/project.$id.task.$taskId.tsx`
- `app/src/components/task/TaskDetailPage.tsx`

### Project Creation
- `app/src/routes/_authed/new-project.tsx`
- `app/src/components/creation/ProjectCreationPage.tsx`
- `app/src/components/creation/CreationChrome.tsx`
- `app/src/components/creation/steps/*`

### Settings
- `app/src/routes/_authed/settings.tsx`
- `app/src/components/settings/SettingsPage.tsx`
- `app/src/components/settings/GeneralTab.tsx`
- `app/src/components/settings/BillingTab.tsx`
- `app/src/components/settings/IntegrationsTab.tsx`
- `app/src/components/settings/PortalTab.tsx`
- `app/src/components/settings/DeveloperTab.tsx`
- `app/src/styles/settings.css`

### Client Portal
- `app/src/routes/portal.$token.tsx`
- `app/src/components/portal/ClientPortalPage.tsx`
- `app/src/routes/portal.$token.task.$taskId.tsx`
- `app/src/components/portal/ClientPortalTaskPage.tsx`

### Stitch / Generate
- `app/src/routes/_authed/project.$id.stitch.tsx`
- `app/src/components/project/ProjectStitchPage.tsx`

### Public marketing
- `app/src/routes/index.tsx`
- `app/src/components/landing/LandingPage.tsx`

### Auth
- `app/src/routes/auth.tsx`
- `app/src/components/auth/AuthPage.tsx`

## What Should Be Updated Now

These are the HTML files that should drive the first frontend pass.

### 1. Dashboard

HTML:
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
- `app/src/components/dashboard/DashboardEmptyState.tsx`

Use the HTML for:
- page structure
- card composition
- section rhythm
- hierarchy
- spacing

Do not change:
- data logic
- onboarding/paywall behavior

### 2. Project Detail

HTML:
- `v2/dev-handoff/Copy of project-detail-prototype.html`

Real files to update:
- `app/src/components/project/ProjectDetailPage.tsx`
- `app/src/components/project/ProjectHeader.tsx`
- `app/src/components/project/PhaseNavigation.tsx`
- `app/src/components/project/TaskChecklist.tsx`
- `app/src/components/project/ProjectDialogs.tsx`

Use the HTML for:
- better project shell
- better metadata layout
- stronger phase/timeline feel
- stronger task area composition

Important:
The prototype shows top navigation states like overview, research, strategy, generate, and assets.
Use that as structural direction, not as a reason to immediately build every missing sub-route in this pass.

### 3. Settings

HTML:
- `v2/dev-handoff/Copy of settings-prototype.html`

Real files to update:
- `app/src/components/settings/SettingsPage.tsx`
- `app/src/components/settings/GeneralTab.tsx`
- `app/src/components/settings/BillingTab.tsx`
- `app/src/components/settings/IntegrationsTab.tsx`
- `app/src/components/settings/PortalTab.tsx`
- `app/src/components/settings/DeveloperTab.tsx`
- `app/src/components/settings/SettingsIcons.tsx`
- `app/src/styles/settings.css`

Use the HTML for:
- shell
- sidebar/content relationship
- spacing
- card treatment
- cleaner settings polish

Do not change:
- current settings logic
- billing logic
- API key logic

### 4. Client Portal

HTML:
- `v2/dev-handoff/Copy of client-portal-prototype.html`

Real files to update:
- `app/src/components/portal/ClientPortalPage.tsx`
- `app/src/components/portal/ClientPortalTaskPage.tsx`

Use the HTML for:
- portal layout
- progress presentation
- client-facing polish
- content spacing and readability

Do not change:
- share token logic
- preview mode logic
- existing permission behavior

### 5. Generate / Stitch

HTML:
- `v2/dev-handoff/Copy of generate-prototype.html`

Real files to update:
- `app/src/components/project/ProjectStitchPage.tsx`

Use the HTML for:
- page structure
- empty state quality
- preview presentation
- stronger project-to-generation relationship

Do not change:
- backend contract
- sync behavior assumptions

## What Should Be Planned Now, But Not Fully Built Yet

These are important, but they likely need new routes or a stronger product decision first.

### 6. Integrations

HTML:
- `v2/dev-handoff/Copy of integrations-prototype.html`

Current closest real file:
- `app/src/components/settings/IntegrationsTab.tsx`

Likely future real files:
- `app/src/routes/_authed/project.$id.integrations.tsx`
- `app/src/components/project/ProjectIntegrationsPage.tsx`

Reason to delay full implementation:
- current app integrations are app-level
- prototype shows something more like project-level integrations
- this needs product/IA confirmation

### 7. Assets

HTML:
- `v2/dev-handoff/Copy of assets-prototype.html`

Likely future real files:
- `app/src/routes/_authed/project.$id.assets.tsx`
- `app/src/components/project/ProjectAssetsPage.tsx`

Reason to delay full implementation:
- no current dedicated route/page
- should be part of a more complete project sub-navigation shell

### 8. Research

HTML:
- `v2/dev-handoff/Copy of research-prototype.html`

Likely future real files:
- `app/src/routes/_authed/project.$id.research.tsx`
- `app/src/components/project/ProjectResearchPage.tsx`

Reason to delay full implementation:
- no current route
- backend/browser-rendering flow is still unresolved

### 9. Strategy

HTML:
- `v2/dev-handoff/Copy of strategy-prototype.html`

Likely future real files:
- `app/src/routes/_authed/project.$id.strategy.tsx`
- `app/src/components/project/ProjectStrategyPage.tsx`

Reason to delay full implementation:
- no current route
- should be added as a proper project sub-surface later

## What Should Not Be Updated In This Pass

### Landing

HTML:
- `v2/dev-handoff/Copy of landing-prototype.html`

Real files:
- `app/src/components/landing/LandingPage.tsx`
- `app/src/components/landing/sections/*`

Decision:
- do not touch in this pass

### Auth

HTML:
- `v2/dev-handoff/Copy of auth-prototype.html`

Real files:
- `app/src/components/auth/AuthPage.tsx`

Decision:
- do not touch in this pass

### Task Detail

HTML:
- `v2/dev-handoff/Copy of task-detail-prototype.html`

Real files:
- `app/src/components/task/TaskDetailPage.tsx`

Decision:
- do not touch in this pass

### Project Creation Modal

HTML:
- `v2/dev-handoff/Copy of project-creation-modal.html`

Real files:
- `app/src/components/creation/ProjectCreationPage.tsx`
- `app/src/components/creation/CreationChrome.tsx`
- `app/src/components/creation/steps/*`

Decision:
- do not touch in this first pass

Reason:
- creation is important
- but dashboard/project/settings/portal/generate should set the design language first

## File-By-File Mapping Summary

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

### Plan now, build later

- `Copy of integrations-prototype.html`
- `Copy of assets-prototype.html`
- `Copy of research-prototype.html`
- `Copy of strategy-prototype.html`

### Do not touch now

- `Copy of landing-prototype.html`
- `Copy of auth-prototype.html`
- `Copy of task-detail-prototype.html`
- `Copy of project-creation-modal.html`

## Integration Notes

These are frontend notes only, so the design pass can move without waiting for all backend decisions.

### Stitch

Frontend can design now:
- connected state
- not connected state
- syncing state
- preview grid
- sync failed state

Do not assume:
- final sync transport
- final user key flow

### Figma

Frontend can design now:
- connected state
- linked files list
- sync action
- extraction action

Do not assume:
- final OAuth flow
- final extraction backend

### Notion

Frontend can design now:
- empty state
- connected state
- synced docs list
- error state

Do not assume:
- final sync model

### Research / Browser Rendering

Frontend can design now:
- prompt area
- loading state
- result cards
- error state
- source/snapshot list

Do not assume:
- final browser-rendering architecture
- final automation backend

### Cloud / automation / cloth

Direction still unclear.

Frontend rule:
- keep provider-neutral states where possible
- do not block design pass on final infrastructure choice

### MCP

Frontend can mention MCP as a future integration/access layer.

Do not make MCP a dependency of the frontend design pass.

## Recommended Execution Order

### Group A: Core shell first

1. Dashboard
2. Project Detail
3. Settings

### Group B: Secondary product surfaces

4. Client Portal
5. Generate / Stitch page

### Group C: New sub-surfaces after approval

6. Research
7. Strategy
8. Assets
9. Project-level Integrations

### Explicitly not in this pass

10. Landing
11. Auth
12. Task Detail
13. Project Creation Modal

## Execution Log (Apr 9-10, 2026)

### Done — Group A

**Dashboard**
- Bento grid (2x2): Due Soon, Recent Activity, Pipeline, Revenue cards
- New PipelineCard component
- DashboardCard updated (14px radius, 24px padding, CardTab, action prop)

**Project Detail**
- Tab bar added: Overview, Research, Strategy, Generate, Assets (functional switching)
- Share + More (three-dot) moved into tab bar row
- Phase dropdown selector in TaskChecklist (dot + name + count + chevron, matches prototype)
- Sidebar alignment fixed (same line height as tasks)
- Hero: progress ring + identity + metadata layout
- Phase timeline bar (segmented, 64px, date labels)
- Two-column grid (tasks + sidebar)

**Settings**
- Sidebar: Profile, Integrations, Plan & Billing, Clients, Account (new icons from prototype)
- Active sidebar item gets background fill
- GeneralTab: added Role card (Freelancer/Studio/In-house/Agency pills)
- IntegrationsTab: Claude AI, Figma, Notion cards added (dummy data) above existing Stripe + Google Sheets
- New ClientsTab (empty state, needs real data hookup)
- New AccountTab (delete account moved from GeneralTab)
- PortalTab + DeveloperTab hidden from sidebar, still accessible via ?tab=

### Done — Group B

**Client Portal**
- Progress ring (72px SVG)
- Phase timeline bar (segmented, clickable)
- Task rows with due dates
- Portal accent color throughout

**Generate / Stitch**
- Empty state + preview card styling improved

### Done — Group C (visual-only, dummy data)

**Research tab** — ResearchTab.tsx
- Company Overview, Market Landscape, Competitors (2x2 grid), Opportunities, Key Insights
- Complete badges, Regenerate/Share actions

**Strategy tab** — StrategyTab.tsx
- 6 sections with approval workflow (Approved/Draft/Needs Revision badges)
- Interactive approve/revision buttons, progress bar

**Generate tab** — GenerateTab.tsx
- 2x2 wireframe result grid (Homepage, Product, Pricing, Demo)
- Open in Figma / Preview / Iterate buttons
- Delivery bar with Share/Export/Save to Assets

**Assets tab** — AssetsTab.tsx
- Upload zone, 3 sections: Wireframes (4), Documents (2), Uploads (2)
- Badge variants: AI Generated, Complete, Shared, Uploaded

### Done — Dock

- Project avatars + 6 nav icons (Dashboard, Projects, Tasks, Integrations, Settings, Client Portal)
- Nav icons expand on hover with smooth animation
- Tooltips on hover for each icon
- Active state highlighting based on current route

### Still TODO

**1. Client Portal — layout sync met prototype**
- HTML bron: `v2/dev-handoff/Copy of client-portal-prototype.html`
- Files om aan te passen:
  - `app/src/components/portal/ClientPortalPage.tsx`
  - `app/src/components/portal/ClientPortalTaskPage.tsx`
- Wat moet er gebeuren:
  - Twee-kolom layout (main + 340px comments sidebar rechts)
  - Tab navigatie in header: Progress, Research, Strategy, Wireframes
  - Phase dropdown selector (zoals in project detail)
  - Research/Strategy sectie met commentable text (dummy data uit HTML)
  - Wireframes sectie met 2x2 grid (dummy data uit HTML)
  - Comments panel rechts met dummy comments
- Niet aanpassen: share token logic, preview mode, permission behavior

**2. Clients tab — echte data aansluiten**
- File: `app/src/components/settings/ClientsTab.tsx`
- Backend: `app/convex/clients.ts` → `api.clients.listForCurrentUser`
- Returns: `{ id, name, email, avatarUrl?, projectCount }[]`
- Voorbeeld gebruik: zie `app/src/hooks/useProjectCreation.ts` regel 26
- Nu toont empty state, moet echte clients tonen met avatar, naam, email, project count

**3. Research/Strategy/Generate/Assets tabs — later backend integratie**
- Files: `app/src/components/project/ResearchTab.tsx`, `StrategyTab.tsx`, `GenerateTab.tsx`, `AssetsTab.tsx`
- Nu dummy data, backend hookup komt later

## Final Decision Summary

### Update now

- Dashboard
- Project Detail
- Settings
- Client Portal
- Generate / Stitch

### Plan now, build later

- Integrations
- Assets
- Research
- Strategy

### Do not update now

- Landing
- Auth
- Task Detail
- Project Creation Modal
