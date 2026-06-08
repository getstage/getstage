# Stage Exporter Figma Plugin

This plugin is the thin canvas-write adapter for Stage wireframe exports.

## Local development

```bash
pnpm --filter @stage/figma-exporter build
```

In Figma Desktop, import `apps/figma-exporter/manifest.json` as a development plugin.

Set `STAGE_API_BASE` during the build when targeting a different Convex HTTP deployment. Update the matching domain in `manifest.json` before publishing the plugin.

The plugin never receives the user's Stage session or Figma OAuth token. It claims one export job with a short-lived pairing code and verifies `figma.currentUser.id` against the Figma account connected through Stage OAuth.
