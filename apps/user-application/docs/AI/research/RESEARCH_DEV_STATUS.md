# Research dev status & debugging guide

Date: June 1, 2026  
Audience: You + the next AI agent  
Scope: Desktop Research V1 — architecture, file map, debugging

---

## Read this first

```txt
Terminal 1: packages/data-ops  →  npx convex dev
Terminal 2: apps/user-application  →  pnpm dev
Logs:       Terminal 2 only, lines prefixed with [stage-engine]
Do NOT:     Run cargo run in a third terminal while pnpm dev is running (port 48221 conflict)
```

After **Rust changes**, kill the stale engine or restart `pnpm dev`:

```bash
kill $(lsof -t -i:48221)
```

If you see `using existing service on port 48221`, Electron adopted an **old binary** — fixes will not run until you kill it.

---

## Provider output pipeline (normalize first)

Codex/Claude output is **never trusted as final shape**. Stage uses two layers:

| Layer | Where | Role |
|-------|--------|------|
| **Extract** | `apps/stage-engine/src/helpers/provider_json.rs` | Find `researchArtifact` JSON in stdout or stderr (lines containing `artifactKind`) |
| **Normalize** | `apps/stage-engine/src/research/workflow.rs`, `research_repository.rs`, competitive matrix helpers | Coerce into `@stage/data-ops/contracts` before Convex + R2 |

**Prompt** (`research/prompt.rs`) guides the model; **normalize** (`research/normalize.rs` + matrix score pass in `research_repository.rs`) guarantees the UI contract before Convex save.

**Provider shape drift (June 2026):** Claude may return `summary` as `{ headline, body }`, `companySnapshot` as a single object, and matrix `dimension`/`rating` fields. Normalize coerces these to the Zod contract (`summary[]`, `companySnapshot[]`, `matrixRows[].id/label/cells[].score`). Codex-shaped output passes through unchanged.

