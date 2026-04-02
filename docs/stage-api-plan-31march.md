# Stage API Plan - 31 March

Updated: 2026-04-02

## Core Decision

Stage is the executor.
The external AI is the interpreter.

That means:
- ChatGPT / Claude / Cursor / Codex / another agent reads the messy prompt
- the external AI decides what the user wants
- the external AI turns that into structured Stage actions
- Stage API validates, writes, reads, and returns data

Stage should not call Anthropic / OpenAI / Gemini for normal project creation.
If an AI already exists on the caller side, Stage only needs to accept clean structured input.

## North Star Workflow

The main agent workflow in v1 is:

1. User gives a complete brief.
2. Agent creates the full project in Stage.
3. Agent or user generates UI in Stitch.
4. Stage links the Stitch project back to the Stage project.
5. Stage shows the latest synced UI previews inside the project.

Important:
- REST, Skills, and later MCP are only different surfaces for the same workflow
- the real goal is not "have many integration types"
- the real goal is "create the project, then link the UI work back into the project cleanly"

## Scope Right Now

Focus now:
- full project creation
- lean project/task reads
- safe action policy
- Stitch project linking
- latest synced Stitch previews inside Stage
- clean docs and handoffs for other agents

Do not expand scope right now:
- no server-side LLM project generation
- no heavy Stitch embed inside Stage
- no Stage-owned Stitch billing model for the public story
- no destructive bulk deletion without explicit confirmation

## Action Policy

The external AI must classify the user request before calling Stage.

### Read

Execute immediately.

Examples:
- "What is the status of this project?"
- "Show me this task"
- "What is due this week?"

### Create

Execute immediately only if the draft is high confidence.
Otherwise ask a follow-up or show a draft first.

Examples:
- "Create a branding project from this brief"
- "Set up this client in Stage"

High confidence means the AI can resolve at least:
- project name
- client name
- project type
- a reasonable phase/task structure
- no major ambiguity about scope

### Update

Execute immediately only when the target and intended change are unambiguous.
If not, ask a follow-up.

Examples:
- "Mark the moodboard as done"
- "Rename this phase to Strategy"
- "Add two tasks to Discovery"

### Destructive

Never execute without explicit confirmation.

Examples:
- "Delete these 14 tasks"
- "Remove this phase"
- "Archive this project"
- "Revoke this API key"

Required behavior:
- preview exactly what will be affected
- require an explicit confirm step
- then execute

### Stitch spend

Creating the Stage project can run immediately at high confidence.
Stitch generation should be treated as a second step because it spends external credits.

Preferred behavior:
- create the project first
- then ask once before the agent uses Stitch

## Correct Architecture

### What should happen

1. User gives a messy prompt to an external AI.
2. The external AI decides whether this is read, create, update, destructive, or clarify.
3. The external AI maps that to Stage API calls.
4. Stage API executes only the structured action.
5. Stage returns clean structured results.
6. If UI work is needed, the agent uses the user's own Stitch account and then syncs the latest result back into Stage.

### What should not happen

1. Stage receives a natural-language prompt.
2. Stage calls an LLM to figure out what the user meant.
3. Stage invents the project plan itself.

That architecture is wrong for this product direction.

## Stitch Model In Stage

Stage should not try to become the full Stitch workspace.

Stage should store:
- one linked Stitch project at the Stage project level
- the latest synced preview screens from that Stitch project
- a direct link to open the full Stitch workspace

This is the expected v1 behavior:
- multiple people may work inside the Stitch project
- Stage should show the latest synced state, not a stale one-off upload
- the full editing and generation experience still lives in Stitch

### Recommended representation

1. Project-level Stitch connection
   - `stitchProjectUrl`
   - optional `stitchProjectId`
   - optional title / status / last synced time

2. Preview screens inside Stage
   - latest synced `2-4` previews from the linked Stitch project
   - stored in Stage storage
   - shown as thumbnails/cards in the Stage project

3. Full workspace link
   - always available via `Open in Stitch`

### Important limitation

Because public v1 is user-owned Stitch:
- Stage should not poll Stitch directly using Stage-held credentials
- the latest sync is agent-driven or user-triggered
- Stage receives the newest previews from the agent that has Stitch access

## API Requirements

The API should expose clean primitives that an external AI can call.

### Read

