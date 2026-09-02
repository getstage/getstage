# Hi-Fi wireframes — live failures and hard caps

Living list of what actually broke in the Nebius/RAG worktree (late August 2026), plus every Stage-imposed cap that can kill a generate. Not a plan. Read this before raising another silent limit.

Companion map: [`WIREFRAMES_GENERATION_CODEMAP.md`](./WIREFRAMES_GENERATION_CODEMAP.md).

---

## What went wrong in the live runs

### 1. Empty TSX because output tokens ran out (Signup, one-screen Nebius)

**What you saw:** gateway HTTP 502, `provider_malformed_output` then `provider_no_data`.

**What actually happened:** DeepSeek used the whole completion budget on hidden reasoning. `content` was empty. `finish_reason` was `length`. Nebius defaults `max_tokens` to **8192** if the request omits it. That 8192 is a Nebius default, not a Stage constant we used to send.

**What we changed:** gateway now sends `max_tokens` and `max_completion_tokens` (default **32768**, `NEBIUS_MAX_TOKENS`) and `reasoning_effort=minimal`. Raising the cap does not shrink the 71k prompt. A later run can still think until this new cap.

Files: `apps/wireframe-ai-gateway/src/generator.rs`, `apps/wireframe-ai-gateway/src/config.rs`.

### 2. RAG does not force Magic UI (or any selected pack) onto the screen

**What you saw:** Magic UI selected under “Page sections.” Signup and Approval still had no Magic UI file.

**What actually happened:** selected packs (`kokonut-ui`, `magic-ui`, `bklit`) are searched as **one pile**. Convex vector search returns the nearest neighbours by score. There is no quota per pack. For Signup the top hits were Kokonut (avatar-picker, bento, …) and Bklit charts. Magic UI lost on similarity. The engine then keeps only the **top 6** bundles for the model (`MAX_MODEL_BUNDLES_PER_SCREEN`). If a Magic UI file was 7th, Nebius never saw it.

The UI has three slots (base / page sections / charts). Retrieval ignores those slots.

Files: `apps/stage-engine/src/wireframes/workflow.rs` (`materialize_catalog_context`, `compact_model_bundles`), `packages/data-ops/convex/lib/wireframeCatalog/handlers.ts` (`searchCatalogHandler`).

### 3. Model copies `@/components/ui/button` (shadcn-style paths)

**What you saw:** first TSX imported `@/components/ui/button`, `card`, `input`. Renderer: “Could not resolve …/catalog/components/ui/button”.

**What actually happened:** Kokonut (and similar) source **contains** those import lines. The gateway preamble says the model may import exact `@/components/...` paths from the bundles. The model copied them into the **screen** file. Those primitive files were not written into the render batch (entry file only per bundle, and shadcn primitives were never a retrieved hit). That is not “we switched the project to shadcn.” It is copy-paste of an import string that appeared in the prompt.

Repair then deleted the broken imports and redrew `<button>` / `<input>` in Tailwind. After repair the screen compiles and **does not mount the catalog component**.

Prompt: `apps/wireframe-ai-gateway/src/generator.rs` (`PREAMBLE`). Compact: `compact_model_bundles` keeps `files.truncate(1)`.

### 4. Funnel and other catalog files miss nested relatives

**What you saw:** Approval imported `FunnelChart`. Render failed on `./use-enter-complete`, `./use-mount-progress`, `chart-formatters`. Repair faked bars.

**What actually happened:** R2 bundle / flatten did not include the relative files the entry TSX imports. Repair inlined a lookalike. Same pattern as (3): “adapt the catalog” becomes “redraw it.”

### 5. Client portal: libraries copied in comments, not imported (run `933b90ec-…`)

**What you saw:** a beige/serif Client portal that does not match Signup/Approval/Dashboard. Model reasoning said it would adapt `magic-ui` scroll-progress, Bklit funnel, Kokonut bento.

**What actually happened:** scoped run was **one screen** (`screen-client-portal`). The old three stayed (timestamps: Signup/Approval 4h, Dashboard 1d, Client portal 1h). The model reimplemented `ReviewProgress`, `FunnelMini`, and glass cards **inside the screen file**. No `import` from `@/registry/magicui/...`. The prompt says “adapt at least one of those real components.” The model treats that as “copy the idea.”

A one-screen batch also picks a **new** visual system. It does not restyle siblings. The grid then looks like four different products.

