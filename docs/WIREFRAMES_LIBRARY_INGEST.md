# Wireframes library ingest — single brief

> **Living document.** Last updated: **2026-08-24**.
> **Status:** architecture decided; ingest **not implemented**. No Convex catalog table, no R2 catalog prefix, no verify endpoint, no n8n workflow in git.
> **Audience:** any agent/tool with GitHub + HTTP + Convex + R2 access. Cursor n8n MCP is **not** required.

This file is the ingest playbook. Do not scatter the same plan across new dated snapshots.

| Related doc | Role |
|-------------|------|
| This file | **Ingest:** how to fill the catalog |
| [`WIREFRAMES_COMPONENT_RETRIEVAL_2026-08-12.md`](./WIREFRAMES_COMPONENT_RETRIEVAL_2026-08-12.md) | Generate-time retrieval + record shape + no Postgres |
| [`WIREFRAMES_REAL_REACT_LIBRARIES.md`](./WIREFRAMES_REAL_REACT_LIBRARIES.md) | Product target: real React + Motion + Tailwind |
| [`WIREFRAMES_REAL_REACT_AUDIT.md`](./WIREFRAMES_REAL_REACT_AUDIT.md) | What is already vendored; Firecrawl vs GitHub facts |
| [`packages/wireframe-renderer/manifests/wireframesQualityInventory.ts`](../packages/wireframe-renderer/manifests/wireframesQualityInventory.ts) | Library/skill inventory data |
| [`R2_MIGRATION_FIXES.md`](../R2_MIGRATION_FIXES.md) | Delete → upload → DB; no ghost R2 objects |
| [`packages/data-ops/convex/ARCHITECTURE.md`](../packages/data-ops/convex/ARCHITECTURE.md) | Convex package layout |

---

## 1. Two loops (do not mix)

```text
INGEST  (offline, scheduled or one-shot — n8n / script / other agent)
  Firecrawl and/or GitHub registry.json
    → R2: source, examples, screenshots, CSS
    → Convex: metadata + embeddings, verified = false until Stage verify
  Nobody is waiting on a wireframe.

GENERATE  (user hits Stage — stage-engine)
  Hard filter Convex (library | verified | runtime | viewport)
    → RAG a few hits
    → fetch those R2 bundles
    → model adapts copy / brand / bounded slots
    → typecheck + browser
    → save
  No Firecrawl. No GitHub. No n8n.
```

Store the **full** catalog. Give generate **a few** hits. Dumping every component into the prompt is the 52k-character failure mode.

Workspace isolation for generate **stays**. Catalog dumps into the prompt **go**.

---

## 2. Tools you can use

Pick **one** orchestrator. The taps are the same.

| Tool | Use it for | Do not use it for |
|------|------------|-------------------|
| **Any HTTP agent** (your current “has access to everything” tool) | Crawl, fetch registry JSON, unzip `files[]`, upload R2, insert Convex | Replacing Stage typecheck/render |
| **n8n** (`https://getstage.app.n8n.cloud`) | Visible cron, retries, run history | Sandbox render, SVG/NaN gates |
| **Firecrawl** | Map/scrape component **pages** when there is no registry (names, tags, screenshots, demo URLs) | Source of truth for TSX (docs markdown is not code) |
| **GitHub raw / API** | `registry.json` + per-item JSON (`files[]`) | Firecrawl of sites that block crawlers |
| **Existing script** `packages/wireframe-renderer/scripts/vendor-registry.mjs` | Proven fetch + adapt for Kokonut / Magic UI / React Bits | Writing into git forever — ingest should write **R2 + Convex**, not more vendor files |
| **Stage verify** (to build) | Typecheck + fixture/browser render → set `verified: true` | Skipping this and marking everything verified |
| **Convex** | Index, filters, embeddings | Storing full TSX blobs |
| **Cloudflare R2** | Immutable bundles | Search |

n8n is optional glue. If another tool already has Firecrawl + GitHub + Convex + R2, use that. Do not block ingest on Cursor MCP OAuth.

---

## 3. Per-library taps (measured 2026-08-11)

Discovery is **one index per registry**, then `GET` each item JSON (real `files[]`, not markdown).

| Library | How to ingest | Index / source | Notes |
|---------|---------------|----------------|-------|
| **Kokonut UI** | Registry | `https://kokonutui.com/r/registry.json` → `/r/<name>.json` | ~40 in index (9 static-safe / 31 motion). Script: `vendor-registry.mjs` `kokonut-ui` |
| **Magic UI** | Registry | `https://magicui.design/registry.json` → `https://magicui.design/r/<name>.json` | ~246 items. Keyframes often inline in JSON `css` |
| **React Bits** | **GitHub only** | `https://raw.githubusercontent.com/DavidHDev/react-bits/main/public/r/registry.json` → `…/public/r/<PascalName>-TS-TW.json` | Site Firecrawl **fails**. 660 items / **165 unique**. Prefer `*-TS-TW`. MIT + Commons Clause — legal review before ship |
| **shadcn/ui** | Registry | `https://ui.shadcn.com` / shadcn registry items | Already the Stage base pack; still catalog-complete if we ingest the rest |
| **Origin UI** | Registry / GitHub | Fetchable (audit: fully fetchable) | `https://github.com/shadcn/originui` |
| **cult-ui** | Registry | Throttled **429** | Placeholder icon only; not a pack yet |
| **Aceternity UI** | Firecrawl `/components/*` + `npx`/registry URL | Paid subset **401** | Need demo **and** the imported file (e.g. `3d-card.tsx`). Do not pretend the website is executable |
| **bklit** | npm / GitHub | `https://bklit.com/` | Do not docs-scrape as source |
| **coss/ui** | Skip for Tailwind renderer | `https://coss.com/ui` | Base UI, not Tailwind — second styling stack |
| **Mantine** | npm / GitHub | Already a thin Stage slot | Package source, not marketing pages |

