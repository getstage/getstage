# Research E2E testing & run log

> **Start here for testing.** Product rules: [`RESEARCH_PRODUCT_REQUIREMENTS.md`](./RESEARCH_PRODUCT_REQUIREMENTS.md) · Architecture: [`RESEARCH_DEV_STATUS.md`](./RESEARCH_DEV_STATUS.md)

Copy-paste form values, success criteria, failure matrix, and run history are in this file.

---

## Before you click Run

1. **Terminal 1:** `cd packages/data-ops && npx convex dev`
2. **Terminal 2:** `cd apps/user-application && pnpm dev` (only this — no separate `cargo run`)
3. **Settings → Integrations:** Claude or Codex connected, **Refresh** until **ready**
4. **`.env`:** `REFERO_MCP_TOKEN=...` set. No `VITE_MOCK_RESEARCH=1` unless you want fake UI only.

Quick check in terminal 2:

```bash
curl http://127.0.0.1:48221/v1/readiness
```

Expect `"ready": true`.

First `pnpm dev` after Rust changes: **1–3 min** (build). Research run itself: **2–8 min** depending on provider.

Use a **real project** in the app (logged in, not guest). The form saves to Convex under that project ID before the engine starts.

---

## Form values (paste into Configure Research)

| Field | Value |
|-------|--------|
| **Industry** | `E-commerce` |
| **Client Website** | `www.shopify.com` |
| **Project Brief** | See below |
| **Competitors** | Add one at a time with **+ Add** |
| **Additional notes** | Optional — skip or use below |

**Project Brief** (paste into the text area):

```text
Shopify is expanding into B2B wholesale for mid-market retailers in Europe.
Goal: understand how competitors handle onboarding, pricing pages, and mobile checkout.
Focus on UX patterns, not stock prices or funding news.
Deliver actionable design insights for a wholesale dashboard MVP.
```

**Competitors** (add these three):

1. `www.bigcommerce.com`
2. `www.woocommerce.com`
3. `www.squarespace.com`

**Additional notes** (optional):

```text
Prioritize mobile-first patterns. Ignore enterprise-only products.
```

Pick **Claude** or **Codex** in the provider toggle, then click **Run Research**.

---

## What success looks like

### UI

- Button shows running state for a few minutes (real Claude/Codex run)
- Form closes; Research tab fills with sections (overview, competitors, insights, etc.)
- No red error banner

### Terminal 2 (for you, not the user)

- `[stage-engine]` lines through the run
- Ends with `run_completed` / `research artifact saved to Convex`
- No `run_failed` with `detail=...`
- No `ZodError` / `Run event stream failed` (IPC bug — fixed May 31; restart `pnpm dev` if you still see it)

---

## If it fails

| UI shows | You check in terminal 2 |
|----------|-------------------------|
| *"Connect Claude or Codex…"* | Integrations — CLI not ready |
| *"Something went wrong while running Research…"* | Search for `run failed` and `detail=` — that's the real cause |
| Save error (same generic message) | `convex context save failed` — Convex terminal 1 |
| Stuck on "Running Research" forever | Old Electron main — **Ctrl+C** and restart `pnpm dev` |

Paste the first `run_failed` line from terminal 2 to debug provider/Refero/Convex issues.

---

## Where logs appear

| Source | Where |
|--------|--------|
| Stage Engine (Rust) | Terminal 2 (`pnpm dev`), prefix `[stage-engine]` |
| Run failures (detail) | Same terminal + generic red error on Research tab |
| React / Vite | Same terminal, prefix `[renderer]` — ignore for Research debugging |
| Convex | Terminal 1 (`npx convex dev`) |

More engine detail:

```bash
RUST_LOG=stage_engine=debug pnpm dev
```

## Do not

- Run `cargo run` in `apps/stage-engine` while `pnpm dev` is open (port 48221 taken)
- Use DevTools **Network** tab to debug engine (engine is localhost IPC, not browser HTTP)
- Copy `VITE_CONVEX_URL=https://your-deployment.convex.cloud` — that breaks the app

## Mock UI only (no engine)

