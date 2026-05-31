# Research V1 — product requirements (owner decisions)

Date: May 31, 2026  
Audience: Product + next implementer  
Related: [`RESEARCH_DEV_STATUS.md`](./RESEARCH_DEV_STATUS.md) · [`RESEARCH_TESTING.md`](./RESEARCH_TESTING.md) · [`STAGE_AI_RESEARCH_HANDOFF.md`](./STAGE_AI_RESEARCH_HANDOFF.md)

---

## What you want (checklist)

### One research per project (full rerun replaces all)

- [ ] **One active research output** per project — not a growing history pile for normal use.
- [ ] When someone runs **Run Research** again, **delete previous research artifacts** for that project (and old R2 assets tied to them) **before** saving the new one.
- [ ] **No “run research again” as additive history** — a full run replaces the last result.
- [ ] **Section regenerate** (competitor card, UI pattern block, etc.) is allowed later — that patches **one section**, not a full new research run.

### Input (configure form)

- [x] **Save configure fields before run** — `projectAiContexts` via `upsertContext` (one row per project, patched in place).
- [ ] **Pre-fill configure form** when user returns (read `projectAiContexts` — data exists, UI not wired).
- [ ] **Brief file upload → R2** (schema has `briefAttachmentR2ObjectKey`; upload flow incomplete).

### Output (research tab)

- [x] **Load latest artifact** — `getLatestResearchArtifact` → parse `contentJson` → map to UI sections.
- [ ] **Text edits persist** — Summary, snapshot, competitors, etc.: **Save Changes** must write back to `projectAiArtifacts.contentJson` (today: UI-only, closes edit mode).
- [ ] **Discard Changes** reverts to last saved artifact from Convex.

### Refero images (must survive return visits)

- [ ] **Stage Engine** fetches Refero screens/flows via MCP during the run.
- [ ] **Download each Refero image** (thumbnail / screenshot URL from MCP response).
- [ ] **Upload to R2** under a stable project-scoped key (e.g. `research/{projectId}/{runId or artifactId}/refero/{referenceId}.webp`).
- [ ] **Store permanent URLs** in the saved artifact:
  - `referoContext.references[].imageUrl` (or `thumbnailUrl`) → **R2 public/signed URL**
  - `uiPatterns[].examples[].imageUrl` → same R2 URLs where example points at Refero
- [ ] **UI** already reads `uiPatterns` → `examples[].imageUrl` via `mapResearchArtifactToTabData` — no mock Figma URLs in production.
- [ ] On **full research replace**, delete **orphaned R2 objects** from the previous artifact.

**Owner:** `apps/stage-engine` (fetch Refero → upload R2 → embed URLs in JSON before `completeResearchRun`). Convex stores JSON only; R2 holds bytes.

### Not in V1 scope (called out so we don’t confuse them)

- Export to Notion (button exists, not wired)
- Full research history / “view previous runs” UI
- Scoped engine token (nice-to-have)

---

## Where data lives today (Convex)

| Table | Column | Purpose | One per project? |
|-------|--------|---------|------------------|
| **`projectAiContexts`** | `industry`, `clientWebsite`, `brief`, `competitorUrls`, `notes`, … | Configure form input | **Yes** (upsert) |
| **`projectAiRuns`** | status, `externalRunId`, … | Run tracking | Many (audit OK) |
| **`projectAiArtifacts`** | **`contentJson`** | Full `ResearchArtifact` JSON (text + metadata) | **Many today** → should be **one active** after replace policy |
| same | `summary` | Plain-text preview | With artifact |
| R2 (future) | object keys in JSON or `briefAttachmentR2ObjectKey` | Refero screenshots, brief PDF | Tied to current artifact |

**Refero URLs today:** inside `contentJson` only — **`imageUrl` fields are null**; nothing in R2. User sees text sections, **no UI Pattern screenshots**.

---

## Refero → R2 flow (to build in stage-engine)

```txt
1. refero_search_screens / refero_search_flows (MCP) → raw references
2. For each reference with image/thumbnail URL:
     download bytes
     PUT R2 (key scoped to project + artifact)
     replace reference URL with R2 URL
3. Map Refero refs into uiPatterns.examples[].imageUrl where sourceReferenceId matches
4. enrich_research_artifact → completeResearchRun(contentJson)
5. On replace run: delete previous artifact row + previous R2 prefix for that project
```

**Files to touch (engine):**

```txt
apps/stage-engine/src/refero/service.rs       — extract real image URLs from MCP payload
apps/stage-engine/src/research/workflow.rs      — orchestrate R2 upload before Convex save
apps/stage-engine/src/convex_store/research_repository.rs — optional: replace-not-append
new: apps/stage-engine/src/storage/r2.rs        — upload + delete prefix (or reuse existing R2 helper if any)
packages/data-ops/convex/projectAi.ts           — completeResearchRun: delete old research artifacts for projectId
```

---

## Edit vs regenerate (product rule)

| Action | Scope | Storage |
|--------|--------|---------|
| **Run Research** | Whole research | Replace artifact + Refero R2 set |
| **Save Changes** (edit mode) | User text edits | Patch `contentJson` in place |
| **Regenerate with AI** (per section) | One block only | Patch section in `contentJson`; no full rerun |

---

## Status snapshot (May 31, 2026)

| Requirement | Status |
|-------------|--------|
| Real engine run + Convex artifact | Done |
| Configure form → `projectAiContexts` | Done |
| Parse artifact in UI | Done — `.nullish()` on Refero + research optional fields; shared parser in `parseResearchArtifact.ts` |
| Refero images → R2 → UI | **Not done** |
| One artifact per project (delete old on rerun) | **Not done** |
| Save text edits to Convex | **Not done** |
| Section regenerate | **Not done** |
| Pre-fill configure form | **Not done** |

---

## Implemented May 31 (engineering)

| Area | What |
|------|------|
| **IPC** | `safeParse` run events; synthetic `run_failed`; skip empty provider stderr |
| **Run UX** | Claude/Codex picker; stall watchdog; generic user errors |
| **Parse** | Zod `.nullish()` for `null` from Codex/Rust; `parseResearchArtifactContent` helper |
| **UI** | Load artifact from Convex; removed parse-error banner on configure view |
| **Docs** | This file + updated `RESEARCH_DEV_STATUS.md`, `RESEARCH_TESTING.md` |
| **Not done** | Refero→R2, one-artifact replace on rerun, Save Changes to Convex |
