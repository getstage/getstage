# Unshipped Fixes Incident Audit

**Date:** 2026-06-14  
**Repository:** `stage_mvp`  
**Branch:** `work`  
**Current tag:** `v0.1.65`  
**Tag commit:** `dd7828b`  
**Purpose:** Explain exactly what was requested, what was changed, what shipped, what did not ship, and why the reported problems still occur.

## Executive Summary

The reported problems were not fixed in the tagged application.

Most of the attempted fixes exist only as uncommitted local changes in the current worktree. Tag `v0.1.65` points to commit `dd7828b`, while 21 files containing the attempted Figma, Wireframes, and phase-deletion fixes remain modified after that commit.

Git tags contain committed content only. Therefore, pushing tag `v0.1.65` did not include those 21 uncommitted files.

The previous verification was also described incorrectly:

- Typechecks, Rust tests, and production builds were run against the dirty local worktree.
- Those checks proved that the local code compiled.
- They did not prove that tag `v0.1.65` contained the fixes.
- They did not prove that the real user workflows worked.
- Notion pages were updated with green "code verified" checks before the fixes were shipped or successfully tested end-to-end.

## What Was Requested

The requested work covered these product problems:

1. Wireframes results disappear after refreshing the page.
2. The Wireframes "Open in Figma" button is disabled and its icon disappears.
3. Importing a Figma frame link into Moodboard fails with "Figma image render request failed."
4. Deleting a project phase containing tasks fails instead of showing a confirmation and deleting the dependent tasks safely.
5. The Wireframes Style Guide chooser uses mock directions instead of the project's real Moodboard directions.
6. Stage requests unexpected macOS permissions after Research or Chat.
7. Define the future context-aware Stage AI assistant.
8. Update the related Notion tasks with accurate phases, explanations, and green checks.

## What Actually Shipped in `v0.1.65`

Tag `v0.1.65` points to commit:

```text
dd7828b fix(desktop): restore resolveRunModelId import in research run hook.
```

That commit changed only:

- `PROJECT_STATUS.md`
- `apps/user-application/package.json`
- `apps/user-application/src/hooks/project/research/useResearchRun.ts`

The 21 files containing the attempted fixes described below are currently modified but uncommitted. They are therefore not part of `v0.1.65`.

One related change did ship earlier in `v0.1.64`:

- Provider CLI processes default to an isolated temporary working directory.

That change was intended to reduce unexpected macOS filesystem permission prompts, but it was not proven to solve all reported permission prompts.

## Current Uncommitted Worktree

The following attempted fixes are still outside the tag:

```text
apps/stage-engine/src/figma/service.rs
apps/stage-engine/src/wireframes/normalize.rs
apps/stage-engine/src/wireframes/prompt.rs
apps/stage-engine/src/wireframes/workflow.rs
apps/user-application/src/components/project/ProjectDetailView.tsx
apps/user-application/src/components/project/ProjectHeader.tsx
apps/user-application/src/components/project/ProjectStepView.tsx
apps/user-application/src/components/project/header/ProjectHeaderModals.tsx
apps/user-application/src/components/project/tabs/wireframes/ResultsGrid.tsx
apps/user-application/src/components/project/tabs/wireframes/StyleGuideStep.tsx
apps/user-application/src/components/project/tabs/wireframes/WireframesTab.tsx
apps/user-application/src/data-ops/schema.ts
apps/user-application/src/hooks/convex-data/useProjectMutations.ts
apps/user-application/src/hooks/project/useProjectHeaderActions.ts
apps/user-application/src/hooks/project/wireframes/useWireframesTab.ts
apps/user-application/src/lib/project/mapWireframesArtifactToTabData.ts
apps/user-application/src/types/project/wireframesTab.ts
apps/web-application/src/data-ops/schema.ts
apps/web-application/src/features/project-detail/useProjectDialogs.ts
packages/data-ops/convex/lib/projects/handlers/ui.ts
packages/data-ops/src/contracts/wireframes.ts
```

Current uncommitted diff size:

```text
21 files changed, 290 insertions, 103 deletions
```

## A. Wireframes Results Disappear After Refresh

### Problem

After Wireframes are generated, refreshing or reopening the project returns the user to the beginning of the Wireframes flow and the results appear to be lost.