Must exist:
- `GET /api/v1/projects`
- `GET /api/v1/projects/:id`
- `GET /api/v1/projects/:id/phases`
- `GET /api/v1/phases/:id/tasks`
- `GET /api/v1/tasks/:id`

Rules:
- list routes must stay lean
- detail routes can return richer payloads
- no overfetching on list endpoints

### Create

Must exist:
- `POST /api/v1/projects`
- `POST /api/v1/projects/:id/phases`
- `POST /api/v1/phases/:id/tasks`

Preferred AI write path:
- `POST /api/v1/projects/import-plan`

Why `import-plan` is better:
- one request for project + phases + tasks
- simpler for external AI agents
- avoids many sequential calls
- easier to validate high-confidence drafts before write

### Stitch linking and sync

Implemented:
- `POST /api/v1/projects/:id/design-connections`
- `GET /api/v1/projects/:id/design-connections`
- `POST /api/v1/projects/:id/designs/upload-url`
- `POST /api/v1/projects/:id/designs/sync`
- `GET /api/v1/projects/:id/designs`

Preferred meaning:
- `design-connections` stores the linked Stitch project
- `upload-url` is for preview image upload to Stage
- `designs/sync` replaces the current user-synced preview set from Stitch so Stage reflects the latest workspace state
- `GET /designs` returns the current synced previews shown in Stage

### Update

Must exist:
- `POST /api/v1/tasks/:id/toggle`

Should exist next:
- patch/update task endpoint
- patch/update project endpoint
- patch/update phase endpoint

### Destructive

Not safe to expose casually until confirmation is designed.

Preferred future pattern:
- preview request
- server returns exact affected entities
- second request with explicit confirmation flag or confirm token

## API Shape Rules

These are important and should not be relaxed:

- `GET /api/v1/projects` returns project summaries only
- `GET /api/v1/projects/:id` returns project metadata and counts, not full nested tasks
- `GET /api/v1/projects/:id/phases` returns phase summaries, not nested task payloads
- `GET /api/v1/phases/:id/tasks` returns task summaries, not full attachments/content blobs
- `GET /api/v1/tasks/:id` is the correct place for full task detail
- Stitch list responses should stay lean too

Never:
- reuse the app read model for public API routes by default
- expose internal tokens like `shareToken`
- return full user docs when ids are enough

## Project Creation Contract

For project creation, the external AI should send structured data.

Minimum useful project shape:
- `name`
- `clientName`
- `type`
- `startDate`
- `endDate`
- `phases`

Each phase:
- `name`
- `tasks[]`

This is the key product idea:
- the AI thinks
- Stage stores

## Current Backend State

Already in place:
- Hono API mounted cleanly under `app/convex/api/`
- thin `http.ts`
- API key auth
- per-key rate limiting
- clean Convex folder split: `api/`, `domain/`, `integrations/`, `platform/`, `developer/`
- shared project service layer
- lean API read models to reduce overfetching
- CRUD routes for projects, phases, and tasks
- `GET /api/v1/tasks/:id`
- `POST /api/v1/projects/import-plan`
- `POST /api/v1/projects/generate` now returns a deprecation error instead of calling an LLM
- Stitch backend exists technically through `POST /api/v1/projects/:id/generate-design`
- Stitch connection storage exists through `projectDesignConnections`
- latest-preview sync flow exists through `POST /api/v1/projects/:id/designs/sync`
- public API docs data now covers the Stitch linking and sync endpoints

Current product direction:
- keep the existing Stitch proxy route available if useful internally
- do not make it the main public Stitch story
- the main public Stitch story is user-owned Stitch + Stage sync

Generated Convex files:
- `app/convex/_generated/*` is recreated by `npx convex dev`
- do not hand-edit generated files

## Public Launch Surfaces

Public v1 should position:
- Stitch as active
- REST API as active
- Agent Skills as active

Keep as coming soon:
- MCP Server
- OpenClaw
- OpenAI later

Reason:
- Stitch already exists as a real workflow direction
- REST is already real
- Skills can become installable quickly
- MCP is not yet implemented

## Current Work Split

Backend agent owns:
- API contracts and validation
- Convex schema changes
- Stitch connection storage
- latest-preview sync flow
- auth, rate limits, and response-shape discipline
- backend implementation handoff accuracy

