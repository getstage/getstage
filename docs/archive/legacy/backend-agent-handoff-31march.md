# Backend Agent Handoff - 2026-03-31

Updated: 2026-04-03

This file tracks the real backend state for the Stage API and Stitch workflow.
It is meant for other AI agents and humans picking up the same branch.

## Goal

Main product workflow:
1. agent creates the full project in Stage
2. user or agent works in Stitch
3. Stage links the Stitch project to the Stage project
4. Stage shows the latest synced previews

Stage is the executor.
Stitch remains the design workspace.

## Architecture Update

The public API is moving direction.

New target:
- Convex remains the app/data backend
- a new Cloudflare Worker + Hono service called `agent-service` becomes the public REST surface
- `agent-mode` remains the separate public skill repo

Why:
- avoids leaning on Convex custom-domain setup for the public API
- gives Stage a clean public API host such as `api-testing.getstage.co`
- keeps current Convex app logic and logged-in product behavior intact

Temporary truth for testing:
- the working HTTP API host right now is:
  - `https://reliable-bullfrog-917.convex.site/api/v1`
- `testing.getstage.co/api/*` is not the correct public API target

## Ownership

Backend agent owns:
- API contracts
- `agent-service` architecture and route migration
- Convex schema changes
- Stitch connection storage
- Stitch preview sync logic
- app-auth Convex modules
- auth / rate limits / validation
- backend handoff accuracy
- tests

Frontend-owned work that backend should not take over unless needed:
- `/agents`
- `/agents/stitch`
- `/agents/skills`
- nav/footer/public copy
- logged-in Stitch page presentation

## What Is Already Done

### Core API foundation

Done:
- clean Hono API structure under `app/convex/api/`
- thin `app/convex/http.ts`
- API key auth
- rate limiting
- lean API read models
- project, phase, task CRUD foundations
- `GET /api/v1/tasks/:id`
- `POST /api/v1/projects/import-plan`
- `POST /api/v1/projects/generate` deprecated with `410`

Important new framing:
- these Convex Hono routes are now the source implementation
- they are not the desired final public edge host

### Stitch public API

Done:
- project-level Stitch connection storage
- preview upload URL flow
- synced preview list flow
- synced preview replacement flow

Implemented public Stitch routes:
- `GET /api/v1/projects/:id/design-connections`
- `POST /api/v1/projects/:id/design-connections`
- `GET /api/v1/projects/:id/designs`
- `POST /api/v1/projects/:id/designs/upload-url`
- `POST /api/v1/projects/:id/designs/sync`

### App-auth Stitch support for the logged-in product

Now added:
- `app/convex/app/projectStitch.ts`

This file is the logged-in app Convex surface for `/project/:id/stitch`.

Implemented in that module:
- `getForProject`
- `listPreviews`
- `linkProject`
- `syncLatest`

What those do right now:
- `getForProject` returns the project-level Stitch connection
- `listPreviews` returns synced preview cards for the project
- `linkProject` creates or updates the linked Stitch project URL
- `syncLatest` currently throws a clear "not wired yet" error

Important:
- this was deliberate
- it removes fake behavior
- it does not pretend the logged-in app can already sync from Stitch directly

### Skills + REST hardening support

Now added:
- installable Stage skill source in this repo:
  - `agent-mode/skills/stage-project-manager/SKILL.md`
- marketplace-ready plugin config (added 2026-04-03):
  - `agent-mode/.claude-plugin/plugin.json`
  - `agent-mode/.claude-plugin/marketplace.json`
- full package metadata:
  - `agent-mode/package.json` (v1.0.0, not private, author, repo, homepage, keywords)
- comprehensive README:
  - `agent-mode/README.md` (install, setup, example prompts, action policy, endpoints, supported clients, troubleshooting, contributors)
- manual fallback file:
  - `app/public/SKILL.md`
- smoke scripts for the current top 3 flows:
  - `app/scripts/smoke/rest.mjs`
  - `app/scripts/smoke/stitch.mjs`

Package scripts:
- `pnpm run smoke:rest`
- `pnpm run smoke:stitch`
- `pnpm run smoke:top3`

Verified locally:
- `npx skills add ./ --list` finds exactly one installable skill:
  - `stage-project-manager`

Important:
- the public install command now targets this repo:
  - `npx skills add getstage/agent-mode`
- that becomes real for users once these changes are pushed to `https://github.com/getstage/agent-mode` and the repo is public
- the repo structure now matches the Post Bridge `agent-mode` pattern (`.claude-plugin/`, `skills/`, `package.json`, `README.md`, `LICENSE`)

### Testing host that works now

Verified:
- `https://reliable-bullfrog-917.convex.site/api/v1/projects`

Not the right host for public smoke tests:
- `https://testing.getstage.co/api/v1/projects`

## Current Backend Structure

Keep this structure:
- `app/convex/api/` for Hono API
- `app/convex/domain/` for business logic
- `app/convex/integrations/` for third-party integration logic
- `app/convex/platform/` for platform helpers
- `app/convex/developer/` for developer tooling
- `app/convex/app/` for logged-in app Convex surfaces

Target new structure:
- `apps/agent-service/` for the public Cloudflare Hono API
- `packages/contracts/` for shared Zod request/response schemas

