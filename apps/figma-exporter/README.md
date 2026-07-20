# Stage Exporter Figma Plugin

This plugin is the thin canvas-write adapter for Stage wireframe exports.

## End users (production)

Install the approved Community plugin — **not** a local zip / Development manifest:

https://www.figma.com/community/plugin/1652796428495766813/stage

Stage Settings → Integrations opens that listing. Plugin id in `manifest.json` must stay `1652796428495766813`.

## Local development

```bash
# Production allowlist zip (quirky-snail Convex) — for publishing / QA vs prod
pnpm --filter @stage/figma-exporter release:zip

# Local Stage (`pnpm dev` / reliable-bullfrog) — Development import only
pnpm --filter @stage/figma-exporter release:zip:dev
```

Outputs (dev/publish tooling — not the in-app user path):
- `apps/figma-exporter/stage-exporter-<version>.zip`
- `apps/figma-exporter/stage-exporter-<version>-testing.zip` for local desktop

In Figma Desktop (dev only): Plugins → Development → Import plugin from manifest… → unzipped `manifest.json`.

**Env mismatch:** Local Stage creates pairing jobs on testing Convex. The Community / production plugin claims against production. That shows up as “pairing code not found or expired.” Use the `-testing` zip with `pnpm dev`.

Default `STAGE_API_BASE` is production (`https://quirky-snail-763.convex.site`). The build rewrites `manifest.json` `networkAccess.allowedDomains` to match. Do **not** publish a plugin whose allowlist still points at `reliable-bullfrog-917` (dev).

Leave `"api": "1.0.0"` alone — that is the Figma Plugin API version, not the Stage app version. Bump `package.json` `version` when you republish.

The plugin never receives the user's Stage session or Figma OAuth token. It claims one export job with a short-lived pairing code and verifies `figma.currentUser.id` against the Figma account connected through Stage OAuth.