**Terminal noise:** Hundreds of `provider_warning` lines can be Codex streaming `researchArtifact` fields on stderr — not failures. Success = `research artifact saved to Convex` / `run_completed`. See [RESEARCH_TESTING.md](./RESEARCH_TESTING.md#terminal-noise-provider_warning).

Strategy: same philosophy in [STRATEGY_DEV_STATUS.md](./STRATEGY_DEV_STATUS.md#provider-output-pipeline-normalize-first).

---

## System structure (layers)

```txt
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1 — React (apps/user-application/src)                    │
│  Configure form · Research tab · hooks · map artifact → UI        │
└────────────────────────────┬────────────────────────────────────┘
                             │ Electron IPC (startRun, run events)
┌────────────────────────────▼────────────────────────────────────┐
│  LAYER 2 — Stage Engine (apps/stage-engine, port 48221)         │
│  Research workflow · Refero MCP · provider CLI · R2 upload      │
└────────────────────────────┬────────────────────────────────────┘
                             │ Convex HTTP (bearer token from Electron)
┌────────────────────────────▼────────────────────────────────────┐
│  LAYER 3 — Convex (packages/data-ops/convex)                    │
│  Context · runs · artifacts · R2 presigned URLs                 │
└────────────────────────────┬────────────────────────────────────┘
                             │ External
┌────────────────────────────▼────────────────────────────────────┐
│  LAYER 4 — External services                                    │
│  Refero MCP · Claude/Codex CLI · Cloudflare R2                  │
└─────────────────────────────────────────────────────────────────┘
```

React never calls Refero or providers directly. Stage Engine owns the run.

---

## Research run flow (step by step)

```txt
1. User fills Configure Research → upsertContext (Convex projectAiContexts)
2. User clicks Run Research → Electron IPC startRun (mode: research)
3. Stage Engine workflow.rs:
     a. getResearchInput (Convex)
     b. createResearchRun (Convex)
     c. Refero: 5 category screen searches + 1 flow search → parse records → fetch images → R2 upload
     d. build_research_prompt (input + referoContext; Codex skips uiPatterns)
     e. Claude/Codex CLI → JSON researchArtifact (text sections only)
     f. apply_engine_ui_patterns (engine-built uiPatterns rows from Refero buckets)
     g. completeResearchRun (Convex) — deletes previous research artifacts + R2 keys
4. React: getLatestResearchArtifact → resolve R2 keys → mapResearchArtifactToTabData → UI
```

---

## File map (where to look)

### Frontend — `apps/user-application/src`

| Path | Role |
|------|------|
| `hooks/project/research/useResearchRun.ts` | Starts engine run (`mode: "research"`) |
| `hooks/project/research/useResearchTab.ts` | Saves context, then starts run |
| `hooks/project/research/useResearchContext.ts` | Pre-fills configure form from `getContext` |
| `hooks/project/research/useResearchArtifact.ts` | Loads + parses latest artifact |
| `hooks/project/research/useSaveResearchArtifact.ts` | Save Changes → `updateResearchArtifact` |
| `hooks/project/research/useResearchSectionRegenerate.ts` | Section regen → `source: section:…` |
| `lib/project/mapResearchArtifactToTabData.ts` | Artifact JSON → UI sections |
| `lib/project/applyResearchTabEdits.ts` | Edit mode → patch summary/snapshot/opportunities |
| `components/project/tabs/research/ResearchTab.tsx` | Main tab orchestration |
| `components/project/tabs/research/UiPatterns.tsx` | Carousel from `examples[].imageUrl` |
| `electron/sidecar.ts` | Spawns or **adopts** engine on 48221 |
| `electron/ipc.ts` | Run events stream to React |
| `electron/helpers/loadEnv.ts` | `REFERO_MCP_TOKEN` → engine env |

### Stage Engine — `apps/stage-engine/src`

Helper/layout conventions: [`apps/stage-engine/ARCHITECTURE.md`](../../../stage-engine/ARCHITECTURE.md) — file roles, when to extract private `fn`s, Strategy module template.

| Path | Role |
|------|------|
| `research/workflow.rs` | **Orchestrator** — Refero → provider → Convex save |
| `research/service.rs` | Builds prompt bundle; calls `ReferoService::research_context` |
| `research/context.rs` | **Per-category Refero queries** (Onboarding, Homepage, Pricing, Checkout, Dashboard) |
| `research/refero_assets.rs` | Image hydrate, R2 upload, **`build_ui_patterns_from_refero`** |
| `research/prompt.rs` | Codex/Claude system + user prompt |
| `research/section.rs` | Section-level regenerate merge |
| `refero/client.rs` | HTTP JSON-RPC to `https://api.refero.design/mcp` |
| `refero/service.rs` | `refero_search_screens/flows`, `refero_get_screen_image` |
| `refero/parse.rs` | Unwrap MCP JSON; read `records[]`; markdown fallback |
| `convex_store/research_repository.rs` | Convex mutations for research |
| `convex_store/asset_upload.rs` | R2 presigned PUT (`purpose: research-refero`) |

### Convex + contracts — `packages/data-ops`

| Path | Role |
|------|------|
| `convex/projectAi.ts` | `getContext`, `upsertContext`, `getResearchInput`, `completeResearchRun`, `updateResearchArtifact`, `getLatestResearchArtifact` |
| `convex/r2.ts` | Upload rules, `generateUploadUrl`, `syncMetadata` |
| `src/contracts/research.ts` | `researchArtifact` Zod schema |
| `src/contracts/refero.ts` | `referoContext` / `ReferoReference` / **`referoUiPatternCategorySchema`** / **`referoCategorySearchSchema`** |
| `src/contracts/parseResearchArtifact.ts` | Normalizer (null, double JSON, matrix scores) |

### Agent skill (Refero rules)

| Path | Role |
|------|------|
| `.agents/skills/refero-mcp/SKILL.md` | ID rules (`uuid` vs numeric flow `id`), `records`, R2, caps |
| `.agents/skills/refero-mcp/references/stage-engine-integration.md` | Rust integration checklist |

---

## Refero pipeline (detail)

```txt
For each UI Patterns category (onboarding, homepage, pricing, checkout, dashboard):
  refero_search_screens(category-specific query, platform=web, response_format=json)
    → up to 3 unique screen UUIDs per category (deduped across categories)

refero_search_flows(journey query, platform=web, response_format=json)
  → up to 4 flow hits (text context for Codex only)

  → parse.rs: extract `records[]` OR markdown `## Screen: {uuid}`
  → service.rs: normalize → ReferoReference (id = screen uuid, uiPatternCategory set)

refero_get_screen_image(screen_id=uuid, image_size=full)  [max 15, category order]
  → refero_assets.rs: PUT bytes to R2 (research-refero) when upload succeeds
  → reference.image_url = R2 object key on success

Codex returns text sections only (no uiPatterns)
  → apply_engine_ui_patterns: replace uiPatterns with engine-built rows
  → each row title = category display name (Onboarding, Homepage, …)
  → each example.imageUrl / thumbnailUrl wired by sourceReferenceId = Refero uuid (no round-robin)
  → imageUrl = full-size target for click/lightbox:
      1. R2 key from upload
      2. reference.image_url (preview from get_screen_image)
      3. reference.thumbnail_url (Refero search CDN thumbnail_url)
  → thumbnailUrl = Refero search thumbnail when available; carousel uses this first

getLatestResearchArtifact
  → resolveResearchImageUrls: R2 keys → signed URLs; https:// URLs pass through unchanged
  → UiPatterns carousel renders thumbnails; lightbox opens imageUrl/fullSrc
```

**Caps:** 5 category screen searches + 1 flow search; 3 screens/category; 15 image fetches per run (`refero/service.rs`).

**Contracts (Zod):** `packages/data-ops/src/contracts/refero.ts`
- `referoUiPatternCategorySchema` — `onboarding | homepage | pricing | checkout | dashboard`
- `referoCategorySearchSchema` — `{ category, query, references[] }`
- `referoContextSchema.categorySearches` — persisted on artifact for debugging

**Soft-fail:** Refero/R2 errors log a warning; research still completes with text.

---

## Convex data model

| Table | Purpose | Cardinality |
|-------|---------|-------------|
| `projectAiContexts` | Configure form (industry, brief, competitors) | One per project |
| `projectAiRuns` | Run status / external run id | Many (audit OK) |
| `projectAiArtifacts` | `contentJson` = full `ResearchArtifact` | **One active** — old rows deleted on `completeResearchRun` |

`uiPatterns.examples[].imageUrl` is the **full-size target** for click/lightbox: R2 object key preferred, then Refero `preview_url`, then `thumbnail_url`. `thumbnailUrl` is the small carousel image. Convex resolves R2 keys → signed URLs on read; `https://` values pass through unchanged.

---

## `.env` (required)

**File:** `apps/user-application/.env`

```txt
REFERO_MCP_TOKEN=your_token_here
```

Optional mock UI only:

```txt
VITE_MOCK_RESEARCH=1
```

Do **not** use placeholder `your-deployment.convex.cloud` for `VITE_CONVEX_URL`.

---

## How to test (short checklist)

1. `npx convex dev` + `pnpm dev`
2. Confirm: `refero_configured=true`, `ready on port 48221` (not “using existing service”)
3. Settings → Integrations → Claude or Codex **ready**
4. Open a **valid project** (deleted project → `Project not found`)
5. Run Research → watch for:

```txt
Refero search completed screen_hits=N flow_hits=M
Refero images persisted to R2 refero_images=N
research artifact saved to Convex
```

6. UI Patterns carousel should show images when `screen_hits > 0` (even if `refero_images=0` — Refero CDN fallback).
7. Clicking an image should open `imageUrl` / fullSrc in the lightbox, not re-scale the carousel thumbnail.
8. **Re-run Research** after engine/UI mapping fixes; old artifacts keep null `imageUrl` and stale tab mapping.

Full form values: [`RESEARCH_TESTING.md`](./RESEARCH_TESTING.md)

---

## Common errors

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Project not found` | Stale/wrong project id or auth | Open/create valid project |
| No Refero logs / old behavior | Stale engine on 48221 | `kill $(lsof -t -i:48221)` + restart dev |
| `screen_hits=0` | Bad token or parse failure | Check `REFERO_MCP_TOKEN`; engine logs for “no parseable records” |
| `refero_images=0` but screen_hits > 0 | R2 upload failed; CDN fallback may still fill carousel | Check R2 config; carousel can work via `thumbnail_url` |
| `imageUrl: null` in artifact | Old run before CDN fallback fix | Re-run Research after engine restart |
| Empty UI Patterns carousel with hits | Stale artifact or ignored `thumbnail_url` | Kill 48221, re-run Research |
| Blurry lightbox after clicking image | UI opened the same carousel thumbnail | Fixed: carousel uses `thumbnailUrl`, lightbox uses full `imageUrl` |
| Same summary under every pattern tag | Old `mapResearchArtifactToTabData` | Rebuild app; re-run not required if artifact OK |
| Persona goals/frustrations show `..` | Double period from join | Fixed in `joinSentences()` — reload app |
| Stuck “Running Research” | Old Electron main | Full `pnpm dev` restart |
| Parse error in UI | `contentJson` vs Zod | Rebuild `data-ops`, reload app |

---

## Re-run research (shipped)

- **Re-run research** button on the Research tab when an artifact exists (opens configure modal prefilled from `getContext`).
- Successful re-run replaces research (`deletePreviousResearchArtifacts`) and **clears strategy** (`deletePreviousStrategyArtifacts` in `completeResearchRunHandler`).
- **Moodboard / flows / wireframes** are not auto-deleted. If downstream work exists, a post-run dialog offers **Keep later steps** (stale banner on later tabs) or **Clear later steps** (`projectAi.clearDownstreamArtifacts` + mock session clear).
- Per-section **Regenerate with AI** is unchanged — full pipeline re-run only via **Re-run research**.

See [RESEARCH_TESTING.md](./RESEARCH_TESTING.md) for manual checks.

---

## Status snapshot (June 1, 2026)

| Feature | Status |
|---------|--------|
| Real engine run + Convex artifact | Done |
| Configure form → Convex | Done |
| Pre-fill configure from `getContext` | Done |
| Artifact parse in UI (`.nullish()`) | Done |
| One artifact per project (delete on rerun) | Done |
| Save Changes → `updateResearchArtifact` | Done (all editable sections) |
| Section regenerate (engine + UI) | Done |
| Refero category search + engine uiPatterns | Done (June 1) |
| imageUrl CDN fallback (R2 → preview → thumbnail) | Done (June 1) |
| Separate carousel thumbnail vs lightbox full image | Done (June 1) |
| UI mapping: patterns + persona sentence join | Done (June 1) |
| Brief file upload → R2 | Done (project-scoped key under `research/{projectId}/briefs`; **5 MB** cap, client validation on pick) |
| Custom sections (Add Section) | Done (`customSections` on artifact + Save Changes) |
| Export to Notion | Done (native OAuth; parent page URL paste once, stored on connection) |
| Styles search (`refero_search_styles`) | Not wired |

---

## June 1 — Refero fixes

| Bug | Fix |
|-----|-----|
| MCP markdown treated as 1 “record” | `parse.rs`: parse markdown before treating `content[]` as hits |
| Skipped full image when thumbnail existed | `service.rs`: fetch up to 15 category screen images for R2 |
| One broad search → wrong UI Patterns rows | `context.rs` + `service.rs`: 5 targeted category searches |
| Codex-authored uiPatterns + round-robin images | `prompt.rs` + `refero_assets.rs`: engine builds rows by category |
| Stale engine after Rust edits | Kill 48221; sidecar warns on adopt |
| Empty carousel despite screen_hits > 0 | Stage ignored Refero `thumbnail_url` | `refero_assets.rs`: fallback chain on `imageUrl` |
| Blurry clicked image | Lightbox reused carousel thumbnail and cropped it | `thumbnailUrl` for carousel, `imageUrl` for lightbox; `object-contain` |
| Repeated group summary on every pattern card | Mapper attached `group.summary` per tag | `mapResearchArtifactToTabData`: tag-only rows |
| Persona text with `..` | `.join(". ")` on strings already ending `.` | `joinSentences()` strips trailing punctuation |

---

## Related docs

| Doc | Purpose |
|-----|---------|
| [`RESEARCH_PRODUCT_REQUIREMENTS.md`](./RESEARCH_PRODUCT_REQUIREMENTS.md) | Product rules + requirement checklist |
| [`RESEARCH_TESTING.md`](./RESEARCH_TESTING.md) | E2E form values + run log |
| [`STAGE_AI_RESEARCH_HANDOFF.md`](./STAGE_AI_RESEARCH_HANDOFF.md) | Short handoff for next agent |
| [`STAGE_AI_WORKFLOW_CONTEXT_PLAN.md`](./STAGE_AI_WORKFLOW_CONTEXT_PLAN.md) | Full workflow architecture plan |
| [`apps/stage-engine/ARCHITECTURE.md`](../../../stage-engine/ARCHITECTURE.md) | Engine module roles + helper conventions |

---

## One-line summary

Research runs: **React → Engine → Refero (5 category searches) + R2/CDN images → Codex (text) → engine uiPatterns → Convex → React**. Kill stale engine after Rust changes. Check `screen_hits`, `category_buckets=5`, and `refero_images` in logs; carousel can work when `refero_images=0` via Refero CDN fallback, but sharp lightbox needs full `imageUrl` from R2/preview.
