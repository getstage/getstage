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

Use a **real, existing project** (logged in). Deleted project ids cause `Project not found`.

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

---

## Success criteria

### UI

- Running state for a few minutes, then full Research tab
- **UI Patterns** shows **5 rows**: Onboarding, Homepage, Pricing, Checkout, Dashboard
- Each row carousel has **category-matched** Refero screenshots (not the same checkout image in every row)
- No red error banner

### Terminal 2 (`[stage-engine]`)

```txt
Refero search completed screen_hits=N flow_hits=M category_buckets=5   # N should be > 0
Refero images persisted to R2 refero_images=K                           # K should be > 0 for carousel
provider run completed, parsing research artifact
research artifact saved to Convex
run_completed
```

### Artifact checks (`contentJson`)

- `referoContext.categorySearches` — 5 buckets with real Refero UUIDs (not `screen-0`)
- `uiPatterns[].title` — Onboarding / Homepage / Pricing / Checkout / Dashboard
- `uiPatterns[].examples[].sourceReferenceId` — matches Refero screen `uuid`
- `uiPatterns[].examples[].imageUrl` — R2 object keys (resolved to URLs on read)

**Bad signs:**

```txt
using existing service on port 48221          → stale engine, kill 48221
Refero screen search returned no parseable records
refero_images=0  (with screen_hits=0)
run_failed detail=...
```

---

## Where data is saved

| Table | What |
|-------|------|
| `projectAiContexts` | Form input (`upsertContext`) |
| `projectAiRuns` | Run record |
| `projectAiArtifacts` | Final `contentJson` (`ResearchArtifact` JSON) |

Read path: `getLatestResearchArtifact` → resolve R2 keys → `mapResearchArtifactToTabData`.

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
