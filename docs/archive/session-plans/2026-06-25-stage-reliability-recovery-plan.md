# Stage Reliability Recovery Plan

Date: 2026-06-25

This plan captures the current failure set around Research images, Moodboard, Style Guide, exports, provider connectivity, uploads, and client portal sync.

Important implementation rule: apply Ponytail and Toyota Reliability together. Fix the smallest real failing gate first, reuse existing helpers before adding code, keep diffs flat where possible, but never trim data-loss safety, auth/access checks, error handling, or accessibility.

## 0. Implementation Discipline

- [ ] Do not start with a large rewrite.
- [ ] Do not introduce a new architecture layer unless a concrete bug cannot be fixed safely without it.
- [ ] For every fix, first identify the smallest failing condition, query, mutation, hook, IPC call, or read model.
- [ ] Prefer deleting or correcting existing code over adding new code.
- [ ] Grep for existing helpers before adding a new helper.
- [ ] Reuse existing error mappers before creating new user-facing error code.
- [ ] Reuse existing upload, R2, run, and export persistence patterns before adding new ones.
- [ ] Keep data-loss safety even if it adds a few lines.
- [ ] Keep auth/access checks even if they add a few lines.
- [ ] Keep IPC/engine validation even if it adds a few lines.
- [ ] Keep accessibility for new controls such as Back, Delete Direction, Remove from Direction, retry buttons, and export actions.
- [ ] Do not add speculative flags, params, config, caching, retries, or abstractions.
- [ ] Do not add broad diagnostics dashboards as part of the first bugfix unless needed to prove the fix.
- [ ] If a bug can be fixed in one component, do not refactor the full feature.
- [ ] If a bug needs backend protection, add the smallest backend guard that prevents data loss or duplicate work.
- [ ] If a frontend guard exists, still verify backend safety for destructive or paid/run-generating actions.
- [ ] Every user-facing error must be calm and actionable.
- [ ] Raw technical errors belong in logs, not in normal UI.
- [ ] Verify each fix with the smallest targeted test or manual QA path.
- [ ] Run a delete-list review before PR: remove any helper, parameter, state field, or test that exists only because the fix was overbuilt.

## 1. Refero / Research Image Ghost Data

- [ ] Confirm Research artifacts never point to R2 images that no longer exist.
- [ ] Keep rerun-start cleanup behavior.
- [ ] Old Research artifacts are cleared when a new Research rerun starts.
- [ ] Old Strategy artifacts are cleared when a Research rerun starts, if Strategy depends on Research.
- [ ] Old R2 research files are deleted at rerun start only.
- [ ] Do not delete Research artifacts again at Research completion.
- [ ] Do not delete Strategy artifacts again at Research completion.
- [ ] Completion should validate the new artifact JSON before saving it.
- [ ] Completion should save the new artifact only once validation passes.
- [ ] Completion should not run broad cleanup that can delete freshly uploaded images.
- [ ] Newly generated Refero image URLs should be saved only after upload succeeds.
- [ ] Saved Research JSON should contain only URLs/keys that either exist or have a clear fallback.
- [ ] If an image upload fails during Research, do not save a ready artifact pointing to that missing file.
- [ ] If Research generation partially succeeds but image persistence fails, mark the run failed or degraded instead of ready.
- [ ] Add a guard/test for the exact failure: rerun Research, delete old images, upload new images, save artifact, reload, all images still render.
- [ ] Add a degraded UI state for missing research images.
- [ ] Missing research image tile should show `Image unavailable`.
- [ ] Missing research image tile should not show a broken browser image icon.
- [ ] Missing research image tile should not collapse the layout.
- [ ] Add a dev/admin diagnostic for a Research artifact that lists image URLs and missing R2 keys.
- [ ] Keep this diagnostic small and local; do not build a large admin system first.

## 2. Moodboard Direction Item Removal

- [ ] Add a safe way to remove an image from a Direction without deleting the uploaded asset globally.
- [ ] Separate `Remove from Direction` from `Delete from Moodboard`.
- [ ] Separate `Delete from Moodboard` from `Delete uploaded file`.
- [ ] In Direction Hub view, the default destructive-looking action should remove from Direction only.
- [ ] Global delete should require explicit intent.
- [ ] Removing from one Direction should not remove the same image from the All tab.
- [ ] Removing from one Direction should not remove the uploaded file.
- [ ] Removing from one Direction should not remove the same image from other Directions.
- [ ] Removing from one Direction should not delete the R2 object.
- [ ] Removing from one Direction should update the Direction item count.
- [ ] Removing from one Direction should persist after reload.
- [ ] If the image is used by a generated Style Guide, mark the Style Guide stale or leave it as historical output, but do not silently corrupt it.
- [ ] Confirmation copy should say exactly what will happen.
- [ ] Add test or manual QA: remove item from Direction, reload, item still exists in All, item no longer exists in that Direction.

