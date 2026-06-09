# 07-06 Monorepo Architecture Audit

Last updated: 2026-06-08

Use this table to track everything done today. Add a new row for each change, fix, or decision.

## Executive bullet summary

### Changed and implemented

- Desktop authentication handoff no longer leaves the browser on an infinite loading screen.
- Packaged desktop builds schedule silent automatic update checks.
- Generated wireframes are shown in Assets and use the latest `wireframesArtifact` as their source of truth.
- Individual wireframes can be exported to Code, Paper, and editable Figma layers.
- Flows can be exported as editable FigJam flow maps.
- Figma and FigJam exports use OAuth-bound pairing jobs, scoped claims, heartbeat, completion, and failure callbacks.
- Notion OAuth is shared across onboarding, Settings, Research, and Strategy.
- Research and Strategy can create native Notion pages and persist completed destination records.
- Global voice/chat shortcuts, persistent chat history, history UI, and a resizable chat panel are merged into the integration branch.
- Companion shortcuts now route through the main window instead of creating a full-screen companion overlay.
- Chat switching no longer changes the chat's last-modified sort order.
- Chat persistence side effects were removed from the React state updater.

### Implemented but not proven by production E2E

- Code wireframe export requires a packaged desktop smoke test.
- Paper export requires a live write with Paper Desktop running.
- Figma and FigJam exports require deployed Convex changes, plugin distribution, and production E2E.
- Research and Strategy Notion exports require authenticated live writes.
- Production Notion OAuth callback still requires deployment and verification.

### Not implemented or still open

- Moodboard export is not part of the current delivery-export implementation.
- The generated TanStack route tree still needs regeneration when the generator is available.
- Desktop idle benchmark automation is not implemented.
- `stage-engine` does not yet stop automatically after an idle timeout.
- Companion UI is still mounted while idle.
- Hidden-window/background work has not been systematically paused.

### Next focus

- Establish a packaged-DMG idle-energy baseline.
- Implement engine idle shutdown and lazy companion mounting.
- Re-run the idle benchmark before the next desktop release.

