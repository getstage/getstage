# Flows V1 Change Audit

Last updated: 2026-10-11 (STA-56 screen-details dialog and edit mode; historical V1 audit preserved)

## STA-56 — Canvas redesign plan (2026-10-09)

**Status:** Initial canvas slice implemented and tested locally in the isolated STA-56 worktree. The full redesign is not complete or release-ready. Full Figma frame inspection remains blocked by unavailable authenticated access. The phases below remain the broader proposal; see the implementation checkpoint for verified progress.

### Scope and design evidence

Werner's latest text calls the new links Style Guide references, but the supplied large screenshot is explicitly labeled **SITEMAP**. Do not silently relabel the link sets or treat a canvas screenshot as a Style Guide specification. All ten links and the mapping uncertainty are retained in [`MOODBOARD_STYLEGUIDE_FIX_PLAN.md`](../moodboard/MOODBOARD_STYLEGUIDE_FIX_PLAN.md#sta-56--style-guide-redesign-references-2026-10-09).

Inspected screenshots supplied on October 9:

- [`Bildschirmfoto 2026-10-09 um 19.24.50.png`](./reference/toolbar-select.png): black floating toolbar over a light dotted canvas; Werner requests only the **leftmost selection pointer** from the first group. Omit the note/shape/link/comment tools.
- [`Bildschirmfoto 2026-10-09 um 19.25.10.png`](./reference/toolbar-connect-add.png): **Connect** and **+** controls, separated from the first group.
- [`Bildschirmfoto 2026-10-09 um 19.25.45.png`](./reference/sitemap-board.png): white bounded board with a purple SITEMAP tab, small rounded page nodes, subtle shadows, curved directed connectors and purple node/edge highlights. The example shows Home, About, Pricing, Features, Blog, Feature A/B/C and Post. This is design sample content, not a fixture to generate for every project.

- [`Bildschirmfoto 2026-10-09 um 19.32.30.png`](./reference/zoom-chat.png): a separate canvas control group with white rounded **Zoom in** and **Zoom out** buttons, followed by a purple rounded **sparkles/chat** button. Werner explicitly requires this section. The rightmost button is the entry point to chat; do not interpret it as voice or an automatic generation action.

Confirmed again by Werner on October 9: **Sitemap for websites (`websites`); Flows for web apps (`web-apps`) and iOS apps (`ios-apps`)**. These share one editor implementation while retaining category-specific content meaning.

### Requested interaction and proposed safeguards

- Editing toolbar scope: **Select, Connect, +** only. The separate **Zoom in / Zoom out / Chat** control group is also required. Keep trackpad/keyboard pan/zoom accessible alongside the visible zoom controls.
- The rightmost purple sparkles button must open chat through the revised entry point. Exact panel layout and chat behavior are not specified by this crop; preserve this requirement without inventing a chat redesign.
- **Deferred scope:** Werner plans to stop using voice, but explicitly says that change is for another time. Record the intent only; do not remove voice features, shortcuts or provider paths in this work.
- Select: choose a node and move it; maintain selection/highlight. Exact board-selection behavior needs the complete design.
- Connect: activate the tool, click a source node, then click a target node to create a directed edge. Show the pending source; cancel with Escape or return to Select. Prevent duplicate edges on repeat/double clicks and explain invalid targets.
- The screenshot highlights Features and Feature C with a connector between them. It demonstrates node-to-node connection, not a hyperlink or a separate diagram board per page.
- **Open product decision:** what exactly does **+** add: a node, a new named board, or an insertion menu for both? The initial slice provisionally reuses the existing manual Add Flow/Sitemap dialog to add a diagram, without inventing a new menu. This is not confirmation of the final Figma interaction.
- Do not globally prohibit cycles: website hierarchy and app navigation have different validation needs. Clarify cross-board connections before implementing them.
- Keyboard selection, connection cancellation, rename/delete, accessible tool labels and visible save/error states must remain usable without mouse-only gestures.

### Initial code gaps (before this slice)

