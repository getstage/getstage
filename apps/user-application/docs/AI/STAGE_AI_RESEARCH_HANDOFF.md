# Stage AI Research Handoff

Date: June 1, 2026  
Status: Research V1 pipeline **working** — Refero + R2 wired (June 1)  
Scope: Research workflow only

> **Debugging:** [`RESEARCH_DEV_STATUS.md`](./RESEARCH_DEV_STATUS.md) (architecture + file map)  
> **Testing:** [`RESEARCH_TESTING.md`](./RESEARCH_TESTING.md)  
> **Refero rules:** `.agents/skills/refero-mcp/SKILL.md`

---

## Architecture (implemented)

```txt
React → Electron IPC → Stage Engine (48221)
  → Convex (context, runs, artifacts)
  → Refero MCP (search + images)
  → R2 (research-refero screenshots)
  → Claude/Codex CLI
  → Convex completeResearchRun
  → React (getLatestResearchArtifact)
```

Stage Engine owns context assembly. React does not call Refero or providers directly.

---

## Layer map (quick)

| Layer | Location | Responsibility |
|-------|----------|----------------|
| UI | `apps/user-application/src/components/project/tabs/research/` | Render sections, edit mode, regenerate buttons |
| Hooks | `apps/user-application/src/hooks/project/research/` | Start run, load artifact, save edits, pre-fill form |
| Electron | `apps/user-application/electron/` | IPC, sidecar, env (`REFERO_MCP_TOKEN`) |
| Engine | `apps/stage-engine/src/research/` + `refero/` | Workflow, Refero, R2, prompt, provider |
| Convex | `packages/data-ops/convex/projectAi.ts` | Persistence, R2 URL resolve on read |
| Contracts | `packages/data-ops/src/contracts/` | `researchArtifact`, `referoContext` schemas |

---

## What is done

- Direct Convex from Rust (`research_repository.rs`)
- Full research workflow (`workflow.rs`)
- Refero search + parse + image fetch + R2 upload (`refero/*`, `refero_assets.rs`)
- Wire `uiPatterns.examples.imageUrl` / `thumbnailUrl` after Codex (full image for lightbox, thumbnail for carousel)
- UI tab mapping fixes: pattern tags without repeated summary; persona `joinSentences`
- Delete previous artifact + R2 keys on full rerun (`completeResearchRun`)
- Configure form save + pre-fill (`useSaveResearchContext`, `useResearchContext`)
- Save Changes → Convex (`useSaveResearchArtifact`, partial sections)
- Section regenerate (`useResearchSectionRegenerate`, `workflow.rs` section path)
- Artifact parse `.nullish()` for Codex null fields
- Engine logs in `pnpm dev` terminal (`[stage-engine]`)

---

## What is not done

- Export to Notion (button only)
- Brief file upload → R2 (filename in form; upload incomplete)
- `refero_search_styles` (visual direction)
- Scoped engine token (optional hardening)
- Save Changes for **all** sections (today: summary, snapshot, opportunities only)

---

## Next agent: inspect these first

```txt
apps/stage-engine/ARCHITECTURE.md
apps/stage-engine/src/research/workflow.rs
apps/stage-engine/src/refero/parse.rs
apps/stage-engine/src/refero/service.rs
apps/stage-engine/src/research/refero_assets.rs
packages/data-ops/convex/projectAi.ts
apps/user-application/src/hooks/project/research/
.agents/skills/refero-mcp/SKILL.md
```

## Next workflow (Strategy) — engine module shape

When adding Strategy, mirror Research layout (see [`apps/stage-engine/ARCHITECTURE.md`](../../../stage-engine/ARCHITECTURE.md)):

```txt
strategy/workflow.rs       # orchestration only
strategy/context.rs        # load research artifact + queries
strategy/prompt.rs         # provider prompt
strategy/post_process.rs   # validate/merge strategyArtifact
```

Reuse `refero/`, `runs/`, `providers/`, `convex_store/` — do not duplicate platform plumbing.

---

## After Rust changes

```bash
kill $(lsof -t -i:48221)
# restart pnpm dev
```

Look for `screen_hits`, `refero_images`, and `category_buckets=5` in logs — not just `run_completed`. Carousel can work when `refero_images=0` if artifact has Refero CDN thumbnails, but sharp click/lightbox needs full `imageUrl` from R2/preview. Re-run Research after engine image fixes.

---

## One-line summary

Research is end-to-end: **Refero → R2/CDN images → Codex → Convex → UI**. Kill stale engine on 48221 after engine edits; re-run Research for new `imageUrl`/`thumbnailUrl` mapping.
