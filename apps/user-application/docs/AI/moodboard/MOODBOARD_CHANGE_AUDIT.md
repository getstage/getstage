# Moodboard Change Audit

Last updated: 2026-06-04

| Layer | Files | Change | Reason | Notes |
|---|---|---|---|---|
| Engine Refero | `apps/stage-engine/src/refero/parse.rs` | Added support for MCP image content arrays and related image payload shapes. | Refero screenshots could be returned as MCP image content instead of a plain string/blob field. | Prevents false “image missing” when MCP response contains valid base64 image data. |
| Engine Moodboard | `apps/stage-engine/src/moodboard/workflow.rs` | Added stronger Refero image fallback behavior and preserved CDN/render fallback URLs when R2 upload succeeds. | A saved asset key should be primary, but the artifact should retain provenance/fallback data for debugging and resilience. | New imports keep `sourceUrl` as provenance only. |
| Engine Moodboard | `apps/stage-engine/src/moodboard/workflow.rs` | New Refero/Figma/URL references store R2 keys plus non-primary fallback URLs. | Avoids a single broken/expired display URL taking down the grid. | Old artifacts without fallback URLs may still need re-import if their R2 object is gone. |
| Convex R2 | `packages/data-ops/convex/r2.ts` | Changed new moodboard object keys to project-first paths. | Debugging moodboard assets by project is easier than starting from user IDs. | New shape: `moodboard/projects/{projectId}/users/{userId}/{source}/{uuid}.{ext}`. |
| Convex R2 compatibility | `packages/data-ops/convex/lib/projectAi/domain/r2Keys.ts` | Updated R2 key collection to recognize new project-first moodboard keys and legacy keys. | Cleanup/audit paths must keep working across old and new storage layouts. | Legacy `users/{userId}/moodboard/{projectId}/...` keys remain supported. |
| Convex read | `packages/data-ops/convex/lib/projectAi/domain/researchContent.ts` | Resolve display URLs from explicit `imageAssetKey` / `thumbnailAssetKey` when present. | The stable asset key is the source of truth; signed URLs should be generated fresh on read. | Applies to moodboard via `getLatestMoodboardArtifact` using `resolveAssetContentJson`. |
| Frontend query | `apps/user-application/src/lib/project/shouldQueryProjectAiArtifacts.ts` | Enabled project AI artifact queries in dev by default. | Stage Engine writes artifacts to Convex in dev too; disabling reads made successful runs look empty. | Can still skip with `VITE_SKIP_PROJECT_AI_ARTIFACT_QUERIES=1`. |
| Frontend mapping | `apps/user-application/src/types/project/moodboardTab.ts` | Prefer resolved `thumbnailUrl` over `imageUrl` for display. | For imported assets, thumbnail/render URL is often the most reliable browser source after Convex read. | `sourceUrl` remains fallback/provenance only. |
| Frontend save | `apps/user-application/src/lib/project/moodboardBoardState.ts` | Save stable asset keys as primary artifact truth when asset keys exist. | Prevents temporary signed URLs from becoming the persisted source of truth. | `imageUrl` may be a stable object key at rest; Convex resolves it on read. |
| Frontend UI | `apps/user-application/src/components/project/tabs/moodboard/MoodboardGrid.tsx` | Added image source fallback chain and graceful unavailable state. | The grid should try known renderable sources before showing an unavailable placeholder. | Tries display image, thumbnail URL, image URL, then source URL. |
| Frontend UI | `apps/user-application/src/components/project/tabs/moodboard/MoodboardGrid.tsx` | Added fullscreen preview modal per reference. | User needs to inspect moodboard screenshots at full size. | Opens from card hover/focus button; closes with Escape, backdrop, or close button. |
| Frontend UI | `apps/user-application/src/components/project/tabs/moodboard/MoodboardTab.tsx`, `DirectionHub.tsx` | Removed auto-seeded fixture directions and added inline direction rename. | Directions are user-created buckets, not automatic fixture labels like `Direction 1/2/3`. | Empty legacy fixture directions are filtered unless referenced or style-guide-backed. |
| Frontend reliability | `apps/user-application/src/components/project/tabs/moodboard/MoodboardTab.tsx` | Removed auto-select-on-load behavior and scoped actions to visible selected refs. | Delete/add actions should only affect explicit visible selections. | Prevents hidden/stale selections from mutating unrelated refs. |
| Frontend reliability | `apps/user-application/src/components/project/tabs/moodboard/MoodboardTab.tsx`, `FolderMenu.tsx` | Made Direction menu close on delete, grid click, outside click, selection loss, and view changes. | Popover state was hanging after grid/delete interactions. | Menu is now positioned relative to its action wrapper. |
| Docs | `MOODBOARD_BUILD_PLAN.md`, `MOODBOARD_DEV_STATUS.md`, `MOODBOARD_TESTING.md`, `MOODBOARD_CHANGE_AUDIT.md` | Documented direction behavior, R2 key strategy, image resolving rules, fullscreen preview, and regression checks. | Keep product/architecture decisions durable for future implementation work. | Update this audit after future moodboard storage or UI behavior changes. |

## Storage Contract

| Field | Stored At Rest | Returned To Renderer | Purpose |
|---|---|---|---|
| `imageAssetKey` | Stable R2 object key | Same stable key | Primary source of truth when present. |
| `thumbnailAssetKey` | Stable R2 object key | Same stable key | Primary thumbnail source of truth when present. |
| `imageUrl` | Stable object key or original fallback URL | Fresh signed URL when key-backed | Browser display URL after Convex read. |
| `thumbnailUrl` | Stable object key or original fallback URL | Fresh signed URL when key-backed | Preferred browser display URL after Convex read. |
| `sourceUrl` | Original Refero/Figma/direct source URL | Same URL | Provenance/debug fallback only, not primary truth. |

## Verification

| Check | Result | Notes |
|---|---|---|
| `cargo test refero::parse -- --nocapture` from `apps/stage-engine` | Passed | Verified MCP image content decoding changes. |
| `cargo check` from `apps/stage-engine` | Passed | Rechecked after moodboard workflow image/fallback changes. |
| `pnpm --dir packages/data-ops run convex:typecheck` | Passed | Rechecked R2 key generation/resolver helper changes. |
| `pnpm run desktop:typecheck` | Passed | Rechecked Moodboard UI/save/fullscreen changes. |
