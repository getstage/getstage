# Moodboard — build plan (end-to-end)

Last updated: 2026-06-04  
Audience: engineering (build order)  
Related: [`MOODBOARD_DEV_STATUS.md`](./MOODBOARD_DEV_STATUS.md) · [`MOODBOARD_TESTING.md`](./MOODBOARD_TESTING.md) · [`RESEARCH_DEV_STATUS.md`](./RESEARCH_DEV_STATUS.md) · [`STRATEGY_DEV_STATUS.md`](./STRATEGY_DEV_STATUS.md)

> Concrete build order and progress audit. High-level status lives in **`MOODBOARD_DEV_STATUS.md`**.

---

## Locked decisions

| # | Decision | Choice |
|---|----------|--------|
| A | Scope (phases 1–4) | Upload + image URL + Figma OAuth + Refero search → Convex/R2 + staging grid |
| B | Figma | Per-user OAuth from Integrations; no shared `FIGMA_ACCESS_TOKEN` in production |
| C | “Generate with AI” | **Refero search box only** — user query; no auto-seed from Research/Strategy |
| D | Refero | **Screens only** (`refero_search_screens` + image fetch); styles/flows deferred |
| E | Image URL | Server fetch → validate → R2 → `source: "url"` |
| F | Import vs style guide | **Two run types:** `mode: moodboard` (no LLM) and `mode: styleguide` (LLM, not built) |
| G | Staged references | Engine **appends** to artifact with `isInMoodboard: false`; user commits via **Add to Moodboard** |

---

## Architecture

```txt
React (MoodboardTab, hooks)
  → Electron IPC startRun(mode: moodboard | styleguide)
  → stage-engine moodboard/workflow.rs | styleguide/workflow.rs (TBD)
       → Refero MCP / Figma REST / URL fetch → R2
       → Convex save moodboardArtifact
  → getLatestMoodboardArtifact (resolveAssetContentJson) → UI grid
```

Rules (same as Research/Strategy):

- React does not call Refero/Figma/providers for import.
- Provider JSON for style guides will use **Extract → Normalize** before Convex save (when built).
- Artifact optional fields must be **omitted**, not JSON `null`, or desktop Zod parse fails.

---

## Progress audit

Status: ⬜ todo · 🟡 in progress · ✅ done

| Step | What | Status | Notes |
|-----:|------|:------:|-------|
| 1.1 | `saveMoodboardArtifact` upsert | ✅ | `handlers/moodboard.ts` |
| 1.2 | `useSaveMoodboardArtifact` + `buildMoodboardArtifact` | ✅ | |
| 1.3 | `MoodboardTab` load/save from artifact | ✅ | `moodboardBoardState.ts` |
| 1.4 | Phase 1 static verification | ✅ | convex + desktop typecheck |
| 2.x | Upload → R2 `moodboard-upload` | ✅ | Renderer upload + staged refs |
| 3.x | Refero search import run | ✅ | `mode: moodboard`, `source: refero` |
| 3.y | Refero image resilience | ✅ | MCP full→thumbnail; CDN HTTPS fallback; valid reference JSON |
| 4.x | Figma OAuth import | ✅ | `moodboard-figma` |
| 4.y | Direct image URL import | ✅ | `moodboard-url` |
| 5.x | Direction Hub + Style Guide AI | ⬜ | Mock delay + fixture UI only |
| 6.x | Re-run policy + testing doc | 🟡 | `MOODBOARD_TESTING.md` filled; runtime E2E manual |

---

## Phase 5 — Style guide AI (next)

| Task | Notes |
|------|--------|
| `apps/stage-engine/src/styleguide/workflow.rs` | Input: research + strategy + direction references (metadata, not raw blobs) |
| `styleguide/prompt.rs` + `provider_json` | Detect style guide JSON / patch `styleGuides[]` |
| Convex run handlers | Mirror strategy `createRun` / `completeRun` |
| `useMoodboardTab.generateStyleGuide` | Replace mock delay with `startRun(mode: styleguide, context: { directionId })` |
| UI | Keep `StyleGuideGenerating`; bind to real run events |

**Exit:** Per-direction palette/typography in Convex; view uses artifact, not only `defaultStyleGuide`.

---

## Phase 6 — Hardening

- Full moodboard regen + downstream dialog
- `UpstreamStaleBanner` flags when research/strategy newer than moodboard
- Figma token refresh UX
- URL import SSRF/size guards audit
- Rename UI: “Generate with AI” → “Search Refero” (copy only)

---

## Refero troubleshooting (import)

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| `run_completed` but **empty grid** | Old artifact with `null` optionals → parse error | Re-run import after engine restart; or clear moodboard artifact |
| `Refero image missing for {uuid}` | MCP `full` miss | Engine retries `thumbnail` + CDN; check logs for `loaded from search CDN URL` |
| `Refero returned no screen images` | MCP + CDN both failed for all hits | Try different query; verify `REFERO_MCP_TOKEN` / `REFERO_MCP_URL` |
| Red: “Saved moodboard could not be loaded” | `contentJson` fails Zod | Inspect artifact in Convex; re-import after JSON fix |
| No `[stage-engine]` lines | Engine not running / wrong port | `curl http://127.0.0.1:48221/v1/readiness` |

Required env (engine): `REFERO_MCP_TOKEN`, `REFERO_MCP_URL` (see `apps/stage-engine` config).

---

## Verification commands

```bash
cd packages/data-ops && npx convex dev    # Terminal 1
cd apps/user-application && pnpm dev      # Terminal 2
kill $(lsof -t -i:48221)                  # after Rust changes, restart Terminal 2

cargo check
pnpm --dir packages/data-ops exec convex codegen
pnpm --dir packages/data-ops run convex:typecheck
pnpm run desktop:typecheck
```

Success signals (import):

```txt
[stage-engine] moodboard import workflow started
[stage-engine] Moodboard Refero import staged references reference_count=N
run_completed
```

Success signals (style guide — when built):

```txt
[stage-engine] styleguide workflow started
run_completed
```