Fixture render is the **final** ingest gate. Deps lists miss hidden imports (`next-themes`, etc.).

---

## 4. What goes where

### R2 (blobs)

Suggested prefix (does not exist yet — invent and use one consistently):

`catalog/libraries/<libraryId>/<componentId>/<version>/`

Store:

- source bundle (all TSX/TS files from registry `files[]`)
- working example
- screenshots / previews
- extra CSS
- optional docs scrape (secondary)

Wireframe **run** artifacts already use `wireframes/projects/…`. Keep catalog keys **separate** so project cleanup cannot delete the library.

R2 rule: replace = delete old object → upload new → update Convex keys ([`R2_MIGRATION_FIXES.md`](../R2_MIGRATION_FIXES.md)).

### Convex (index)

No table yet. Add one (name TBD, e.g. `wireframeCatalogComponents`) with at least:

```ts
{
  id: "aceternity/google-gemini-effect",
  library: "aceternity-ui",
  kind: "hero-effect",
  sourceBundleKey: "r2-key",
  exampleBundleKey: "r2-key",
  screenshotKey: "r2-key",
  exports: ["GoogleGeminiEffect"],
  propsSchema: {},
  npmDependencies: ["motion/react"],
  fileDependencies: [],
  runtime: "client",
  staticCapture: { supported: true, restingState: "complete-paths" },
  viewportRequirements: { minHeight: "400vh", overflow: "clip" },
  compatibleIntents: ["marketing-hero", "ai-product"],
  visualTags: ["dark", "technical", "animated-paths"],
  sourceUrl: "upstream URL",
  license: "verified license",
  upstreamVersion: "version",
  verified: false, // true only after Stage verify
  embedding: /* Convex vector */
}
```

Full field list: retrieval doc § Required registry record.

Deterministic filters **before** vector search: selected library → verified → runtime → installed deps → screen/block intent → **then** embeddings.

Unverified rows stay in the catalog. Generate must not retrieve them.

---

## 5. Files in this repo (read these)

### Must-read for ingest

| Path | Why |
|------|-----|
| `docs/WIREFRAMES_LIBRARY_INGEST.md` | This brief |
| `docs/WIREFRAMES_COMPONENT_RETRIEVAL_2026-08-12.md` | Generate contract + record JSON |
| `packages/wireframe-renderer/scripts/vendor-registry.mjs` | Working fetch/adapt for 3 libraries |
| `packages/wireframe-renderer/manifests/libraries.json` | What Stage **already** exports |
| `packages/wireframe-renderer/manifests/wireframesQualityInventory.ts` | Upstream URLs, gaps, React Bits GitHub note |
| `packages/data-ops/convex/schema.ts` | Where the new catalog table will live |
| `packages/data-ops/convex/lib/r2/` | How Stage uploads/deletes R2 today |
| `packages/data-ops/convex/ARCHITECTURE.md` | Handler layout |

### Generate / renderer (do not confuse with ingest)

| Path | Why |
|------|-----|
| `apps/stage-engine/src/wireframes/` | Run workspace, prompt, render, offload `liveUrl` |
| `packages/wireframe-renderer/src/cli.ts` | Virtual `@stage/*` imports, live esbuild, static Figma path |
| `apps/user-application/src/lib/settings/skillsCatalog.ts` | UI pack list |
| `apps/user-application/docs/AI/wireframes/WIREFRAMES_BUILD_PLAN.md` | Older product plan (screens, brand kit) |

### Not product / ignore

| Path | Why |
|------|-----|
| `.firecrawl/` | Untracked scrapes, not the catalog |
| `.cursor/mcp.json` | Editor wiring only |
| n8n cloud workflows | Not in git yet |

---

## 6. Ingest pipeline (implementation order)

```text
1. Enable Convex table + vector index + mutations (insert/update, never silent overwrite without version).
2. For each library in the table above:
     a. Fetch index (registry.json or Firecrawl map).
     b. For every item: fetch item JSON / GitHub file.
     c. Zip files[] → R2 source bundle.
     d. Optional: screenshot from demo URL → R2.
     e. Convex row, verified = false, embedding from name+tags+intents+exports.
3. Stage verify job (script or HTTP):
     typecheck + fixture render (+ geometry/SVG/Unicode later)
     pass → verified = true
     fail → stay false, store lastError.
4. Only then wire generate to query Convex (separate PR).
```

Do **not** `npm install` random packages inside stage-engine at run time. Persist **source files**.

---

## 7. Honest current state (2026-08-24)

**Done in product (not this catalog):** live React preview, sealed run workspace, subset vendored into `packages/wireframe-renderer/src/libraries/*`, React Bits pack (7 fixture-gated components), Magic UI / Kokonut expanded vs the old 4-file cosplay.

**Not done:** complete library ingest, Convex catalog, R2 catalog prefix, verify endpoint, generate-time RAG, n8n workflow in repo.

**Do not claim:** IEC/IVD, “all of Aceternity”, or that selecting a pack in the UI loads the upstream site.

---

## 8. Linear task mapping

Linear: **Building the automation to ingest the component libraries** (AI Generations).

That card is **this ingest loop only**. “Perfect Hi-Fi and fast” is generate after the catalog exists.