| Current code | Observed limitation | Required direction |
|--------------|---------------------|--------------------|
| `packages/data-ops/src/contracts/flows.ts` | Ordered steps and screens only; no boards, positions or edges | Backward-compatible graph representation with stable IDs |
| `FlowsTab.tsx` | Row/list UI with a local serialized whole-artifact save queue | Shared graph workspace; keep generation, approvals and screen details |
| `lib/project/mapFlowsArtifactToTabData.ts` | Converts steps into labels, discarding step IDs and `screenId` | Keep identity/mapping through edits and migration |
| `useSaveFlowsArtifact.ts` | Reconstructs step IDs from indexes and omits `screenId` on save | Preserve graph and screen identity; avoid independent editable step copies |
| `convex/lib/projectAi/handlers/flows.ts` | Checks access then replaces `contentJson`; no edit revision check | Targeted, validated operations with conflict and retry handling |
| `apps/stage-engine/src/flows/prompt.rs` | Asks for 5 flows with 4–7 ordered steps | Category-specific graph content; deterministic client layout |
| `projectExportMarkdown.ts`, `exports/figma/service.rs` | Export ordered step lists | Read committed graph boards/edges and preserve screen mapping |

The initial slice now uses exact `@xyflow/react` version `12.12.0` for graph mechanics. Existing GSAP/Motion remain animation tools, not graph engines; no new animation system was added.

### Phased implementation

1. **Design/access gate:** inspect full frames and their states; resolve module mapping and + behavior. Capture spacing, toolbar states, node/edge styling and empty/generating/error screens.
2. **Contracts and compatibility:** represent graph version, board IDs/types/titles, node IDs/positions/roles, stable optional `screenId`, edge IDs/source/target/labels. Convert old step artifacts to initial boards deterministically without overwriting stored projects merely on read. Derive consumer step/page lists from the graph; do not keep two independently editable sources of truth.
3. **Convex safety:** authorize every operation and validate graph membership. Add typed operations for board/node/edge edits, operation IDs for duplicate retries and per-target revision checks. Permit concurrent edits to different nodes; surface same-target conflicts. Keep revisions/history and expiring, throttled presence separate. Undo must not erase a newer teammate edit. Reject or explicitly review stale AI results instead of overwriting the board.
4. **Canvas slice:** replace the list workspace in `FlowsTab.tsx` with the inspected layout. Implement Select/Connect and the confirmed + behavior, the separate Zoom in / Zoom out / Chat controls, curved arrows, source/target highlighting, node dragging, board labels and accessible keyboard interactions. Keep dragging local and save at controlled boundaries; do not persist every mouse frame. Remote updates must not reset active local drafts or the viewport.
5. **Generation and consumers:** update Flows prompt/normalizer, section regeneration and FigJam plan. Website nodes represent pages; app graphs may include action/decision nodes that must not become extra Wireframes screens. Wireframes and exports read accepted saved graph data, not stale step snapshots. Preserve generation/status controls from V1.
6. **Acceptance:** visual checks against exported/authenticated frames; Select/Connect/+ behavior; visible zoom controls and chat entry point; no voice removal in this scope; Escape cancellation; duplicate-click idempotency; delete-node edge cleanup; old-artifact loading; reload/project-switch persistence; two-client edits; failed saves; permissions; AI conflicts; Wireframes/Markdown/FigJam graph consistency; keyboard interaction and reduced motion.

### Implementation checkpoint — local only

