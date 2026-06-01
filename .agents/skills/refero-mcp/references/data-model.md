# Refero data model (condensed)

Source: [Refero MCP data model](https://doc.refero.design/mcp/data-model)

## ID types

| Entity | ID field | Type | Image tool |
|--------|----------|------|------------|
| Style | `uuid` | UUID string | preview via style record |
| Screen | `uuid` | UUID string | `refero_get_screen_image` |
| Flow | `id` | **number** | thumbnails on steps |

Do not use numeric IDs for screens. Do not use UUIDs for flows.

## Search vs detail

| Layer | Search | Detail |
|-------|--------|--------|
| Styles | `refero_search_styles` | `refero_get_style` |
| Screens | `refero_search_screens` | `refero_get_screen` |
| Flows | `refero_search_flows` | `refero_get_flow` |

Search returns compact **records**; detail returns rich metadata and longer descriptions.

## Styles (search record)

- `uuid`, `title`, `url`, `platform` (usually `desktop`)
- `preview_url`, `description`

Full style adds: `northStar`, `theme`, `colors`, `typography`, `typeScale`, `spacing`, `layout`, `elevation`, `components`, `imagery`, `dos`, `donts`, `customSections`.

## Screens (search record)

- `uuid`, `platform` (`web` | `ios`)
- `thumbnail_url`, `page_url`, `refero_url`
- `site` — `{ id, domain, name, description, categories, refero_url }`
- `page_types`, `ux_patterns`, `ui_elements`
- `hex_colors`, `colors` (optional)
- `content.description` (and `layout`, `functions` in detail)

Detail adds: `preview_url`, `fonts`, `flows` (related flow refs).

## Flows (search record)

- `id` (number), `platform`, `name`, `screens_count`
- `refero_url`, `description`, `problem`
- `steps` — compact step name list in search
- `site` — product metadata

Detail `steps[]` includes: `name`, `screen_id` (UUID), `refero_url`, `thumbnail_url`, `goal`, `action`, `system_response`, `page_types`, `ux_patterns`, `ui_elements`, `content`.

## Images

- `refero_get_screen` → text metadata only
- `refero_get_screen_image` → raw bytes/base64; params: `screen_id`, `image_size` (`thumbnail` | `full`)

## Platform notes

- Screen/flow search: `platform` = `"web"` or `"ios"` (required on search).
- Style search: no platform param.
- Stage maps `ReferoPlatform::Web` → `"web"` for screen/flow search.

## Mapping to Stage `ReferoReference`

Stage normalizes MCP records into `packages/data-ops/src/contracts/refero.ts`:

- `id` — must be real Refero id (`uuid` or flow numeric id as string)
- `kind` — `screen` | `flow` | `style`
- `uiPatternCategory` — optional; `onboarding | homepage | pricing | checkout | dashboard` for screens bucketed by engine
- `title`, `productName`, `productUrl`, `platform`, `sourceUrl`
- `thumbnailUrl`, `imageUrl` — after R2 upload, object keys; before upload, Refero CDN URLs if present
- `tags` — from `page_types`, `ux_patterns`, or API tags
- `screenType`, `flowType`, `stepCount`, `styleType` — kind-specific optional fields

When parsing MCP JSON, prefer API snake_case fields before inventing camelCase aliases.
