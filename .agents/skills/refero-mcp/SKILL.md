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
  → Refero MCP (search + optional images)
  → R2 upload (research-refero) for screenshot bytes
  → Codex → researchArtifact JSON → Convex
  → React Research tab
```

Refero is **not** used in Stage chat (`mode: chat`). Only Research workflow.

## Three layers — when to use which

| Layer | MCP tools | Use for |
|-------|-----------|---------|
| **Styles** | `refero_search_styles`, `refero_get_style` | Typography, color, spacing, surfaces, brand feel |
| **Screens** | `refero_search_screens`, `refero_get_screen`, `refero_get_screen_image`, `refero_get_similar_screens` | Concrete UI: pricing, checkout, dashboards, empty states |
| **Flows** | `refero_search_flows`, `refero_get_flow` | Onboarding, cancellation, checkout sequences |

For Stage Research today: **screens + flows** are implemented in `ReferoService`. Styles are not wired yet — add if visual-direction research is needed.

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
4. Artifact stores **R2 object key** in `imageUrl` / `thumbnailUrl` (not Refero CDN URL)
5. On read, Convex resolves keys → signed URLs **only** on `imageUrl`, `thumbnailUrl`, `url` fields

Upload is **soft-fail**: bad/missing images must not abort Research.

## Request budget (Refero Pro)

~8,000 MCP calls/month. Stage caps per run (see stage-engine `ReferoService`):
- 4 screen searches + 4 flow searches (compact list)
- Up to 6 `refero_get_screen_image` fetches

Keep queries specific; avoid redundant get_screen calls when search metadata is enough.

## Common mistakes (Refero + Stage)

| Mistake | Fix |
|---------|-----|
| Parse search without `records` | Read `records` array from search JSON |
| Map screen id from `id` | Use `uuid` |
| Treat flow `id` as string UUID | Flow `id` is numeric |
| Pass `limit` to search tools | Use `page` pagination only on search |
| Pass `image_size` to `refero_get_screen` | Only on `refero_get_screen_image` |
| Old tool names with `_tool` suffix | Use current names from tools doc |
| Resolve every string as R2 key in Convex | Only resolve url fields that contain `/` path keys |
| Hard-fail Research on R2 upload error | Log, skip image, continue to Codex |

## Implementation map (Stage monorepo)

| Area | Path |
|------|------|
| MCP client | `apps/stage-engine/src/refero/client.rs` |
| Parse / unwrap MCP JSON | `apps/stage-engine/src/refero/parse.rs` |
| Search + image hydrate | `apps/stage-engine/src/refero/service.rs` |
| R2 upload | `apps/stage-engine/src/research/refero_assets.rs`, `convex_store/asset_upload.rs` |
| Research workflow | `apps/stage-engine/src/research/workflow.rs` |
| TS contracts | `packages/data-ops/src/contracts/refero.ts` |
| R2 rules | `packages/data-ops/convex/r2.ts`, `src/shared/uploadRules.ts` |
| Artifact parse | `packages/data-ops/src/contracts/parseResearchArtifact.ts` |

When fixing Refero parse: add `records` to extractors and `uuid` as first-class id for screens; validate UUID format before image fetch.

## Agent checklist — Refero in Research

1. Confirm `REFERO_*` / MCP auth configured in stage-engine env.
2. Search with concrete UX queries (not generic "e-commerce").
3. Parse `records`; map `uuid` → screen reference id.
4. Fetch images only for valid UUIDs; upload to R2 or skip.
5. Pass text metadata + Refero context into Codex prompt.
6. Save artifact with `referoContext` embedded; wire `imageUrl` keys where uploaded.