- `FlowsCanvas.tsx` / `flowsCanvas.css`: canvas is the default workspace, with an explicit details toggle. Websites display **Sitemap**; web/iOS apps display **Flows**. Navigation, loading/generation and manual-add labels follow the category without changing the internal `flows` route.
- Shared mechanics: bounded labeled boards, draggable/keyboard-movable nodes, curved directed connections, purple selection/connection highlights, source-then-target Connect, Escape cancellation, selected-connection removal and separate Zoom in / Zoom out / Chat controls. Connection selection/removal also works from the keyboard, with friendly node/edge names and accurate screen-reader instructions. Group dragging is deliberately disabled until a batch-move operation exists.
- Five supplied SVGs are archived in `apps/user-application/public/logos/flows/`: `select.svg`, `add.svg`, `zoom-in.svg`, `zoom-out.svg`, `chat.svg`. The supplied `Downloads/Projects - Flows/social, connection.svg` does not exist; Connect temporarily uses the installed Phosphor `Graph` icon. The four supplied canvas screenshots are archived above, rather than relying on temporary macOS paths.
- `contracts/flows-canvas.ts` / `domain/flows-canvas.ts`: optional version-1 canvas metadata, bounded geometry and validated membership. Legacy steps receive deterministic initial positions/connections on read, without an automatic stored migration. Screen identity remains in the existing steps/screens contract.
- `projectAi.editFlowsCanvas`: authorized targeted move/connect/disconnect operations. Replaced artifacts, active generation, invalid references and conflicting move coordinates are rejected. Repeated connection/removal operations and identical final moves are idempotent; this is not a general operation history or conflict-safe undo implementation.
- Compatible AI completions retain saved canvas metadata. Saved flow/node IDs, explicit step order, screen IDs and step-to-screen mappings are checked before replacing anything. AI cannot add/remove boards during regeneration; manual + can add a separate diagram without replacing existing graph identity. Incompatible output fails before deleting the previous artifact. Whole-artifact saves preserve canvas data and check the supplied `expectedUpdatedAt`; older unversioned clients can still save non-canvas artifacts but cannot overwrite a saved canvas. Both save paths pause during generation.
- Legacy detail saves retain existing step IDs/screen references. Canvas-only subscription updates no longer reset detail drafts; failed detail saves restore authoritative list data and retain editable drafts. Concurrent detail editing still needs targeted operations. Step membership changes in a saved board are rejected rather than silently dropping positions/connections.
- Markdown includes explicit saved connections instead of presenting them as an obsolete linear journey.
- Graph-aware FigJam export is implemented locally across the new `createFigJamArtifactExportJob` boundary, shared compiler/contracts and plugin adapter. Convex compiles an immutable, authorized snapshot directly from the current saved artifact inside the job-creation transaction; the sidecar no longer duplicates the compiler or races a second snapshot read. The new endpoint deliberately fails against older backends instead of falling back to a misleading linear export.
- Older direct job-creation clients cannot supply a different flow map: their plan is rebuilt from saved data. Canvas-bearing sources produce `figjam-canvas-map`; legacy sources can still use the old format through the old endpoint. The new desktop endpoint materializes all legacy/partial boards using the same adapter as the canvas. Positions, branches, disconnected nodes and cycles are retained; the plugin creates bounded sections, editable native nodes and only the saved directed connectors. Node widths/board dimensions share helpers with the renderer. Native FigJam connectors are elbowed, not a promise of identical ReactFlow Bézier rendering.
- The plugin declares `supportedWritePlanKinds: ["figjam-canvas-map"]` before claiming. Old plugins are rejected before receiving a graph claim or touching the file. Membership/reference validation precedes canvas creation; exports are capped at 5,000 nodes. Creation failures remove only this export's tracked nodes. A lost completion response keeps the created content and asks the user to check Stage rather than deleting a possibly committed export.
- Active claims cannot be overwritten or concurrently reclaimed. Job reuse is creator-scoped; completed destination fields are cleared on a fresh request. Permission/account access is rechecked at claim and heartbeat; revoked access cannot write shared artifact/destination links at completion. Repeated completion and late failure cannot clobber a completed job. Changes after request do not rewrite the queued blueprint: stale completions retain their own destination but do not mark the current diagram exported, and the dialog identifies earlier snapshots. These are snapshot exports, not live Figma synchronization.
- `getFlowsInput` now returns the canonical project category using the existing boundary resolver (including legacy aliases). The Rust input requires that field rather than guessing a website/app type. Website prompts request page inventories and branched Sitemap graphs; web/iOS prompts request functional flows with reusable screen references. The website shape example is checked against the shared schema. Provider output quality is not yet verified with live runs.
- Engine normalization retains canvas metadata, explicit step order and graph membership instead of clipping saved or explicitly declared graphs to legacy generation limits. Fresh non-graph websites can contain up to 18 pages rather than the former eight-step limit. Targeted patches do not truncate saved nodes or unrelated saved screen key elements. Canvas bounds/reference checks still run at the backend write boundary.
- Wireframes prompts consume saved graph connections through `screenId`, not adjacent array steps, and explicitly prohibit treating action/decision nodes as extra screens. End-to-end navigation/output fidelity remains pending.
- The purple button requests chat through `DesktopShell`, then focuses the composer and closes history instead of toggling the keyboard-history shortcut. Voice behavior/removal is unchanged. Live Electron/chat integration remains unverified.

