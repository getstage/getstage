# Stage Agent Skill

Installable source:

```bash
npx skills add getstage/agent-mode
```

Manual fallback:
- download this file
- drop it into your agent workspace or project context

Use this skill when acting on behalf of a user inside Stage.
Stage is the source of truth. Claude is the operator.

## Core model

Stage is the executor.
You are the interpreter.

That means:
- You read the messy prompt.
- You decide the intent.
- You build the structured API call.
- Stage only validates, reads, writes, and returns data.

Never send natural-language prompts to Stage expecting Stage to decide what the user meant.

## Action policy

### Read

Execute immediately.

Examples:
- "What is the status of this project?"
- "Show me this task."
- "What is due this week?"

### Create

Execute only at high confidence.

High confidence means you can resolve:
- project name
- client name
- project type
- a reasonable phase and task structure
- no major ambiguity about scope

If confidence is not high:
- ask a follow-up question
- or show a draft summary before writing

### Update

Execute only if the target and change are unambiguous.

If not:
- ask a follow-up question

### Destructive

Never execute destructive actions without explicit confirmation.

Examples:
- deleting tasks
- removing phases
- archiving projects
- revoking API keys

Required behavior:
- preview exactly what will be affected
- ask for explicit confirmation
- only execute after confirmation

## Preferred endpoints

Read:
- `GET /api/v1/projects`
- `GET /api/v1/projects/:id`
- `GET /api/v1/projects/:id/phases`
- `GET /api/v1/phases/:id/tasks`
- `GET /api/v1/tasks/:id`

Create:
- `POST /api/v1/projects`
- `POST /api/v1/projects/import-plan`
- `POST /api/v1/projects/:id/phases`
- `POST /api/v1/phases/:id/tasks`

Update:
- `POST /api/v1/tasks/:id/toggle`

Avoid:
- `POST /api/v1/projects/generate`

That endpoint is deprecated. Build the plan yourself and use `import-plan`.

## Claude and AI workflow endpoints

### Handshake — verify connection

```http
POST /api/v1/agent/connections/claude/handshake
Authorization: Bearer stg_...
Content-Type: application/json

{
  "connectionId": "<optional — provided in the setup prompt>",
  "client": "claude_code",
  "capabilities": {
    "notionMcp": true,
    "figmaMcp": false
  }
}
```

Response `201 Created`:
```json
{ "connectionId": "abc123", "status": "connected" }
```

Rules:
- Call this once after installing the skill and setting the API key.
- Set `notionMcp` to `true` if you have a Notion MCP tool available.
- Set `figmaMcp` to `true` if you have a Figma MCP tool available.
- If `connectionId` is omitted, Stage will find or create one for your user.

### Other AI endpoints

- `GET /api/v1/projects/:id/ai/context`
- `POST /api/v1/projects/:id/ai/context`
- `GET /api/v1/projects/:id/ai/runs`
- `POST /api/v1/projects/:id/ai/runs`
- `GET /api/v1/projects/:id/ai/artifacts`
- `POST /api/v1/projects/:id/ai/artifacts`
- `POST /api/v1/ai/artifacts/:id/exports`

Rules:
- Create a run before substantial AI work.
- Write artifacts back into Stage after the work completes.
- Treat Notion and Figma as Claude-connected in v1, not Stage OAuth integrations.
- Always update Stage after a Notion or Figma export finishes.

## Figma and Notion exports

If the user wants work pushed to Figma or Notion after the project exists:

1. Create the project in Stage first.
2. Save AI context if needed.
3. Create a run for research, strategy, generate, or delivery.
4. Write the resulting artifact back into Stage.
5. Record the export result in Stage after the Figma or Notion step finishes.

Current rule:
- Treat Figma and Notion as export destinations in v1.
- Do not assume Stage has native OAuth for Figma or Notion.
- Always write the export result back with `POST /api/v1/ai/artifacts/:id/exports`.

## Recommended flow

1. Classify the request: read, create, update, destructive, or clarify.
2. Resolve the target entity.
3. Decide whether confidence is high enough to act.
4. If creating a full project, prefer `POST /api/v1/projects/import-plan`.
5. If research, strategy, generate, or delivery work is requested, create the project first and track the work through AI context, runs, artifacts, and exports.
6. Keep list requests lean. Use detail endpoints only when richer data is needed.

## Example: create a project

When the user says:

> Create a branding project from this brief.

You should:
1. Extract a structured project plan.
2. Check confidence.
3. Call `POST /api/v1/projects/import-plan` with project, phases, and tasks.

Example payload:

```json
{
  "name": "Brew & Co Brand Identity",
  "clientName": "Brew & Co",
  "type": "branding",
  "startDate": 1717200000000,
  "endDate": 1720828800000,
  "phases": [
    { "name": "Discovery", "tasks": ["Research competitors", "Client interview"] },
    { "name": "Strategy", "tasks": ["Brand positioning", "Moodboard"] },
    { "name": "Design", "tasks": ["Logo concepts", "Color palette"] }
  ]
}
```

## Authentication

Base URL for all API calls:

```text
Testing:    https://testing.getstage.co
Production: https://getstage.co
```

Use Bearer auth:

```http
Authorization: Bearer stg_...
```

Every request must include the full URL, e.g. for testing:

```http
GET https://testing.getstage.co/api/v1/projects
Authorization: Bearer stg_...
```

API keys are created in Stage under `Settings -> Developer`.
