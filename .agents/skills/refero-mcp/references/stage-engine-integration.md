# Stage engine + Refero integration

## Config

stage-engine loads Refero MCP URL and auth from env (see `app` config). Logs show:

```
refero_configured=true refero_mcp_url=https://api.refero.design/mcp
```

## Research workflow hook

`apps/stage-engine/src/research/workflow.rs`:

1. Load research input from Convex
2. `ReferoService::research_context_for_categories` — 5 screen searches + 1 flow search
3. `persist_refero_context_images` — hydrate bytes per category bucket, R2 upload (soft-fail)
4. Build Codex prompt with Refero metadata (**Codex skips uiPatterns**)
5. Parse JSON artifact → `apply_engine_ui_patterns` → enrich → `completeResearchRun` in Convex

## Caps (`refero/service.rs`)

- 5 category screen searches × 3 hits each (deduped by UUID across categories)
- 1 flow search × 4 hits
- `MAX_REFERO_IMAGE_FETCHES = 15` (category order)
- Skip synthetic ids (`screen-0`, `flow-1`, …) — means parse missed real Refero id

## Category queries (`research/context.rs`)

Fixed rows map to Refero searches:

| Category | Query pattern (includes industry + client) |
|----------|---------------------------------------------|
| `onboarding` | B2B wholesale signup onboarding setup wizard account request |
| `homepage` | B2B wholesale marketing homepage landing hero product |
| `pricing` | B2B pricing page plan comparison subscription tiers |
| `checkout` | B2B mobile checkout payment order review cart |
| `dashboard` | B2B wholesale dashboard admin catalog approval queue |

## UI Patterns assembly (`refero_assets.rs`)

- `build_ui_patterns_from_refero` — one group per non-empty category bucket
- Row title = category display name (Onboarding, Homepage, …)
- Example `sourceReferenceId` = Refero screen UUID
- `imageUrl` priority: R2 upload key → `reference.image_url` (preview) → `reference.thumbnail_url` (search CDN)
- `thumbnailUrl`: search thumbnail when present; React carousel uses this, lightbox uses `imageUrl`
- Codex output `uiPatterns` is **replaced** by engine-built rows

## TS / Zod contracts (`packages/data-ops/src/contracts/refero.ts`)

- `referoUiPatternCategorySchema` — enum of five row categories
- `referoCategorySearchSchema` — `{ category, query, references[] }`
- `referoContextSchema.categorySearches` — persisted on artifact
- `referoReferenceBaseSchema.uiPatternCategory` — optional bucket tag on screen refs

Validated on read via `researchArtifactSchema` + `parseResearchArtifactContent`.

## Parse gaps to fix when debugging

Search payloads nest hits under **`records`**. Screen id field is **`uuid`**. Flow id is numeric `id`.

Snake_case URL fields: `thumbnail_url`, `preview_url`, `page_url`, `refero_url`, `site.name`, `site.domain`.

## R2 upload path

`ConvexAssetUploader::upload_research_refero_image`:

1. Mutation `r2:generateUploadUrl` — purpose `research-refero`, returns `{ key, uploadUrl }`
2. HTTP PUT image bytes
3. Mutation `r2:syncMetadata`

Never pass `fileSize: 0`. Validate image magic bytes before upload.

## Convex read path

`getLatestResearchArtifact` → `resolveResearchContentJson` → resolves R2 keys to signed URLs.

**Only** resolve on object keys named `imageUrl`, `thumbnailUrl`, or `url`, and only when value looks like a stored key (contains `/`, not `https://`).

Refero CDN URLs in `imageUrl` / `thumbnailUrl` are stored as-is and render without R2 resolution.

## UI read mapping (`mapResearchArtifactToTabData.ts`)

- Carousel: `group.examples[].thumbnailUrl ?? imageUrl`
- Lightbox: `group.examples[].imageUrl ?? thumbnailUrl`
- Patterns Recognised: tag labels only — do not repeat `group.summary` on every tag row
- Target Users: `joinSentences()` on goals/frustrations to avoid double periods (`..`)

## Testing Refero locally

1. `npx convex dev` in `packages/data-ops`
2. `pnpm dev` in `apps/user-application` (builds data-ops + stage-engine)
3. Run Research on a project with competitors + brief
4. Check stage-engine logs: `category_buckets=5`, image upload → Codex → artifact saved
5. Research tab: 5 UI Patterns rows with distinct carousels

## When Refero images are missing in UI

- Artifact still saves with text research
- Empty category bucket → row omitted from `uiPatterns`
- `referoContext.references` with synthetic ids → parse failure; fix `records` + `uuid` mapping
- `imageUrl: null` on old artifacts → re-run Research after CDN fallback fix
- `refero_images=0` with `screen_hits > 0` → check artifact for Refero CDN URLs before assuming total failure