```txt
VITE_MOCK_RESEARCH=1
```

in `.env`, restart. Shows fixture/Zapier data for layout work only.

---

## Where Research data is saved (Convex)

| Table | What |
|-------|------|
| **`projectAiContexts`** | Form input before run (industry, website, brief, competitors) via `upsertContext` |
| **`projectAiRuns`** | Run record while engine works (`createResearchRun`) |
| **`projectAiArtifacts`** | **Final output** — `contentJson` holds the full `ResearchArtifact` JSON string |

The Research tab reads **`getLatestResearchArtifact`** → parses `contentJson` with `researchArtifactSchema` → maps to UI via `mapResearchArtifactToTabData`.

In the Convex dashboard: open **`projectAiArtifacts`**, filter by your project, look at **`contentJson`** (large JSON string). Module = `research`, kind = `researchArtifact`.

**Parse error in UI:** row exists in Convex but `contentJson` failed Zod — check renderer for `[research] artifact parse failed`. **Fixed May 31:** optional fields use `.nullish()` in `research.ts` and `refero.ts` (Codex sends `"logoUrl": null`, etc.). Run `pnpm --dir packages/data-ops build`, reload app — no re-run needed.

---

## Run log

Append a row after each E2E attempt. Keep terminal excerpts short — full JSON is huge.

| Date | Result | Provider | run_id | project_id | Notes |
|------|--------|----------|--------|------------|-------|
| 2026-05-31 | **PASS** | codex | `859302b4-41f1-42be-af3f-09f6ae9e7ea7` | `k171navg…` | First E2E after IPC fix. Text artifact saved. |
| 2026-05-31 | **PASS*** | codex | `76c332d2-e699-4692-be45-01d3e0f67b54` | `k1735spgy…` | Engine saved; UI parse failed until `research.ts` nullish fix. Reload to view. |

### 2026-05-31 — PASS (codex)

**Form:** Shopify wholesale brief, competitors bigcommerce / woocommerce / squarespace (test project, Lumen Apps).

**Terminal excerpt (tail):**

```txt
[stage-engine]  WARN … provider stderr … stderr=tokens used
[stage-engine]  WARN … provider stderr … stderr=142.745
[stage-engine] {"type":"provider_warning","message":"tokens used"}
[stage-engine] {"type":"provider_warning","message":"142.745"}
[stage-engine] {"type":"output_delta","text":"{…researchArtifact JSON…}"}
[stage-engine]  INFO … provider run completed, parsing research artifact … output_chars=22764
[stage-engine]  INFO … research artifact saved to Convex … project_id="k171navg40ppp33dj2ya5hv85h86ek63"
[stage-engine] {"type":"run_completed","finalText":"Research artifact saved."}
```

**Outcome:**

- IPC stream survived Codex stderr warnings (no ZodError, no stuck spinner)
- Artifact title: *Wholesale Dashboard MVP Research*
- Saved to Convex; UI should show full Research tab
- Artifact listed WooCommerce + Squarespace as competitors (BigCommerce may have been omitted by model — not a pipeline failure)

**Previous session (same day):** FAILED with `ZodError path ["message"]` on empty `provider_warning` — fixed in `electron/ipc.ts` + `safeParse`; required full `pnpm dev` restart to load new Electron main.

### 2026-05-31 — PASS* (codex, project k1735spgy…)

**Form:** Same Shopify wholesale brief; WooCommerce + Squarespace competitors.

**Terminal:** `run_completed` / `research artifact saved to Convex` — then `[research] artifact parse failed` for `logoUrl: null`, `imageUrl: null`, `sourceProduct: null`.

**Fix:** `packages/data-ops/src/contracts/research.ts` — optional AI fields → `.nullish()`. Rebuild + reload app.

**Outcome:** Text sections display after reload. UI Pattern screenshots still empty (Refero→R2 not built).

---

## Template for next run

```markdown
### YYYY-MM-DD — PASS|FAIL (claude|codex)

**Form:** …

**Terminal excerpt:**

```txt
(paste last ~10 [stage-engine] lines)
```

**Outcome:** …
```
