# Project AI domain helpers

Pure TypeScript helpers for `projectAi` — **no** `query` / `mutation` / `action` exports.

Convex endpoints are registered only in `convex/projectAi.ts`. Handlers live per step in `convex/lib/projectAi/<step>/` (plus `mcp/` for AI tools); background jobs in `convex/workflows/`.
