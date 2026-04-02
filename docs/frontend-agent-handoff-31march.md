# Frontend Agent Handoff - 2026-03-31

This file tracks frontend work for the Stage public agent integration surface.
It is meant for other AI agents and humans picking up the same branch.

Updated: 2026-04-02

## Status Summary

Current live frontend:
- Developer tab in Settings is live and wired
- Public API docs page at `/docs`
- Public OpenClaw page at `/openclaw`
- Downloadable skill file at `/SKILL.md`
- Agents hub page at `/agents`
- Nav updated to link to `/agents`
- Footer updated to include agent/integration links

Important direction change:
- the old copy treated Stitch as "coming soon"
- that is no longer the product direction
- Stitch should be the first active integration story
- MCP and OpenClaw should be clearly marked as coming soon on the hub

## Ownership

Frontend scope is owned by the frontend agent.

Frontend agent should handle:
- `/agents` copy, card order, CTA direction, and active/coming-soon states
- `/agents/stitch`
- `/agents/skills`
- public docs presentation and route linkage
- future authenticated project UI for the Stitch panel

Backend-owned work that frontend should not change directly:
- `app/convex/api/routes/*`
- `app/convex/api/models.ts`
- `app/convex/domain/projects/service.ts`
- `app/convex/http.ts`
- `app/convex/schema.ts`
- backend API contract decisions

Still not done:
- `/agents/stitch`
- `/agents/skills`
- final `/agents` polish and route linkage cleanup
- ClawHub / listing content
- MCP server page
- project-level Stitch panel inside the app UI
- task-level design reference UX

## Locked Product Direction

The public agent story is now:
- Stitch = active
- REST API = active
- Agent Skills = active
- MCP = coming soon
- OpenClaw = coming soon

Main workflow:
1. agent creates the full project in Stage
2. user or agent works in Stitch
3. Stage shows the latest synced previews from the linked Stitch project
4. full design workspace still opens in Stitch

This matters because multiple people may work on the same Stitch project.
Stage should therefore show the latest synced state, not just one static image upload.

## Current Frontend Files

### Agent hub
- `app/src/components/agents/AgentsPage.tsx`
- `app/src/routes/agents.tsx`

### API docs
- `app/src/lib/stage-api-docs.ts`
- `app/src/components/api-docs/ApiDocsPage.tsx`
- `app/src/routes/docs.tsx`

### OpenClaw
- `app/src/components/openclaw/OpenClawPage.tsx`
- `app/src/routes/openclaw.tsx`

### Skill file
- `app/public/SKILL.md`

### Developer settings
- `app/src/components/settings/DeveloperTab.tsx`
- `app/src/features/settings/useDeveloperSettings.ts`
- `app/src/components/settings/SettingsIcons.tsx`
- `app/src/components/settings/SettingsPage.tsx`
- `app/src/features/settings/useSettingsTabs.ts`
- `app/src/types/settings.ts`
- `app/src/styles/settings.css`

### Landing page
- `app/src/components/landing/sections/Nav.tsx`
- `app/src/components/landing/sections/FooterSection.tsx`

## Current Behavior

Developer tab:
- available in Settings sidebar
- Pro-gated
- supports create, list, reveal-once, copy, and revoke API keys
- links users to `/docs`

Agents hub (`/agents`) right now:
- public route
- card order is now closer to the intended direction:
  - Stitch
  - REST API
  - Agent Skills
  - MCP
  - OpenClaw
- hero and "How it works" now reflect the project-first-then-Stitch workflow
- MCP and OpenClaw are still marked as coming soon
- Stitch and Skills cards point to `/agents/stitch` and `/agents/skills`
- those routes do not exist yet, so the hub is only partially finished
- CTA area still links to `/docs` and raw `/SKILL.md`

Docs page (`/docs`) right now:
- public route
- data-driven from `app/src/lib/stage-api-docs.ts`
- code samples for cURL, TypeScript, and Python
- links to `/openclaw` and `/SKILL.md`

OpenClaw page (`/openclaw`) right now:
- public route
- currently over-positioned relative to the updated product direction
- should remain available, but no longer be treated as a primary active integration from the hub

## Required Frontend Changes Next

### 1. Update `/agents`

Current state:
- the main card order and hero direction are already updated
- the page is typecheck-safe
- sub-routes still do not exist

Still needed:
- keep the current design system and layout direction
- finish the hub so every primary CTA resolves to a real page
- make sure the hub does not rely on raw `/SKILL.md` as the main Skills experience

