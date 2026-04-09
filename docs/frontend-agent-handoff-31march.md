# Frontend Agent Handoff - 2026-03-31

Updated: 2026-04-03

This file tracks the real frontend state for the Stage agent / Stitch work.
It is meant for other AI agents and humans picking up the same branch.

## Goal

The product flow is:
1. create the full project in Stage
2. do the UI work in Stitch
3. show the linked Stitch project and latest synced previews back inside Stage

Frontend therefore has two separate jobs:
- public explanation pages
- logged-in product UI

## Architecture Update

The public API host direction has changed.

New target:
- frontend stays on `testing.getstage.co` / `getstage.co`
- public REST API moves to `agent-service`
- target API hosts become:
  - `api-testing.getstage.co`
  - `api.getstage.co`

Temporary truth while backend migration happens:
- the working API host is:
  - `https://reliable-bullfrog-917.convex.site/api/v1`
- frontend should not assume `testing.getstage.co/api/*`

## Ownership

Frontend agent owns:
- `/agents`
- `/agents/stitch`
- `/agents/skills`
- public docs presentation and route linkage
- nav/footer/public information architecture
- logged-in Stitch page presentation
- future project detail UI polish for Stitch
- final public API host copy once `agent-service` is live

Backend-owned work that frontend should not change directly:
- `app/convex/api/routes/*`
- `app/convex/api/models.ts`
- `app/convex/schema.ts`
- `app/convex/domain/projects/service.ts`
- `app/convex/app/projectStitch.ts`
- API contract decisions
- sync architecture decisions

## Current Frontend Status

### Public pages that now exist locally

Built and compiling:
- `/agents`
- `/agents/stitch`
- `/agents/skills`
- `/docs`
- `/openclaw`
- `/SKILL.md`

Main files:
- `app/src/components/agents/AgentsPage.tsx`
- `app/src/components/agents/StitchPage.tsx`
- `app/src/components/agents/SkillsPage.tsx`
- `app/src/components/api-docs/ApiDocsPage.tsx`
- `app/src/components/openclaw/OpenClawPage.tsx`
- `app/public/SKILL.md`

### Logged-in Stitch page that now exists locally

Built and compiling:
- `/project/:id/stitch`

Main files:
- `app/src/components/project/ProjectStitchPage.tsx`
- `app/src/routes/_authed/project.$id.stitch.tsx`
- `app/src/components/project/ProjectHeader.tsx`

Important:
- the old fake "coming soon" dialog in the project header is gone
- the project header now links directly to the Stitch page

## Current Public Page Reality

### `/agents`

Current state:
- Stitch card is first
- REST API is active
- Agent Skills is active
- MCP is coming soon
- OpenClaw is coming soon
- hero copy is aligned with the project-first-then-Stitch workflow

What this page is doing now:
- introduces the available integration surfaces
- points users to Stitch and Skills as the main current paths
- keeps MCP and OpenClaw visible without pretending they are launched

### `/agents/stitch`

Current state:
- explains Stage as project system and Stitch as design workspace
- explains linked Stitch project + latest synced previews
- uses the current visual language, not a separate design system
- includes Stitch-related API endpoint section

What this page is doing now:
- explains the real product workflow
- sets correct expectations that Stage does not replace Stitch
- should later point to the `agent-service` API host, not the frontend host

### `/agents/skills`

Current state:
- page exists
- shows `npx skills add getstage/agent-mode`
- shows setup steps and supported clients
- shows manual `/SKILL.md` fallback

Important current truth:
- the installable skill source now exists in this repo:
  - `agent-mode/skills/stage-project-manager/SKILL.md`
- manual fallback still exists at:
  - `app/public/SKILL.md`
- agent-mode repo is now marketplace-ready (updated 2026-04-03):
  - `.claude-plugin/plugin.json` — plugin metadata
  - `.claude-plugin/marketplace.json` — marketplace listing with category, keywords, strict mode
  - `package.json` — full metadata (author, repository, homepage, keywords, engines, v1.0.0, not private)
  - `README.md` — comprehensive (install, setup, example prompts, action policy, all endpoints, supported clients, troubleshooting, contributors)
  - `LICENSE` — MIT, copyright GetStage
  - structure matches the Post Bridge `agent-mode` pattern

Current limitation:
- the public install command only becomes truly live after these changes are pushed to `https://github.com/getstage/agent-mode` and the repo is public
- public REST examples should eventually point to `api-testing.getstage.co` / `api.getstage.co`

### `/docs`

Current state:
- public route exists
- covers current Stage API
- includes Stitch endpoints

Important:
- docs should not rely on `testing.getstage.co/api/*`
- once `agent-service` is live, docs should show the API domain explicitly

### `/openclaw`

Current state:
- page exists
- should remain live
- should not be treated as a main launched integration path right now

## Current Logged-In Stitch Page Reality

### What the page now does for real

`app/src/components/project/ProjectStitchPage.tsx` is no longer just a visual stub.

It now uses real Convex app-auth functions:
- `api.app.projectStitch.getForProject`
- `api.app.projectStitch.listPreviews`
- `api.app.projectStitch.linkProject`
- `api.app.projectStitch.syncLatest`

Current backend module:
- `app/convex/app/projectStitch.ts`

