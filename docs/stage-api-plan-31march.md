# Stage API Plan - 31 March

Updated: 2026-04-03

This file is the product/implementation truth for the current Stage agent workflow.

## Core Goal

The goal is simple:

1. user gives a complete brief
2. agent creates the full project in Stage
3. UI work happens in Stitch
4. Stage shows the linked Stitch project and latest synced previews

It does not matter whether the surface is:
- REST
- Skills
- later MCP

Those are only ways to trigger the same workflow.

## Core Decision

Stage is the executor.
The external AI is the interpreter.

That means:
- agent interprets the messy prompt
- agent turns that into structured Stage actions
- Stage validates, stores, reads, and returns data

Stage should not use its own normal LLM project-generation path for this flow.

## Architecture Update

The public API direction changes here.

Keep:
- Convex for database, logged-in app state, realtime reads, and internal project/Stitch logic
- Hono patterns and current route contracts
- separate public skill repo at `getstage/agent-mode`

Change:
- move the public REST API off the Convex-hosted public path
- build a separate Cloudflare Worker service called `agent-service`
- keep Convex as the source of truth underneath that service

Why:
- cheaper custom domain story than paying for extra Convex custom-domain usage
- clearer public API host
- keeps the logged-in Stage app on Convex where it already works well
- keeps the public agent surface independent from the frontend worker

Immediate truth:
- current HTTP API still exists in Convex and remains the source implementation
- temporary testing base URL is:
  - `https://reliable-bullfrog-917.convex.site/api/v1`
- target public API domains are:
  - `api-testing.getstage.co`
  - `api.getstage.co`

This means:
- `testing.getstage.co` stays the frontend
- `agent-service` becomes the public REST API
- current Convex Hono routes become the migration source, not the final public edge host

## North Star Workflow

1. User gives a complete project brief
2. Agent creates the full project in Stage with `import-plan`
3. User or agent works in Stitch
4. Stitch project is linked back to the Stage project
5. Stage shows the latest synced previews

Important product truth:
- multiple people may work in the Stitch project
- Stage should therefore show the latest synced state

## What Is Already Done

### Backend

Done:
- clean Hono API
- API key auth
- rate limiting
- lean project/phase/task reads
- `POST /api/v1/projects/import-plan`
- project-level Stitch connection storage
- preview upload URL route
- synced preview list route
- synced preview replacement route
- app-auth Convex module for the logged-in Stitch page

Main implemented Stitch routes:
- `GET /api/v1/projects/:id/design-connections`
- `POST /api/v1/projects/:id/design-connections`
- `GET /api/v1/projects/:id/designs`
- `POST /api/v1/projects/:id/designs/upload-url`
- `POST /api/v1/projects/:id/designs/sync`

Logged-in app backend module:
- `app/convex/app/projectStitch.ts`

### Temporary public API host that works now

Verified:
- `https://reliable-bullfrog-917.convex.site/api/v1`

Not correct for public testing:
- `https://testing.getstage.co/api/v1`

Reason:
- the Cloudflare frontend worker serves the site
- it is not the public API service

### Frontend public pages

Built:
- `/agents`
- `/agents/stitch`
- `/agents/skills`
- `/docs`
- `/openclaw`
- `/SKILL.md`

### Logged-in frontend

Built:
- `/project/:id/stitch`

Current real behavior:
- project data loads
- Stitch connection loads
- synced previews load
- Stitch project can be linked from the app
- project header links to the Stitch page

## What Is Partial

### Logged-in app sync behavior

This is the main partial area now.

Current truth:
- `Sync latest` exists in the UI
- `syncLatest` exists in backend
- backend currently returns a clear "not wired yet" error

Why:
- public v1 is user-owned Stitch
- Stage should not fake universal Stitch access

So the open product/backend task is:
- define and implement what logged-in in-app sync really does

### Skills install flow

Current truth:
- `/agents/skills` exists
- `/SKILL.md` exists
- install command now points at this repo:
  - `npx skills add getstage/agent-mode`
- canonical installable skill now exists at:
  - `agent-mode/skills/stage-project-manager/SKILL.md`
- `.claude-plugin/` directory is added with `plugin.json` and `marketplace.json` for marketplace listing
- `package.json` has full metadata (author, repository, homepage, keywords, engines)
- `README.md` is comprehensive (install, setup, what it does, example prompts, action policy, endpoints, troubleshooting, contributors)

Still important:
- the installable source is now ready in the repo
- the command becomes publicly usable once these changes are pushed to the GitHub repo
- repo must be public for `npx skills add getstage/agent-mode` to work

### Public API hosting

This is now the main architecture transition area.

Current truth:
- the API contracts live in Convex Hono
- the frontend lives on a Cloudflare site worker
- using `testing.getstage.co/api/*` is the wrong public shape