| # | Area | Files | Change | Reason | Status | Notes |
|---|---|---|---|---|---|---|
| 1 | Desktop auth / web handoff | `apps/web-application/src/routes/auth.desktop.tsx` | Fixed `/auth/desktop` staying on infinite spinner after successful login handoff to `stage://auth`. Added success state ("Stage Desktop connected"), auto `window.close()` attempt, manual **Close tab** button, and hidden-link redirect for `stage://` instead of `window.location.assign`. | Auth worked end-to-end, but the browser tab never left the loading screen — bad UX after a successful desktop callback. | Done locally | Needs deploy to `testing.getstage.co` (and prod when ready). Desktop app login itself was already working. |
| 2 | Desktop auto-updates | `apps/user-application/electron/helpers/auto-update.ts` | Enabled automatic update checks on app launch (~10s after startup). Popup only when an update is available (download → restart). Silent when up to date or on network errors. Manual **Check for Updates…** menu unchanged. Opt-out: `STAGE_DISABLE_AUTO_UPDATE_CHECK=1`. | Users had to open **Stage → Check for Updates…** manually; no automatic prompt when a new version shipped. | Done locally | Needs next packaged desktop release for users to receive this behavior. |
| 3 | Assets / wireframe delivery | `AssetsTab`, `ExportOptionsDialog`, delivery export hooks, shared contracts | Assets now renders the actual latest generated wireframes and exposes working Code, Paper, and Figma export actions per screen. | The delivery UI previously showed placeholders and only described export choices. | Done locally | Requires normal desktop packaging and smoke testing. |
| 4 | Code export | `stage-engine/src/exports/delivery`, Electron IPC | Rust validates the selected latest wireframe and compiles a deterministic standalone HTML bundle. Electron owns the directory picker and traversal-safe file writes. | Keeps generation deterministic and keeps renderer code away from local filesystem access. | Done locally | Produces `index.html` and `README.md`. |
| 5 | Paper export | `stage-engine/src/exports/delivery/paper.rs` | Added a protocol-correct local MCP client that initializes a Paper session, discovers tool schemas, creates an artboard, and writes the wireframe with `write_html`. | Paper Desktop exposes local read/write MCP and does not use Figma OAuth. | Done locally; runtime smoke test pending | Paper Desktop was not running at `127.0.0.1:29979` during verification. |
| 6 | Figma and FigJam canvas export | `apps/figma-exporter`, Rust export domain, Convex jobs/Hono routes | Added OAuth-bound one-time pairing jobs, editable Figma wireframe writes, editable FigJam flow maps, complete/fail callbacks, and a claim heartbeat. | Figma OAuth identifies the user but REST cannot write canvas nodes; the plugin performs the final canvas write. | Done locally | Deploy Convex changes and publish/distribute the Stage Exporter plugin before customer use. |
| 7 | Export reliability | `figmaExportJobs`, `/api/v1/figma-export/*` | Export jobs are idempotent per artifact target. Plugin claims are short-lived, identity-bound, and extended by heartbeat while active. | Prevents duplicate writes and prevents long-running valid writes from expiring mid-export. | Done locally | Production E2E still required. |
| 8 | Collaboration language | `.agents/skills/german-collaboration`, `stage-monorepo-architect` | Added a repository language rule: concise German collaboration with brief corrections; all Markdown and repository artifacts remain English. | Supports German practice without slowing implementation or mixing repository languages. | Done locally | Applies when the repository skills are loaded. |
| 9 | Notion integration consistency | Onboarding integrations, Convex content-platform integration, Notion docs | Replaced onboarding's simulated Notion/Figma connection state with the real desktop OAuth flow. Successful Research and Strategy Notion exports now persist durable artifact destinations. | The same native connection and export history must be visible and reliable across onboarding, Settings, and project workflows. | Done locally | Requires Convex deploy and OAuth E2E verification. |
| 10 | Figma MCP decision | `FIGMA_WIREFRAME_EXPORT_PLAN.md` | Updated the architecture decision for Figma's current remote MCP write-to-canvas support. Remote MCP is a valid future adapter but requires a separate per-user MCP authorization and cannot reuse Stage's existing REST OAuth session automatically. | Avoids treating Paper's local auth-free MCP and Figma's remote authenticated MCP as equivalent transports. | Documented | Keep plugin default; evaluate Rust MCP adapter separately. |
| 11 | Integration verification | Notion OAuth, Research/Strategy export actions, installed desktop runtime, Testing Convex deployment | Verified that the installed Stage app uses the Testing deployment, Notion OAuth callback and connected state work, Research and Strategy actions exist, and the local desktop application builds successfully. | Separates implemented functionality from functionality proven by a live destination write. | Partially verified | No current Stage-generated Research or Strategy page was found in Notion. Live Notion write, Paper write, and published Figma plugin E2E remain pending. Production Notion callback is not deployed. |

## Entry details

### 1. Desktop auth loading screen stuck on spinner

**Observed**
- Desktop app opens browser to `https://testing.getstage.co/auth/desktop?state=...&redirect_uri=stage%3A%2F%2Fauth`
- User signs in successfully
- Stage Desktop receives the session via `stage://auth`
- Browser tab stays on **Opening Stage Desktop...** with spinner forever

**Fix**
- After handoff: show success copy instead of spinner
- Try to close the browser tab automatically
- Fallback **Close tab** button when the browser blocks auto-close
- More reliable `stage://` trigger via hidden anchor click

**Verify after deploy**
- [ ] Open Stage Desktop → Log in
- [ ] Complete web auth
- [ ] Confirm Stage Desktop is signed in
- [ ] Confirm browser shows success state (not infinite spinner)
- [ ] Confirm tab closes or **Close tab** works

### 2. Automatic desktop update popups

