# Backend Agent Handoff - 2026-03-31

This file is the backend handoff log for the Stage public API and agent workflow.
It is meant for other AI agents and humans picking up the same branch.

Updated: 2026-04-02

## Status Summary

Completed:
- Clean Hono API structure under `app/convex/api/`
- Thin `app/convex/http.ts` mount using `HttpRouterWithHono`
- API key auth flow with SHA-256 lookup and `lastUsedAt` updates
- Per-key API rate limiting
- Shared project/task service layer in `app/convex/domain/projects/service.ts`
- Separate app read models vs API read models
- CRUD API routes for projects, phases, and tasks
- `GET /api/v1/tasks/:id`
- `POST /api/v1/projects/import-plan`
- `POST /api/v1/projects/generate` deprecated with a `410` response
- Stitch backend service in `app/convex/integrations/stitch.ts`
- Stitch proxy API endpoint `POST /api/v1/projects/:id/generate-design`
- project-level Stitch connection storage in `projectDesignConnections`
- latest-preview sync flow for linked Stitch projects
- `GET /api/v1/projects/:id/design-connections`
- `POST /api/v1/projects/:id/design-connections`
- `POST /api/v1/projects/:id/designs/upload-url`
- `POST /api/v1/projects/:id/designs/sync`
- `GET /api/v1/projects/:id/designs`
- Resend audience sync switched to the official `resend` SDK in `app/convex/integrations/resendAudience.ts`
- Convex structure cleanup: integrations/domain/platform folders instead of flat backend files at root

Not done yet:
- MCP server package
- formal API tests
- final tightening of destructive-action safety

## Ownership

Backend scope is owned by the backend agent.

Backend agent should handle:
- API contracts
- Convex schema changes
- Stitch connection storage
- latest-preview sync flow
- auth / rate limits / validation
- backend handoff and implementation truth

Frontend-owned work that backend should not take over unless needed:
- `/agents`
- `/agents/stitch`
- `/agents/skills`
- nav/footer/public copy
- future in-app Stitch section layout and presentation

Current frontend progress already visible on branch:
- `/agents` exists and has been partially updated toward the Stitch-first direction
- `/agents/stitch` does not exist yet
- `/agents/skills` does not exist yet
- footer still needs alignment with the final Stitch/Skills-first public flow

## Locked Architecture Decisions

### 1. Stage is still the executor

External AI interprets the prompt.
Stage stores and executes structured actions.

### 2. Project creation stays first

Preferred path:
- external AI builds the project plan
- caller uses `POST /api/v1/projects/import-plan`

### 3. Public Stitch story is user-owned

For the public agent workflow:
- the user or agent uses the user's own Stitch setup
- Stage does not become the main public Stitch proxy
- Stage links the Stitch project back into the Stage project

### 4. Stage should show the latest synced Stitch state

Important new decision:
- multiple collaborators may work inside the same Stitch project
- Stage should therefore show the latest synced previews, not a stale one-off import

Because Stage should not hold user Stitch credentials in public v1:
- latest sync is agent-driven or user-triggered
- Stage receives the newest preview set from the caller that has Stitch access

## File Layout

Current backend layout:
- `app/convex/api/index.ts`
- `app/convex/api/auth.ts`
- `app/convex/api/errors.ts`
- `app/convex/api/models.ts`
- `app/convex/api/routes/projects.ts`
- `app/convex/api/routes/phases.ts`
- `app/convex/api/routes/tasks.ts`
- `app/convex/developer/apiKeys.ts`
- `app/convex/platform/rateLimits.ts`
- `app/convex/domain/projects/service.ts`
- `app/convex/domain/projects/readModel.ts`
- `app/convex/domain/projects/apiReadModel.ts`
- `app/convex/domain/collaborators/service.ts`
- `app/convex/domain/collaborators/invites.ts`
- `app/convex/domain/auth/cleanup.ts`
- `app/convex/domain/demo/workspace.ts`
- `app/convex/integrations/stitch.ts`
- `app/convex/integrations/resendAudience.ts`
- `app/convex/integrations/googleSheets.ts`
- `app/convex/integrations/stripeConnect.ts`
- `app/convex/integrations/loopsOtp.ts`
- `app/convex/http.ts`

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
- `POST /api/v1/projects/:id/generate-design` exists as a Stitch proxy route

Auth:
- Bearer token only
- Uses Stage API keys from `developer/apiKeys`
- Hashes incoming key with SHA-256 before lookup
- API auth returns only `apiKeyId` and `userId`

Rate limiting:
- global API limiter
- per-API-key limiter
- implemented in `app/convex/platform/rateLimits.ts`

## API Shape Rules

Public API responses were trimmed to avoid overfetching.

Current intent:
- `GET /api/v1/projects` returns project summaries only
- `GET /api/v1/projects/:id` returns project metadata and counts, not nested phases/tasks
- `GET /api/v1/projects/:id/phases` returns phase summaries with counts, not nested tasks
- `GET /api/v1/phases/:id/tasks` returns task summaries, not full content/attachments
- full task content + attachments belong in task-detail reads, not list responses