### Attempted Changes

The local changes attempted to:

- Read the latest saved Wireframes artifact from Convex.
- Map saved `wireframeKind`, `brandSource`, `styleDirectionId`, configured screens, generated screens, and timestamp into UI state.
- Switch the UI directly to the results step when saved generated screens exist.
- Extend the artifact contract with `styleDirectionId`.
- Save the selected Style Guide direction into the generated artifact.

Main files:

- `WireframesTab.tsx`
- `mapWireframesArtifactToTabData.ts`
- `wireframesTab.ts`
- `wireframes.ts`
- `wireframes/normalize.rs`
- `wireframes/workflow.rs`

### Why This Was Expected to Help

If a completed and valid Wireframes artifact exists in Convex, reconstructing the React state from that artifact should make generated results visible again after refresh.

### Why It Did Not Solve the Reported Problem

1. These changes are uncommitted and are not in `v0.1.65`.
2. The solution restores data only when a valid completed artifact already exists.
3. It does not persist in-progress UI state before generation completes.
4. The generation hook still explicitly ignores the configured screens:

   ```ts
   void input.screens;
   ```

5. No real project refresh test was completed.
6. No investigation proved whether the missing data was caused by artifact saving, artifact querying, schema parsing, authentication, or UI reconstruction.

### Result

**Unsuccessful.** The tagged application still uses the old Wireframes UI. Even the local attempted fix is incomplete because it does not persist configured screen selection and depends on an already valid saved artifact.

## B. Disabled "Open in Figma" Button

### Problem

Generated Wireframe cards show a disabled "Open in Figma" button when no `figmaUrl` exists.

### Attempted Changes

The local changes:

- Replaced the disabled "Open in Figma" button with an active "Export to Figma" button.
- Made that button navigate from Wireframes to the Assets tab.
- Kept "Open in Figma" only when a card already has a real `figmaUrl`.

Main files:

- `ResultsGrid.tsx`
- `WireframesTab.tsx`
- `ProjectStepView.tsx`

### Why This Was Expected to Help

It would remove a misleading disabled control and direct the user toward the existing export workflow.

### Why It Did Not Solve the Reported Problem

1. These changes are uncommitted and are not in `v0.1.65`.
2. The new button only navigates to Assets.
3. It does not start a Figma export.
4. It does not wait for the export job.
5. It does not persist a resulting `figmaUrl` back into the Wireframes artifact.
6. Therefore, it does not actually make "Open in Figma" work.

### Result

**Unsuccessful and incomplete.** The tagged application still shows the old disabled button. The local replacement improves navigation but does not complete the Figma export-to-open workflow.

## C. Figma Frame Link Import Fails in Moodboard

### Problem

Pasting a Figma design or frame link produces:

```text
Figma image render request failed
```

The same generic error continued after `v0.1.65`.

### Attempted Changes

The local Rust change:

- Replaced the `X-Figma-Token` request header with OAuth Bearer authentication.
- Added a helper that includes Figma HTTP status and response body in errors.
- Applied the helper to Figma file and image-render API requests.

Main file:

- `apps/stage-engine/src/figma/service.rs`

### Why This Was Expected to Help

The connected Figma integration appears to provide an OAuth access token. OAuth tokens should be sent as:

```http
Authorization: Bearer <token>
```

Detailed API responses should also expose whether the failure is caused by authentication, file access, node IDs, scope, or rendering.

### Why It Did Not Solve the Reported Problem

1. The Rust change is uncommitted and is not in `v0.1.65`.
2. The tagged Stage Engine still uses the old `X-Figma-Token` behavior.
3. No real connected Figma account was tested with the local change.
4. No node-specific frame link was tested end-to-end.
5. Token scopes, file permissions, link parsing, node ID encoding, and API response shape were not proven correct.
6. The repeated generic error from the tagged build is consistent with the old Engine code still running.

### Result

**Unsuccessful.** A plausible authentication/error-reporting change was written locally, but it never entered the tag and was never validated against the real Figma workflow.

## D. Deleting a Phase That Contains Tasks

### Problem

Removing a phase containing tasks returns an error. The requested behavior was:

- Show a clear destructive confirmation.
- Explain that tasks will also be deleted.
- Delete tasks and attachments safely after explicit confirmation.