**Observed**
- Update flow only ran when user clicked **Stage → Check for Updates…**
- `checkForUpdates()` returned immediately unless `manual: true` was passed
- `initAutoUpdates()` set up listeners but never scheduled a check

**Fix**
- Removed the early return that blocked non-manual checks
- Added `scheduleAutomaticUpdateCheck()` — runs once ~10s after launch (packaged builds only)
- **Update available** → same popups as manual flow (Download → Restart when ready)
- **Up to date** → log only, no popup (avoids "latest version" nag on every launch)
- **Check failed** → log only on auto; manual menu still shows error dialog
- Disable for testing: `STAGE_DISABLE_AUTO_UPDATE_CHECK=1`

**Verify after next desktop release**
- [ ] Launch packaged Stage → wait ~10s → no popup if already on latest
- [ ] Publish a newer version → launch older build → update popup appears
- [ ] **Check for Updates…** still shows "You're on the latest version" when current

### 3. Wireframe delivery architecture

**Source of truth**
- Wireframes are generated in the Wireframes tab and stored as the latest `wireframesArtifact`.
- Assets derives its wireframe cards directly from `generatedScreens`; it does not create a second wireframe model.

**Destination ownership**
- Code: Rust compiles; Electron selects and writes the local directory.
- Paper: Rust connects to the currently open Paper Desktop file over local MCP.
- Figma/FigJam: Rust compiles typed write plans; Convex owns durable jobs and OAuth identity binding; the Stage Exporter plugin writes canvas nodes.

**Heartbeat**
- A plugin claim expires to prevent abandoned or stolen claims from remaining usable.
- While an export is actively writing, the plugin calls `/api/v1/figma-export/heartbeat` every minute.
- The heartbeat only extends the existing scoped claim. It does not contain the Stage session or Figma OAuth token.

**Verification completed**
- [x] Data Ops contracts typecheck
- [x] Convex typecheck
- [x] Desktop application typecheck
- [x] Desktop application production build
- [x] Stage Exporter plugin typecheck and build
- [x] Rust `cargo fmt --check`
- [x] Rust `cargo check`
- [x] Rust tests: 43 passed
- [ ] Paper Desktop live write smoke test
- [ ] Published plugin + deployed Convex production E2E

### 4. Current integration status

| Integration | Implemented | Verified | Remaining work |
|---|---|---|---|
| Notion OAuth | Yes | Testing OAuth callback, selected-page authorization, and connected Settings state verified | Deploy and verify the production callback |
| Research to Notion | Yes | Action contract, server-side token handling, artifact parsing, page creation path, stored parent reuse, and durable destination persistence verified in code and build | Perform an authenticated live write and confirm the resulting Notion page |
| Strategy to Notion | Yes | Action contract, server-side token handling, artifact parsing, page creation path, stored parent reuse, and durable destination persistence verified in code and build | Perform an authenticated live write and confirm the resulting Notion page |
| Code wireframe export | Yes | Rust, Electron IPC, contracts, typechecks, and Rust tests verified | Packaged desktop smoke test |
| Paper wireframe export | Yes | MCP session initialization, tool discovery, and export implementation verified in code and Rust tests | Run Paper Desktop and perform a live artboard write |
| Figma wireframe export | Yes | Typed write plan, OAuth-bound job flow, plugin build, heartbeat, and callbacks verified locally | Deploy Convex changes, distribute the plugin, and perform production E2E |
| FigJam flow export | Yes | Shared job/plugin architecture and editable flow-map write path verified locally | Deploy Convex changes, distribute the plugin, and perform production E2E |

**Important Notion behavior**

- Notion OAuth grants Stage access only to pages selected by the user.
- Notion does not return the selected page as Stage's default export parent.
- The first Research or Strategy export therefore asks for a parent page URL or ID.
- After the first successful export, Stage stores and reuses that parent for both Research and Strategy.
- The current export creates a new Notion child page on every export.
- Exports currently include at most 100 Notion blocks.
