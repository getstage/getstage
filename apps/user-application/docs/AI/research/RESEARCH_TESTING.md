# Research E2E testing & run log

> **Architecture & file map:** [`RESEARCH_DEV_STATUS.md`](./RESEARCH_DEV_STATUS.md)  
> **Product rules:** [`RESEARCH_PRODUCT_REQUIREMENTS.md`](./RESEARCH_PRODUCT_REQUIREMENTS.md)

---

## Before you click Run

1. **Terminal 1:** `cd packages/data-ops && npx convex dev`
2. **Terminal 2:** `cd apps/user-application && pnpm dev` (no separate `cargo run`)
3. **After Rust changes:** `kill $(lsof -t -i:48221)` then restart Terminal 2
4. **Settings → Integrations:** Claude or Codex **ready**
5. **`.env`:** `REFERO_MCP_TOKEN=...` set. No `VITE_MOCK_RESEARCH=1` unless testing layout only.

```bash
curl http://127.0.0.1:48221/v1/readiness   # expect "ready": true
```

Use a **real, existing project** (logged in). If the project was deleted but the URL is still open, the app shows **“Could not load this project”** (no crash).

First `pnpm dev` after Rust changes: **1–3 min** compile. Research run: **2–8 min**.

---

## Form values (paste into Configure Research)

| Field | Value |
|-------|--------|
| **Industry** | `E-commerce` |
| **Client Website** | `www.shopify.com` |
| **Project Brief** | See below |
| **Competitors** | bigcommerce.com, woocommerce.com, squarespace.com |

**Project Brief:**

```text
Shopify is expanding into B2B wholesale for mid-market retailers in Europe.
Goal: understand how competitors handle onboarding, pricing pages, and mobile checkout.
Focus on UX patterns, not stock prices or funding news.
Deliver actionable design insights for a wholesale dashboard MVP.
```

Pick **Claude** or **Codex**, then **Run Research**.

**Re-run research:** With an existing artifact, use **Re-run research** → edit configure form → **Replace research & run**. Expect strategy tab to reset; if moodboard/flows/wireframes exist, choose **Keep** or **Clear later steps** after the run completes.

---

## Success criteria

### UI

- Running state for a few minutes, then full Research tab
- **UI Patterns** shows **5 rows**: Onboarding, Homepage, Pricing, Checkout, Dashboard
- Each row carousel has **category-matched** Refero screenshots (not the same checkout image in every row)
- Carousel images visible when `screen_hits > 0` even if `refero_images=0` (Refero CDN fallback)
- Clicking a carousel image opens the full `imageUrl` in the lightbox; it should not crop/upscale the thumbnail
- **Patterns Recognised** shows tag labels only (no repeated group summary under every tag)
- **Target Users** goals/frustrations have single periods (no `..`)
- No red error banner

### Terminal 2 (`[stage-engine]`)

```txt
Refero search completed screen_hits=N flow_hits=M category_buckets=5   # N should be > 0
Refero images persisted to R2 refero_images=K                           # K=0 OK if screen_hits>0 (CDN fallback)
provider run completed, parsing research artifact
research artifact saved to Convex
run_completed
```

### Artifact checks (`contentJson`)

- `referoContext.categorySearches` — 5 buckets with real Refero UUIDs (not `screen-0`)
- `uiPatterns[].title` — Onboarding / Homepage / Pricing / Checkout / Dashboard
- `uiPatterns[].examples[].sourceReferenceId` — matches Refero screen `uuid`
- `uiPatterns[].examples[].imageUrl` — full/lightbox URL: R2 object key **or** Refero `preview_url` / CDN fallback
- `uiPatterns[].examples[].thumbnailUrl` — carousel URL; should be Refero `thumbnail_url` when present

**Re-run required:** Artifacts saved before the CDN fallback fix may have `imageUrl: null`. Kill stale engine (`48221`) and run Research again.

**Bad signs:**

```txt
using existing service on port 48221          → stale engine, kill 48221
Refero screen search returned no parseable records
refero_images=0  (with screen_hits=0)
run_failed detail=...
```

---

## Where data is saved

### Convex (metadata + JSON)

| Table | What | Retention |
|-------|------|-----------|
| `projectAiContexts` | Form input + `lastProviderId` after a successful run | 1 row per project; deleted with project |
| `projectAiRuns` | Failed / cancelled runs only | **Deleted** after successful artifact save |
| `projectAiArtifacts` | Final `contentJson` (`ResearchArtifact` JSON) | Latest per project; old rows + R2 keys removed on re-run |
| `artifactDestinations` | Durable Notion/Figma delivery records | Successful Notion export creates or updates a completed destination |

### R2 (`assetsgetstage-testing`)

Refero screenshots: `users/{userId}/research/{projectId}/refero/{uuid}.png`  
Brief PDFs: `users/{userId}/research/{projectId}/briefs/{uuid}.pdf`

Keys live inside `contentJson`; R2 bytes are deleted when the artifact is replaced or the project is deleted.

Read path: `getLatestResearchArtifact` → resolve R2 keys (https URLs pass through) → `mapResearchArtifactToTabData` maps `thumbnailUrl` to carousel `src` and `imageUrl` to lightbox `fullSrc`.

### Dev cleanup

Run `developer.testingFixtures.cleanupOrphanedProjectAiData` in the Convex dashboard to purge rows whose `projectId` no longer exists. Completed destinations are retained.

---

## Terminal noise (`provider_warning`)

During **Strategy** runs, stderr may stream **saved Research** JSON (`ui-patterns-*`, `examples`, Refero URLs). That is Codex re-reading context — **not** a Research re-run and **not** a failure.

During **Research** runs, stderr may stream partial JSON lines before the final artifact.

| You see | Meaning |
|---------|---------|
| `provider_warning` with `uiPatterns` / `competitive` | Usually Strategy job echoing research; ignore if you are running Strategy |
| `research artifact saved to Convex` | Research **success** |
| `run_failed` | Real failure — read `ERROR` / `run_failed` message |

Architecture: [RESEARCH_DEV_STATUS.md](./RESEARCH_DEV_STATUS.md#provider-output-pipeline-normalize-first).

---

## Do not

- Run `cargo run` while `pnpm dev` is open (port 48221)
- Debug engine via browser Network tab (IPC, not HTTP)
- Use placeholder Convex URL in `.env`

Mock UI only: `VITE_MOCK_RESEARCH=1` in `.env`.

---

## Run log

| Date | Result | Provider | Notes |
|------|--------|----------|-------|
| 2026-05-31 | PASS | codex | Text artifact; IPC fix |
| 2026-05-31 | PASS* | codex | UI parse failed until `.nullish()` fix |
| 2026-06-01 | — | — | Category Refero searches + engine uiPatterns |
| 2026-06-01 | — | — | imageUrl CDN fallback + UI mapping fixes (patterns, personas) |
| 2026-06-01 | — | — | Split thumbnail carousel from full-size lightbox image |

### Template for next run

```markdown
### YYYY-MM-DD — PASS|FAIL (claude|codex)

**Project id:** …
**screen_hits / refero_images:** N / K

```txt
(paste last ~15 [stage-engine] lines)
```

**Outcome:** …
```