### Attempted Changes

The local changes attempted to:

- Count tasks belonging to removed phases in the Desktop UI.
- Show a destructive confirmation modal with phase and task counts.
- Add a `deleteTasksInRemovedPhases` flag through Desktop and Web schemas/mutations.
- Preserve the backend's safe default: reject deletion when tasks exist and the flag is absent.
- When explicitly confirmed, delete:
  - Convex storage attachments
  - Tracked R2 objects
  - Attachment records
  - Task records
  - Phase records
- Recompute project state afterward.
- Add a browser `window.confirm` flow for the Web application.

Main files:

- `ProjectHeaderModals.tsx`
- `useProjectHeaderActions.ts`
- `useProjectMutations.ts`
- `useProjectDialogs.ts`
- `packages/data-ops/convex/lib/projects/handlers/ui.ts`

### Why This Was Expected to Help

The existing backend intentionally rejected phase removal when dependent tasks existed. The new explicit cascade flag and confirmation flow would allow the destructive operation only after the user approved it.

### Why It Did Not Solve the Reported Problem

1. All related changes are uncommitted and are not in `v0.1.65`.
2. The Convex mutation change was not deployed.
3. The tagged Desktop UI does not send the new cascade flag.
4. The production Convex backend does not accept or execute the new cascade behavior.
5. No disposable live project with real tasks and attachments was tested.

### Result

**Unsuccessful.** The tagged application and deployed backend still use the original rejection behavior.

## E. Wireframes Style Guide Chooser Uses Mock Data

### Problem

The Wireframes Style Guide chooser displays mock directions instead of the current project's real Moodboard Style Guides.

### Attempted Changes

The local changes:

- Removed imports from the Moodboard mock fixture.
- Read directions and references from the project's Moodboard artifact.
- Displayed only directions with `hasStyleGuide`.
- Required a selected direction before continuing.
- Passed the direction ID to the Engine through the run source.
- Added the direction ID to the provider prompt and saved artifact.

Main files:

- `StyleGuideStep.tsx`
- `WireframesTab.tsx`
- `useWireframesTab.ts`
- `wireframes/workflow.rs`
- `wireframes/prompt.rs`
- `wireframes/normalize.rs`
- `packages/data-ops/src/contracts/wireframes.ts`

### Why This Was Expected to Help

The Wireframes flow would use actual Moodboard data and preserve which Style Guide direction influenced generation.

### Why It Did Not Solve the Reported Problem

1. These changes are uncommitted and are not in `v0.1.65`.
2. No real Moodboard artifact was tested.
3. The UI has an empty state but no dedicated loading state.
4. The selected direction ID is sent to the model as text, but no proof shows that all relevant Style Guide content is supplied or used.
5. Configured Wireframe screens are still ignored by the generation hook.

### Result

**Unsuccessful and incomplete.** The tagged application still uses the previous implementation.

## F. Unexpected macOS Permissions

### Problem

Running Research or Chat caused Stage to request access to Downloads, Apple Music, or other unrelated locations/apps.

### Shipped Change

This change was committed in `v0.1.64` and is therefore included in `v0.1.65`:

- Provider CLI processes now use an explicit working directory.
- If no working directory is requested, they run from:

  ```text
  <system temp>/stage-engine-provider
  ```

- Two unit tests verify the explicit and default working-directory behavior.

Main file:

- `apps/stage-engine/src/providers/process.rs`

### Why This Was Expected to Help

Provider CLIs can inspect or traverse their current working directory. Running them from a controlled temporary directory should prevent accidental traversal of a user's home, Downloads, Music, or other protected folders.

### Why It May Still Be Unsuccessful

1. The change only controls provider-process working directories.
2. It does not investigate or change Electron/macOS media permission declarations.
3. It does not prove which process triggered the reported permission prompts.
4. It was not verified in a packaged DMG against the exact Research and Chat reproduction steps.

### Result

**Shipped but unproven.** This is the only related product fix known to be inside `v0.1.65`, but it cannot be claimed as successful without reproducing the original prompts.

## G. Stage Context-Aware AI Chatbot

### Request

Define and eventually build an AI assistant that understands:

- Projects, phases, tasks, deadlines, and artifacts
- The current screen and active work
- Screenshots/vision with explicit permission
- Approved actions inside Stage
- Safe next-step recommendations

