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

## What Needs To Change Next

### Backend

1. Add API tests.
   Needed for:
   - auth
   - rate limiting
   - read shapes
   - import-plan validation
   - Stitch connection/sync flow

2. Add authenticated in-app read support for the future Stitch project panel.
   Reason: the public API is ready, but the project UI will still need a clean authenticated read shape.

### Frontend / Docs

1. Finish `/agents`.
   Current state:
   - the main hub exists
   - Stitch is already moved to the first active card
   - the hero/how-it-works copy is closer to the real workflow
   - but `/agents/stitch` and `/agents/skills` do not exist yet
   - CTA/link cleanup is still needed
2. Add `/agents/stitch` page.
3. Add `/agents/skills` page with install flow.
4. Expand `SKILL.md` so it teaches:
   - action classification
   - high-confidence creation rule
   - destructive confirmation rule
   - create project first
   - use Stitch second
   - sync latest previews back into Stage
5. Align nav/footer/public links with the real active surfaces.
   Important:
   - do not make raw `/SKILL.md` the main Skills destination
   - do not over-position OpenClaw relative to Stitch

### Frontend app work that is still missing

This is separate from the public pages.

The logged-in Stage app still needs:
1. a project-level Stitch panel inside the normal project UI
2. states for:
   - no Stitch project linked
   - linked but no previews synced
   - linked with synced previews
   - syncing
   - sync failed
3. a clear `Open in Stitch` action
4. a clear `Sync latest` action
5. latest synced preview grid
6. optional phase badges on preview cards

Important v1 decision:
- sync belongs to the project, not to each task
- phase tagging is okay
- task-level preview references are later work, not v1

Important frontend technical note:
- the public API routes are for agents and external tools
- the logged-in app should eventually use normal authenticated Convex queries/mutations for this panel, not a manual API-key flow

### Product UI later

Inside the Stage project UI, add a Stitch section with:
- linked Stitch project
- latest synced previews
- last synced timestamp
- `Open in Stitch` action
