# Research Workflow

Use this reference when the user wants Claude to research a project inside Stage.

## Goal

Turn messy discovery input into structured Stage research artifacts.

## Order of operations

1. Read `GET /api/v1/projects/:id/ai/context`.
2. If the context is incomplete and the user supplied new inputs, update it with `POST /api/v1/projects/:id/ai/context`.
3. Create a research run with `POST /api/v1/projects/:id/ai/runs`.
4. Perform the research in Claude.
5. Write the output back with `POST /api/v1/projects/:id/ai/artifacts`.

## Good research inputs

- `clientWebsite`
- `competitorUrls`
- `referenceUrls`
- `brief`
- `notes`

## Artifact rules

- Use module `research`.
- Use `contentFormat: "markdown"` unless the user explicitly asked for structured JSON.
- Store the main findings in `contentMarkdown`.
- Use `summary` for a short result line, not the full report.

## Status rules

- If the research completed, store the artifact as `ready`.
- If the run failed, store the artifact or run status as `failed` and explain why.
- If the work needs more input, stop and ask instead of inventing missing source material.