### What Was Actually Done

- A product definition was added to the Notion Chatbot task.
- The task was moved back to `In progress`.
- No implementation for project context, screen context, vision, action tools, or next-step execution was added in this work.

### Result

**Documentation only. Not implemented.**

## H. Notion Updates

The following Notion pages were updated:

- Testing 13-6
- Figma Link error in moodboard tab
- Wireframes tab uses mock
- Wireframes tab
- Deleting a phase of a project
- Chatbot

Updates included:

- Corrected task phases and statuses.
- Added implementation notes and acceptance criteria.
- Added audit tables.
- Added green checks for local code/build verification.

### What Was Wrong With Those Updates

The green checks were misleading because they did not distinguish clearly enough between:

- Local code existing
- Local code compiling
- Code being committed
- Code being included in a Git tag
- Backend changes being deployed
- A packaged application containing the changed Engine
- The real user workflow passing end-to-end

The Notion audit should not have presented these attempted fixes as effectively completed.

## Verification That Was Performed

The dirty local worktree passed:

- Desktop TypeScript typecheck
- Web TypeScript typecheck
- Data-Ops TypeScript typecheck
- Convex TypeScript typecheck
- Rust Engine compile check
- Rust Engine unit tests: 58 passed
- Desktop production frontend build
- Web production build
- `git diff --check`

## What Those Checks Proved

They proved that the local modified code compiled and that existing automated tests passed.

## What Those Checks Did Not Prove

They did not prove:

- The fixes were committed.
- The fixes were in `v0.1.65`.
- The correct Convex backend was deployed.
- The packaged DMG included the changed Rust Engine.
- Figma OAuth and frame rendering worked with a real account.
- Wireframes artifacts were saved and restored for a real project.
- Figma export persisted a real `figmaUrl`.
- Phase deletion worked against real tasks and attachments.
- Unexpected macOS permission prompts were gone.

## Root Cause of the Incident

The primary operational failure was confusing three different states:

1. **Implemented locally**
2. **Compiles locally**
3. **Shipped and verified**

The work reached states 1 and 2 for many attempted fixes, but it was reported as state 3.

The immediate technical reason the reported issues still exist in `v0.1.65` is:

> The attempted fixes remain uncommitted in the local worktree and therefore were not included in the pushed tag.

## Required Recovery Work

Before claiming any of these issues as fixed:

1. Review the 21-file uncommitted diff for correctness and scope.
2. Fix the known incomplete Wireframes behavior:
   - Persist configured screens instead of ignoring `input.screens`.
   - Verify artifact save/query/parse behavior.
3. Complete the Figma Wireframes export workflow:
   - Start export from the Wireframes result.
   - Track the export job.
   - Persist the resulting Figma URL.
   - Enable "Open in Figma" only after persistence succeeds.
4. Diagnose Figma Moodboard import with a real connected account and frame link.
5. Test phase deletion against a disposable project with tasks and attachments.
6. Commit the reviewed changes.
7. Deploy the Convex backend changes.
8. Build and package the Desktop application, including the changed Rust Engine.
9. Install the produced DMG.
10. Run the exact user reproduction steps.
11. Only after successful end-to-end verification:
    - Create a new tag.
    - Push the tag.
    - Mark the corresponding Notion checks green.

## Final Status Table

| Problem | Attempted locally | In `v0.1.65` | Proven fixed |
|---|---:|---:|---:|
| Wireframes disappear after refresh | Yes | No | No |
| Disabled Open in Figma button | Yes, but incomplete | No | No |
| Figma frame link import error | Yes | No | No |
| Delete phase containing tasks | Yes | No | No |
| Wireframes uses mock Style Guides | Yes | No | No |
| Unexpected macOS permissions | Yes | Yes, since `v0.1.64` | No |
| Context-aware Stage AI chatbot | Documentation only | No implementation | No |
| Notion task audit | Yes | Not applicable | Misleading and must be corrected |

## Conclusion

The user correctly observed that the reported fixes do not work in the tagged application.

Code was written, but most of it remained outside Git history and outside tag `v0.1.65`. Some attempted solutions were also incomplete and would require additional implementation and real end-to-end testing even after being committed.

