# Web app = Mac app (shared screens) + complete MCP — plan

Status: **approved by Werner 2026-11-07** (order 4.1 → 4.2 → 4.4 → 4.3 → 4.5; keys move to the backend, no key rotation). Ticked = built.
Branch: `feat/mcp` (worktree `~/stage_mvp-mcp`). Related: `docs/2026-11-02!!!-WORK_PLAN.md` (Phase 4, MCP checklist).

## 1. Why the web looked different

Some web screens were **rebuilt** instead of **reused** from the Mac app (Settings, the first Projects view). A rebuild always drifts from the Mac design. The fix is the rule below, and every web screen is checked against it in §3.

## 2. Rule

1. **Every screen the Mac app has is reused, not rebuilt.** Its code moves to `packages/project-ui` (`@stage/project-ui`) and both apps import it. The Mac app keeps working exactly as before. Only the import path changes.
2. **Shared screens show; apps act.** A shared component draws the screen. Anything that only works on Mac (AI runs, the Rust engine, Figma/Paper export, desktop shortcuts, auto-update) is passed in as an optional handler. The web passes none, so those buttons don't appear, or it shows "In Stage for Mac" where the Mac has a feature the web can't offer.
3. **Data stays per app.** The Mac app loads data with its hooks (React Query + Convex); the web uses `convex/react` with the query cache. Shared screens get their data as props. This is a small container in each app plus one shared presentational component.
4. **Only the pages Figma designed for the web stay web-only**: Dashboard (2491-4955), Projects list (2495-5463), Integrations → Tools (2491-5129), web onboarding.
5. **No duplicates.** If the web needs something the Mac already has (a helper, an icon, a type), it moves to the package; it isn't copied.

## 3. Inventory: every signed-in web screen

| Web screen | Source of truth | Now | Target |
|---|---|---|---|
| Sidebar shell | Figma web | Built ✅ | keep |
| Dashboard `/app` | Figma 2491-4955 | Built ✅ | keep |
| Projects list `/app/projects` | Figma 2495-5463 | Built ✅ | keep |
| Integrations → Tools | Figma 2491-5129 | Built ✅ | keep |
| Integrations → Skills / Components / Marketplace | existing website pages | links out | keep |
| Project header + tabs | Mac `ProjectHeader` | Shared ✅ | — |
| Overview (task board) | Mac `KanbanBoard` | Shared ✅ (read-only) | — |
| Research | Mac `ResearchTab` sections | Shared ✅ (read-only) | — |
| Strategy | Mac `StrategyTab` cards | Shared ✅ (read-only) | — |
| Flows | Mac `FlowsCanvas` + details view | Shared ✅ (read-only) | — |
| Wireframes | Mac `ResultsGrid` | Shared ✅ (read-only) | — |
| Moodboard + Style guide | Mac `MoodboardTab` + style guide preview | Shared ✅ (read-only) | — |
| Assets | Mac `AssetsTab` | Shared ✅ (read-only; exports and uploads on Mac) | — |
| Settings | Mac `SettingsShell` + panels | Shared ✅ | — |
| Client Portal link in project header | Mac header (`ClientPortalButton`) | Shared ✅ (opens the public portal when it is on) | — |

## 4. Work, in order

### 4.1 Settings = Mac Settings (fixes the screenshot)

Mac files: `components/settings/` `SettingsShell` (tabs), `SettingsPrimitives`, `ProfilePanel`, `TeamPanel`, `BillingPanel`, `ClientsPanel`, `ShortcutsPanel`, `AccountPanel`, `DeleteAccountDialog` (~2,100 lines).

| Tab | Mac-only parts | Web |
|---|---|---|
| Profile (name, avatar upload, role) | none | same panel |
| Teams (members, invites) | none | same panel |
| Billing & Credits (plan, change plan, portal, credits, purchase history) | 2 desktop calls (open in browser) | same panel; links open in the same tab |
| Clients | none | same panel |
| Shortcuts | desktop keyboard shortcuts | tab hidden on the web |
| Account (delete account, sign out, app updates, widget) | updates, widget, desktop session | same panel without the app-only rows |

