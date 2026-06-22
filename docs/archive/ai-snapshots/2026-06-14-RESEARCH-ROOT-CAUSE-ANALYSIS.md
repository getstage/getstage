# Research root cause analysis — 14 June 2026

**Notion target:** https://app.notion.com/p/3758714fd557804196b8d7543121d81f?v=55c8714fd55782158820088e203de89b&p=37f8714fd55780db8e0ceeac74a075a2&pm=s
**Page ID:** `37f8714f-d557-80db-8e0c-eeac74a075a2`

**Status:** In progress · **Severity:** High · **Area:** Research / stage-engine

---

## What the user sees

- Research takes several minutes, then sometimes fails completely
- Competitive matrix shows fake `OK` values or generic `Dimension 1` labels (older builds)
- Recent strict validation caused **total run failure** when one matrix cell was missing (e.g. Squarespace on "Progressive disclosure in onboarding")
- Dev environment often runs **stale engine code** on port 48221

---

## Exact Research workflow

1. Load project context from Convex (brief, industry, competitor URLs)
2. Refero search — 5 UI category searches + 1 flow search (~15–19 references)
3. Upload Refero images to R2
4. Build one large text prompt
5. Run Claude CLI — **single call, `--tools ""` (no web browsing)**
6. Claude must return one JSON blob: summary, company snapshot, competitive analysis, personas, opportunities, open questions, sources
7. Rust post-processing: normalize → filter competitors → drop generic dimensions → validate/repair matrix
8. Save to Convex OR fail entire run

---

## Why it is slow

| Step | Cause |
| --- | --- |
| Refero | 6 API searches + image handling |
| R2 | ~15 image uploads |
| Claude | One large generation (~19k chars) |
| **Total** | Several minutes is expected |

---

## Why it is unpredictable

1. **Claude does not fetch competitor websites** — runs with no tools; uses brief + URLs as text + training knowledge
2. **One-shot giant JSON** — easy to drop fields; no per-section retry
3. **LLM non-determinism** — same project, different matrix each run
4. **Post-processing layers** — filter/normalize/validate can reject or alter results
5. **Dev sidecar reuse** — log shows `using existing service on port 48221` = old Rust binary still running

---

## Steering mismatch (prompt vs reality)

**Prompt does:** JSON shape, allowed competitor list, require score + evidence note per cell

**Prompt does NOT:** give Claude web access, split into smaller steps, enforce JSON schema, retry missing cells, verify real site visits

We ask research-grade competitive analysis **without giving Claude research tools**.

---

## Product rules (agreed 14 June 2026)

- **Never** invent fake `OK` placeholders
- **Never** use `N/A` — if AI did not return a cell, **omit it** (do not show, do not invent)
- **Never** fail the entire run because of one missing matrix cell — save the rest
- Show real evidence notes in matrix UI, not just colored scores

---

## Required fixes (direction)

1. Omit missing cells; save partial report
2. Give Claude web/research tools OR pre-fetch competitor summaries in engine before prompt
3. Split run — competitive matrix as dedicated step with retry
4. Structured JSON output enforcement
5. Kill stale sidecar after Rust changes: `kill $(lsof -t -i:48221)`

---

## Dev verification checklist

- [ ] Restart engine after Rust changes (must see `starting dev cargo run`, not `using existing service`)
- [ ] Run Research on project with 2 competitors
- [ ] Confirm artifact saves even if one matrix cell missing
- [ ] Confirm no fake OK / no N/A in matrix
- [ ] Confirm matrix shows score + evidence note
