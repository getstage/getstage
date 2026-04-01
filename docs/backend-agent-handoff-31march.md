# Backend Agent Handoff - 2026-03-31

This file is the backend handoff log for the Stage public API work.
It is meant for other AI agents and humans picking up the same branch.

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
- Stitch API endpoint `POST /api/v1/projects/:id/generate-design`
- Resend audience sync switched to the official `resend` SDK in `app/convex/integrations/resendAudience.ts`
- Convex structure cleanup: integrations/domain/platform folders instead of flat backend files at root

Not done yet:
- MCP server package
- Formal API tests
- Final tightening of `import-plan` validation

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

Rule used for cleanup:
- keep actual app-facing Convex modules at root: `projects.ts`, `tasks.ts`, `viewer.ts`, `settings.ts`, `portal.ts`, `billing.ts`, etc.
- move backend-only helpers/services/integrations into folders
- keep `http.ts`, `schema.ts`, `crons.ts`, `auth.ts`, and `convex.config.ts` thin and obvious

## Current HTTP API

Mounted under `/api/v1`.

Implemented routes:
- `GET /api/v1`
- `GET /api/v1/projects`
- `GET /api/v1/projects/:id`
- `POST /api/v1/projects`
- `POST /api/v1/projects/import-plan`
- `POST /api/v1/projects/generate` returns `410` and points callers to import/create routes
- `GET /api/v1/projects/:id/phases`
- `POST /api/v1/projects/:id/phases`
- `GET /api/v1/phases/:id/tasks`
- `GET /api/v1/tasks/:id`
- `POST /api/v1/phases/:id/tasks`
- `POST /api/v1/tasks/:id/toggle`

Auth:
- Bearer token only
- Uses Stage API keys from `developer/apiKeys`
- Hashes incoming key with SHA-256 before lookup
- API auth now returns only `apiKeyId` and `userId`

Rate limiting:
- Global API limiter
- Per-API-key limiter
- Implemented in `app/convex/platform/rateLimits.ts`

## Shared Logic Notes

`app/convex/domain/projects/service.ts` is the backend sharing layer.

Why it exists:
- UI mutations have direct `ctx.db` access
- Hono routes run through Convex action/http context and need internal wrappers
- This file keeps the real project/task logic in one place, then exposes:
  - plain helper functions for UI mutations
  - internal query/mutation wrappers for Hono routes

Current UI reuse:
- `app/convex/projects.ts#create`
- `app/convex/tasks.ts#create`
- `app/convex/tasks.ts#toggleComplete`

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

## Project Creation Notes

Current architecture decision:
- Stage is the executor
- external AI is the interpreter
- Stage should not call Anthropic/OpenAI/Gemini for normal project creation

What this means in practice:
- external AI should generate the structured project plan
- callers should use `POST /api/v1/projects/import-plan` or `POST /api/v1/projects`
- `POST /api/v1/projects/generate` is intentionally deprecated

## Verification Already Run

Commands run successfully:
- `npx convex codegen`
- `pnpm typecheck`

## Parallel Work Right Now

Frontend agent can work in parallel now.

Safe frontend scope:
- API docs page
- developer/API key UI
- agent or `SKILL.md` docs
- frontend integration against the current read/create routes

Backend focus right now:
- tighten `POST /api/v1/projects/import-plan` validation
- add API tests
- protect lean response shapes from overfetch regressions

Avoid simultaneous edits in:
- `app/convex/api/routes/projects.ts`
- `app/convex/api/models.ts`
- `app/convex/domain/projects/service.ts`

Generated Convex files:
- `app/convex/_generated/*` is recreated by `npx convex dev`
- do not hand-edit generated files

## Important Constraints For Next Agent

### 1. Do not put more logic back into `http.ts`

`http.ts` should stay a thin mount point plus existing Stripe/auth route registration.

### 2. Keep the new folder split intact

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

Stitch now uses a dedicated `projectGeneratedDesigns` table.

### 4. R2 cleanup already includes Stitch, but keep it in mind

Implemented:
- project deletion cleanup calls Stitch cleanup
- `app/convex/r2.ts` includes generated design keys in reference scanning

## Stitch Research Notes

Confirmed package:
- `@google/stitch-sdk` on npm
- version seen during research: `0.0.3`

Observed SDK surface from package README:
- `stitch.createProject(title)`
- `project.generate(prompt, deviceType?)`
- `screen.getHtml()`
- `screen.getImage()`
- `screen.edit(...)`
- `screen.variants(...)`

SDK env expectation:
- `STITCH_API_KEY`

## Recommended Next Backend Step

Highest-value next backend work:
1. Add formal API tests for auth, task detail, and project import routes
2. Add tests/assertions around lean API response shapes to prevent overfetch regressions
3. Tighten `import-plan` validation and response shape if needed
4. Build the MCP server package on top of the current API surface
5. If Stitch expands, keep list responses lean and push richer data into detail reads only