- [x] Move `SettingsShell` (tab bar + "Back to dashboard"), `SettingsPrimitives` and the panels to `@stage/project-ui/settings`
- [x] Data: instead of splitting every panel, the Mac data hooks moved too (`@stage/project-ui/data/*`) and the web now runs the same React Query + `ConvexQueryClient` setup as the Mac. App differences go through `@stage/project-ui/platform` (`PlatformProvider`: session, opening links, in-app destinations, Stripe `platform`); Mac `lib/platform.tsx`, web `lib/platform.tsx`
- [x] Desktop-only rows: Mac `components/settings/AccountPanel.tsx` passes its widget/updates/session cards as `desktopSettings`; web hides the Shortcuts tab. R2 uploads use the desktop bridge only on Mac (`setUploadTransport`)
- [x] Delete the rebuilt `apps/web-application/src/components/mcp/SettingsPage.tsx`; web `/app/settings?tab=` and `/app/plans` use the Mac screens. Also shared: plans page + plan cards (web copy deleted), workspace switcher logic (`useActiveSpace`, web copy deleted), errors, validation, R2 uploads, Badge, Button, Avatar
- [ ] Check: web Settings side by side with Mac Settings, every tab — Werner (testing), and the Mac Settings in the next Mac testing build

### 4.2 Security fix (before anything new uses Refero/Details)

`appSecrets.getReferoMcpToken`, `getDetailsMcpToken` and `getOpenRouterApiKey` return Stage's paid keys to **any signed-in user**.

