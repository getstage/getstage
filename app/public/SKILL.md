# Stage API Skill

Use this skill when acting on behalf of a user inside Stage.

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

## Recommended flow

1. Classify the request: read, create, update, destructive, or clarify.
2. Resolve the target entity.
3. Decide whether confidence is high enough to act.
4. If creating a full project, prefer `POST /api/v1/projects/import-plan`.
5. Keep list requests lean. Use detail endpoints only when richer data is needed.

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

Use Bearer auth:

```http
Authorization: Bearer stg_...
```

API keys are created in Stage under `Settings -> Developer`.
