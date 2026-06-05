# Moodboard E2E testing

> **Architecture & status:** [`MOODBOARD_DEV_STATUS.md`](./MOODBOARD_DEV_STATUS.md) · **Build order:** [`MOODBOARD_BUILD_PLAN.md`](./MOODBOARD_BUILD_PLAN.md) · **Change audit:** [`MOODBOARD_CHANGE_AUDIT.md`](./MOODBOARD_CHANGE_AUDIT.md)

---

## Before you test

1. **Terminal 1:** `cd packages/data-ops && npx convex dev`
2. **Terminal 2:** `cd apps/user-application && pnpm dev`
3. **After Rust changes:** `kill $(lsof -t -i:48221)` then restart Terminal 2
4. **Engine readiness:**

```bash
curl http://127.0.0.1:48221/v1/readiness   # expect "ready": true
```

5. **Project:** Logged in; project with **Research** + **Strategy** completed (recommended; not required for import-only tests)
6. **Refero (search import):** `REFERO_MCP_TOKEN` (+ `REFERO_MCP_URL` if non-default) in stage-engine environment
7. **Figma import:** Settings → Integrations → Figma **connected** (active OAuth)

First `pnpm dev` after Rust changes: allow **1–3 min** compile. Refero import run: usually **10–60 s** depending on hit count and CDN.

---

## Smoke test — import paths (shipped)

### 1. Upload from device

1. Moodboard tab → **Upload from Device** mode (default)
2. Drop 2+ images → thumbnails in staging grid
3. Select → **Add to Moodboard** → assign to a direction (optional)
4. Reload app → images still present

**Expect:** R2 keys resolve to signed URLs; `source: upload`.

### 2. Refero search (“Search Refero”)

1. Switch to **Search Refero** (or click the sparkle control)
2. Enter query, e.g. `dashboard empty states`
3. Click **Generate**

**UI:**

- Import running state while `mode: moodboard` is active
- Then **staging grid** with thumbnails (not an empty white canvas)
- `run_completed` with no red error

**Terminal 2:**

```txt
[stage-engine] moodboard import workflow started source=Some("refero")
[stage-engine] Moodboard Refero import staged references reference_count=N
run_completed
```

`N` should be ≥ 1. MCP warnings like `Refero image missing` are OK if followed by `loaded from search CDN URL` or successful upload.

**Not expected:** `run_completed` + completely empty grid. If that happens, see [Troubleshooting](#troubleshooting).

**Clarification:** This path does **not** call Claude/Codex. Query is **only** the search box text.

### 3. Direct image URL

1. **Figma Link** mode → paste a direct image URL (`.png`, `.jpg`, `.webp`, `.gif`)
2. Submit → one staged reference

**Expect:** `source: url`, image in grid after reload.

### 4. Figma link

1. Connect Figma in Settings → Integrations
2. **Figma Link** mode → paste a `figma.com/design/...` URL the connected user can open
3. Submit → one or more staged frames

**Expect:** `source: figma`. If not connected: message to connect Figma (not env-token error).

---

## Smoke test — persistence & board

| # | Step | Pass criteria |
|---|------|----------------|
| 5 | Select staged refs → **Add to Moodboard** | Items move to board grid (`isInMoodboard: true`) |
| 6 | Reload app | References + directions restored from Convex |
| 7 | Re-run **Strategy** on same project | Moodboard **unchanged** until “Clear later steps” in dialog |
| 8 | `UpstreamStaleBanner` | Shows when research/strategy newer than moodboard (if applicable) |

### Direction checks

| # | Step | Pass criteria |
|---|------|----------------|
| 9 | Fresh/imported moodboard with no user-created directions | No automatic `Direction 1`, `Direction 2`, `Direction 3` entries appear |
| 10 | Open **Add to Direction** before creating a direction | Existing direction list is empty; user must create a named direction |
| 11 | Try saving a blank new direction | Nothing is created; no fallback `Direction N` name |
| 12 | Create a named direction and assign refs | Direction appears in Direction Hub with the real assigned reference count |
| 13 | Rename the direction from Direction Hub | Assigned refs move with the renamed direction; reload keeps the new name |
| 14 | Import refs from Refero/Figma/upload | New refs are visible but not automatically selected |
| 15 | Select staged refs only and click **Delete selected** | Only those visible staged refs are removed from the staging grid/artifact |
| 16 | Select one visible moodboard ref and click **Delete from Moodboard** | Only that visible selected ref leaves the moodboard; hidden/other refs are unchanged |
| 17 | Reload an older artifact with empty `Direction 1/2/3` | Empty legacy fixture directions are not shown unless references/style guide data use them |
| 18 | Open **Add to Direction**, then click grid/delete/outside/menu toggle | Direction menu closes cleanly; no floating popover remains |
| 19 | Reload refs with `imageAssetKey` / `thumbnailAssetKey` | Convex resolves fresh signed URLs; grid does not show broken image placeholders when assets exist |
| 20 | Hover a reference and open fullscreen preview | Preview opens in a modal; Escape, close button, or backdrop closes it |
| 21 | Import a new moodboard image and inspect artifact/R2 key | New key starts `moodboard/projects/{projectId}/users/{userId}/...`; no signed URL is stored as primary truth when asset key exists |

---

## Smoke test — style guide

| # | Step | Pass criteria |
|---|------|---------------|
| 22 | Create a direction and assign at least one moodboard reference | Direction Hub shows the direction with the real reference count |
| 23 | Click **Generate Style Guide** | `StyleGuideGenerating` appears and stage-engine starts `mode: styleguide` |
| 24 | Wait for completion | `StyleGuideView` opens with provider-generated palette/typography/components |
| 25 | Inspect latest moodboard artifact | `styleGuides[]` contains one entry with matching `directionId`; direction has `hasStyleGuide: true` and `styleGuideId` |
| 26 | Click **Regenerate** | Existing style guide for that direction is replaced, not duplicated |
| 27 | Double-click Generate / Regenerate | Engine dedupes by `(projectId, styleguide, directionId)`; no parallel duplicate provider work |

Expected logs:

```txt
[stage-engine] styleguide workflow started
run_completed
```

and Convex `styleGuides[]` with project-specific palette/typography.

---

## Convex checks

| Table / query | What to verify |
|---------------|----------------|
| `projectAiArtifacts` | Latest `module: moodboard`, `kind: moodboardArtifact` |
| `contentJson` | `references[]` with `imageUrl` (https or resolvable key), **no** `null` for optional fields |
| `getLatestMoodboardArtifact` | Client receives resolved `imageUrl` / `thumbnailUrl` |

Import run does **not** require a row in `projectAiRuns` after success (same pattern as research/strategy completion).

---

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Empty grid after `run_completed` | Desktop error: “Saved moodboard could not be loaded” → artifact parse failed; re-run import on fresh engine |
| `Refero returned no screen images` | Query too narrow; Refero token; try another query |
| Only MCP warnings, no grid | Restart engine after pull; confirm CDN fallback log lines |
| Figma fails immediately | Integrations → Figma connected; URL accessible to that account |
| No engine logs | `curl` readiness; restart desktop app |
| Images broken in grid but refs exist | R2 / `resolveAssetContentJson`; check `imageAssetKey` in artifact |

---

## Static gates (before PR)

```bash
cargo check
pnpm --dir packages/data-ops exec convex codegen
pnpm --dir packages/data-ops run convex:typecheck
pnpm run desktop:typecheck
```
