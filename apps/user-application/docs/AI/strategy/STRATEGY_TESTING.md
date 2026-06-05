# Strategy E2E testing & run log

> **Architecture & file map:** [`STRATEGY_DEV_STATUS.md`](./STRATEGY_DEV_STATUS.md)

---

## Before you click Generate

1. **Terminal 1:** `cd packages/data-ops && npx convex dev`
2. **Terminal 2:** `cd apps/user-application && pnpm dev` (no separate `cargo run`)
3. **After Rust changes:** `kill $(lsof -t -i:48221)` then restart Terminal 2
4. **Settings → Integrations:** Claude or Codex **ready**
5. **Research completed** on the **same project** (Strategy reads `getLatestResearchArtifact`)
6. **Provider:** Strategy uses the same Claude/Codex as Research (`projectAiContexts.lastProviderId`), then localStorage, then first ready provider in Settings

```bash
curl http://127.0.0.1:48221/v1/readiness   # expect "ready": true
```

Use a **real, existing project** (logged in). If the project was deleted but the URL is still open, the app shows **“Could not load this project”** (no crash).

First `pnpm dev` after Rust changes: **1–3 min** compile. Strategy run: **1–5 min**.

---

## Form values (Strategy generate step)

| Field | Value |
|-------|--------|
| **Focus areas** | e.g. `Wholesale onboarding`, `B2B checkout`, `Dashboard MVP` |
| **Additional direction** | Optional — ties Strategy sections to your research focus |

Then **Generate Strategy**.

**Full regenerate:** **Regenerate strategy** beside **Edit Strategy** replaces all sections (approvals reset). Research unchanged. Downstream prompt if moodboard+ exists — same as research re-run.

---

## Success criteria

### UI

- Running state for ~1–5 minutes, then full Strategy tab with sections from **your** research (not the fintech mock template)
- Approve / save / section regenerate work against the **Convex artifact id** (not `mock-strategy-…`)
- No red error banner

### Terminal 2 (`[stage-engine]`)

```txt
strategy workflow started
starting strategy provider run
strategy artifact saved to Convex
run_completed
```

### Convex

| Table | What | Retention |
|-------|------|-----------|
| `projectAiContexts` | `strategyFocusAreas`, `strategyGenerateNotes`, `lastProviderId` | 1 row per project; deleted with project |
| `projectAiRuns` | Failed / cancelled runs only | **Deleted** after successful artifact save |
| `projectAiArtifacts` | Final `contentJson` (`StrategyArtifact` JSON) | Latest per project |
| `artifactDestinations` | Failed Notion exports only | No row on successful export |

Read path: `getLatestStrategyArtifact` → `mapStrategyArtifactToTabData`.

Project delete cascades to all `projectAi*` rows and cleans Research R2 keys from artifact JSON.

---

## Terminal noise (`provider_warning`)

Codex often prints on **stderr**:

- Fragments of the **research** artifact (`uiPatterns`, `recognizedPatterns`, Refero `imageUrl`, …)
- The **strategy prompt** echoed back (`Requirements:`, `- Use exactly these seven sections`, …)
- A full **`strategyArtifact`** JSON line (this is still parsed — see `provider_json.rs`)
- `tokens used` / `codex` / token counts

These show as `type":"provider_warning"` in Terminal 2. **They are not run failures.**

| You see | Meaning |
|---------|---------|
| Many `provider_warning` lines | Noisy stderr; ignore if run finishes |
| `run_completed` + `Strategy artifact saved.` | **Success** — check Strategy tab |
| `run_failed` + `strategy table rows…` | Real failure (fixed June 2026 via table coerce — restart engine) |
| `ERROR stage_engine::strategy::workflow` | Real failure — read `error=` on same line |

Architecture: [STRATEGY_DEV_STATUS.md](./STRATEGY_DEV_STATUS.md#provider-output-pipeline-normalize-first).

---

## Do not

- Run `cargo run` while `pnpm dev` is open (port 48221)
- Debug engine via browser Network tab (IPC, not HTTP)
- Expect Strategy to run if Research was done on a **different** project
- Rely on sessionStorage mock data — clear `stage:mock-strategy-artifact:*` if you previously tested with the old dev mock path

Mock UI only (layout): `VITE_MOCK_STRATEGY=1` in `.env` — **not wired to Generate**; use only if you manually inject mock records for Figma work.

---

## Common failures

| Symptom | Cause |
|---------|--------|
| No `[stage-engine]` Strategy logs | Old dev mock path was used; restart app after fix |
| `Choose Claude or Codex in Research…` | Connect Claude or Codex in Settings → Integrations |
| `Could not save strategy changes` | Old mock id in sessionStorage; regenerate via engine |
| `No saved strategy artifact to regenerate` | Section regenerate needs a Convex-saved artifact |
| Research required screen | No completed research on this project |

---

## Run log

| Date | Result | Provider | Notes |
|------|--------|----------|-------|
| 2026-06-02 | — | — | Dev parity fix: Strategy uses Convex + engine like Research |

### Template for next run

```markdown
### YYYY-MM-DD — PASS|FAIL (claude|codex)

**Project id:** …

```txt
(paste last ~15 [stage-engine] lines)
```

**Outcome:** …
```