## 3. Moodboard Direction Deletion

- [ ] Add a way to delete a Direction.
- [ ] Deleting a Direction should not delete uploaded source images by default.
- [ ] Deleting a Direction should remove the Direction name.
- [ ] Deleting a Direction should remove Direction image assignments.
- [ ] Deleting a Direction should remove or orphan the Direction Style Guide according to one explicit rule.
- [ ] Prefer deleting the Style Guide only if it belongs only to that Direction.
- [ ] Show confirmation before deleting a Direction.
- [ ] Confirmation should explain that images stay in the Moodboard unless separately deleted.
- [ ] Confirmation should explain what happens to the Style Guide.
- [ ] If the product requires at least one Direction, prevent deleting the last Direction and show why.
- [ ] If deleting the last Direction is allowed, show an empty Direction Hub state with `New Direction`.
- [ ] Add QA: delete Direction with images, reload, uploaded files remain, All tab remains correct.

## 4. Moodboard Upload Persistence

- [ ] Fix uploaded files disappearing after reload.
- [ ] Verify uploaded assets are saved to persistent storage, not only local UI state.
- [ ] Verify upload creates or updates the database record that the reload path reads.
- [ ] Verify asset records include project id.
- [ ] Verify asset records include user id or workspace ownership.
- [ ] Verify asset records include original filename.
- [ ] Verify asset records include file type.
- [ ] Verify asset records include size.
- [ ] Verify asset records include R2 asset key.
- [ ] Verify asset records include public URL or resolvable key.
- [ ] Verify asset records include thumbnail key when generated.
- [ ] Verify asset records include createdAt.
- [ ] Upload flow should upload file to R2 first.
- [ ] Upload flow should create persistent record after R2 upload succeeds.
- [ ] Upload flow should update Moodboard artifact/state after persistent record succeeds.
- [ ] Render should prefer persisted URL/key over temporary browser preview after reload.
- [ ] Fix mismatch where UI shows `Uploaded (1)` before reload and `Uploaded (0)` after reload.
- [ ] If DB save fails after R2 upload, show an error.
- [ ] If DB save fails after R2 upload, do not silently pretend upload succeeded.
- [ ] If DB save fails after R2 upload, consider small orphan cleanup only if existing cleanup helper exists.
- [ ] If thumbnail generation fails, keep the original image.
- [ ] If thumbnail generation fails, use original as fallback thumbnail.
- [ ] Add QA: upload image, reload, uploaded count remains, image renders, Direction assignment remains.

## 5. Moodboard Broken Image Handling

- [ ] Any unavailable image should render a clean fallback tile.
- [ ] Fallback tile should say `Image unavailable`.
- [ ] Broken images should not collapse layout.
- [ ] Broken images should not block selecting other images.
- [ ] Broken images should not block deleting or removing other images.
- [ ] Use existing image error handling if present before adding new logic.
- [ ] If retry is already available, expose retry only where useful.
- [ ] Log missing URL/key for developers.
- [ ] Do not show raw R2 errors to normal users.
- [ ] QA missing original image.
- [ ] QA missing thumbnail.
- [ ] QA original exists but thumbnail missing.
- [ ] QA thumbnail exists but original missing.

## 6. Moodboard Continue To Flows Button

- [ ] Review sticky `Continue to flows` placement.
- [ ] Ensure it does not cover image content.
- [ ] Ensure it does not float awkwardly over the grid.
- [ ] Ensure it does not hide errors or selection actions.
- [ ] Ensure it behaves correctly with no images selected.
- [ ] Ensure it behaves correctly with images selected.
- [ ] Ensure it behaves correctly with many images.
- [ ] Ensure it behaves correctly in a short viewport.
- [ ] Ensure it behaves correctly in a narrow viewport.
- [ ] Prefer a small positioning fix over a full footer redesign.
- [ ] Button should only appear when continuing to flows is valid.
- [ ] QA desktop and smaller laptop viewport.

## 7. Style Guide View Navigation