Frontend agent owns:
- `/agents` information architecture and copy
- `/agents/stitch`
- `/agents/skills`
- public docs presentation
- nav/footer/public-route linkage
- future in-app Stitch section presentation

Coordination rule:
- frontend should not change backend route contracts or schema without backend coordination
- backend should not rewrite the public marketing/integration surface unless frontend is blocked

---

## Full Status As Of 2026-04-02

This section tracks what is done, what is not, and what is blocked.

### Backend — done

| What | Status | Notes |
|------|--------|-------|
| Hono API structure, CORS, error handling | Done | `app/convex/api/index.ts` |
| API key auth (SHA-256, reveal-once, max 5 per user) | Done | `app/convex/developer/apiKeys.ts` |
| Rate limiting (120/min per key, 1000/min global) | Done | `app/convex/platform/rateLimits.ts` |
| Project CRUD (create, list, get) | Done | `app/convex/api/routes/projects.ts` |
| `POST /import-plan` (one-call project creation) | Done | preferred path for agents |
| Phase + Task CRUD | Done | routes + service layer |
| `GET /tasks/:id` with full detail | Done | includes content + attachments |
| `POST /tasks/:id/toggle` | Done | |
| Stitch connection storage (`projectDesignConnections`) | Done | create/update + list |
| Stitch preview sync (`designs/sync`, replaces old set) | Done | de-duplicates by stitchScreenId |
| Upload URL generation for preview images | Done | R2 pre-signed URLs |
| Stitch proxy route (`generate-design`) | Done | kept for internal use |
| Lean API read models (no overfetching) | Done | `apiReadModel.ts` separate from app read model |
| Schema + indexes | Done | `app/convex/schema.ts`, 512 lines |
| R2 cleanup includes Stitch assets | Done | project deletion cleans up everything |
| `POST /generate` deprecated with 410 | Done | points to `/import-plan` |
| Shared project service layer | Done | `domain/projects/service.ts`, 717 lines |
| Free plan project limit (3 projects) | Done | enforced in create flow |

### Frontend — public pages — done

| What | Status | Notes |
|------|--------|-------|
| `/agents` hub | Done | Stitch first, REST API, Skills active, MCP + OpenClaw coming soon |
| `/agents/stitch` | Done | workflow explainer, API endpoints, what Stage shows |
| `/agents/skills` | Done | `npx skills add stage-hq/agent-mode`, setup steps, supported clients |
| `/docs` API reference | Done | interactive, all endpoints including Stitch |
| `/openclaw` | Done | live but de-emphasized as coming soon |
| `SKILL.md` | Done | action policy, endpoints, full Stitch workflow |
| Footer | Done | Stitch + Skills links, no raw `/SKILL.md` |
| Nav | Done | links to `/agents` |
| Developer settings tab | Done | create/list/revoke API keys, links to docs |
| All hub card links resolve to real pages | Done | no dead links |

### Backend — not done yet

| What | Status | Blocked by | Notes |
|------|--------|-----------|-------|
| Authenticated Convex queries for in-app Stitch panel | Not started | nothing | the logged-in app needs session-auth queries for design connections + synced previews, not API-key routes |
| API tests | Not started | nothing | auth, rate limiting, read shapes, import-plan, Stitch sync |
| Update/patch endpoints | Not started | nothing | `PATCH /projects/:id`, `PATCH /tasks/:id`, `PATCH /phases/:id` |
| Destructive action safety model | Not started | product decision | preview + confirm token pattern |
| MCP server package | Not started | API stability | expose Stage tools for Claude Desktop etc |

### Frontend — not done yet

| What | Status | Blocked by | Notes |
|------|--------|-----------|-------|
| In-app Stitch panel (project detail) | Not started | backend auth queries | `ProjectDesignPanel` component inside `ProjectDetailPage.tsx` |
| Link Stitch project dialog | Not started | backend auth queries | paste URL, connect to project |
| Synced preview thumbnail grid | Not started | backend auth queries | show latest screens from Stitch |
| Last synced timestamp display | Not started | backend auth queries | |
| Open in Stitch action | Not started | backend auth queries | external link to Stitch workspace |
| Sync latest action (in-app trigger) | Not started | backend auth queries | |
| Optional phase badges on previews | Not started | backend auth queries | |

### Infra / other — not done yet