Next truth:
- public API moves to `agent-service`
- `agent-service` calls into Convex
- docs, skills, and smoke tests should eventually target `api-testing.getstage.co`

## What Is Still Not Done

### Backend not done yet

1. scaffold `agent-service`
2. extract shared request/response schemas into a clean package
3. move public REST routes into `agent-service`
4. real in-app sync behavior
5. formal API tests
6. update endpoints
7. destructive-action safety
8. MCP server package

What is already added for hardening:
- smoke scripts for the top 3 flows
  - `app/scripts/smoke/rest.mjs`
  - `app/scripts/smoke/stitch.mjs`
- package scripts:
  - `pnpm run smoke:rest`
  - `pnpm run smoke:stitch`
  - `pnpm run smoke:top3`

Current limitation:
- smoke scripts were originally pointing at the frontend domain
- they should now use the Convex HTTP host until `agent-service` is live

### Frontend not done yet

1. final public page polish on testing
2. final footer/public IA review
3. final logged-in Stitch page polish after sync decision

### Not for v1

Do not build yet:
- task-level Stitch sync
- task-level preview ownership model
- full Stitch embed/editor inside Stage

## Public Surface Status

Active:
- Stitch
- REST API
- Agent Skills

Coming soon:
- MCP
- OpenClaw
- OpenAI later

## Current Work Split

Backend owns:
- API contracts
- `agent-service` architecture and migration
- schema
- Stitch backend logic
- app-auth Convex modules
- tests
- sync architecture decisions

Frontend owns:
- `/agents`
- `/agents/stitch`
- `/agents/skills`
- public docs presentation
- footer/nav polish
- logged-in Stitch page presentation
- final public API host copy once `agent-service` is live

## Target Repo Layout

Target shape:

```text
.
├── app                     # current Stage app (frontend + Convex)
├── agent-mode              # separate public skill repo source
├── apps
│   └── agent-service       # new Cloudflare Worker + Hono public API
└── packages
    └── contracts           # shared Zod/request/response schemas
```

Notes:
- current repo does not yet have the `apps/` + `packages/` workspace scaffold
- this is the target direction, not fully implemented structure yet
- `agent-mode` stays separate because it must be public and independently installable

## Important Product Rules

### Rule 1: project-level first

Stitch is project-level in v1.

Allowed:
- linked Stitch project per Stage project
- synced previews at project level
- optional phase context

Not for now:
- per-task Stitch connections
- per-task Stitch sync

### Rule 2: no fake success

If a flow is not fully implemented:
- do not fake success
- show clear and honest state

### Rule 3: Stage does not become the Stitch editor

Stage should show:
- linked Stitch project
- latest synced previews
- jump-off point back to Stitch

Stage should not become:
- full Stitch workspace
- heavy embedded editor in v1

## Recommended Next Order

### Backend next

1. scaffold `apps/agent-service`
2. add `wrangler.jsonc` and package scripts for stage/production deploys
3. extract shared Zod contracts into `packages/contracts`
4. migrate public REST routes from Convex Hono into `agent-service`
5. keep Convex as the app/data backend underneath
6. finish real in-app sync behavior
7. run smoke scripts against the temporary Convex HTTP host until `agent-service` is live
8. add API tests
9. add update endpoints
10. add destructive-action safety

### Frontend next

1. verify `/agents`, `/agents/stitch`, `/agents/skills` on testing
2. final footer/public IA pass
3. polish `/project/:id/stitch`
4. keep public API examples generic until `agent-service` host is live
5. update logged-in Stitch UX once real sync is decided

### Infra next

1. push the updated `agent-mode/` files to `https://github.com/getstage/agent-mode` (README, package.json, .claude-plugin/, LICENSE are all ready)
2. make the repo public if it isn't already
3. add a public API host for `agent-service`

## Current File Pointers

Backend:
- `app/convex/api/routes/projects.ts`
- `app/convex/integrations/stitch.ts`
- `app/convex/app/projectStitch.ts`
- `app/convex/domain/projects/service.ts`

Frontend:
- `app/src/components/agents/AgentsPage.tsx`
- `app/src/components/agents/StitchPage.tsx`
- `app/src/components/agents/SkillsPage.tsx`
- `app/src/components/project/ProjectStitchPage.tsx`
- `app/src/components/project/ProjectHeader.tsx`

Skills + smoke:
- `agent-mode/skills/stage-project-manager/SKILL.md`
- `agent-mode/.claude-plugin/plugin.json`
- `agent-mode/.claude-plugin/marketplace.json`
- `agent-mode/package.json`
- `agent-mode/README.md`
- `agent-mode/LICENSE`
- `app/public/SKILL.md`
- `app/scripts/smoke/rest.mjs`
- `app/scripts/smoke/stitch.mjs`

## Verification

Verified after the current changes:
- `npx convex codegen`
- `pnpm typecheck`
- `pnpm exec vite build`