- [ ] Add a real Back button in the Style Guide view.
- [ ] Wire the existing `onBack` prop instead of ignoring it.
- [ ] Back should return to Direction Hub.
- [ ] Back should preserve active Direction.
- [ ] Back should preserve generated Style Guide state.
- [ ] Back should not require clicking Strategy or another top nav item.
- [ ] Back control should be keyboard accessible.
- [ ] Back control should have accessible label text.
- [ ] Prefer wiring the existing prop over adding new routing state.
- [ ] QA: open Style Guide, click Back, return to Moodboard Direction Hub.

## 8. Style Guide Layout Problems

- [ ] Fix Style Guide layout when images are added to a Direction.
- [ ] Style Guide should stay inside the Moodboard page bounds.
- [ ] Style Guide should not shift out of place.
- [ ] Style Guide should not overlap top navigation.
- [ ] Style Guide should not overflow horizontally.
- [ ] Atmosphere sliders should align correctly.
- [ ] Palette rows should wrap cleanly.
- [ ] Typography rows should fit.
- [ ] Components section should not be pushed off-screen unexpectedly.
- [ ] Prefer CSS/layout correction in the existing component over a new layout system.
- [ ] QA with one Direction image.
- [ ] QA with two Direction images.
- [ ] QA with three or more Direction images.
- [ ] QA with one broken image fallback.
- [ ] QA normal desktop viewport.
- [ ] QA smaller laptop viewport.
- [ ] QA narrow window.

## 9. Style Guide Pin To Generate

- [ ] Decide intended behavior for `Pin to Generate`.
- [ ] If it should work now, wire it to the generation context.
- [ ] If it should work now, save the Style Guide as pinned input for future generation.
- [ ] If it should work now, show success feedback.
- [ ] If it should work now, show pinned state.
- [ ] If it is not ready, hide the button.
- [ ] If it is not ready but must remain visible, disable it with clear tooltip/copy.
- [ ] Do not leave a clickable inert button.
- [ ] Prefer hiding over building a speculative pinning system if the feature is not required now.
- [ ] QA click behavior.
- [ ] QA reload behavior if persistent.

## 10. Style Guide Generation Scope

- [ ] Style Guide generation must use only images assigned to the selected Direction.
- [ ] Do not use Research images.
- [ ] Do not use Refero images outside the Direction.
- [ ] Do not use images from other Directions.
- [ ] Do not use old deleted images.
- [ ] Do not use unavailable images as valid inputs.
- [ ] Generation prompt should include assigned Direction image references only.
- [ ] Backend should resolve Direction images itself where possible.
- [ ] Do not trust arbitrary frontend image lists without ownership validation.
- [ ] If a Direction has zero usable images, do not generate.
- [ ] If a Direction has zero usable images, show `Add references to this Direction first`.
- [ ] If some images are unavailable, generate from available images only or fail clearly.
- [ ] If some images are skipped, tell the user calmly.
- [ ] QA Direction A and Direction B do not cross-contaminate.

## 11. Style Guide Generation Spec Alignment

- [ ] Compare current generated Style Guide schema with the requested schema.
- [ ] Current output appears to use `title`.
- [ ] Current output appears to use `subtitle`.
- [ ] Current output appears to use `atmosphere[]`.
- [ ] Current output appears to use `colorPalettes[]`.
- [ ] Current output appears to use `typography`.
- [ ] Current output appears to use `componentSwatchCount`.
- [ ] Requested output uses `atmosphere`.
- [ ] Requested output uses `palette`.
- [ ] Requested output uses `typography`.
- [ ] Requested output uses `components`.
- [ ] Requested output uses `layout`.
- [ ] Requested output uses `motion`.
- [ ] Requested output uses `antiPatterns`.
- [ ] Do not migrate everything in one risky jump unless necessary.
- [ ] Prefer compatibility: old Style Guides still render, new Style Guides can use the improved shape.
- [ ] Add a schema version if the repo already has an artifact versioning pattern.
- [ ] Add an adapter only if needed by current frontend rendering.
- [ ] Avoid building full export-to-Figma/Tailwind/Style-Dictionary now unless requested.

## 12. Style Guide Prompt

