# Notion Export Workflow

Use this reference when the user wants an artifact added to Notion.

## V1 rule

Notion is Claude-connected, not Stage-connected.

That means:
- Claude performs the Notion action.
- Stage stores the request and final export state.

## Order of operations

1. Read the Stage artifact that will be exported.
2. Use Claude's Notion tooling or MCP connection.
3. After the Notion action completes, update Stage with:
   - provider `notion`
   - action performed
   - status
   - destination URL if available

Use:
- `POST /api/v1/ai/artifacts/:id/exports`

## Status rules

- `requested` if the export was queued but not finished
- `in_progress` while Claude is doing the work
- `completed` when the Notion page exists
- `failed` if Notion rejected the request or the workspace was unavailable

## Never do this

- Do not claim Stage has direct Notion OAuth in v1.
- Do not say “connected to Stage” when the tool is only available inside Claude.