| What | Status | Notes |
|------|--------|-------|
| Publish `stage-hq/agent-mode` npm package | Not started | the Skills page references `npx skills add stage-hq/agent-mode` but the package doesn't exist yet |
| MCP server package | Not started | needs stable API first |

---

## Priority Order

| # | What | Owner | Blocked by |
|---|------|-------|-----------|
| 1 | Authenticated Convex queries for Stitch panel | Backend | nothing |
| 2 | In-app Stitch panel (project detail page) | Frontend | #1 |
| 3 | API tests | Backend | nothing |
| 4 | Publish `stage-hq/agent-mode` npm package | Infra | nothing |
| 5 | Update/Patch endpoints | Backend | nothing |
| 6 | MCP Server package | Backend | nothing |
| 7 | Destructive action safety model | Backend + Frontend | product decision |

---

## Edge Cases That Matter For The North Star

These are the things that can silently break the agent workflow.

### Agent sends no client name

`clientName` is optional in `import-plan`. The project just gets created without one. Fine for now, but agents should be guided to ask. The SKILL.md already lists `clientName` as part of the high-confidence check.

### Agent sends a bad project type

Validated against 8 types (branding, web-design, product-design, app-design, packaging, motion-design, illustration, other). Unknown types get a 400 error. Good.

### Agent sends an incomplete brief

`import-plan` requires at least 1 phase. But doesn't require tasks, dates, or budget. The agent should fill in reasonable defaults — that's the agent's job per the "Stage is executor" rule.

### Stitch sync with no connection

Worth verifying: does `designs/sync` require an existing design connection, or can you sync previews without linking a Stitch project first? If it allows orphan syncs, that could create confusing state.

### Multiple agents syncing at the same time

`designs/sync` replaces the full preview set. If two agents sync at the same time, the last one wins. This is acceptable for v1 but worth noting.

### Free plan limits

Free users can create max 3 projects. The API enforces this. If an agent hits the limit, it gets a clear error. The agent should handle this gracefully (suggest upgrading or archiving).

---

## File Reference

### Backend files

```
app/convex/api/index.ts          — main Hono app, CORS, route mount
app/convex/api/auth.ts           — Bearer token auth, SHA-256 lookup
app/convex/api/errors.ts         — ApiError class, global handler
app/convex/api/models.ts         — Zod schemas for all endpoints
app/convex/api/types.ts          — context types
app/convex/api/routes/projects.ts — all project + design routes
app/convex/api/routes/phases.ts  — phase task routes
app/convex/api/routes/tasks.ts   — task detail + toggle
app/convex/http.ts               — thin mount (Hono + Auth + Stripe)
app/convex/schema.ts             — full database schema
app/convex/domain/projects/service.ts     — shared business logic
app/convex/domain/projects/readModel.ts   — app-side read builders
app/convex/domain/projects/apiReadModel.ts — API-side read builders
app/convex/integrations/stitch.ts         — Stitch SDK, sync, connections
app/convex/developer/apiKeys.ts           — key generation + auth
app/convex/platform/rateLimits.ts         — rate limit configs
```

### Frontend files

```
app/src/components/agents/AgentsPage.tsx   — /agents hub
app/src/components/agents/StitchPage.tsx   — /agents/stitch
app/src/components/agents/SkillsPage.tsx   — /agents/skills
app/src/components/api-docs/ApiDocsPage.tsx — /docs
app/src/components/openclaw/OpenClawPage.tsx — /openclaw
app/src/components/settings/DeveloperTab.tsx — API key management
app/src/components/landing/sections/Nav.tsx
app/src/components/landing/sections/FooterSection.tsx
app/src/lib/stage-api-docs.ts             — API docs data
app/public/SKILL.md                        — agent skill file
app/src/routes/agents.tsx                  — layout with Outlet
app/src/routes/agents/index.tsx            — /agents route
app/src/routes/agents/stitch.tsx           — /agents/stitch route
app/src/routes/agents/skills.tsx           — /agents/skills route
```

### Files that will need changes for in-app Stitch panel

```
app/src/components/project/ProjectDetailPage.tsx — add design panel
app/src/components/project/ProjectHeader.tsx     — add Stitch menu item
app/src/hooks/useProjectDetail.ts                — add design data fetch
```

### Do not hand-edit

```
app/src/routeTree.gen.ts    — regenerated by TanStack Router
app/convex/_generated/*     — regenerated by Convex
```