- [ ] Add or update the styleguide extraction prompt in the repo-native prompt location.
- [ ] Prompt must instruct the model to analyze assigned Direction moodboard images.
- [ ] Prompt must return one JSON object only.
- [ ] Prompt must match the agreed schema.
- [ ] Prompt must include strict anti-patterns.
- [ ] Prompt must say not to use images outside the selected Direction.
- [ ] Prompt must say not to invent unsupported visual traits.
- [ ] Prompt must handle low-quality images.
- [ ] Prompt must handle unavailable images.
- [ ] Prompt must require practical frontend-usable values.
- [ ] Prompt should include atmosphere density.
- [ ] Prompt should include atmosphere variance.
- [ ] Prompt should include atmosphere motion.
- [ ] Prompt should include palette roles.
- [ ] Prompt should include typography roles.
- [ ] Prompt should include component tokens.
- [ ] Prompt should include layout rules.
- [ ] Prompt should include motion rules.
- [ ] Prompt should include anti-pattern list.
- [ ] Keep the prompt concise enough to be maintainable.
- [ ] Do not add prompt complexity unrelated to the current Style Guide UI.

## 13. Style Guide Anti-Patterns

- [ ] Enforce banned/default style choices from the provided spec.
- [ ] Avoid Inter for premium/creative contexts.
- [ ] Avoid generic serifs such as Times.
- [ ] Avoid generic serifs such as Georgia.
- [ ] Avoid generic serifs such as Garamond.
- [ ] Avoid generic serifs such as Palatino.
- [ ] Avoid pure black `#000000`.
- [ ] Avoid generic AI purple/blue neon.
- [ ] Avoid gradients over 80 percent saturation.
- [ ] Use max one accent color per palette.
- [ ] Include density 1-10.
- [ ] Include variance 1-10.
- [ ] Include motion 1-10.
- [ ] Avoid centered hero when variance is greater than 4.
- [ ] Avoid generic circular spinners.
- [ ] Avoid `scroll to explore` filler.
- [ ] Avoid vague style-guide filler text.
- [ ] If model returns banned values, repair or reject them.
- [ ] Prefer small validation/repair at the boundary over spreading checks through the UI.

## 14. Style Guide Token Direction

- [ ] Decide how close MVP should be to W3C DTCG-compatible tokens.
- [ ] If adopting DTCG now, store token names.
- [ ] If adopting DTCG now, store token values.
- [ ] If adopting DTCG now, store token types.
- [ ] If adopting DTCG now, support color tokens.
- [ ] If adopting DTCG now, support typography tokens.
- [ ] If adopting DTCG now, support spacing/layout tokens.
- [ ] If adopting DTCG now, support motion tokens.
- [ ] If not adopting DTCG fully now, keep the schema adaptable.
- [ ] Do not trap generated data in a frontend-only display shape.
- [ ] Do not build Tailwind, Style Dictionary, or Figma variable export in this first reliability pass.

## 15. Style Guide Backend Flow

- [ ] Confirm whether Style Guide generation should stay in the existing engine/run flow or use a new HTTP endpoint.
- [ ] Prefer the existing repo-native generation flow over adding a separate API layer.
- [ ] Input must include project id.
- [ ] Input must include direction id.
- [ ] Input must include selected provider/model if the current system supports provider selection.
- [ ] Backend should derive image references from direction id.
- [ ] Backend must verify images belong to the project.
- [ ] Backend must verify images belong to the user/workspace.
- [ ] Backend must verify images belong to the Direction.
- [ ] Backend must skip or fail clearly on missing image keys.
- [ ] Backend must store generated Style Guide against the Direction.
- [ ] Backend must return the saved Style Guide.
- [ ] Prevent stale run overwrite: newer successful generation should not be overwritten by older completion.
- [ ] Keep stale-run protection minimal and consistent with existing run handling.

## 16. Style Guide Editing And Regeneration

- [ ] Keep editing lower priority than reliable generation and rendering.
- [ ] Keep regenerate lower priority than reliable generation and rendering.
- [ ] If Edit is visible and works, preserve it.
- [ ] If Edit is visible but incomplete, either wire the minimal save path or hide/disable it.
- [ ] If Regenerate is visible, it must start a real run.
- [ ] Regenerate must show loading.
- [ ] Regenerate must show success.
- [ ] Regenerate must show failure.
- [ ] Regenerate must update the Style Guide only after successful completion.
- [ ] Do not add version history unless required now.

## 17. Figma Design Export Copy

- [ ] Change copy from `Run the Stage Exporter plugin in Figma` to `Run the Stage Exporter plugin in Figma Design`.
- [ ] Apply this to Assets export to Figma Design.
- [ ] Use exact wording: `Run the Stage Exporter plugin in Figma Design`.
- [ ] Keep exact wording: `Enter this one-time pairing code:`.
- [ ] Avoid ambiguous `Figma` when this is specifically Figma Design.
- [ ] Keep FigJam copy separate.
- [ ] FigJam copy should say `Run the Stage Exporter plugin in FigJam`.
- [ ] Confirm pairing code UI is visible.
- [ ] Confirm pairing code is copyable or easy to select.
- [ ] Prefer changing only text constants if the flow otherwise works.

