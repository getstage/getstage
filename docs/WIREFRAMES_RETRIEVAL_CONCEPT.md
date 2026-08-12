# Wireframes retrieval concept

> **Status:** concept only. Not implemented.  
> **Last updated:** 2026-08-12  
> **Does not replace** the live renderer or sealed workspace isolation. It replaces how components are acquired and how the provider finds them.

Stage must stop asking the model to invent complete pages from skill text and component names. The catalog stores every upstream component. Generate retrieves a few verified hits through Convex RAG. The provider searches; Stage does not pre-pick “the best.”

## Workspace: keep isolation, drop the dump

Do **not** delete the run-local workspace. Delete what we stuff into it.

| Keep | Drop |
|------|------|
| Unique sealed directory, read-only provider, size/path limits, tombstone cleanup | Materializing full library catalogs, recipes, and skill bodies into every run |
| Short screen brief, style-guide snapshot, viewport, output schema | 50k+ character prompts and required-read of the whole pack |
| After RAG: only the retrieved R2 source + example files | Manually duplicated `libraries.json` contracts as the source of truth |
| Deterministic typecheck / browser gates | Model repair for missing props, bad chart `data`, fake lucide names, `NaN` SVG |

The workspace stays a sandbox. It becomes a **thin tray** for the brief plus the files Convex already chose as search hits — not a copy of Aceternity.

## Why the current path fails

Selecting Aceternity today exposes only what is already vendored (often a bento, not `3d-card-effect`). The model gets names, not executable source. Gates check import names, not prop shapes, so `{ sellThrough, reorderRate }` SSR-succeeds and draws `M10 NaN`. Skills are markdown, not compositions.

## Storage

No PostgreSQL unless Convex later fails measured limits.

**R2** — large immutable blobs:

- component / template / block source bundles
- working examples
- screenshots
- CSS / local assets
- optional docs markdown (discovery only, never the executable contract)

**Convex** — searchable index:

- id, library, kind, exports, prop schema
- npm + file dependencies, runtime, static-capture behavior
- compatible intents, visual tags, viewport, license, upstream version
- R2 keys, `verified`, embeddings

Convex points. R2 contains. Vector search never decides whether an export exists, a prop is required, or a dependency is installed.

## Ingest (n8n)

One-shot or scheduled. n8n is the visible automation. It is not the renderer.

```text
Firecrawl map/scrape library sites
  (e.g. https://ui.aceternity.com/components/3d-card-effect)
    → names, tags, screenshots, npx/registry URLs, demo pages
Fetch real source via registry JSON / GitHub
  (demo TSX is not enough — also the files it imports, e.g. 3d-card.tsx)
Upload blobs to R2
Insert Convex row with verified = false
n8n calls Stage verify endpoint (typecheck + sandbox render)
  pass → verified = true
  fail → stays false (catalog keeps it; generate cannot retrieve it)
```

Store the complete library. Do not cap ingest. Unverified rows exist; generate cannot see them.

shadcn MCP is a Cursor helper while building the n8n/registry mapping. Generate never calls MCP or Firecrawl.

## Generate (stage-engine — no n8n, no crawl)

```text
1. Stage applies hard filters to Convex
     selected library | verified | runtime | viewport
2. Provider RAG-searches Convex (queries, tags, screen intent)
3. Hits → fetch those R2 bundles into the thin workspace
4. Provider reads, compares, picks, adapts copy / brand / slots
5. Typecheck + browser validate
     deterministic failures stay local (no model repair)
6. Save only if contract + render + geometry pass
```

Catalog = everything. Prompt = brief + retrieved files only.

## Validation (four levels)

1. **Contract** — allowed imports, real exports, required props, valid data shapes, installed deps.
2. **Render** — no exception, no `NaN`/`Infinity` in SVG/HTML, no visible `\uXXXX`, valid live state.
3. **Geometry** — viewport, no overflow/clip/overlap of primary content.
4. **Visual** — hierarchy, moodboard fit, distinctiveness. Model repair only here.

Live preview and Figma/static capture are separate registry fields. SSR is not both.

## Cutover deletions

Remove, do not wrap:

- full skill injection and full catalog prompts
- name-only quality gates duplicated by typecheck
- model repair for compiler/schema errors
- obsolete mega-prompt / Design-Director branches that exist only to invent pages from names
- git-vendored subset as the only executable library (renderer still compiles retrieved source)

## Out of scope for this concept

- Implementing n8n workflows in this PR
- Convex schema / R2 ingest code
- Deleting `provider_workspace.rs` in this PR