Engine log: `scoped_screen_count=1`, `artifact_screen_count=4`, `failed=0`.

### 6. Decision log: RAG query over 2000 characters (run `90f32924-…`)

**What you saw:** red banner “None of the selected screens could be generated.” Yellow: “1 selected screen has no design yet: Decision log.”

**Exact error:**

```txt
component search failed for screen screen-decision-log:
invalid catalog request: query must contain 1-2000 characters
```

Then: `screens_returned=0`, `gateway_batch=false`. Codex Design Director ran ~3 minutes first (`00-design-plan.json` ~18k). That plan’s purpose + layout + every content requirement + Magic UI recipe was concatenated into the catalog **search query**. Engine and Convex both reject queries longer than **2000 characters**. RAG never ran. The screen was skipped. The run failed. Existing cards were not deleted.

This is a **Stage cap**, not Qwen’s context window. The same string is only used to embed a search. A 2000-character limit is an arbitrary guard. A Design Director plan always blows past it on the Codex Hi-Fi path. The Nebius gateway path builds a short query from title + description (`rag_screen_plan`) and usually stays under 2000.

Files:

- `apps/stage-engine/src/convex_store/catalog_repository.rs` — `MAX_QUERY_CHARACTERS = 2000`
- `packages/data-ops/convex/lib/wireframeCatalog/handlers.ts` — `query.length > 2_000`
- Codex path query assembly: `workflow.rs` (`materialize_catalog_context` from the design plan)

### 7. Grid thumbnail looks wrong until you click

**What you saw:** card preview is flatter / missing motion / “Blocked script execution in about:srcdoc”. Opened dialog looks closer to the real screen.

**What actually happened:** two different iframes.

| Surface | File | Scripts |
|---------|------|---------|
| Grid thumbnail | static HTML (`htmlUrl` / `renderToStaticMarkup`) | **Off.** `sandbox="allow-same-origin"` only |
| Live dialog | bundled live HTML (`liveUrl`) | **On.** `sandbox="allow-scripts"` |

Motion, `useScroll` progress bars, hover, Approve clicks, funnel animation do not run on the thumbnail. Motion `initial={{ opacity: 0 }}` also bakes empty states into static HTML (funnel bars at width 0, faded cards). Figma/export of static HTML has the same problem.

File: `apps/user-application/src/components/project/tabs/wireframes/WireframeHtmlPreview.tsx`.

### 8. Other failures already seen in this worktree

- **15 screens vs ~1M context:** one gateway call with every screen overflowed. Now sequential chunks of **5** (`MAX_GATEWAY_SCREENS_PER_REQUEST`).
- **Convex “already in progress”:** `pkill` / crash leaves `projectAiRuns` `module: "generate"` `running` for **60 minutes** (`STALE_RUNNING_RUN_MS`). Overlay freshness is **20 minutes**. Overlay Cancel must cancel both engine run and Convex.
- **Event stream 404 loop:** Electron retried `GET /v1/runs/{id}/events` every 1s. Fixed: stop on 404/410. Restart Desktop so `out/main` picks it up.
- **Renderer compiling old `@stage/base` TSX:** scoped render to current ids; per-screen compile.

---

## Caps that can fuck up a generate

These are all Stage (or Nebius-default) numbers. None of them “let the model do its thing.”

### Already killed a live run

| Cap | Value | Where | What it does |
|-----|-------|--------|----------------|
| Catalog **search query** | **1–2000 characters** | engine `catalog_repository.rs`, Convex `searchCatalogHandler` | Decision log died here. Codex design-plan query is too long. Empty query also dies. |
| Nebius `max_tokens` if omitted | **8192** | Nebius API default | Empty `content`, thinking-only completions. |
| Model bundles per screen | **6** | `MAX_MODEL_BUNDLES_PER_SCREEN` | Drops Magic UI if it is not in the top 6 scores. |
| Files per bundle in the **model** prompt | **1** (entry file) | `compact_model_bundles` | Nested `./hooks` not in the prompt; model still copies those imports. |
| RAG hits retrieved | **12** | `MAX_RAG_BUNDLES_PER_SCREEN` / Convex `limit` max 12 | Renderer can keep 12; model still only sees 6. |
| Vector score floor | **0.35** | `searchCatalogHandler` | Hits below 0.35 are discarded even if they are the right pack. |
| Gateway screens per HTTP call | **5** | `MAX_GATEWAY_SCREENS_PER_REQUEST` | Needed for context; a 15-screen run is three sequential calls. |