## 18. Figma / FigJam Export Runtime

- [ ] Fix Assets Figma export failing with `engine:create-figma-export`.
- [ ] Fix Assets Figma export failing with `TypeError: fetch failed`.
- [ ] Fix Flows FigJam export failing with `engine:create-figjam-export`.
- [ ] Fix Flows FigJam export failing with `TypeError: fetch failed`.
- [ ] Do not show `FigJam Export Complete` unless export actually completes.
- [ ] Export should have a real `requested` state.
- [ ] Export should have a real `waiting for plugin` state.
- [ ] Export should have a real `plugin connected` state if available.
- [ ] Export should have a real `exporting` state if available.
- [ ] Export should have a real `completed` state.
- [ ] Export should have a real `failed` state.
- [ ] Export should have a real `expired` state.
- [ ] If job creation fails, show failure immediately.
- [ ] If plugin never connects, keep status waiting or expired.
- [ ] If plugin connects but export fails, show failed.
- [ ] If export succeeds, then show complete.
- [ ] Verify create job.
- [ ] Verify show pairing code.
- [ ] Verify plugin enters code.
- [ ] Verify plugin claims job.
- [ ] Verify export payload is delivered.
- [ ] Verify frontend sees completed status.
- [ ] Add timeout/expiration UI only if the backend already has TTL or status.
- [ ] Add retry action using existing export trigger.
- [ ] Friendly engine fetch failure should say `Stage could not reach the export service. Restart Stage and try again.`
- [ ] Do not expose raw `TypeError: fetch failed` to users.
- [ ] Verify `apps/figma-exporter/manifest.json` points to the correct plugin setup.
- [ ] Verify plugin and desktop use the same environment.
- [ ] QA Figma Design open with plugin installed.
- [ ] QA Figma Design closed.
- [ ] QA plugin not installed.
- [ ] QA wrong pairing code.
- [ ] QA expired pairing code.
- [ ] QA FigJam file open.
- [ ] QA Figma Design file open.

## 19. Figma / FigJam Export Success Messaging

- [ ] Show `Export Complete` only after backend/job status is complete.
- [ ] Do not show success just because a job was requested.
- [ ] Modal should show pairing code.
- [ ] Modal should show current status.
- [ ] Modal should show helpful next step.
- [ ] Modal should show retry if failed.
- [ ] Figma Design next step should mention Figma Design.
- [ ] FigJam next step should mention FigJam.
- [ ] If plugin is disconnected, say `Open the Stage Exporter plugin and enter this pairing code.`
- [ ] If export fails, say `Export failed. Try again or restart the plugin.`
- [ ] Keep technical details in logs or dev detail only.

## 20. Paper Export Error Message

- [ ] Replace raw Paper Desktop error with friendly copy.
- [ ] Do not show raw local URL.
- [ ] Hide `http://127.0.0.1:29979/mcp`.
- [ ] Suggested main message: `Open Paper Desktop with the target Paper file open, then try again.`
- [ ] Suggested secondary message: `Stage could not connect to Paper Desktop.`
- [ ] Add `Try again` action if not already available.
- [ ] If Paper Desktop is not installed and detectable, show install/open guidance.
- [ ] If Paper Desktop is open but no file is open, say `Open the target Paper file first.`
- [ ] If connection times out, say `Stage could not reach Paper Desktop.`
- [ ] Keep raw error only in dev logs.
- [ ] Prefer changing existing error mapping over adding a new Paper error subsystem.
- [ ] QA Paper closed.
- [ ] QA Paper open without file.
- [ ] QA Paper open with file.
- [ ] QA local service unavailable.

## 21. Assets Tab Upload Reliability

- [ ] Fix uploaded asset that appears once but disappears after reload.
- [ ] Ensure Assets uploaded files persist in database.
- [ ] Ensure Uploaded count is derived from persisted records.
- [ ] Ensure uploaded PDFs are supported correctly.
- [ ] Ensure uploaded images are supported correctly.
- [ ] Uploaded file card should remain after reload.
- [ ] Delete uploaded file should delete DB record.
- [ ] Delete uploaded file should delete R2 object if that is current product behavior.
- [ ] Delete uploaded file should remove item from UI.
- [ ] Delete uploaded file should update count.
- [ ] If deletion fails, show error.
- [ ] If deletion fails, keep item visible.
- [ ] QA upload PDF, reload, Uploaded count remains.
- [ ] QA delete PDF, reload, Uploaded count remains zero.

