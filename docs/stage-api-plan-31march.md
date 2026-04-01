# Stage API Plan - 31 March

## Core Decision

Stage is the executor.
The external AI is the interpreter.

That means:
- ChatGPT / Claude / Gemini / another agent reads the messy user prompt
- the external AI decides what the user wants
- the external AI turns that into structured Stage actions
- Stage API validates, writes, reads, and returns data

Stage should not call Anthropic / OpenAI / Gemini for normal project creation.
If an AI already exists on the caller side, Stage only needs to accept clean structured input.

## Scope Right Now

Focus now:
- project creation
- project/task reads
- clear action safety rules
- clean API docs and skill docs

Do not expand scope right now:
- no server-side LLM project generation
- no complicated Stitch flow decisions yet
- no destructive bulk deletion without a confirmation design

## Action Policy

The external AI must classify the user request before calling Stage.

### 1. Read

Execute immediately.

Examples:
- "What is the status of this project?"
- "Show me this task"
- "What is due this week?"

### 2. Create

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

If confidence is not high:
- ask a clarification
- or return a draft summary before writing

### 3. Update

Execute immediately only when the target and intended change are unambiguous.
If not, ask a follow-up.

Examples:
- "Mark the moodboard as done"
- "Rename this phase to Strategy"
- "Add two tasks to Discovery"

### 4. Destructive

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

## Correct Architecture

### What should happen

1. User gives a messy prompt to an external AI.
2. The external AI decides whether this is read, create, update, destructive, or clarify.
3. The external AI maps that to Stage API calls.
4. Stage API executes only the structured action.
5. Stage returns clean structured results.

### What should not happen

1. Stage receives a natural-language prompt.
2. Stage calls an LLM to figure out what the user meant.
3. Stage invents a plan itself.

That architecture is wrong for this product direction.

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
- Stitch backend exists technically, but product direction is still not settled

Current Convex direction:
- keep app-facing entrypoints at root
- keep backend-only logic inside folders

Generated Convex files:
- `app/convex/_generated/*` is recreated by `npx convex dev`
- do not hand-edit generated files

## Parallel Work Right Now

Frontend agent can work now on:
- API docs page
- developer UI for API keys
- agent or `SKILL.md` docs
- frontend wiring to the current read/create endpoints

Backend agent focus now:
- tighten `POST /api/v1/projects/import-plan` validation
- add API tests
- keep list/detail response shapes lean

Avoid simultaneous edits in:
- `app/convex/api/routes/projects.ts`
- `app/convex/api/models.ts`
- `app/convex/domain/projects/service.ts`

## What Needs To Change Next

### Backend

1. Tighten validation rules for bulk import.
   Reason: malformed AI output should fail cleanly.

2. Design destructive confirmation flow before delete endpoints are added.

3. Add API tests.
   Needed for:
   - auth
   - rate limiting
   - read shapes
   - import-plan validation
   - destructive confirmation later

### Frontend / Docs

1. Developer tab for API keys.
2. Public docs page.
3. `SKILL.md` / agent docs that teach:
   - action classification
   - high-confidence creation rule
   - destructive confirmation rule
   - correct endpoint usage

## Stitch

Do not let Stitch confuse the core API design.

There are two valid models:

### Model A: Stage-owned Stitch

User clicks "Generate Design" inside Stage.
Stage calls Stitch.
Stage stores the result.

In this model:
- Stage needs Stitch credentials
- this is a native Stage feature

### Model B: Agent-owned generation

External AI or tool generates the design elsewhere.
Stage only stores the output.

In this model:
- Stage does not need Stitch
- Stage is only a storage/execution layer

Decision for now:
- do not expand Stitch architecture until the product choice is explicit
- do not let Stitch affect project creation design

## Recommended Build Order

### Phase 1

- keep read routes clean
- keep `POST /api/v1/projects` working
- keep `GET /api/v1/tasks/:id` working

### Phase 2

- validate nested phases/tasks strictly
- document the import shape for external AIs
- keep `POST /api/v1/projects/import-plan` as the preferred AI write path

### Phase 3

- add update routes where needed
- design destructive confirmation flow

### Phase 4

- API tests
- MCP server after the API shape is stable

## Final Rule

If the request is:
- read: execute
- create: execute only at high confidence
- update: execute only if unambiguous
- destructive: require explicit confirmation

That is the policy the API, docs, and skill file should all reflect.
