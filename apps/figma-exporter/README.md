# Stage Exporter Figma Plugin

This plugin is the thin canvas-write adapter for Stage wireframe exports.

## Local development

```bash
# Production (default) — publish / org-distribute this build
pnpm --filter @stage/figma-exporter build

# Local against testing Convex
pnpm --filter @stage/figma-exporter build:dev
```

In Figma Desktop, import `apps/figma-exporter/manifest.json` as a development plugin.

Default `STAGE_API_BASE` is production (`https://quirky-snail-763.convex.site`). The build rewrites `manifest.json` `networkAccess.allowedDomains` to match. Do **not** publish a plugin whose allowlist still points at `reliable-bullfrog-917` (dev).

Leave `"api": "1.0.0"` alone — that is the Figma Plugin API version, not the Stage app version. Bump `package.json` `version` when you republish.

The plugin never receives the user's Stage session or Figma OAuth token. It claims one export job with a short-lived pairing code and verifies `figma.currentUser.id` against the Figma account connected through Stage OAuth.