## 22. Client Portal Sync

- [ ] Fix client portal not reflecting current project state.
- [ ] Confirm share token points to the correct project.
- [ ] Confirm portal uses the same environment as desktop app.
- [ ] Confirm portal is not accidentally reading production while desktop writes testing.
- [ ] Confirm portal reads live project data if live behavior is intended.
- [ ] Confirm portal reads the latest snapshot if snapshot behavior is intended.
- [ ] Confirm portal includes correct project name.
- [ ] Confirm portal includes correct client/company name.
- [ ] Confirm portal includes correct phases.
- [ ] Confirm portal includes correct tasks.
- [ ] Confirm portal includes correct progress.
- [ ] Confirm portal includes completed state.
- [ ] Confirm desktop changes are saved before portal is opened.
- [ ] If portal is snapshot-based, add explicit `Sync portal` action.
- [ ] If portal is snapshot-based, show last synced timestamp.
- [ ] If portal is live, invalidate portal cache after project updates.
- [ ] Prefer fixing the existing portal read model/cache over adding a second sync model.
- [ ] QA create project task, open portal, task appears.
- [ ] QA complete task, portal updates.
- [ ] QA rename project, portal updates.

## 23. AI Provider / Engine Connection Reliability

- [ ] Treat Settings `Connected` as provider auth status only.
- [ ] Do not treat `Connected` as proof that Stage can start an AI run.
- [ ] Add or expose runtime health for Stage Engine reachable.
- [ ] Add or expose runtime health for provider authenticated.
- [ ] Add or expose runtime health for provider executable/bridge available.
- [ ] Add or expose runtime health for selected model available.
- [ ] Add or expose runtime health for network available.
- [ ] Add `Test connection` for Claude/Codex if this can reuse existing provider status calls.
- [ ] Add `Refresh connection` for Claude/Codex if this can reuse existing provider status calls.
- [ ] Add `Last checked` timestamp only if status check is implemented.
- [ ] If provider is authenticated but run startup fails, show `Claude is connected, but Stage could not start a run.`
- [ ] If engine is unreachable, show `Stage Engine is not reachable. Restart Stage and try again.`
- [ ] If network failed, show `Stage could not reach the AI provider. Check your connection and try again.`
- [ ] If auth expired, show `Reconnect Claude to continue.`
- [ ] If provider bridge is missing, show `Stage could not find the provider bridge. Reconnect the provider or restart Stage.`
- [ ] Never show raw `engine:start-run`.
- [ ] Never show raw `Error invoking remote method`.
- [ ] Never show raw `TypeError: fetch failed`.
- [ ] Keep raw details in dev logs only.
- [ ] Add startup health check only if it is cheap and does not create noisy network calls.
- [ ] Add health refresh after app wake/resume only if existing lifecycle hooks already exist.
- [ ] Add health refresh after reconnecting provider.
- [ ] Add health refresh after failed run.
- [ ] Do not add infinite retries.
- [ ] Use bounded retry only where already expected.
- [ ] QA provider connected but engine down.
- [ ] QA engine up but provider disconnected.
- [ ] QA network offline.
- [ ] QA auth expired.
- [ ] QA successful recovery after reconnect.

## 24. AI Run Error Handling Across Product

- [ ] Use one shared user-facing error mapper for AI run startup.
- [ ] Apply it to Chat.
- [ ] Apply it to Research.
- [ ] Apply it to Strategy.
- [ ] Apply it to Moodboard Style Guide.
- [ ] Apply it to Flows.
- [ ] Apply it to Wireframes.
- [ ] Apply it to any `engine:start-run` caller.
- [ ] Normalize engine unavailable.
- [ ] Normalize provider unavailable.
- [ ] Normalize provider auth expired.
- [ ] Normalize network unavailable.
- [ ] Normalize model unavailable.
- [ ] Normalize cancelled by user.
- [ ] Normalize unknown failure.
- [ ] User-facing error should say what failed.
- [ ] User-facing error should say what to do next.
- [ ] User-facing error should include retry/reconnect action where possible.
- [ ] Developer logs should include raw error.
- [ ] Developer logs should include provider id when available.
- [ ] Developer logs should include project id when available.
- [ ] Developer logs should include run id if created.
- [ ] Developer logs should include timestamp.
- [ ] Do not create a run record if preflight fails before run creation.
- [ ] If run record is created and then fails, mark it failed.
- [ ] If run record is created and then fails, store friendly message.
- [ ] If run record is created and then fails, store raw detail separately if needed.

