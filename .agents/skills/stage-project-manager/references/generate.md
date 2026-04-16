# Generate Workflow

Use this reference when the user wants Stage outputs such as concepts, wireframes, or deliverables generated.

## Goal

Turn strategy into concrete outputs while keeping Stage as the system of record.

## Order of operations

1. Read strategy artifacts from Stage.
2. Create a generate run with `POST /api/v1/projects/:id/ai/runs`.
3. Produce the requested outputs in Claude.
4. Store the outputs with `POST /api/v1/projects/:id/ai/artifacts`.

## Artifact rules

- Use module `generate`.
- Use `kind` to distinguish output types such as `brand_concept`, `wireframe`, `delivery_asset`, or `design_direction`.
- Use `summary` for a short explanation of what was generated.
- If a preview or external deliverable URL exists, store it in `externalUrl`.

## Destination rules

Generated outputs may later be sent to:
- Notion
- Figma

Do not assume that sending an output also updates Stage automatically. Always mark the export back in Stage after it finishes.
