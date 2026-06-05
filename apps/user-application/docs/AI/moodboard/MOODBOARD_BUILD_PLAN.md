# Moodboard — build plan (end-to-end)

Last updated: 2026-06-05
Audience: engineering (build order)  
Related: [`MOODBOARD_DEV_STATUS.md`](./MOODBOARD_DEV_STATUS.md) · [`MOODBOARD_TESTING.md`](./MOODBOARD_TESTING.md) · [`MOODBOARD_CHANGE_AUDIT.md`](./MOODBOARD_CHANGE_AUDIT.md) · [`RESEARCH_DEV_STATUS.md`](../research/RESEARCH_DEV_STATUS.md) · [`STRATEGY_DEV_STATUS.md`](../strategy/STRATEGY_DEV_STATUS.md)

> Concrete build order and progress audit. High-level status lives in **`MOODBOARD_DEV_STATUS.md`**.

---

## Locked decisions

| # | Decision | Choice |
|---|----------|--------|
| A | Scope (phases 1–4) | Upload + image URL + Figma OAuth + Refero search → Convex/R2 + staging grid |
| B | Figma | Per-user OAuth from Integrations; no shared `FIGMA_ACCESS_TOKEN` in production |
| C | “Search Refero” | **Refero search box only** — user query; no auto-seed from Research/Strategy |
| D | Refero | **Screens only** (`refero_search_screens` + image fetch); styles/flows deferred |
| E | Image URL | Server fetch → validate → R2 → `source: "url"` |
| F | Import vs style guide | **Two run types:** `mode: moodboard` (no LLM) and `mode: styleguide` (LLM) |
| G | Staged references | Engine **appends** to artifact with `isInMoodboard: false`; user commits via **Add to Moodboard** |
| H | Directions | User-created/user-named only; no fixture fallback like `Direction 1/2/3`; rename persists with assigned references |
| I | Moodboard R2 keys | New keys are project-first: `moodboard/projects/{projectId}/users/{userId}/{source}/{uuid}.{ext}`; legacy keys still resolve |

---

## Architecture

```txt
React (MoodboardTab, hooks)
  → Electron IPC startRun(mode: moodboard | styleguide)
  → stage-engine moodboard/workflow.rs | styleguide/workflow.rs
       → Refero MCP / Figma REST / URL fetch → R2
       → styleguide LLM → normalize/merge styleGuides[]
       → Convex save moodboardArtifact
  → getLatestMoodboardArtifact (resolveAssetContentJson) → UI grid
```

Rules (same as Research/Strategy):

- React does not call Refero/Figma/providers for import.
- Provider JSON for style guides uses **Extract → Normalize → Merge** before Convex save.
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
| 4.z | Project-first moodboard R2 keys | ✅ | Stable asset keys at rest; signed URLs only on read |
| 5.0 | Direction Hub real board state | ✅ | No auto-seeded directions; inline rename; real counts |
| 5.x | Style Guide AI | ✅ | `mode: styleguide` routes through stage-engine; provider JSON patches `styleGuides[]` |
| 6.x | Re-run policy + testing doc | 🟡 | `MOODBOARD_TESTING.md` filled; runtime E2E manual |

---

## Phase 5 — Style guide AI

Direction Hub and style guide generation are board-state backed now.

| Task | Notes |
|------|--------|
| `apps/stage-engine/src/styleguide/workflow.rs` | ✅ Input: strategy/research context + direction references metadata |
| `styleguide/prompt.rs` + `provider_json` | ✅ Detect style guide JSON / patch `styleGuides[]` |
| Convex run handlers | Deferred — styleguide currently saves through `saveMoodboardArtifact` |
| `useMoodboardTab.generateStyleGuide` | ✅ Replaced mock delay with `startRun(mode: styleguide, context: { directionId })` |
| UI | ✅ `StyleGuideGenerating` bound to real run events |

**Exit:** Per-direction palette/typography in Convex; view uses artifact, not only `defaultStyleGuide`.

---

## Phase 6 — Hardening

- Full moodboard regen + downstream dialog
- `UpstreamStaleBanner` flags when research/strategy newer than moodboard
- Figma token refresh UX
- URL import SSRF/size guards audit
- Provider picker for style guide generation

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