### Verification and review

- Shared package build, desktop TypeScript, Convex TypeScript, plugin TypeScript/build and Electron production bundle build pass. This is not a packaged-DMG or sidecar smoke test.
- Full data-ops suite: **62 tests pass**, including **19 canvas/navigation/generation/persistence tests**, **11 snapshot/job tests** and **7 plugin tests**. Coverage includes authorization, canonical/legacy category input, the engine's Sitemap example, stale saves, generation pauses, manual board addition, identity preservation, geometry/references, idempotency, move conflicts, queued snapshots, plugin capability, revoked access, lease protection, SDK-mocked graph construction and owned-node rollback. The compiled plugin also executes in a VM with dynamic code generation disabled; native Figma execution is still unverified.
- Full Rust suite: **197 tests pass**; Clippy passes for all targets/features with warnings denied. Rust format checks apply to the modified files. Cargo output/cache is isolated under `/tmp/sta56-engine-target`; no monitoring-worktree build output was changed.
- Browser fixture: **8 tests pass**, repeated three times (**24/24**) without page errors. Coverage includes connect/remove/reload, drag and keyboard commits, keyboard connection and edge removal, Escape, failed-save recovery, conflicting remote movement, zoom, chat-request/add entry, narrow-screen control placement and simulated two-client updates without viewport reset.
- Browser persistence uses isolated localStorage and the shared domain operations, not account/backend writes. The chat check verifies the request event, not a running authenticated desktop chat session. No real accounts were mutated, and no commit, merge, push or deployment was made. The original monitoring worktree remains untouched.

From the isolated worktree:

```sh
pnpm --filter stage-user-application dev:canvas # isolated preview at http://127.0.0.1:4326
pnpm --filter stage-user-application test:canvas
pnpm --filter @stage/data-ops exec vitest run
CARGO_TARGET_DIR=/tmp/sta56-engine-target cargo test --manifest-path apps/stage-engine/Cargo.toml --offline --locked -j 2
```

On a new machine, install the browser first with `pnpm --filter stage-user-application exec playwright install chromium`.

### Visual correction — 2026-10-11

