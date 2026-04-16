# Figma Workflow

Use this reference when the user wants to open, iterate, or push Stage outputs into Figma.

## V1 rule

Figma is Claude-connected, not Stage-connected.

Claude performs the action.
Stage stores the export request and result.

## Common actions

- `open_in_figma`
- `iterate_design`

## Order of operations

1. Read the target Stage artifact.
2. Use Claude's Figma tooling or MCP connection.
3. After the action finishes, update Stage through `POST /api/v1/ai/artifacts/:id/exports`.

## What to persist back to Stage

- provider `figma`
- the action name
- export status
- destination URL if Figma returns one
- a short destination label if useful

## Stitch coexistence

- Stitch remains a direct Stage-managed design integration.
- Figma in v1 is additive and Claude-mediated.
- Do not replace Stitch flows when the user explicitly asked for Stitch.
