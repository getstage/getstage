# Stage engine + Refero integration

## Config

stage-engine loads Refero MCP URL and auth from env (see `app` config). Logs show:

```
refero_configured=true refero_mcp_url=https://api.refero.design/mcp
```

## Research workflow hook

`apps/stage-engine/src/research/workflow.rs`:

1. Load research input from Convex
2. `ReferoService::research_context` — search screens + flows
3. `persist_refero_context_images` — hydrate bytes, R2 upload (soft-fail)
4. Build Codex prompt with Refero metadata
5. Parse JSON artifact → enrich → `completeResearchRun` in Convex

## Caps (`refero/service.rs`)

- `MAX_REFERO_SEARCH_RESULTS = 4` per search type
- `MAX_REFERO_IMAGE_FETCHES = 6`
- Skip synthetic ids (`screen-0`, `flow-1`, …) — means parse missed real Refero id

## Parse gaps to fix when debugging

Current `extract_reference_values` keys: `items`, `results`, `screens`, `flows`, `data`.

**Refero search returns `records`** — add `"records"` to this list.

Current `reference_id` keys include `id`, `screenId`, … but Refero screens use **`uuid`** — ensure `uuid` is first for screens.

Flow search uses numeric `id` — stringify for Stage reference id.

Snake_case URL fields: map `thumbnail_url`, `preview_url`, `page_url`, `refero_url`, `site.name`, `site.domain`.

## R2 upload path

`ConvexAssetUploader::upload_research_refero_image`:

1. Mutation `r2:generateUploadUrl` — purpose `research-refero`, returns `{ key, uploadUrl }`
2. HTTP PUT image bytes
3. Mutation `r2:syncMetadata`

Never pass `fileSize: 0`. Validate image magic bytes before upload.

## Convex read path

`getLatestResearchArtifact` → `resolveResearchContentJson` → resolves R2 keys to signed URLs.

**Only** resolve on object keys named `imageUrl`, `thumbnailUrl`, or `url`, and only when value looks like a stored key (contains `/`). Do not resolve arbitrary strings like `"Strong"` or `"v1"`.

## TS artifact contract

`packages/data-ops/src/contracts/research.ts` — full `researchArtifact` with optional `referoContext`.

Parse normalizer: `parseResearchArtifactContent` — double-encoded JSON, matrix score casing, missing envelope fields.

## Testing Refero locally

1. `npx convex dev` in `packages/data-ops`
2. `pnpm dev` in `apps/user-application` (builds data-ops + stage-engine)
3. Run Research on a project with competitors + brief
4. Check stage-engine logs: Refero search → image skip/upload → Codex → artifact saved
5. Research tab should load without parse errors

## When Refero images are missing in UI

Expected until parse + UUID mapping works:

- Artifact still saves with text research
- `referoContext.references` may show "Untitled Refero reference"
- `imageUrl` null on uiPatterns examples

Fix parse (`records`, `uuid`) before expecting R2 screenshots in Research tab.
