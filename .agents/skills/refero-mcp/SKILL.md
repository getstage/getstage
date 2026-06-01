---
name: refero-mcp
description: >-
  Use Refero MCP for design research in Stage — styles, screens, flows, and
  screenshots. Load when working on Stage Research, refero integration in
  stage-engine, Refero parse/upload bugs, R2 image persistence, refero_search_* /
  refero_get_* tools, or when the user links doc.refero.design MCP docs.
---

# Refero MCP (Stage)

Refero gives agents **real product design research**: styles (visual direction), screens (UI patterns), flows (multi-step journeys). Stage Research uses Refero before Codex to ground artifacts in shipped patterns.

Official docs (source of truth):
- [Getting started](https://doc.refero.design/mcp/getting-started)
- [Tools](https://doc.refero.design/mcp/tools)
- [Data model](https://doc.refero.design/mcp/data-model)

Read `references/stage-engine-integration.md` when changing Rust/Convex code.
Read `references/tools-and-workflows.md` for tool params and research order.
Read `references/data-model.md` for field names and ID types.

## Stage Research flow

```
Research form → Convex context
  → stage-engine Research workflow
  → Refero MCP (5 category screen searches + 1 flow search + images)
  → R2 upload (research-refero) for screenshot bytes
  → Codex → text sections only (competitors, personas, opportunities)
  → Engine builds uiPatterns rows from Refero category buckets
  → researchArtifact JSON → Convex
  → React Research tab
```

Refero is **not** used in Stage chat (`mode: chat`). Only Research workflow.

## Three layers — when to use which

| Layer | MCP tools | Use for |
|-------|-----------|---------|
| **Styles** | `refero_search_styles`, `refero_get_style` | Typography, color, spacing, surfaces, brand feel |
| **Screens** | `refero_search_screens`, `refero_get_screen`, `refero_get_screen_image`, `refero_get_similar_screens` | Concrete UI: pricing, checkout, dashboards, empty states |
| **Flows** | `refero_search_flows`, `refero_get_flow` | Onboarding, cancellation, checkout sequences |

For Stage Research today: **screens + flows** are implemented in `ReferoService`. Five **category-targeted** screen searches map to UI Patterns rows (`onboarding`, `homepage`, `pricing`, `checkout`, `dashboard`). Styles are not wired yet.

## Critical ID and response rules

These cause production bugs if ignored:

1. **Screen IDs are UUIDs** — field name is `uuid`, not `id` or `screenId`. Use with `refero_get_screen_image` / `refero_get_screen`.
2. **Flow IDs are numbers** — field `id` (e.g. `11201`). Use with `refero_get_flow`.
3. **Search responses use `records`** — paginated shape `{ pagination, records: [...] }`. Do not assume `items`, `results`, or bare arrays only.
4. **Snake_case from API** — `thumbnail_url`, `preview_url`, `page_url`, `refero_url`, `page_types`, `ux_patterns`, `ui_elements`, `screens_count`.
5. **Never call `refero_get_screen_image` with synthetic IDs** like `screen-0` — that means parse failed.
6. **Image tool** — `refero_get_screen_image` with `screen_id` (UUID) and `image_size`: `"thumbnail"` | `"full"`. Only for visual inspection; Stage persists `full` to R2.

## Stage persistence (R2)

When Refero returns valid screenshot bytes:

1. stage-engine calls Convex `r2:generateUploadUrl` (`purpose: research-refero`, `scopeId: projectId`)
2. HTTP PUT bytes to presigned URL
3. Convex `r2:syncMetadata`
4. Artifact stores full/lightbox target in `imageUrl` (R2 key preferred, then `preview_url`, then `thumbnail_url`) and carousel source in `thumbnailUrl`
5. On read, Convex resolves R2 keys → signed URLs **only** on `imageUrl`, `thumbnailUrl`, `url` fields; `https://` values pass through unchanged

Upload is **soft-fail**: bad/missing images must not abort Research.

## Request budget (Refero Pro)

~8,000 MCP calls/month. Stage caps per run (see stage-engine `ReferoService`):
- 5 category screen searches (3 hits each, deduped)
- 1 flow search (4 hits)
- Up to 15 `refero_get_screen_image` fetches (category order)

Keep queries specific per category; avoid one mega-query mixing onboarding + checkout.

## Common mistakes (Refero + Stage)

| Mistake | Fix |
|---------|-----|
| Parse search without `records` | Read `records` array from search JSON |
| Map screen id from `id` | Use `uuid` |
| Treat flow `id` as string UUID | Flow `id` is numeric |
| Pass `limit` to search tools | Use `page` pagination only on search |
| Pass `image_size` to `refero_get_screen` | Only on `refero_get_screen_image` |
| Old tool names with `_tool` suffix | Use current names from tools doc |
| Round-robin images into uiPatterns | Engine builds rows in `refero_assets.rs` by category |
| Resolve every string as R2 key in Convex | Only resolve url fields that contain `/` path keys |
| Hard-fail Research on R2 upload error | Log, skip upload, use Refero CDN fallback on `imageUrl` |
| One broad Refero search for all UI Patterns | Five category queries in `research/context.rs` |

## Implementation map (Stage monorepo)

| Area | Path |
|------|------|
| MCP client | `apps/stage-engine/src/refero/client.rs` |
| Parse / unwrap MCP JSON | `apps/stage-engine/src/refero/parse.rs` |
| Search + image hydrate | `apps/stage-engine/src/refero/service.rs` |
| R2 upload | `apps/stage-engine/src/research/refero_assets.rs`, `convex_store/asset_upload.rs` |
| Research workflow | `apps/stage-engine/src/research/workflow.rs` |
| Category queries | `apps/stage-engine/src/research/context.rs` |
| UI Patterns builder | `apps/stage-engine/src/research/refero_assets.rs` (`build_ui_patterns_from_refero`) |
| TS contracts | `packages/data-ops/src/contracts/refero.ts` (`referoUiPatternCategorySchema`, `referoCategorySearchSchema`) |
| R2 rules | `packages/data-ops/convex/r2.ts`, `src/shared/uploadRules.ts` |
| Artifact parse | `packages/data-ops/src/contracts/parseResearchArtifact.ts` |

When fixing Refero parse: add `records` to extractors and `uuid` as first-class id for screens; validate UUID format before image fetch.

## Agent checklist — Refero in Research

1. Confirm `REFERO_*` / MCP auth configured in stage-engine env.
2. Run **five category screen searches** (not one broad query).
3. Parse `records`; map `uuid` → screen reference id; set `uiPatternCategory`.
4. Fetch images only for valid UUIDs; upload to R2 or skip (CDN fallback on artifact)
5. Pass flow metadata + category summaries into Codex prompt (**Codex does not author uiPatterns**).
6. Engine builds `uiPatterns` from `categorySearches`; save artifact with `referoContext`.
