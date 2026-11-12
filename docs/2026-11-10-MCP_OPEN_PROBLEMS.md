# MCP + web app: open problems (2026-11-10)

Everything that is wrong or unfinished in the Stage MCP and the signed-in web app, from Linear STA-72 / STA-73,
Adrien's and Werner's tests, and the work on `feat/mcp` (`~/stage_mvp-mcp`). Nothing below is on production.
All changes since 2026-11-07 are **uncommitted** in `~/stage_mvp-mcp` and live on **testing** only.

Legend: **Bug** = broken now. **Missing** = not built yet. **Decision** = needs Werner. **Check** = needs a test or logs.

## 1. Blocking the MCP launch

| # | Problem | Type | Where / cause | Fix |
|---|---|---|---|---|
| 1.1 | **Research can't be saved via MCP** (STA-73 #6). The AI wrote Research, `save_research` asked for a `runId`, the AI couldn't get one and Stage refused 3 times. | Bug | Since 2026-11-08 Research must start with `start_research` (Stage collects the Refero/Details screens and returns the `runId`). The AI either didn't have `start_research` in its tool list (a client still showing an old, cached list) or didn't call it. An invented `runId` also fails Convex's id check with an unclear message instead of "call start_research". | Make the refusal always say "Call start_research first, then pass its runId" (also for an invalid id). Re-test after reconnecting the client so it loads the current tools. |
| 1.2 | **Cursor showed "0 tools enabled"** after connecting (2026-11-09). | Bug, fixed | A tool schema contained `z.undefined()`, which can't be JSON Schema, so the whole tool list failed. Fixed and deployed to testing (`59b764c5`, 14:55); clients must press Reload once. | Add an automated test that converts every tool schema, so this can't ship again. |
| 1.3 | **The Research-the-Mac-way flow was never run end to end** by a real client (form → `start_research` → `save_research`). | Check | Built and unit-tested (engine queries, dedupe, UI patterns), but no client has completed it yet (see 1.1). | Run it once in Claude and once in Cursor; compare with the Mac run of MCP Test 5. |
| 1.4 | **Style guide via MCP in the new format** (STA-73 #4). | Done 2026-11-10 | `save_style_guide` takes the Style Guide editor's full `spec` (intent, tagged references checked against the direction's images, light/dark colour roles, fonts, shape, rules, type scale, layout, motion, components), stored where the Mac editor keeps it. `get_build_brief` and `get_step_results("styleguide")` return each direction's DESIGN.md, built by the Mac's own code (now shared in `data-ops/src/domain/styleGuideSpec.ts`). A Stage-run generator (like "Regenerate All", costs credits) is not built; the AI writes the guide itself. |
| 1.5 | **Landing page "Connect MCP" guide** (STA-73 #2) is not live. | Missing | PR #94 (`codex/landing-mcp-guide` → `website`) is open and mergeable: Connect MCP buttons, Claude/ChatGPT/Other guides. | Werner reviews and merges, then ship the website. |

## 2. Web app polish (STA-73)

| # | Problem | Type | Where | Fix |
|---|---|---|---|---|
| 2.1 | Action buttons have no hover arrow (STA-73 #1, Screen Studio video). | Missing | Web app buttons (`/app` pages) | Add the arrow-on-hover state to the shared button, like the video. |
| 2.2 | No "Back to projects" on a project page (STA-73 #3). | Missing | `components/mcp/ProjectView.tsx` only links back when a project is missing. | Add "← Back to projects" above the project title. |
| 2.3 | The "Progress Information" popover is overlapped by the next card's info icon (STA-73 #5). | Bug | `components/mcp/ProjectsPage.tsx` (popover stacking) | Raise the open popover above the next row. |
| 2.4 | Competitor logos on the web showed letters. | Bug, fixed | Web had no Brandfetch id. Now read from `VITE_BRANDFETCH_CLIENT_ID` (`.env.*.local`); web builds stop without it. Live on testing. | Check MCP Test 5 → Card View shows logos. |
| 2.5 | "Leave page?" popup and page refresh/freeze in `/app`. | Bug, fixed | Convex warnings + session refresh + landing smooth-scroll. Live on testing. | Werner to confirm on testing. |
| 2.6 | Tasks and Client Portal are not in the web sidebar. | Missing | Mac-only for now. | Later (STA-68 client portal). |

## 3. Other bugs and checks

| # | Problem | Type | Notes |
|---|---|---|---|
| 3.1 | **STA-72: three Research runs failed with a generic "Server Error"** (2026-11-10 05:27–05:40 Asia/Makassar = 2026-11-09 22:27–22:40 CET; request ids `1f9769bb1095e3d0`, `ddec04efa9314ed8`, `014a9ffcbe74dd9a`). Later runs succeeded. | Check | Needs the logs for those request ids (Werner: Convex dashboard / Grafana). Nothing from `feat/mcp` is on production; if these are testing runs, 1.1's unclear id error is a candidate. Whatever the cause, Research errors should name the reason instead of "Server Error". |
| 3.2 | Refero iOS search results come back titled "Refero screen". | Bug, small | Refero sends no app name for some iOS results. Use the screen's own title when Refero has one. |
| 3.3 | Connections made before per-step permissions still list every tool. | By design | Their key still limits them (read + edit = all, read = view only). Reconnecting shows the new permission screen. |
| 3.4 | Mac-side fixes not yet in a Mac build: a picked Figma frame as one picture, and Stage's own image copy for the Mac's Figma imports. | Check | Needs the next Mac testing build. |
| 3.5 | Existing client stored as "Wessel", so MCP projects show "Client: Wessel". | Data | Rename in Settings → Clients. |
| 3.6 | Test projects MCP Test 1–5 on testing. | Cleanup | Delete after testing. |

## 4. Decisions waiting for Werner

1. **Style guide via MCP** (1.4): accept the new format (recommended) or a Stage generator tool.
2. **Trial out of credits**: start the paid plan automatically (charges the card) or one clear "Start Stage Start now" button on web and Mac. Today nothing happens automatically and top-ups are blocked during the trial on purpose.
3. **Landing page PR #94**: review and merge.
4. **Commit and PR** for `feat/mcp` (all work since 2026-11-07 is uncommitted), then production.

## 5. Done and live on testing (for reference)

Content rules with named fields (junk, placeholders, broken links between steps refused) · wireframe HTML cleaned · stale-step reporting, later steps kept when Research is saved again · Refero (markdown fallback) and Details search · Research the Mac way (form, `start_research`, Stage-built UI patterns, Mac credits) · Figma import (picked frame as one picture, Stage's own image copies) · per-step permissions on the Allow screen, enforced by the API, disallowed tools hidden · web sidebar = Mac sidebar · web logos via Brandfetch.