Target state:
- Stitch card first and active
- REST API active
- Agent Skills active
- MCP marked coming soon
- OpenClaw marked coming soon
- Stitch card links to `/agents/stitch`
- Skills card links to `/agents/skills`
- footer/product links match this same structure

### 2. Add `/agents/stitch`

This page should explain:
- Stage project creation happens first
- Stitch is the design workspace
- Stage stores the linked Stitch project and latest synced previews
- users can open the full Stitch project from Stage

The page should clearly say:
- Stage does not become the full Stitch editor
- Stage shows the latest synced previews from the linked Stitch project
- this is important because multiple collaborators may be working in Stitch

### 3. Add `/agents/skills`

This page should be the public install/setup page.

Primary CTA:
- `npx skills add stage-hq/agent-mode`

Secondary CTA:
- download manual `/SKILL.md`

It should explain:
- supported clients
- API key setup
- create project first
- use Stitch second
- sync latest previews back into Stage

### 4. De-emphasize `/openclaw`

Keep it live, but treat it as preview / coming soon in the hub.
Do not keep it as one of the main active public paths.

### 4.5. Clean up nav/footer linkage

Current state:
- nav links to `/agents`
- footer links to `/agents`
- footer still links `Agent Skills` directly to `/SKILL.md`
- footer still uses `/openclaw` as the visible integration link instead of Stitch-first linkage

Still needed:
- align footer with the real v1 structure
- give Stitch and Skills better public entry points
- avoid making raw `/SKILL.md` the main destination

### 5. Project UI later

Inside the authenticated Stage project UI, add a Stitch section that shows:
- linked Stitch project
- latest synced preview thumbnails
- last synced time
- `Open in Stitch`

No heavy embed in v1.
Prefer thumbnails + external link.

## What Is Still Missing In The Logged-In App

This is the part that is easy to miss:
- the public API is now ready for agents
- the logged-in Stage app is not yet ready to expose the same Stitch workflow cleanly

So the frontend still needs an in-app Stitch workflow inside the normal project UI.

### The main missing in-app feature

Inside a project, the user should be able to see:
- whether a Stitch project is linked
- the latest synced preview screens
- when the last sync happened
- a clear action to open the full Stitch workspace

This should live at the project level first.

## Exact UI Decision For V1

### Project level is the source of truth

For v1:
- one Stage project can have one main linked Stitch project
- syncing happens at the project level
- preview screens can optionally be tagged to a phase
- task-level sync should not be built in v1

Reason:
- task-level sync creates too much complexity too early
- the product need right now is "project + UI work linked back in cleanly"
- phase tagging is enough to keep previews organized without overcomplicating the model

### What this means in practice

Build:
- project-level Stitch panel
- optional phase badge on preview cards
- latest preview grid

Do not build yet:
- "Sync this task with Stitch"
- separate Stitch connections per task
- heavy embedded Stitch editor
- automatic background sync polling

## Project Detail UI: Exact Placement

The natural place for the first Stitch panel is:
- [ProjectDetailPage.tsx](/Users/wernerjohannesdieben/stage_mvp/app/src/components/project/ProjectDetailPage.tsx)

Files likely involved:
- [ProjectDetailPage.tsx](/Users/wernerjohannesdieben/stage_mvp/app/src/components/project/ProjectDetailPage.tsx)
- [ProjectHeader.tsx](/Users/wernerjohannesdieben/stage_mvp/app/src/components/project/ProjectHeader.tsx)
- [useProjectDetail.ts](/Users/wernerjohannesdieben/stage_mvp/app/src/hooks/useProjectDetail.ts)
- [useProjectDetailQuery.ts](/Users/wernerjohannesdieben/stage_mvp/app/src/features/project-detail/useProjectDetailQuery.ts)

Recommended layout:
- keep the current project header as-is
- keep phase navigation and task checklist as-is
- insert a new Stitch section between the project header and the phase/task workflow, or directly below the phase navigation if that fits the current visual rhythm better

The section should feel like the rest of Stage:
- same cards
- same spacing
- same typography
- controlled color accents only

## Stitch Panel: Required States

The frontend should plan for these states explicitly.

### 1. No Stitch project linked yet

Show:
- title like `Stitch`
- short explanation
- empty state
- action to add/paste Stitch project URL

### 2. Stitch project linked, no previews synced yet

Show:
- linked Stitch project
- `Open in Stitch`
- `Sync latest previews`
- note that Stage will show the latest selected screens after sync

### 3. Stitch project linked, previews synced

Show:
- linked Stitch project title / URL
- `Open in Stitch`
- `Sync latest`
- `Last synced`
- grid of latest previews