Werner confirmed the target using the [full workspace screenshot](./reference/canvas-workspace-target.png) and the [limited toolbar/control group](./reference/canvas-controls-target.png). Latest Figma references: [2379:4498](https://www.figma.com/design/1r1quTKtqFy9E2UZt3rnOd/Stage-%3C%3E-Main?node-id=2379-4498&m=dev) and [2379:4807](https://www.figma.com/design/1r1quTKtqFy9E2UZt3rnOd/Stage-%3C%3E-Main?node-id=2379-4807&m=dev). These URLs are recorded references, not successfully retrieved MCP design output; public reads still return forbidden/login and desktop MCP is unavailable.

- The Flows/Sitemap tab now fills the remaining workspace below a compact, white, underline-active project navigation. Other project tabs retain their existing content layout; the header was subsequently shared across all tabs as described below. The old approval/statistics panel and secondary tabs are available in **View details**, not above the canvas.
- The dotted canvas, white purple-outlined board/tab, compact labels, rounded purple arrow paths, centred **Select / Connect / +** toolbar and bottom-right **Zoom / Chat** controls are visible without scrolling. Node-width estimates prevent short labels such as Contact splitting mid-word; renderer and plugin share the board/node sizing helpers.
- Existing saved positions, IDs, edges and screen mappings are unchanged. Diagram addition keeps its existing manual dialog; final node-versus-board **+** semantics remain open. Details and FigJam remain accessible through small canvas actions; no export was triggered.
- Only the idle companion pill is hidden while this canvas is visible, avoiding a second black toolbar. Active voice and shortcuts remain unchanged; this is not the deferred voice-removal feature.
- Verification: desktop TypeScript passes, all **62 shared tests** pass, and **9 browser tests** pass with the actual desktop Tailwind/global styles included. Simulated browser saves cover the previous movement/connection/conflict cases; the new test checks full-height sizing, visible limited controls and styling.
- Read-only checks in the running, signed-in Electron app on `reliable-bullfrog-917` verify canvas/details switching, manual-add opening/cancellation, zoom, chat opening/closing, unchanged rendered node positions, and controls staying within the non-scrolling workspace at desktop and 390px layouts. No project edits, generation or export jobs were submitted. Development remains running locally; no commit, push or deployment. Werner subsequently accepted the canvas appearance. Full STA-56 acceptance remains pending; Style Guide redesign and Stage MCP actions remain unimplemented.

### Shared project header follow-up — 2026-10-11

- Werner requested the same header on every project tab. Extracted the existing header styling to `header/projectHeader.css`, imported directly by `ProjectHeader`; it no longer depends on loading the Flows canvas stylesheet. Title, white underline-active tabs, Share/Export/actions and Client Portal now use one layout everywhere. Normal project content retains its horizontal padding; the canvas remains full-height. No workflow tabs were renamed or added.
- Desktop TypeScript passes. Read-only Electron checks verify the same 83px header, purple active underline, white Export text and hidden secondary metadata across Overview, Research, Strategy, Moodboard, Sitemap, Wireframes and Assets. The canvas still fits the remaining non-scrolling workspace. No saves or generation were triggered by these checks.
- **Next interaction gap:** the current **+** adds a separate diagram, not a node inside the selected diagram. Werner requested adding a page/step within a board and supplied a comment specifying double-click to open screen element details. Werner explicitly prioritized the screen-details popover on double-click (with an accessible keyboard entry) before any + changes. Its supplied Figma reference is [frame 2379:4246](https://www.figma.com/design/1r1quTKtqFy9E2UZt3rnOd/Stage-%3C%3E-Main?node-id=2379-4246&m=dev). The URL remains inaccessible, but Werner subsequently supplied complete screenshots of both popup states; these are the visual authority for the implemented slice below. The abandoned generic anchored popover was removed. Node insertion via + remains pending.

### Screen-details popup — 2026-10-11

- Supplied references: [read state](./reference/screen-details-read-target.png), [edit state](./reference/screen-details-edit-target.png), Figma frame **2379:4246**. Implemented a centered, responsive 512px card with a blurred/dimmed backdrop, grey icon/title/flow-count/description header, white **Key elements** body, pencil entry, grey editable list, **Cancel** and purple **Save Changes**. Figma selection outlines and frame labels are not product UI.
- Double-click or Enter on a node in Select mode resolves its saved screen strictly through `flowId → stepId → screenId`; titles are never used for matching. Unlinked/action nodes and missing screen references show an honest empty state without generation or fabricated elements. Double-click no longer zooms the diagram. Escape/backdrop dismisses and restores node focus.
- `ScreenDetailsDialog.tsx` reuses the installed Radix Dialog and existing `ScreenElementList`, `ScreenEditActions` and icons. No new dependency, positioning system, backend endpoint or graph operation. Element inputs now have accessible labels. Existing detail cards retain their previous labels/styles; popup styling is scoped.
- Explicit Save uses the existing serialized `persist` / `useSaveFlowsArtifact` path with `expectedUpdatedAt`, committed flows/screens and a screen-element baseline check. It preserves IDs, connections, positions and other screens. Remote movement does not discard a popup draft; same-screen changes reject stale saves and retain the draft. An in-flight lock prevents duplicate saves, errors remain inside the editor, and editing pauses during generation. Pending saves cannot be dismissed. Cancel makes no write. No AI controls were added.
- Verification: desktop TypeScript and **16 browser tests** pass, including screen-ID resolution, no double-click zoom/write, keyboard open/focus return, edit/cancel/save/reload, duplicate save, failed-save recovery, unlinked/missing screens, same-screen conflicts, different-screen collaboration, movement preservation and narrow/paused layouts. These persistence/concurrency checks use isolated localStorage fixtures, not live account writes.
- Read-only signed-in Electron check: double-click **Storefront Preview Gallery** opens its four actual saved elements; pencil exposes four inputs and Cancel returns to read mode. Backdrop blur and unchanged viewport verified. No real **Save Changes**, AI run or export was submitted. Screenshot: `/tmp/sta56-screen-details-live.png`. Visual acceptance remains Werner's next check; no commit/push/deployment.

### Still open before release

Authenticated/exported full-frame review and module mapping; final **+** behavior and missing Connect SVG; targeted board/node/membership edits; presence/history/conflict-safe undo; live category-generation and graph-aware Wireframes output verification; deterministic generated layout review; native FigJam/Community-plugin QA and approved publication; two authenticated clients and live Electron/chat/backend smoke; full visual/accessibility/reduced-motion acceptance. Matching engine + category-input/export backend + graph-capable plugin must ship together. Bump the plugin version on approved publication; the checked-in Community zip/version has not been republished or replaced. Older backends without `projectCategory` / the new export endpoint are deliberately not guessed around. **Style Guide redesign is not implemented: full frames and the supplied module mapping are still missing.**

A final paste-ready STA-56 audit is deferred until the requested work is complete. The earlier interim audit is superseded by this living checkpoint, not a completion claim.

---

## Historical Flows V1 changes

| Layer | Files | Change | Reason | Notes |
|---|---|---|---|---|
| Contract | `packages/data-ops/src/contracts/engine-run.ts` | Added `flows` to `runModeSchema`. | Allows renderer and engine IPC to start Flows runs. | Mirrors Rust `RunMode::Flows`. |
| Contract | `packages/data-ops/src/contracts/flows.ts` | Added upstream artifact IDs, FigJam metadata, `updatedAt`, and step `screenId`. | Keeps generated, edited, regenerated, and exported Flows traceable. | Optional fields must be omitted, not written as `null`. |
| Convex | `packages/data-ops/convex/lib/projectAi/handlers/flows.ts` | Added `getFlowsInput`, run create/complete/fail, artifact update, and FigJam export request. | Gives Flows the same workflow shape as Strategy. | `getFlowsInput` requires Research + Strategy + Moodboard. |
| Convex reliability | `packages/data-ops/convex/lib/projectAi/handlers/flows.ts` | Added server-side Flows artifact shape validation for complete/update paths. | Prevents malformed public mutation payloads from corrupting saved Flows. | Checks artifact header, project ownership, statuses, steps, screens, and `null` optional fields. |
| Convex reliability | `packages/data-ops/convex/lib/projectAi/handlers/flows.ts` | Made FigJam export request idempotent per artifact/action. | Double-clicks should update the existing destination instead of creating duplicate records. | Still reports current Plugin/Widget boundary honestly. |
| Convex | `packages/data-ops/convex/projectAi.ts` | Exported Flows endpoints. | Makes handlers callable by renderer and Stage Engine. | Codegen required after changes. |
| Engine model | `apps/stage-engine/src/models/runs.rs` | Added `RunMode::Flows`. | Rust mirror of the shared run contract. | Required for IPC deserialization. |
| Engine model | `apps/stage-engine/src/models/flows.rs` | Added `FlowsInput`. | Typed shape for Convex context response. | Holds upstream artifacts and optional existing Flows artifact. |
| Engine repository | `apps/stage-engine/src/convex_store/flows_repository.rs` | Added Convex adapter for Flows. | Keeps workflow orchestration separate from transport. | Mirrors Strategy repository style. |
| Engine workflow | `apps/stage-engine/src/flows/workflow.rs` | Added full generate and targeted regenerate orchestration. | Makes Flows a real Stage Engine workflow. | Supports `screen:{id}` and `flow:{id}` sources. |
| Engine prompt | `apps/stage-engine/src/flows/prompt.rs` | Added full and targeted regenerate prompts. | Provider gets Research + Strategy + Moodboard context only. | No Refero call in Flows V1. |
| Engine normalize | `apps/stage-engine/src/flows/normalize.rs` | Added provider drift normalization and merge helpers. | Protects Convex/UI from malformed provider output. | Full generation forces `Draft`. |
| Engine parser | `apps/stage-engine/src/helpers/provider_json.rs` | Added `extract_flows_artifact`. | Extracts Flows JSON from provider stdout/stderr. | Accepts full artifact or normalizable shape. |
| Engine routing | `apps/stage-engine/src/runs/mod.rs`, `apps/stage-engine/src/app.rs`, `apps/stage-engine/src/main.rs` | Wired `FlowsWorkflow` into app state and run routing. | Routes `mode: flows` through the typed workflow. | Full project run dedupe includes Flows. |
| Frontend hooks | `apps/user-application/src/hooks/project/flows/useFlowsRun.ts` | Added Flows run hook. | Reuses provider readiness and fast/default model options. | Mirrors Strategy run handling. |
| Frontend hooks | `apps/user-application/src/hooks/project/flows/useSaveFlowsArtifact.ts` | Added artifact save hook. | Persists manual edits and status changes. | Builds a full artifact from UI state. |
| Frontend hooks | `apps/user-application/src/hooks/project/flows/useFlowsFigJamExport.ts` | Added FigJam export request hook. | Makes the FigJam button real without pretending REST can write canvas nodes. | Records export request and surfaces limitation. |
| Frontend reliability | `apps/user-application/src/hooks/project/flows/useFlowsFigJamExport.ts` | Added in-flight request lock. | Prevents duplicate FigJam export mutations from rapid clicks before React disables the button. | Returns the active promise for repeated clicks. |
| Frontend hooks | `apps/user-application/src/hooks/project/flows/useFlowsScreenRegenerate.ts` | Added targeted regenerate helper. | Supports screen/flow regenerate via `mode: flows`. | FlowsTab currently calls `useFlowsRun` directly for the same behavior. |
| Frontend UI | `apps/user-application/src/components/project/tabs/flows/FlowsTab.tsx` | Converted normal flow from fixture-backed to artifact-backed. | Empty state now asks user to generate Flows. | Manual add/edit/status/screen edits persist. |
| Frontend reliability | `apps/user-application/src/components/project/tabs/flows/FlowsTab.tsx` | Added serialized save queue and run-busy guards for generation/regeneration. | Prevents overlapping edit saves and duplicate targeted AI runs from spam clicks. | Stale run errors are hidden once a valid artifact is loaded. |
| Frontend UI | `FlowHeaderActions.tsx`, `FlowRow.tsx`, `FlowSummary.tsx`, `FlowActions.tsx`, `ScreensPanel.tsx`, `ScreenCard.tsx` | Added FigJam handler, status control, regenerate action, and loading states. | Completes the interactive V1 tab behavior. | Maintains Figma visual language. |
| Frontend reliability | `FlowRow.tsx`, `FlowActions.tsx` | Added regenerate disabled/loading state for flow rows. | Prevents rapid repeated flow regenerate starts from the expanded row action. | Shares Flows run busy state from `FlowsTab`. |
| Docs | `FLOWS_DEV_STATUS.md`, `FLOWS_TESTING.md`, `FLOWS_CHANGE_AUDIT.md` | Added Flows implementation docs and audit table. | Gives the next agent/user a durable status reference. | Keep updated after verification. |

## Verification

| Check | Result | Notes |
|---|---|---|
| `cargo check` from `apps/stage-engine` | Passed | Root repo has no `Cargo.toml`; Stage Engine is the Rust crate root. |
| `cargo check` from `apps/stage-engine` after reliability pass | Passed | Rechecked after Toyota reliability review. |
| `cargo test flows` from `apps/stage-engine` | Passed | 2 Flows normalizer tests passed. |
| `pnpm --dir packages/data-ops exec convex codegen` | Passed | Regenerated Convex TypeScript bindings. |
| `pnpm --dir packages/data-ops run convex:typecheck` | Passed | Convex handlers/types compile. |
| `pnpm --dir packages/data-ops run convex:typecheck` after reliability pass | Passed | Rechecked server-side validation/idempotent export changes. |
| `pnpm run desktop:typecheck` | Passed | Renderer/main TypeScript compile. |
| `pnpm run desktop:typecheck` after reliability pass | Passed | Rechecked UI locks/save queue changes. |