Current relevant files:
- `app/convex/api/routes/projects.ts`
- `app/convex/domain/projects/service.ts`
- `app/convex/integrations/stitch.ts`
- `app/convex/app/projectStitch.ts`

Future relevant files:
- `apps/agent-service/src/index.ts`
- `apps/agent-service/src/hono/*`
- `apps/agent-service/wrangler.jsonc`
- `packages/contracts/*`

Important cleanup done in this pass:
- removed loose new root files
- consolidated logged-in app Stitch logic into a single `app/projectStitch.ts` module

## Current HTTP API

Mounted under `/api/v1`.

Implemented routes:
- `GET /api/v1`
- `GET /api/v1/projects`
- `GET /api/v1/projects/:id`
- `POST /api/v1/projects`
- `POST /api/v1/projects/import-plan`
- `POST /api/v1/projects/generate` returns `410`
- `GET /api/v1/projects/:id/design-connections`
- `POST /api/v1/projects/:id/design-connections`
- `GET /api/v1/projects/:id/designs`
- `POST /api/v1/projects/:id/designs/upload-url`
- `POST /api/v1/projects/:id/designs/sync`
- `GET /api/v1/projects/:id/phases`
- `POST /api/v1/projects/:id/phases`
- `GET /api/v1/phases/:id/tasks`
- `GET /api/v1/tasks/:id`
- `POST /api/v1/phases/:id/tasks`
- `POST /api/v1/tasks/:id/toggle`
- `POST /api/v1/projects/:id/generate-design` still exists as a Stitch proxy route

## Current Product Truth

### Stage is still the executor

External AI interprets the prompt.
Stage stores and executes structured actions.

### Project creation stays first

Preferred path:
- external AI builds the project plan
- caller uses `POST /api/v1/projects/import-plan`

### Public REST host should move out of Convex hosting

Target:
- `api-testing.getstage.co`
- `api.getstage.co`

Implementation direction:
- Cloudflare Worker + Hono in `agent-service`
- Convex underneath for storage and internal logic

### Public Stitch story is user-owned

For public v1:
- user or agent uses the user's own Stitch setup
- Stage links the Stitch project back into Stage
- Stage stores synced previews
- full editing remains in Stitch

### Stage should show the latest synced Stitch state

Important new product rule:
- multiple collaborators may work inside the same Stitch project
- Stage should therefore show the latest synced preview set
- not a stale one-off import

## Current Frontend Reality Relevant To Backend

Frontend now already built:
- `/agents`
- `/agents/stitch`
- `/agents/skills`
- `/project/:id/stitch`

Important:
- `/project/:id/stitch` is no longer just waiting on read queries
- it can already read project, connection, and previews
- it can already link a Stitch project

What is still incomplete from backend side:
- real logged-in app sync behavior

## What Is Still Not Done

### 1. Real in-app sync behavior

This is the main remaining backend blocker.

Current state:
- `syncLatest` exists in `app/convex/app/projectStitch.ts`
- it throws a clear error

Why this is unresolved:
- public v1 is user-owned Stitch
- Stage should not fake universal Stitch access
- product still needs a real answer for how sync should run from inside the logged-in app

This is the main open backend/product question now.

### 2. API tests

Still not done:
- auth failures
- rate limiting
- lean read shapes
- `import-plan` validation
- Stitch connection routes
- Stitch preview sync routes

Current stopgap:
- smoke scripts now exist for REST and Stitch
- they should currently target `reliable-bullfrog-917.convex.site`
- later they should target `api-testing.getstage.co`

### 3. Public API migration

Still not done:
- scaffold `apps/agent-service`
- add `wrangler.jsonc`
- add package scripts for stage and production deploys
- extract shared request/response Zod schemas into `packages/contracts`
- migrate the public REST routes out of Convex hosting
- keep Convex as the backend source of truth underneath
### 4. Update endpoints

Still not done:
- patch/update project
- patch/update phase
- patch/update task

### 5. Destructive-action safety

Still not done:
- preview affected entities
- explicit confirmation step
- confirmation token or similar pattern

### 6. MCP server package

Still not done.
Not a current blocker for the main workflow.

## Important Backend Constraints

### Do not move more logic back into `http.ts`

`http.ts` should stay thin.

### Do not flatten app-facing modules into the Convex root

New logged-in app logic should prefer:
- `app/convex/app/*`

### Do not model task-level Stitch ownership yet

Current v1 model is:
- project-level Stitch connection
- project-level synced previews
- optional phase context

Do not add yet:
- task-level Stitch sync
- task-owned preview records

### Do not fake sync success

If sync is unresolved:
- keep the behavior honest
- return clear error states

## Recommended Next Backend Order

1. Scaffold `apps/agent-service`
2. Add `wrangler.jsonc` and package scripts
3. Extract shared Zod contracts into `packages/contracts`
4. Move public REST routes into `agent-service`
5. Point smoke tests to the temporary Convex HTTP host until `agent-service` is live
6. Decide and implement real in-app sync behavior
7. Add formal API tests
8. Add update endpoints
9. Add destructive-action safety
10. Build MCP later

## Verification

Verified successfully after the current work:
- `npx convex codegen`
- `pnpm typecheck`
- `pnpm exec vite build`
- `npx skills add ./ --list`
