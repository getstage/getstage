# Stage Wireframe Renderer

Private monorepo package that renders model-generated TSX to Stage's existing static HTML-fragment contract.

## Contract

The CLI reads one JSON batch from stdin:

```json
{
  "version": 1,
  "baseLibraryId": "shadcn-ui",
  "sectionsLibraryId": "magic-ui",
  "screens": [{ "id": "home", "tsx": "..." }]
}
```

Generated TSX imports the selected Base library from `@stage/base` and the optional Sections library from `@stage/sections`. The renderer resolves those virtual imports, renders React with `react-dom/server`, compiles Tailwind once for the batch, and returns self-contained HTML fragments. A failed screen returns an error and never replaces its HTML fallback.

## Sources

`src/components/ui` is installed from the official shadcn registry. Kokonut UI, Magic UI, and Aceternity UI sources are installed from their official shadcn-compatible registries. Origin UI sources come from the official `shadcn/originui` repository. Mantine is consumed from its official npm package. `manifests/libraries.json` defines the exports exposed to generation prompts.