## 25. Provider Settings UX

- [ ] Settings should distinguish authenticated from ready to run.
- [ ] Settings should distinguish reachable from ready to run.
- [ ] `Connected` alone is misleading if runs fail.
- [ ] Add provider status label `Connected`.
- [ ] Add provider status label `Needs reconnect`.
- [ ] Add provider status label `Engine unavailable`.
- [ ] Add provider status label `Test failed`.
- [ ] Add provider status label `Ready`.
- [ ] Add inline issue text when provider is not ready.
- [ ] Add action `Test` only if the test path is implemented.
- [ ] Add action `Refresh` only if the refresh path is implemented.
- [ ] Add action `Reconnect`.
- [ ] Add action `Disconnect`.
- [ ] After reconnecting, run lightweight readiness check if available.
- [ ] Show success only when readiness check passes.
- [ ] QA Claude connected and ready.
- [ ] QA Claude connected but engine down.
- [ ] QA Claude disconnected.
- [ ] QA Claude auth expired.
- [ ] QA Codex connected but run fails.

## 26. Export / Provider Shared Reliability

- [ ] Treat export failures and AI run failures as local bridge reliability issues where appropriate.
- [ ] Engine bridge fetch failure should be mapped consistently.
- [ ] A local bridge/service failure should never produce raw technical text in the main UI.
- [ ] Add or reuse health diagnostics for Stage Engine.
- [ ] Add or reuse health diagnostics for Figma exporter.
- [ ] Add or reuse health diagnostics for FigJam exporter.
- [ ] Add or reuse health diagnostics for Paper bridge.
- [ ] Add or reuse health diagnostics for Claude/Codex providers.
- [ ] Do not build a giant diagnostics screen as the first fix.
- [ ] Use one recovery pattern: retry, reconnect, restart Stage, or open target app/plugin.
- [ ] Keep recovery copy specific to the tool.

## 27. Flow / FigJam Export

- [ ] Fix flow export showing success too early.
- [ ] Flow export should require real FigJam completion before success modal.
- [ ] Add FigJam pairing code UI if needed.
- [ ] Ensure user knows this is FigJam, not Figma Design.
- [ ] Use copy: `Run the Stage Exporter plugin in FigJam`.
- [ ] Track job status until completed.
- [ ] Track job status until failed.
- [ ] Track job status until expired.
- [ ] QA click Send to FigJam.
- [ ] QA job requested.
- [ ] QA pairing code shown.
- [ ] QA no success until plugin completes.
- [ ] QA failure shown if plugin is not available.

## 28. Assets Figma Design Export

- [ ] Fix asset export to Figma Design.
- [ ] Use copy: `Run the Stage Exporter plugin in Figma Design`.
- [ ] Show pairing code.
- [ ] Status should not remain vague at `requested` forever.
- [ ] Explain next step: open Figma Design.
- [ ] Explain next step: run Stage Exporter plugin.
- [ ] Explain next step: enter one-time pairing code.
- [ ] Show clear failed state if engine call fails.
- [ ] Show complete only after plugin confirms.
- [ ] QA asset export creates job.
- [ ] QA modal shows Figma Design copy.
- [ ] QA plugin completion updates UI.
- [ ] QA failed job shows friendly error.

## 29. Public Error Message Cleanup

- [ ] Audit visible user errors for raw technical strings.
- [ ] Replace raw errors in AI run startup.
- [ ] Replace raw errors in Research generation.
- [ ] Replace raw errors in Strategy generation.
- [ ] Replace raw errors in Moodboard Style Guide generation.
- [ ] Replace raw errors in Figma Design export.
- [ ] Replace raw errors in FigJam export.
- [ ] Replace raw errors in Paper export.
- [ ] Replace raw errors in uploads.
- [ ] Replace raw errors in client portal sync.
- [ ] User-facing errors should not expose stack traces.
- [ ] User-facing errors should not expose local URLs.
- [ ] User-facing errors should not expose IPC method names.
- [ ] User-facing errors should not expose raw `fetch failed`.
- [ ] User-facing errors should not expose provider internals.
- [ ] Every error should say what happened.
- [ ] Every error should say whether user data is safe when relevant.
- [ ] Every error should say what to do next.
- [ ] Add dev-only details where useful.

## 30. Data Safety Rules