Each preview card should show:
- thumbnail
- title if available
- optional phase badge
- synced time or created time
- optional external screen link if available

### 4. Sync in progress

Show:
- loading state on the panel
- disabled sync action
- keep existing previews visible if they exist

### 5. Sync failed

Show:
- error message
- retry action
- keep last successful synced previews visible if possible

## Important Data/Product Rules

### Rule 1: Stage should show the latest synced Stitch state

The backend now does this by replacing the current `user_sync` preview set when `designs/sync` runs.

Frontend implication:
- the panel should always treat the returned preview set as the current truth
- do not design the UI like a historical gallery by default

### Rule 2: Stitch is project-first, not task-first

Frontend implication:
- Stitch connection belongs to the project
- preview cards may show a phase tag
- tasks should only reference previews later, after the project-level panel exists

### Rule 3: the logged-in app should not awkwardly use API-key-style flows

The public API exists for agents and external tools.

Frontend implication:
- do not build the logged-in project panel around manual Bearer key usage
- wait for or request normal authenticated Convex app-facing queries/mutations for the project panel

## Task-Level Design References: What Is Missing

This is a likely future requirement, but it is not ready yet.

Current backend model supports:
- project-level Stitch connection
- project-level previews
- optional `phaseId` on synced previews

Current backend does not support:
- many-to-many task-to-preview linking
- "this one screen belongs to these exact tasks" relationships

Frontend should therefore not invent task-level ownership yet.

If task-level design references are needed later, the cleaner direction is:
- add a dedicated join model
- then let tasks reference already-synced previews

Not:
- run separate Stitch sync flows from each task row

## Public Surface Work Still Needed

### `/agents`

Still needs:
- Stitch first
- REST API active
- Skills active
- MCP coming soon
- OpenClaw coming soon

### `/agents/stitch`

Still needs:
- public Stitch explainer page
- clean explanation of linked project + latest previews + full Stitch workspace link
- use of the existing visual system, not a different landing style

### `/agents/skills`

Still needs:
- install page
- `npx skills add stage-hq/agent-mode`
- fallback `/SKILL.md`
- clear explanation of project creation first, Stitch second, sync back into Stage

### `/docs`

The docs data is updated with the new Stitch endpoints.
Frontend still needs to make sure the docs presentation clearly reflects:
- project first
- Stitch second
- sync latest previews back into Stage

### `/openclaw`

Keep live, but do not present it as one of the main active paths right now.

## Recommended Frontend Build Order

### Public-facing order

1. Finish `/agents` linkage and footer cleanup
2. Add `/agents/stitch`
3. Add `/agents/skills`
4. Expand `/SKILL.md` presentation and install flow references

### Logged-in app order

1. Wait for the app-auth read/write surface for the Stitch panel
2. Add project-level Stitch section inside the project page
3. Support linked project + latest preview grid + last synced timestamp
4. Add optional phase badges
5. Only after that, discuss task-level preview references

## Backend Dependency Notes

Frontend depends on backend for:
- final authenticated read model for the in-app Stitch project panel
- any follow-up changes to destructive-action safety or auth rules

Frontend does not need to wait for backend to do:
- `/agents` rewrite
- `/agents/stitch`
- `/agents/skills`
- install/setup messaging

Backend routes now available for frontend/docs to target:
- `GET /api/v1/projects/:id/design-connections`
- `POST /api/v1/projects/:id/design-connections`
- `GET /api/v1/projects/:id/designs`
- `POST /api/v1/projects/:id/designs/upload-url`
- `POST /api/v1/projects/:id/designs/sync`

Current sync behavior:
- `designs/sync` replaces the project's current user-synced preview set
- this is intentional so Stage shows the latest Stitch state when collaborators update the same Stitch project

## Design Notes

Use the same overall visual language already established:
- ambient blur backgrounds
- rounded cards
- consistent Stage header
- strong but controlled color accents

Updated visual hierarchy:
- violet for Stage / API
- teal for Stitch
- green for Skills
- blue for MCP
- red reserved, but OpenClaw should no longer feel like a primary launch path

## Generated Files

Do not hand-edit:
- `app/src/routeTree.gen.ts`

It is regenerated by the TanStack Router Vite plugin or `npx @tanstack/router-cli generate`.

## Verification

Frontend verification expected after route/copy changes:
- `pnpm typecheck`
- `pnpm exec vite build`

## Do Not Touch

Backend files owned by the backend agent:
- `app/convex/api/routes/*`
- `app/convex/api/models.ts`
- `app/convex/domain/projects/service.ts`
- `app/convex/http.ts`
- `app/convex/schema.ts`
