# Changelog Overview — 2026-07-12

Overview of everything currently changed in the working tree for this backlog polish wave. Use this as source material for the public changelog.

**Scope:** uncommitted local changes (+ new docs/helpers) as of 2026-07-12.  
**Stats:** ~45 modified files, +1 new Convex helper, +2 Linear docs files.

---

## Summary (what to tell users)

1. **Moodboard images no longer disappear after ~24h** (STA-6) — root cause fixed.
2. **Project type “Other” now lets you specify a custom label** (STA-9).
3. **Client photo is optional** when creating a project (STA-10).
4. **Required wireframe screens can be unticked** (STA-11).
5. **Saving designs into a Direction opens Direction Hub** (STA-16).
6. **Newer AI models available** — GPT-5.6 variants + Claude Fable 5 (STA-20).

---

## STA-6 — Moodboard images disappearing (`Image Display Bug`)

### Problem (simple)
Moodboard Refero/Figma/URL uploads were treated as temporary. An hourly cleanup job deleted anything still marked “pending” after 24 hours — including live moodboard images. Public CDN URLs then 404’d. This was **not** signed-URL expiry.

### Example deleted object key
```text
moodboard/projects/<projectId>/users/<userId>/refero/<uuid>.jpg
```
Public form:
```text
https://assets-testing.getstage.co/moodboard/projects/.../refero/<uuid>.jpg
```

### What changed
| Change | Why |
| --- | --- |
| Attach R2 keys when moodboard/research artifacts are saved | Removes them from `uploadedAssets` so prune won’t delete live images |
| Harden `pruneStalePendingUploads` | If a stale upload is still referenced by an artifact, **attach** it instead of deleting |
| Scan `projectAiArtifacts.contentJson` for referenced keys | Prune safety net for moodboard/research keys stored in JSON |
| Prefer https display URLs in moodboard engine workflow; keep R2 keys in asset-key fields | Better display fallback when resolving keys |

### Files
- **New:** `packages/data-ops/convex/lib/projectAi/domain/attachArtifactAssets.ts`
- `packages/data-ops/convex/lib/projectAi/domain/artifactStore.ts`
- `packages/data-ops/convex/lib/projectAi/domain/r2Keys.ts`
- `packages/data-ops/convex/lib/projectAi/handlers/moodboard.ts`
- `packages/data-ops/convex/lib/r2/domain.ts`
- `packages/data-ops/convex/lib/r2/handlers.ts`
- `apps/stage-engine/src/moodboard/workflow.rs`

### Important caveat for changelog
- **Prevents future deletions** for newly saved images.
- **Does not restore** images already deleted from R2 (those need re-import).

---

## STA-9 — Project type “Other” + specify input

### What changed
- Added optional `typeOtherLabel` through schema / validators / contracts / create + read paths.
- Desktop create flow + onboarding + web create flow: choosing **Other** shows a specify/custom label input.
- Project lists show the custom label when type is `other`.

### Files (high level)
- Shared: `apps/user-application/shared/project-creation.ts`, `apps/web-application/shared/project-creation.ts`
- UI: `ProjectTypeStep.tsx` (desktop + web), onboarding renderer/flow/controller
- Persistence: `packages/data-ops/convex/schema.ts`, validators, project service/handlers, API models, desktop contracts
- Display: `ProjectsOverviewView.tsx`, `ClientPortalProjectsView.tsx`
- Draft/create wiring in both apps’ project-creation features

---

## STA-10 — Client photo optional

### What changed
- Client photo field labeled **(Optional)**.
- Removed create-flow validation that blocked project creation without a photo.

### Files
- `apps/user-application/src/components/project/create/ClientDetailsStep.tsx`
- `apps/user-application/src/hooks/project/useCreateProjectFlow.ts`
- Related create/model/schema touchpoints in the same wave

---

## STA-11 — Screens selection (required screens locked)

### What changed
- “Required” screens are **recommended / default-on**, not locked.
- Users can untick them again.
- Badge copy: `Required` → `Recommended`.

### Files
- `apps/user-application/src/components/project/tabs/wireframes/WireframesTab.tsx`
- `apps/user-application/src/components/project/tabs/wireframes/ConfigureStep.tsx`

---

## STA-16 — Redirection after Save Direction

### What changed
- After adding selected designs to a Direction (existing or newly created), Moodboard switches to **Direction Hub** (`setView("hub")`).

### Files
- `apps/user-application/src/components/project/tabs/moodboard/MoodboardTab.tsx`

---

## STA-20 — Latest AI models (GPT 5.6 / Fable 5)

### What changed
- Claude fallback/catalog + chat defaults: added **Claude Fable 5**.
- Codex/OpenAI: added **GPT-5.6 Sol / Terra / Luna**; removed older GPT-5.4 fallbacks from catalog.
- Codex update command hint: `codex --upgrade` → `codex update`.
- Critique panel / chat defaults updated to surface new models.

### Files
- `apps/stage-engine/src/providers/catalog.rs`
- `apps/stage-engine/src/providers/claude.rs`
- `apps/stage-engine/src/providers/service.rs`
- `apps/user-application/src/hooks/engine/useChatDefaults.ts`
- `apps/user-application/src/components/companion/CritiquePanel.tsx`

---

## Docs / tracking updates

### New / updated docs in this wave
- `docs/LINEAR_TODO.md` — backlog status board
- `docs/linear_todo_action.md` — action notes / diagnosis / done markers
- `docs/CHANGELOG_OVERVIEW_2026-07-12.md` — this file
- `apps/user-application/docs/AI/desktop/README.md` — minor desktop docs link/update
- Untracked inventory note: `apps/user-application/docs/AI/desktop/DESKTOP_PUBLIC_BUNDLE_INVENTORY.md` (present in tree; not part of the ticket fixes above)

---

## Suggested public changelog bullets

```md
### Fixes
- Moodboard images no longer get deleted after ~24 hours (pending-upload prune no longer removes live Refero/moodboard assets).
- Wireframe screen selection: recommended screens can be deselected again.
- After saving designs to a Direction, you land on Direction Hub.

### Improvements
- Project type “Other” now supports a custom label.
- Client photo is optional during project creation.
- Added Claude Fable 5 and GPT-5.6 model options.
```

---

## QA checklist before release notes go live

- [ ] Moodboard Refero import → save → confirm image still loads next day (or confirm key left `uploadedAssets`)
- [ ] Create project with type Other + custom label; label shows in lists
- [ ] Create project without client photo
- [ ] Untick a recommended wireframe screen and generate
- [ ] Add designs to Direction → lands on Direction Hub
- [ ] New models appear in chat/model picker

---

## Not fixed by this wave

- Already-deleted R2 moodboard objects remain gone (must re-import).
- STA-13 Figma Plugin Bug — not in this change set.
- STA-7 Chatbox Bug — not in this change set.