- [ ] Never delete files just because they are missing from one UI view.
- [ ] Never globally delete assets when the user only intended to remove from a Direction.
- [ ] Never complete a run with references to deleted files.
- [ ] Never overwrite newer generated data with an older run completion.
- [ ] Rerun cleanup should happen at the beginning of rerun, not after completion.
- [ ] If cleanup fails, stop and show error before generating new references.
- [ ] If generation fails, old stable data should remain unless explicitly cleared at rerun start by design.
- [ ] If upload persistence fails, do not show upload as successful.
- [ ] If export job fails to create, do not show pairing code or success.
- [ ] If export job is only requested, do not show complete.
- [ ] Backend must guard destructive actions, not only the UI.
- [ ] UI should disable duplicate destructive/run buttons while pending.
- [ ] Backend should reject or join duplicate running records where the product requires idempotency.

## 31. Toyota Reliability Checks

- [ ] Double-click cannot start duplicate paid/provider runs.
- [ ] React Strict Mode double effects cannot start duplicate runs.
- [ ] Retry while pending cannot create duplicate jobs.
- [ ] Back/forward navigation cannot corrupt current run state.
- [ ] Refresh mid-run does not save partial invalid artifacts as ready.
- [ ] Side effects such as timers, listeners, subscriptions, and polling have cleanup.
- [ ] API boundaries validate inputs.
- [ ] IPC handlers validate inputs.
- [ ] Convex write and read paths agree on required/optional fields.
- [ ] UI does not receive `string | null` where it expects `string`.
- [ ] No new `as any`, `@ts-ignore`, or `@ts-expect-error` to silence contract issues.
- [ ] Missing access should fail closed.
- [ ] A valid artifact should hide stale sibling run errors.
- [ ] Technical detail should be logged but not shown as primary user copy.

## 32. QA Scenarios

- [ ] Research rerun deletes old images and keeps new images.
- [ ] Research artifact reload renders all Refero images.
- [ ] Research artifact with missing image shows fallback.
- [ ] Moodboard upload image persists after reload.
- [ ] Moodboard upload PDF persists after reload.
- [ ] Moodboard remove from Direction keeps image in All.
- [ ] Moodboard delete Direction keeps uploaded images.
- [ ] Moodboard delete uploaded file removes it intentionally.
- [ ] Style Guide generates from one Direction only.
- [ ] Style Guide does not use images from other Directions.
- [ ] Style Guide layout stays correct.
- [ ] Style Guide Back works.
- [ ] Style Guide unavailable image is skipped or shown clearly.
- [ ] Figma Design export copy says Figma Design.
- [ ] Figma Design export pairing code works.
- [ ] Figma Design export success only after completion.
- [ ] FigJam export copy says FigJam.
- [ ] FigJam export success only after completion.
- [ ] Paper export shows friendly error when Paper unavailable.
- [ ] Paper export does not show raw local URL.
- [ ] Settings connected but engine down shows friendly failure.
- [ ] Provider reconnect recovers run startup.
- [ ] Client portal reflects current project tasks.
- [ ] Client portal reflects current progress.
- [ ] Client portal reflects current project name.

## 33. Priority Order

- [ ] P0: Stop ghost data and missing image references.
- [ ] P0: Fix AI provider / engine run startup reliability and friendly errors.
- [ ] P0: Fix upload persistence disappearing after reload.
- [ ] P0: Fix global delete versus remove-from-Direction data-loss risk.
- [ ] P0: Fix export false-success states.
- [ ] P1: Add Direction delete.
- [ ] P1: Fix Style Guide Back button.
- [ ] P1: Fix Style Guide layout.
- [ ] P1: Fix Style Guide generation scope and prompt/schema alignment.
- [ ] P1: Fix client portal sync.
- [ ] P1: Improve Paper, Figma Design, and FigJam copy.
- [ ] P2: Add fuller token-compatible Style Guide schema.
- [ ] P2: Add Style Guide editing and regeneration polish.
- [ ] P2: Add deeper diagnostics only after the core failures are stable.

## 34. Decisions To Keep Explicit

- [ ] `Remove from Direction` is not the same as `Delete uploaded file`.
- [ ] `Connected` provider status is not the same as `Ready to run`.
- [ ] `Export requested` is not the same as `Export complete`.
- [ ] `Figma Design` and `FigJam` need separate copy.
- [ ] Style Guide generation should use Direction images only.
- [ ] Research rerun cleanup should happen before the new run, not after completion.
- [ ] Missing images should never silently appear as normal valid data.
- [ ] User-facing errors should be calm, clear, and actionable.
- [ ] Minimal code is the goal, but data-loss safety and runtime reliability are non-negotiable.

