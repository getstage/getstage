# R2 Storage Change Audit

Last updated: 2026-06-04

## Decision

New R2 object keys are **domain-first**. Project-scoped assets are also **project-first**.

Old keys remain supported and must not be migrated eagerly.

## New Key Shapes

| Purpose | New key shape | Notes |
|---|---|---|
| `profile-avatar` | `profiles/users/{userId}/avatars/{uuid}.{ext}` | User-scoped; no project context. |
| `client-avatar` with project scope | `clients/projects/{projectId}/users/{userId}/avatars/{uuid}.{ext}` | Project header/client profile uploads pass `projectId`. |
| `client-avatar` without project scope | `clients/users/{userId}/avatars/{uuid}.{ext}` | Used during project creation before a project ID exists. |
| `project-marker` with project scope | `projects/{projectId}/users/{userId}/markers/{uuid}.{ext}` | Project header uploads pass `projectId`. |
| `project-marker` without project scope | `projects/project-drafts/users/{userId}/markers/{uuid}.{ext}` | Used during project creation before a project ID exists. |
| `project-asset` with project scope | `project-assets/projects/{projectId}/users/{userId}/files/{uuid}.{ext}` | Assets tab passes `projectId`. |
| `project-asset` without project scope | `project-assets/project-drafts/users/{userId}/files/{uuid}.{ext}` | Fallback for upload paths without project context. |
| `research-refero` | `research/projects/{projectId}/users/{userId}/refero/{uuid}.{ext}` | Stage Engine already passes project scope. |
| `research-brief` | `research/projects/{projectId}/users/{userId}/briefs/{uuid}.{ext}` | Research configure passes project scope. |
| `moodboard-upload` | `moodboard/projects/{projectId}/users/{userId}/uploads/{uuid}.{ext}` | Moodboard upload passes project scope. |
| `moodboard-refero` | `moodboard/projects/{projectId}/users/{userId}/refero/{uuid}.{ext}` | Stage Engine passes project scope. |
| `moodboard-figma` | `moodboard/projects/{projectId}/users/{userId}/figma/{uuid}.{ext}` | Stage Engine passes project scope. |
| `moodboard-url` | `moodboard/projects/{projectId}/users/{userId}/urls/{uuid}.{ext}` | Stage Engine passes project scope. |
| `generated-design` | `generated-designs/projects/{projectId}/users/{userId}/images/{uuid}.{ext}` | Generic upload path. |
| Stitch generated designs | `generated-designs/projects/{projectId}/users/{userId}/images/{screenId}.{ext}` | Separate Stitch integration key builder updated. |
| `task-attachment` with project scope | `tasks/projects/{projectId}/users/{userId}/attachments/{uuid}.{ext}` | Web task/research attachment paths pass project scope. |
| `task-attachment` without project scope | `tasks/users/{userId}/attachments/{uuid}.{ext}` | Fallback for upload paths without project context. |
| `csv-upload` | `imports/users/{userId}/csv/{uuid}.{ext}` | User-scoped private import. |
| `portal-logo` | `portal/users/{userId}/logos/{uuid}.{ext}` | User/workspace scoped. |

## Legacy Support

Legacy keys such as these still resolve and delete:

```txt
users/{userId}/moodboard/{projectId}/...
users/{userId}/research/{projectId}/...
users/{userId}/project-assets/...
users/{userId}/profile/...
users/{userId}/clients/...
```

## Audit Table

| Layer | Files | Change | Reason | Notes |
|---|---|---|---|---|
| Convex R2 | `packages/data-ops/convex/r2.ts` | Replaced user-first key generation with domain-first/project-first key generation. | Make R2 debugging match how Stage work is organized. | Existing object keys remain valid. |
| Convex R2 cleanup | `packages/data-ops/convex/r2.ts` | Updated referenced-key ownership checks to support both `users/{userId}/...` and `.../users/{userId}/...`. | Cleanup must not miss new domain-first assets. | Applies to attachments, generated designs, portal configs, and tracked assets. |
| Convex orphan listing | `packages/data-ops/convex/r2.ts` | Updated orphan scan from old `users/{userId}/...` prefix-only matching to shared ownership matching. | New domain-first objects must be visible to cleanup/debug tooling. | Old keys still match. |
| Convex project AI cleanup | `packages/data-ops/convex/lib/projectAi/domain/r2Keys.ts` | Added new domain-first prefixes to JSON key collection. | Artifact cleanup should recognize new storage layout. | Keeps legacy research/moodboard detection. |
| Stitch integration | `packages/data-ops/convex/integrations/stitch.ts` | Changed generated design key builder to project-first. | Stitch bypasses `r2.ts`, so it needed its own key update. | Uses screen ID as filename stem. |
| Frontend project header | `apps/user-application/src/hooks/project/useProjectHeaderActions.ts` | Pass `projectId` as upload scope for project marker and client avatar changes. | Project header uploads should land under project-scoped paths. | Project creation still uses draft paths. |
| Frontend assets | `apps/user-application/src/hooks/project/useProjectAssetUploads.ts`, `apps/user-application/src/components/project/tabs/assets/AssetsTab.tsx` | Added optional `projectId` scope and passed it from Assets tab. | Project assets should be project-first. | Upload modal without project context still uses domain fallback. |
| Web task/research attachments | `apps/web-application/src/components/project/ResearchTab.tsx`, `apps/web-application/src/components/task/TaskDetailPage.tsx` | Pass project scope for task/research attachment uploads. | Task files are project work and should be project-first when possible. | Falls back to `tasks/users/...` only if a future caller has no project context. |
| Web R2 helper | `apps/web-application/src/lib/r2Uploads.ts` | Added optional `scopeId` support matching the desktop helper. | Web upload callsites need to pass project scope into Convex. | Keeps existing callers working. |
| Docs | `R2_STORAGE_CHANGE_AUDIT.md` | Added global storage audit. | This decision applies beyond Moodboard. | Keep updated when new upload purposes are added. |

## Verification

| Check | Result | Notes |
|---|---|---|
| `pnpm --dir packages/data-ops run convex:typecheck` | Passed | Rechecked global R2 key generation, cleanup, and Stitch integration changes. |
| `pnpm run desktop:typecheck` | Passed | Rechecked project asset/header upload callsite changes. |
| `pnpm --dir apps/web-application run typecheck` | Passed | Rechecked web task/research attachment upload scope changes. |

## Self-Check Notes

During the global audit I found two things that were not complete enough:

| Finding | Fix |
|---|---|
| Orphan upload listing still only scanned legacy `users/{userId}/...` keys. | Changed it to use the same ownership helper as cleanup, so `profiles/users/...`, `project-assets/projects/.../users/...`, `moodboard/projects/.../users/...`, etc. are included. |
| Project AI artifact key collection only knew the new Research/Moodboard/project asset prefixes. | Broadened it to all current domain-first prefixes: profiles, clients, projects, project-assets, generated-designs, research, moodboard, tasks, imports, and portal. |
| Task attachments were domain-first but still user-scoped even when project context was available. | Added project-scoped task attachment keys and passed `projectId` from the web task/research attachment upload callsites. |
| The web app had a separate R2 upload helper that did not accept `scopeId`. | Added optional `scopeId` to the web helper and forwarded it to `r2.generateUploadUrl`. |

Intentional fallback paths remain for uploads that happen before a project exists. Project creation cannot store under `projects/{projectId}` yet, so it uses `projects/project-drafts/...` or `clients/users/...` until the project record exists.