- [x] Backend relays `/integrations/refero/mcp` and `/integrations/details/mcp` (`convex/integrations/referenceProxy.ts`): the caller signs in with their own Stage session, only MCP tool traffic is forwarded, Stage's key is added server-side
- [x] Mac engine calls the relays with the user's session (`convex_store/reference_relay.rs`, `with_endpoint` on the Refero/Details services) instead of fetching the keys. Local dev tokens in the engine's env still work. Needs a Mac testing build to verify Research and Moodboard imports
- OpenRouter is only used for Mac voice transcription; left as is (Werner, 2026-11-07). `getOpenRouterApiKey` stays
- [ ] Remove `getReferoMcpToken` and `getDetailsMcpToken` once the Mac version with the relay is released and older versions are no longer supported (released Mac apps still call them)
- Keys are not rotated (Werner's decision).

### 4.3 Flows: details view

- [x] Moved `FlowRow`, `FlowSummary`, `FlowActions`, `StepsPanel`, `ScreensPanel`, `ScreenCard`, `ScreenElementList`, `ScreenEditActions`, `ScreenFilter`, icons, the mapper and the flow/screen types to `@stage/project-ui/flows`. Editing is one optional `edit` prop per row/card (the Mac passes it). The details header is shared too (`FlowsDetailsHeader`; the Mac adds Add flow / FigJam as `actions`)
- [x] Web Flows tab: canvas with "View details", details view with the Flows / Screens tabs, read-only

### 4.4 Moodboard + Style guide (web and MCP, same as Mac)

How the Mac does it today: the Rust engine fetches Stage's Refero/Details keys, searches, downloads each chosen image and uploads it to R2 (`moodboard-refero`, project-scoped keys) through Convex; the moodboard stores only Stage's copies. Image links and Figma frames go through the same download → R2 path.

Backend (port of `apps/stage-engine/src/moodboard/workflow.rs` + `refero/`, `details/`):
- [x] Refero search on the backend (`convex/lib/references/refero.ts`, port of the engine client/parser) → `POST /api/v1/references/search`. Details is only used by Research on Mac, so the moodboard search is Refero, as on Mac
- [x] Import (`projectAi.importReferencesForApi` → `POST /api/v1/projects/:id/moodboard/references`): Refero screenshots (full, then thumbnail) and image links (engine checks: http(s), no local/private hosts, real image bytes, 10 MB) stored as tracked R2 uploads (`moodboard-refero` / `moodboard-url`), added through the Mac save (`saveMoodboardResult`) into a named direction, one moodboard run + `moodboardFallback` credits like a Mac import
- [x] Style guide save (`POST /api/v1/projects/:id/moodboard/style-guide`): input `generatedStyleGuideSchema` (what the engine prompt asks for); normalize (banned fonts → Geist), grounding (category conventions, Research reference ids) and merge are the engine's rules, shared in `@stage/data-ops/domain/moodboard` (Mac `directionIdFromName` now uses it); the direction needs images, as on Mac
- [x] Tests for the shared moodboard rules (`tests/moodboardDomain.test.ts`). Download/store is checked end to end on testing via the MCP (Werner)

MCP tools:
- [x] `search_references` (query, platform)
- [x] `add_to_moodboard` (projectId, direction, screens and/or imageUrls)
- [x] `save_style_guide` (projectId, direction, styleGuide) with the rules from `apps/stage-engine/src/styleguide/prompt.rs`
- [x] Step order: Moodboard + Style guide is step 3 in the MCP instructions; Wireframes use it when present

Web:
- [x] Mac Moodboard views in `@stage/project-ui/moodboard`: `DirectionHub`, `MoodboardGrid`, `DirectionToggle`, `Header`, types, mapper, `boardDirections` (the Mac's direction filter), style guide spec + fonts, `StyleGuidePreview` with the shadcn components (`ui/shadcn`) and the `sg-*` tokens (`moodboard/styleguide/theme.css`, imported by both apps). `StyleGuideDialog` is the shared dialog: the Mac passes its editor and header controls, the web shows the preview and Export. Actions (new/rename/delete direction, generate style guide, select images) are optional
- [x] Web Moodboard tab: directions → a direction's images → its style guide, read-only
- Mobbin: not built on Mac either (STA-62). When it is, it plugs into `references.search` as a third source.

### 4.5 Assets / Delivery

- Exports to Figma and Paper need the Mac (Figma plugin through the engine, Paper desktop). They stay Mac-only; the web Assets tab shows the shared asset list with "Export in Stage for Mac".
- [x] Assets in `@stage/project-ui/assets`: `AssetCard` (Export optional), `AssetCategoryTabs`, `DocumentsGrid`, `UploadedGrid`, icons, types, constants (out of the Mac mock folder), mapper, `buildAssetsTabData` (out of the Mac hook) and `uploadedRows`. Web Assets tab shows them; uploading and exports say "in Stage for Mac"
- [x] MCP `get_build_brief` (projectId): project, Strategy, Style guides + directions, Flows and Wireframes in one spec, plus which steps are missing. The step guide points Delivery to it

### 4.6 Already done (for reference)

- [x] `@stage/project-ui`: project header/tabs, Research, Strategy, Flows canvas, Wireframes grid, task board, Avatar, `formatRelativeTime`, `getInitials`
- [x] Web project view uses them; MCP save tools for Research, Strategy, Flows, Wireframes with step order enforced

## 5. How I verify each step

1. Typecheck all three apps (`apps/user-application`, `apps/web-application`, `packages/data-ops`) and run `pnpm --filter @stage/project-ui test`
2. Deploy to testing (Convex `convex dev --once`, MCP `deploy:testing`, web `testing:deploy`) — never production
3. Screenshot the web screen next to the Mac screen before saying it is done
4. Tick the box here in the same commit

## 6. Needs Werner's OK

- Order of §4 (my proposal: 4.1 → 4.2 → 4.4 → 4.3 → 4.5)
- §4.2 changes the Mac app (engine stops fetching keys): ships in a Mac testing build
- Credit cost for MCP moodboard imports (proposal: same as a Mac import, because Stage pays Refero)

## 7. Commits

One commit per step above, each with its checkbox ticked, on `feat/mcp`. Nothing is pushed or deployed to production without Werner's go.