### Truncation that silently changes the prompt (does not always 502)

| Cap | Value | Where | What it does |
|-----|-------|--------|----------------|
| Strategy / research / moodboard / flows in Nebius prompt | **8000 chars each** | gateway `MAX_ARTIFACT_CHARS` | Rest is `...[truncated]`. Brand truth can disappear. |
| Skill guidance | **4000 chars** | `MAX_SKILL_CHARS` | Same. |
| Ingested catalog file for **search embeddings** | **24_000 chars** | Convex `MAX_SEARCH_CHARACTERS` | Long components are sliced at ingest, not at generate. |
| Catalog source payload | **1_000_000 bytes**, **128 files** | Convex `MAX_SOURCE_BYTES` / `MAX_SOURCE_FILES` | Oversize component cannot load. |
| Gateway request source per screen | **1_500_000 bytes** | `MAX_SOURCE_BYTES` | Oversize batch 400s. |
| Gateway body | **12_000_000 bytes** | `MAX_REQUEST_BYTES` | Whole JSON dump of design context + bundles. |
| Component bundles per screen (gateway validate) | **24** | `MAX_COMPONENT_BUNDLES` | Currently we send 6, so this is slack. |

### Product / lock / UI caps that feel like “generate is broken”

| Cap | Value | Where | What it does |
|-----|-------|--------|----------------|
| Convex generate lock | **60 minutes** | `runStore.ts` `STALE_RUNNING_RUN_MS` | After crash/pkill, next generate throws “already in progress.” |
| Overlay “still generating” freshness | **20 minutes** | `useWireframesRun` | Overlay can hide while Convex is still locked. |
| Parallel CLI screen runs | **5** | `MAX_PARALLEL_SCREEN_RUNS` | Codex/Claude Hi-Fi only. |
| Concurrent gateway generations | **4** | `MAX_CONCURRENT_GENERATIONS` | Extra local generates 429. |
| Provider timeout | **600 s** | `WIREFRAME_PROVIDER_TIMEOUT_SECONDS` | Long DeepSeek + thinking can hit this. |
| Moodboard images attached | **4** | `MAX_MOODBOARD_IMAGES` | Extra selected images never reach the model. |
| Brand kit files | **4** files, **10 MiB** each | `MAX_BRAND_KIT_FILES` / `MAX_BRAND_KIT_BYTES` | Extra assets dropped. |
| Libraries in one search | **1–8** | Convex + engine | Three packs is fine. |
| Vector search pull | `min(limit * 4, 48)` then **48** catalog docs | `getCatalogComponents` | Used to throw at 25; raised to 48. If this regresses, search throws before any screen. |
| Normalized sections / blocks | **8 / 8** | `MAX_SECTIONS_PER_SCREEN` | Post-process trim, not generate-kill. |
| Provider workspace | 256 files, 10 MiB/file, 64 MiB total | `provider_workspace.rs` | Unlikely on gateway path. |

### Nebius / model (not Stage constants, still real)

- Prompt + completion must fit the model context (~1M on the current Flash route; 15-screen dumps still overflowed before chunking).
- `max_completion_tokens` **includes reasoning**. Thinking still eats the budget.
- `reasoning_effort=minimal` is a request. The model can still write a novel in `reasoning_content`.

---

## What is not a cap (common mix-ups)

- **Adding a screen does not have to wipe the old ones.** Engine merge (`apply_scoped_screens`) only overwrites ids in this run. Ticked screens in “Add or edit screens” **are** the run. The big “Generate N Wireframes” button regenerates every ticked id. “Generate N new screens only” sends only ids that have no design yet.
- **Dummy `providerId: "codex"`** is intentional. Nebius is `gen:nebius` in `context.source`. If that token is missing, you get Codex Design Director + the 2000-character query path.
- **Thumbnail script errors** are expected with the current sandbox. They are not a failed generate.

---

## If you raise the 2000-character query cap

Do it in **both** places (engine validate + Convex handler) or generate still 500s. Truncating the query to 2000 is safer than embedding a 10k design plan: the search string should be a short screen brief, not the whole director document. The Codex path should use the same short `rag_screen_plan` the gateway already uses, instead of concatenating `contentRequirements`.

Do not “remove all caps.” The ones that already burned us are: **8192 output**, **query 2000**, **top 6 bundles**, **one file per bundle**, **no per-library quota**, **thumbnail without JS**.
