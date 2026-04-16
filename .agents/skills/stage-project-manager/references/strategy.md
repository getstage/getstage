# Strategy Workflow

Use this reference when the user wants a strategy document or structured plan generated inside Stage.

## Goal

Convert Stage research and project context into strategy artifacts that can be reviewed and approved.

## Order of operations

1. Read the existing research artifacts from `GET /api/v1/projects/:id/ai/artifacts?module=research`.
2. Read current strategy artifacts from `GET /api/v1/projects/:id/ai/artifacts?module=strategy`.
3. Create a strategy run with `POST /api/v1/projects/:id/ai/runs`.
4. Generate the strategy sections.
5. Write each result back to Stage as a strategy artifact.

## Recommended strategy sections

- goals
- KPIs
- audience
- user journeys
- sitemap
- content direction
- design principles

## Artifact rules

- Use module `strategy`.
- Prefer one artifact per section when the output should be reviewable independently.
- Use `contentFormat: "markdown"` for narrative sections.
- Use `contentFormat: "json"` only when the structure matters to the UI.

## Approval rules

- Stage owns approval state.
- If the user approves a section, update that artifact to `approved`.
- If the user requests changes, treat the previous artifact as superseded and generate a replacement.