### What works now

1. Project loads
- the page reads real project data
- project name is shown correctly

2. Connection state loads
- if no Stitch project is linked, the empty state is shown
- if a Stitch project is linked, the linked state is shown

3. Preview state loads
- synced previews are read from backend
- preview cards render image, title, optional phase badge, synced time

4. Linking a Stitch project is real
- user can paste a Stitch project URL
- mutation runs
- connection state updates

5. The route is now real
- project header links to `/project/:id/stitch`

### What does not work yet

The main remaining gap:
- `Sync latest` is not truly implemented yet

Current behavior:
- button exists
- backend mutation exists
- mutation throws a clear error instead of pretending the sync worked

Why:
- public v1 is user-owned Stitch
- Stage should not fake ownership of Stitch access
- product/backend still need to define the real logged-in sync behavior

## Required Frontend Changes Next

### 1. Final polish on `/agents`

Still needed:
- deploy verification on testing
- final CTA review
- final copy review
- confirm card order and coming-soon labeling are exactly right

### 2. Final polish on `/agents/stitch`

Still needed:
- testing deploy verification
- final wording/CTA review
- confirm the page is explaining the current backend truth, not an older proxy story

### 3. Final polish on `/agents/skills`

Still needed:
- testing deploy verification
- keep install copy honest until the external install source exists
- keep manual fallback clear
- update public API host copy once backend migration is finished

### 4. Footer / public IA review

Current state:
- much closer than before
- but still worth one final pass

Still needed:
- confirm Stitch and Skills are surfaced correctly
- confirm OpenClaw is not over-promoted
- confirm footer links match the final product hierarchy

Current footer direction:
- Stitch
- Agent Skills
- All integrations

### 5. Logged-in Stitch page polish

Still needed:
- decide how the incomplete `Sync latest` action should be presented
- keep it visible with current honest error state, or
- temporarily disable it with explanatory UI

Possible polish areas:
- helper text under the linked project card
- clearer empty-state wording
- more explicit explanation of how latest previews arrive in Stage

### 6. Future project detail integration

Still open:
- should Stitch remain a separate route only?
- or should some part of it later also appear inline in the main project detail page?

That is a product/UX decision, not an immediate frontend blocker.

## Important Frontend Rules

### Rule 1: project-level first

For v1:
- Stitch belongs to the project
- not to each task

Frontend should not build:
- per-task Stitch sync
- task-level Stitch connections
- task-owned preview syncing

### Rule 2: preview cards may show phase context

This is okay in v1:
- preview card
- optional phase badge

This is not okay yet:
- inventing task ownership for previews

### Rule 3: do not fake sync success

If the sync is not real yet:
- do not show fake loading then fake success
- keep the current honest behavior or make it clearer

## Current Frontend Blockers

Main blocker:
- final backend/product decision for real logged-in app sync behavior

Secondary blocker:
- final public API host is not `testing.getstage.co/api/*`
- frontend docs/copy should update once `agent-service` is scaffolded

This is no longer blocked on reads or linking.
Those are now wired.

It is blocked on:
- what "Sync latest" should really do from inside the Stage app

## Backend Dependency Notes

Backend is already providing:
- project Stitch connection read
- preview list read
- project Stitch link mutation

Backend still needs to decide or implement:
- `agent-service` public API migration
- real in-app sync behavior
- live smoke execution with a real `STAGE_API_KEY`
- formal tests for the Stitch flow

Frontend does not need to wait for backend to do:
- `/agents`
- `/agents/stitch`
- `/agents/skills`
- public route polish
- footer/nav review

## Recommended Frontend Build Order

### Public-facing order

1. Verify `/agents`, `/agents/stitch`, and `/agents/skills` on testing
2. Final footer/public IA pass
3. Final wording pass once `agent-service` API host is confirmed

### Logged-in app order

1. Keep `/project/:id/stitch` as the main logged-in Stitch route
2. Decide presentation of incomplete sync action
3. Wait for backend/product decision on real sync behavior
4. Then finish the final Stitch page UX pass

## Verification Notes

Current local frontend is compiling with:
- `pnpm typecheck`
- `pnpm exec vite build`

Related top-3 verification files:
- `agent-mode/skills/stage-project-manager/SKILL.md`
- `agent-mode/.claude-plugin/plugin.json`
- `agent-mode/.claude-plugin/marketplace.json`
- `app/public/SKILL.md`
- `app/scripts/smoke/rest.mjs`
- `app/scripts/smoke/stitch.mjs`

## File Reference

Public pages:
- `app/src/components/agents/AgentsPage.tsx`
- `app/src/components/agents/StitchPage.tsx`
- `app/src/components/agents/SkillsPage.tsx`
- `app/src/components/api-docs/ApiDocsPage.tsx`
- `app/src/components/openclaw/OpenClawPage.tsx`
- `app/src/components/landing/sections/Nav.tsx`
- `app/src/components/landing/sections/FooterSection.tsx`
- `app/public/SKILL.md`

Logged-in Stitch files:
- `app/src/components/project/ProjectStitchPage.tsx`
- `app/src/components/project/ProjectHeader.tsx`
- `app/src/routes/_authed/project.$id.stitch.tsx`
