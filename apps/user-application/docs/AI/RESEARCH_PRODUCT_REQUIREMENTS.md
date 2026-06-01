# Research V1 — product requirements (owner decisions)

Date: June 1, 2026  
Related: [`RESEARCH_DEV_STATUS.md`](./RESEARCH_DEV_STATUS.md) · [`RESEARCH_TESTING.md`](./RESEARCH_TESTING.md)

---

## Structure (how pieces relate)

```txt
CONFIGURE (input)          RUN (engine)              OUTPUT (artifact)
─────────────────          ────────────              ─────────────────
projectAiContexts    →     Refero + provider   →     projectAiArtifacts.contentJson
  industry                   R2 screenshots            summary, competitors,
  brief, competitors         typed JSON                uiPatterns, referoContext
```

**One active research** per project: `completeResearchRun` deletes previous research artifacts and their R2 keys before saving the new one.

---

## Requirements checklist

### One research per project

- [x] Full **Run Research** replaces previous artifact (not additive history)
- [x] Old R2 keys collected from previous `contentJson` and deleted
- [x] **Section regenerate** patches one section only (`source: section:…`)

### Input (configure form)

- [x] Save fields before run → `projectAiContexts` (`upsertContext`)
- [x] Pre-fill form when user returns (`getContext` → `useResearchContext`)
- [ ] Brief file upload → R2 (`briefAttachmentR2ObjectKey` — partial)

### Output (research tab)

- [x] Load latest artifact → parse → map to UI
- [x] **Save Changes** writes back to Convex (`updateResearchArtifact`) — summary, snapshot, opportunities
- [ ] Save Changes for all sections (competitors, UI patterns, personas — not wired)
- [ ] **Discard Changes** explicit revert (reload from Convex today)

### Refero images

- [x] Engine searches Refero (`refero_search_screens`, `refero_search_flows`)
- [x] Fetch full screenshots (`refero_get_screen_image`, max 15)
- [x] Upload to R2 (`purpose: research-refero`, project-scoped keys)
- [x] Store full image and carousel thumbnail separately (`uiPatterns.examples.imageUrl`, `thumbnailUrl`)
- [x] Convex resolves R2 keys → signed URLs on read (`https://` pass through)
- [x] UI carousel reads `thumbnailUrl`; lightbox opens full `imageUrl`
- [x] CDN fallback when R2 upload fails (`thumbnail_url` / `preview_url`)
- [x] Patterns Recognised: tag labels only (no repeated group summary)
- [x] Target Users: `joinSentences()` (no double periods)

### Not in V1

- Export to Notion
- Research history UI
- Scoped engine token

---

## Refero → R2 flow (implemented)

```txt
1. refero_search_* (response_format=json) → records[].uuid
2. refero_get_screen_image(uuid, full) → bytes
3. Convex generateUploadUrl + PUT + syncMetadata
4. build_ui_pattern_example → uiPatterns.examples[].imageUrl (full) + thumbnailUrl (carousel)
5. completeResearchRun → delete old artifact + R2 keys
```

**Code:** `apps/stage-engine/src/refero/*`, `research/refero_assets.rs`, `research/workflow.rs`  
**Rules:** `.agents/skills/refero-mcp/SKILL.md`

---

## Edit vs regenerate

| Action | Scope | Storage |
|--------|--------|---------|
| **Run Research** | Whole research | Replace artifact + R2 set |
| **Save Changes** | User text edits | Patch `contentJson` in place |
| **Regenerate with AI** | One section | Engine merges section into artifact |

---

## Status snapshot (June 1, 2026)

| Requirement | Status |
|-------------|--------|
| Real engine run + Convex artifact | Done |
| Configure form → Convex | Done |
| Pre-fill configure form | Done |
| Parse artifact in UI | Done |
| Refero images → R2/CDN → UI | **Done** (June 1) |
| One artifact per project | Done |
| Save text edits to Convex | **Partial** (3 sections) |
| Section regenerate | Done |
| Brief upload → R2 | Not done |
| Export to Notion | Not done |

---

## Convex tables

| Table | Purpose |
|-------|---------|
| `projectAiContexts` | Configure form (one row per project) |
| `projectAiRuns` | Run audit trail |
| `projectAiArtifacts` | Latest `contentJson` (one active research after replace) |

R2 bytes are **not** in Convex tables — only object keys inside `contentJson`.