Important:
- do not reuse the app read model for public API responses by default
- do not expose `shareToken` in public API read models
- avoid returning full `user` docs from auth/helper calls when ids are enough
- if Stitch list/detail routes are added, keep them lean too

## Project Creation Notes

Current architecture decision:
- Stage is the executor
- external AI is the interpreter
- Stage should not call Anthropic/OpenAI/Gemini for normal project creation

What this means in practice:
- external AI should generate the structured project plan
- callers should use `POST /api/v1/projects/import-plan` or `POST /api/v1/projects`
- `POST /api/v1/projects/generate` is intentionally deprecated

## Stitch Direction For Public v1

### Current implementation truth

Already implemented:
- Stitch SDK integration in `app/convex/integrations/stitch.ts`
- project-level Stitch connections stored in `projectDesignConnections`
- synced preview screens stored in `projectGeneratedDesigns`
- `designs/sync` replaces the project's current user-synced preview set so Stage can show the latest state
- R2 cleanup already knows about generated design objects

### Product direction change

The public v1 Stitch story is no longer:
- "Stage calls Stitch and owns the full generation flow"

The public v1 Stitch story is now:
- agent or user works in Stitch
- Stage stores a linked Stitch project on the Stage project
- Stage stores the latest synced preview set from that Stitch project
- full editing remains in Stitch

### Why

Reasons:
- avoids making Stage the owner of Stitch usage costs
- matches the "Stage is executor" architecture
- supports multiple collaborators working in the same Stitch project
- lets Stage show the freshest synced state without pretending to be the full design workspace

## Required Backend Changes Next

### 1. Add formal API tests

Highest-value coverage:
- auth failures
- rate limiting
- lean read shapes
- `import-plan` validation
- Stitch connection + sync flow

### 2. Add authenticated project-facing read model support for the Stitch panel

The public API is ready, but the in-app project UI will need a clean read shape for:
- linked Stitch project
- latest synced previews
- last synced timestamp

Important:
- the logged-in app should not be forced to use the public API-key routes for this
- backend should provide normal app-auth Convex queries/mutations for the project detail UI
- phase tagging is already compatible with the current sync model
- task-level preview linking is not modeled yet and should not be faked in the frontend

### 3. Keep the current proxy route, but de-emphasize it

Current route:
- `POST /api/v1/projects/:id/generate-design`

Action:
- keep it if internally useful
- do not treat it as the primary public Stitch path
- public docs and frontend should center on linking + sync

## Frontend Dependency Notes

Frontend depends on backend for:
- authenticated project-facing read model for the in-app Stitch panel
- authenticated write surface for linking/syncing from inside the app if that becomes part of the logged-in flow
- any later task-to-preview association model, if product decides that tasks should reference synced screens

Frontend does not need to wait for backend to do:
- `/agents` completion
- `/agents/stitch`
- `/agents/skills`
- install-flow messaging

## Shared Logic Notes

`app/convex/domain/projects/service.ts` remains the backend sharing layer.

Why it exists:
- UI mutations have direct `ctx.db` access
- Hono routes run through Convex action/http context and need internal wrappers
- this file keeps the real project/task logic in one place

The next Stitch sync logic should follow the same pattern:
- shared helper/service logic first
- internal wrappers for Hono routes second

## Important Constraints For Next Agent

### 1. Do not put more logic back into `http.ts`

`http.ts` should stay a thin mount point plus existing Stripe/auth route registration.

### 2. Keep the current folder split intact

Do not move backend service code back into the Convex root unless the file is a real app-facing entrypoint.

Preferred placement:
- `domain/*` for business logic and read models
- `integrations/*` for third-party services and webhooks
- `platform/*` for internal infra helpers
- `developer/*` for developer-facing tooling like API keys

### 3. Stitch should not reuse `attachments`

Current `attachments` rows are task-scoped:
- table requires `taskId`
- existing cleanup/query code assumes task ownership

Stitch should continue to use:
- project-level design connection storage
- `projectGeneratedDesigns` for synced previews

### 4. R2 cleanup already includes Stitch

Implemented:
- project deletion cleanup calls Stitch cleanup
- `app/convex/r2.ts` includes generated design keys in reference scanning

Keep this in mind if new preview-sync keys are added.

## Verification Already Run

Commands already run successfully in prior backend work:
- `npx convex codegen`
- `pnpm typecheck`

## Recommended Next Backend Step

Highest-value next backend work:
1. Add authenticated Convex read/write functions for the in-app Stitch panel
2. Add API tests for:
   - auth
   - task detail
   - import-plan
   - Stitch connection/sync routes
3. Keep lean response shapes protected
4. Define the later task-to-preview association model only if product decides it is needed
5. Build the MCP server package after the public API shape is stable
