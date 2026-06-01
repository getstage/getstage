# Refero MCP tools and workflows

Source: [Refero MCP tools](https://doc.refero.design/mcp/tools)

Server URL: `https://api.refero.design/mcp`  
Auth: Bearer token or OAuth (Refero Pro required, ~8000 calls/month).

## Styles

### `refero_search_styles`

| Param | Required | Notes |
|-------|----------|-------|
| `query` | yes | Semantic: domain, aesthetic, product category |
| `page` | no | Default 1 |
| `response_format` | no | `md` or `json` |

Returns `{ pagination, records[] }` with style summaries.

### `refero_get_style`

| Param | Required | Notes |
|-------|----------|-------|
| `style_id` or `style_ids` | yes | Style UUID(s); batch max ~3–4 |

## Screens

### `refero_search_screens`

| Param | Required | Notes |
|-------|----------|-------|
| `query` | yes | Screen type, pattern, company, on-screen text |
| `platform` | yes | `web` or `ios` |
| `page` | no | Pagination only — **no** `limit`, `offset`, `image_size`, `include_similar` |

Good queries: `pricing page annual monthly toggle`, `dashboard empty state`, `billing settings cancellation modal`.

### `refero_get_screen`

`screen_id` or `screen_ids` — UUID(s) from search.

### `refero_get_similar_screens`

`screen_id` (UUID), optional `limit` 1–20.

### `refero_get_screen_image`

| Param | Required | Notes |
|-------|----------|-------|
| `screen_id` | yes | Screen **UUID** |
| `image_size` | no | `thumbnail` (default) or `full` |

Stage Research uses `full` for R2 persistence.

## Flows

### `refero_search_flows`

Same pagination pattern as screens: `query`, `platform`, optional `page`.

Good queries: `subscription cancellation retention`, `checkout promo code`, `signup onboarding`.

### `refero_get_flow`

`flow_id` (number) or `flow_ids` (number[]).

## Recommended research order

1. **Styles** (optional) — visual direction for marketing/product chrome.
2. **Screens** — concrete patterns for the brief (pricing, checkout, dashboard).
3. **Flows** — when journey sequence matters (onboarding, cancel, B2B approval).
4. **`refero_get_screen_image`** — only for top 4–6 screens worth showing in artifact UI.
5. **`refero_get_similar_screens`** — expand one strong screen hit.

## Stage Research workflow (minimal)

```
refero_search_screens(query, platform=web)
refero_search_flows(query, platform=web)
for each screen uuid (cap 6):
  refero_get_screen_image(screen_id=uuid, image_size=full)
  → upload bytes to R2 (research-refero)
embed referoContext + metadata in Codex prompt
```

## Common API mistakes

- Old names like `refero_search_screens_tool` — use current names.
- `get_design_guidance` — removed; use styles/screens/flows.
- Numeric screen IDs — invalid; screens are UUIDs.
- Passing search-only params to detail tools.

## MCP response handling in Stage

Refero may return:

- JSON in MCP `content[].text`
- `structuredContent`
- Wrapped `result`

Stage unwrap order (`refero/parse.rs`): `structuredContent` → `result` → parse text JSON → arrays.

Search payloads nest hits under **`records`**, not only top-level arrays. Always check:

```json
{ "pagination": { ... }, "records": [ ... ] }
```

Extract screen id: `record.uuid`  
Extract flow id: `String(record.id)`  
Extract thumbnails: `thumbnail_url`, `preview_url`  
Extract product: `site.name`, `site.domain`
