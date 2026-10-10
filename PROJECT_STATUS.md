# Stage — Project Status

> **Living document.** Update weekly (or before each release).  
> **Last updated:** 2026-10-10

**Positioning:** Stage does the thinking. Your AI does the building.

---

## Local website review — 2026-10-01

- Active checkout: `/Users/adrien.ninet/Developer/stage-local-recovery`, branch `codex/profile-setup`. The Documents/iCloud checkout returned empty reads for offloaded files, including Git metadata. Recovered integration commit `fe370213` and available local edits into this checkout; original files retained.
- Local Vite preview: `http://127.0.0.1:4190`. Review onboarding without account writes at `/setup-profile?preview=1` (development only).
- Added three-step profile setup with live rendering of the existing ProfileView, shared role/contact/technology/photo fields, local draft recovery, authenticated step persistence, username availability, analytics, and download-to-profile link. Auth preserves desktop callbacks and pending profile saves.
- Verified production build (47 marketing pages), profile backend tests, Convex TypeScript, desktop live updates, draft refresh, and 375px layout. The authenticated browser flow remains unverified because the new Convex functions/schema have not been deployed.
- Profile follow-up: restored compact tool rows, profile resource cards, inline technology selection and marketplace picker from the original `stage-site` prototype. Local setup now saves `stage-profile-preview`; download's web link preserves preview mode and opens the full editable profile. The original reward sidebar is preview-only; no subscription credit is applied. Live authenticated profile persistence still requires backend deployment and verification.
- **Do not deploy or push without Adrien's explicit green flag.** Frontend and backend changes are local only. Test-deployment/account validation is required before release.

## Website persistence readiness audit — 2026-10-01

- Local `/profile?preview=1` uses browser localStorage, not a backend account. Production excludes the development-only preview path. Authenticated profile edits, onboarding and collection saves call Convex `builderProfiles` functions; uploaded avatar/banner images are stored as bounded data URLs in the profile document. Onboarding drafts also use account-scoped localStorage until completion.
- Verification passed: production web build and 47 pre-rendered marketing pages, Convex typecheck, 10 profile/routing tests. Added a complete-field persistence test across simulated sessions, including contacts, images, collections and publish/unpublish. These are local backend tests, not deployed end-to-end verification.
- Read-only HTTP checks against configured testing Convex returned `Could not find public function` for `builderProfiles:mine` and `builderProfiles:username`. Production returned generic server errors for both; their cause is not exposed. Deployed profile persistence is not verified and is a release blocker.
- Release sequence: developer review of backend/auth/routes, commit and integrate into `website`, deploy matching Convex schema/functions to testing, deploy testing web bundle, verify authenticated save/reload/logout/login and a second session plus public/private behavior. Then deploy matching production backend before the web bundle and repeat smoke checks. No deployment, push, or real-account mutation performed in this audit.

## Website SEO and AI-search readiness — 2026-10-01

- Local-only audit: 49 prerendered public marketing URLs, 48 indexable canonical pages (the marketplace alias points to component libraries). Homepage and download now include readable initial HTML, alongside the six solutions, blog, marketplace categories, and resource details.
- Added unique category/resource metadata, route-aware canonical/Open Graph/Twitter/JSON-LD updates, collection ItemLists, large image previews, and visible article attribution below the summary. Preserved the requested clean headline layout. Existing detailed descriptions, features, FAQs, related links, and official resource links remain crawlable.
- Worker now runs before static responses to send noindex headers on nonproduction domains and account/onboarding/builder pages, and real 404 responses for unknown blog/solution/resource URLs. API proxy behavior is unchanged. This changes static-request routing and must be smoke-tested on testing hosting before release.
- Production build and `pnpm --filter stage-app check:seo` pass: unique titles/descriptions, canonical URLs, one H1, valid JSON-LD, image files, and sitemap indexing consistency across all 48 indexable pages. Nine local Worker response checks also pass for public/private/staging routes, missing-page statuses, asset caching, and the unconfigured API response. No push or deployment performed.
- GEO follows standard crawlability/content-quality guidance; no fabricated citations, reviews, freshness dates, or special AI markup. Existing Datafast tracking remains. Search Console/Bing sitemap submission, indexing checks, live Core Web Vitals, and organic/AI-referral monitoring require the approved deployment and account access. No search rankings or AI citations can be guaranteed.

## Local Research diagnostics and thumbnail recovery — 2026-10-09

- Normal `apps/user-application` → `pnpm run dev` now enables Research diagnostics only for unpackaged desktops targeting the exact Testing backend. Electron's build now reads the same local `.env` Convex URL as the renderer. Explicit `STAGE_TELEMETRY_ENABLED=0` opts out; packaged Testing remains opt-in and packaged production stays disabled.
- Research thumbnails now fall back once to the full image when the CDN denies the thumbnail, then show `Image unavailable` if both sources fail. This does not change successful Research artifacts or trigger new runs.
- Eight desktop configuration regression tests and four isolated browser checks pass (403 fallback, exhausted sources, identical URLs, source changes), plus desktop typecheck. The first user run had diagnostics disabled. After the fix/restart, the next real Research run completed on 2026-10-09 at 17:56:45.927 UTC: Codex, succeeded, 212.580s, one terminal Loki event and seven successful timed steps. Prometheus cumulative run/duration counts increased from 1 to 2 and duration sum from 109.653s to 322.233s, matching the new run. The user confirmed thumbnail recovery. Existing 2026-10-08 acceptance evidence remains in the canonical rollout audit. No production deploy or account mutation.

- Research dashboard is now provisioned on Railway Testing and is Grafana's default home: https://grafana-testing-038e.up.railway.app/d/stage-research/stage-c2b7-research. Eight panels use persisted logs, not stale push-metric instant queries. Real-run cards/tables/logs, Run ID drill-down, no-data Production state and home navigation pass hosted browser checks. Deployment `d8f533da-fdcf-4333-b4ee-0886bc8e65d2` is SUCCESS. No new services/dependencies; alert delivery and other workflows remain pending.

## Testing desktop release — 2026-10-10

- User authorized a new Testing tag for the STA-31 monitoring foundation and Research thumbnail recovery. Desktop package version: `0.2.56`; intended tag: `v0.2.56`, branch `feat/sta-31-monitoring`. The tag triggers signed/notarized arm64 + x64 builds and the separate `desktop-testing-feed`; this is not a production release.
- Bundled changes: Research/section metadata sender with bounded queue and stop endpoint, authenticated Testing intake/contracts, rollout portal, versioned Grafana Research dashboard, local `.env` alignment and thumbnail fallback. Packaged Testing diagnostics remain explicit opt-in; automatic diagnostics are limited to unpackaged local Testing. Production collection stays disabled.
- Release checks: frozen lockfile install, 196 engine tests, strict all-target/all-feature Clippy, 76 contract/desktop configuration tests, 12 Worker tests and monitoring build pass. Desktop version/build and GitHub Actions status must be verified before claiming published DMGs. Unrelated V3 plans, design sketches and agent-skill changes are excluded.

## NOW (this week)

| Priority | Item | Owner / where |
|----------|------|----------------|
| **!!! P0 project creation** | Released client sends `websites` / `web-apps` / `ios-apps`, while the failing Convex deployment serves legacy validators. `workspaceMembers:listPending` also proves client/backend API drift. Restore contract and deployment parity before feature work. | [`docs/STA-43_USER_FEEDBACK_RECOVERY_PLAN.md`](docs/STA-43_USER_FEEDBACK_RECOVERY_PLAN.md); Linear `STA-43` |
| **P0 seats/downgrade** | Stripe portal plan switching is not configured; enabling self-service downgrades without server-side seat reconciliation can leave Studio/Agency members with project access after the owner moves to Solo. Checkout seat metadata may also remain stale after a price switch. Do not enable live downgrades or release draft PR #81 as a complete solution. | [`docs/STA-43_USER_FEEDBACK_RECOVERY_PLAN.md`](docs/STA-43_USER_FEEDBACK_RECOVERY_PLAN.md#seat-downgrades-and-stripe-customer-portal-release-blocker); draft PR #81 |
| **P0 STA-43** | Model-picker containment, real personal/team space selector, Figma Teams UI, multi-file PDF/MD briefs, multi-URL competitor entry, and Help & Feedback correction. Local + Testing only until Werner accepts. | [`docs/STA-43_USER_FEEDBACK_RECOVERY_PLAN.md`](docs/STA-43_USER_FEEDBACK_RECOVERY_PLAN.md); Figma `1844:2274` |
| **P1 STA-44 SEO** | English use-case hub (6 pages), video blog (2 posts), getstage.co canonical fix, per-page pre-render + sitemap. Branch `feat/sta-44-seo-pages`; not deployed. | [`docs/STA-44_SEO_PAGES_PLAN.md`](docs/STA-44_SEO_PAGES_PLAN.md); Linear `STA-44` |
| **P1 STA-31 / STA-47** | **STA-47 website content built** on `feat/sta-44-seo-pages`: no Strapi; all marketing content in `content.json` (pages from blocks, use cases, blog, redirects), validated at build; getstage.co ships from branch `website` via `pnpm web:test` (testing.getstage.co) then `pnpm web:ship` (up-to-date + folder guards → build → push → deploy); Adrien may only ship marketing folders. Open: create `website` branch, Adrien's access, homepage copy. **STA-31 local foundation built:** `apps/monitoring` is a Stage-styled, local-only rollout portal with the full living spec, seven phases, 23 Zod-validated audit findings, CSV export and a user setup checklist (`pnpm monitoring:dev`, port 4310). `infra/` contains pinned Collector/Prometheus/Loki/Grafana configs, Dockerfiles, local Compose, initial Health provisioning and a testing-only smoke script. Native config validators, app build/typecheck and desktop/mobile browser checks pass. **Railway testing stack deployed 2026-10-06** in Adrien Ninet's Pro workspace: Collector, private Prometheus/Loki and login-protected Grafana are online. The synthetic metric/log and bearer checks pass. Application telemetry, custom DNS and production rollout are still pending; phase 1 remains in progress. **Phase 2 intake deployed to Testing:** `testing.getstage.co/api/telemetry`, separate telemetry-only Worker; 62 contract + 12 Worker tests, typechecks and synthetic local-workerd → real Railway count/histogram/log checks pass. Deployed positive auth needs a real Stage Testing session. **Research sender built locally:** automatic diagnostics for unpackaged local desktops targeting the exact Testing backend (packaged Testing remains opt-in), bounded/non-blocking Rust queue, one terminal observation and timed Research/section steps; runtime stop purges exports without cancelling runs. Nine telemetry tests, all 196 engine tests, strict Clippy, desktop typecheck and six Rust/TS fixtures pass (68 contract tests total). Two real signed-in Research runs are verified in Grafana; persistent Settings opt-out, other workflows and desktop/cloud events remain pending. **Stage React portal is online:** https://stage-monitoring-testing.steep-resonance-f13d.workers.dev, protected with the existing `werner` Grafana testing admin login. Anonymous assets reject with 401; hosted desktop/mobile browser checks pass. No production deployment or website bundle replacement. See `apps/monitoring/README.md` and `infra/README.md`. | [`docs/STA-31_STA-47_MONITORING_AND_CMS_PLAN.md`](docs/STA-31_STA-47_MONITORING_AND_CMS_PLAN.md), [`docs/STA-31_MONITORING_BUILD_SPEC.md`](docs/STA-31_MONITORING_BUILD_SPEC.md); Linear `STA-31`, `STA-47` |
| **!!! P0 release** | 2026-09-14 production cut: React landing/WebP, Solo–Agency pricing, Lo-Fi/export integration, bug containment, trusted login domain, deploy; Figma last | `docs/2026-09-14_SHIP_TODAY_CHECKLIST.md` |
| **P0 STA-33 1–4** | **Lo-Fi done** (desktop smoke 2026-09-09). Export dialog destinations + skills step, GitHub Import. Wireframes UI is Lo-Fi only; the engine retains Hi-Fi. **Adrien commentary 10 Sep:** [`docs/NEW_10_SEPTEMBER.md`](docs/NEW_10_SEPTEMBER.md). **Next:** Werner picks rows; then testing Convex `importedSkillHubItems`; then sections 5–8. | [`docs/NEW_VERSION_START_SEPTEMBER_2026.md`](docs/NEW_VERSION_START_SEPTEMBER_2026.md); Linear `STA-33` |
| **P0 STA-33 5–8** | After 1–4 ships: categories lock, Details.so during research testing, style guide, MCP. | Linear `STA-33`; same living plan |
| **P0 STA-33 Research routing** | Testing candidate: canonical category reaches the engine; Websites → Details website sections; Web apps and iOS apps → Refero app screens, including iOS-specific search. Users select up to five relevant rows. Refero thumbnails remain available when an older R2 image is missing. Desktop smoke still required. Inventory: [`docs/STA-33_RESEARCH_CATEGORY_BREAKAGE.md`](docs/STA-33_RESEARCH_CATEGORY_BREAKAGE.md) | `v0.2.42` / `prod-v0.2.42` |
| **P1 wireframes quality** | Beat raw Claude: Taste skill → local/project skills + library packs → moodboard layouts → refine | `docs/WIREFRAMES_QUALITY_PLAN.md` |
| **!!! P0** | Desktop idle energy P0 — PR `fix/desktop-idle-energy-p0` | `docs/AI/desktop/2026-06-07!!!-DESKTOP_IDLE_ENERGY_PLAN.md` |
| **P1** | Run packaged-DMG benchmark + 2 h soak (RAM < 400 MB, 12 hr power < 500) | `scripts/desktop-idle-benchmark.sh` |
| **P2** | IPC R2 upload (separate PR after energy gate) | `src/lib/r2Uploads.ts`, `electron/helpers/r2-upload.ts` |
| **P3** | Export E2E + Convex deploy | Notion live test, Figma plugin publish, Paper live write |
| **P2 triage** | Bug triage #33 / #40 / #45 + Dashboard Revenue gap | `apps/user-application/docs/AI/BUG_TRIAGE_2026_06_24.md` |
| **P1 moodboard** | Moodboard + Style Guide fix plan (multi-project, Edit, images, engine vision) — **implemented 2026-06-25** | `apps/user-application/docs/AI/moodboard/MOODBOARD_STYLEGUIDE_FIX_PLAN.md` |
| **P1 moodboard followup** | Provider selection, components from palette, data-loss on tab switch, engine fetch reliability | `apps/user-application/docs/AI/moodboard/MOODBOARD_FOLLOWUP_PLAN.md` |
| **P0 reliability review** | Research images, Moodboard directions, Style Guide, exports, uploads, provider errors, client portal recovery checklist | `apps/user-application/docs/AI/moodboard/STAGE_RELIABILITY_RECOVERY_PLAN.md` |
| **P1 local review** | Project-aware Stage chat: `@project`, bounded Convex context, screenshots, confirmed window capture | `apps/user-application/docs/AI/chatbot/CHATBOT_PLAN.md`; branch `feat/stage-chat-project-context-vision` |
| **P2 desktop flash-kill** | Convex queries routed through TanStack Query (`@convex-dev/react-query`) + route loaders (`ensureQueryData`) so screens paint ready data instead of setup/empty flashes. Interim: per-tab `TabLoadingState` loader on Flows/Wireframes/Assets. Branch `feat/convex-tanstack-query-loaders`. Follow-up: strip residual `isRunsLoading`/`isStyleGuideRunsLoading` guards once live smoke confirms loader cache hits. Skill: `.agents/skills/convex-tanstack-query-adapter/` | apps/user-application/src |

**Current desktop version (release branch):** `0.2.46` (production tag `prod-v0.2.46`; production Convex deployed from the matching `work` merge). Testing feed also published `v0.2.46`. Testing tag `v0.2.47` is built from draft PR #81 (`fix/team-invite-upgrade-gate`): Solo invite upgrade entry, derived seat enforcement on downgrade, invoice-based credit grants, and the task-assignee owner fix. It needs the matching testing Convex deploy before acceptance. Not merged; no production tag. Live Stripe portal plan switching stays off until production has this backend.

---

## Implemented in the current integration branch

- **Convex refactor sprint** — thin transport files, `convex/models/` + `convex/helpers/`, handlers in `convex/lib/`; see [Notion task](https://app.notion.com/p/37b8714fd55781078141d5d610317f14) and `packages/data-ops/convex/ARCHITECTURE.md`
- Notion research export embeds Refero UI pattern images (`v0.1.59`)
- Desktop v0.1.52–0.1.55 (auto-update, auth handoff, provider CLI detection)
- Desktop performance pass (sidecar defer, polling reduced)
- Global voice/chat shortcuts and Settings → Shortcuts
- Persistent Stage chat history and resizable chat panel
- Main-window companion routing; full-screen companion overlay removed
- Notion OAuth and Research/Strategy Notion export paths
- Assets delivery with Code, Paper, and Figma wireframe exports
- Editable FigJam flow export
- Dashboard / project / task UI improvements

---

## Current local review changes

- Website marketplace/profile integration is local on `codex/sync-stage-marketplace`, based on `website` at `6b65ad74`. Resources groups marketplace + blog; Solutions uses Phosphor icons (white in navigation). Imports 50 resources / 33 detail pages without modifying the original static prototype.
- New additive `builderProfiles` Convex table/functions support authenticated collections, unique usernames, private-by-default profiles, explicit publication at `/builders/<handle>`, preset/uploaded banners, and technology tags. Deploy and smoke-test these functions on testing **before** deploying the web bundle. No deployments or pushes have been made; Adrien explicitly requires a green flag before going live.
- Verification: production web build/prerender, Convex typecheck, `pnpm --filter @stage/data-ops test:profiles`, asset-reference checks, and desktop/mobile browsing. Signed-in production/cross-device smoke remains pending. Profile layout was checked with a temporary local fixture; no real accounts or profiles were changed.
- Developer review is required by the existing shipping gate because this integration adds routes, auth return handling and backend code. The gate is unchanged. The prototype's simulated free-month promotion is not presented as a real reward; old prototype files remain intact.


- The Wireframes results grid shows every generated Lo-Fi screen instead of truncating the project at six; Assets and Wireframes now expose the same complete set.
- Stage Engine is warning-free under strict Clippy; the production desktop workflow now blocks releases on Rust warnings.
- Flows generation distinguishes marketing websites from apps/platforms, and Wireframes now take their initial screen list from the project's latest Flows artifact instead of a generic marketing fixture.
- The first successful desktop checkout opens a dismissible, one-time onboarding video over the blurred dashboard; packaged YouTube requests now provide Stage's HTTPS referrer identity and retain an external fallback.
- Project-aware Stage chat pins one `@project`, blocks ambiguous critique requests, loads bounded indexed Convex context, and supports local image upload/paste/drop plus confirmed window capture.
- Chat switching no longer corrupts last-modified history order.
- Chat persistence no longer performs side effects inside a React state updater.
- Streaming chat updates no longer synchronously persist every chunk.
- Duplicate list-item React keys are fixed.
- Shortcut registration now unregisters only shortcuts owned by its module.
- Shortcut defaults and cross-platform Ctrl handling are aligned.
- Legacy companion cleanup no longer destroys unrelated windows.
- Development can run without the production single-instance lock.
- Audit, Greptile, operating-plan, and energy-plan status is updated.

---

## Blockers

- [x] Baseline idle benchmark on **v0.1.56 DMG** (2026-06-09) — **FAIL** (expected before energy P0 merge)
- [ ] Re-benchmark **v0.1.57 DMG** (no chat in smoke) — must PASS
- [x] PR #5 (`fix/desktop-idle-energy-p0`) merged into `work`
- [x] PR #6 (chat projectId + IPC polish) merged into `work`
- [x] Tag **v0.1.57** pushed — GitHub Actions DMG build running
- [ ] Export destinations verified with live E2E tests

### Baseline benchmark v0.1.56 (Werner Mac, chat used in smoke)

| Metric | Result | Budget |
|--------|--------|--------|
| Peak RSS | **956 MB** | < 400 MB |
| Avg CPU (30 min) | **9.2%** | < 1% |
| `stage-engine` at end | **still running** | none |

Smoke included one chat session → engine stayed up (no idle shutdown in 0.1.56). Energy P0 PR targets this.

---

## Tooling map

| Tool | Job |
|------|-----|
| **Notion** | Tasks, bugs, client portal |
| **Datafa.st** | Production user analytics |
| **Greptile (Lumenapps)** | PR code review only |
| **GitHub `getstage/getstage`** | Code + releases |
| **This file + `ARCHITECTURE.md`** | Dev source of truth |
| **`docs/README.md`** | Doc map (CURRENT / IGNORE) |

---

## Next release target

**v0.1.57** — merge PR #5 (energy P0) into `work`, rebuild DMG, re-run benchmark until PASS.  
**v0.1.56** — shipped (partner chat redesign); baseline FAIL above is the “before” proof.

---

## Links

- Operating plan: `docs/AI/desktop/2026-06-08!!!-PROJECT_OPERATING_PLAN.md` (repo root copy in `apps/user-application/docs/AI/desktop/` if moved)
- Architecture: `ARCHITECTURE.md`
- Desktop index: `apps/user-application/docs/AI/desktop/README.md`
- AI start: `AGENTS.md`

- Profile visual audit: white page surface with gray footer, original compact collection markup and marketplace picker rows, 154px desktop profile offset, banner thumbnails and dialog styles restored. Removed stale 612px navbar override; desktop is 668px with Download fully contained. Browser verified at desktop and 375px. Original profile HTML and JavaScript recovered from stage-site; original standalone CSS files remain iCloud dataless, so styles were compared against the integrated copy.

## Website auth, download and transition fixes — 2026-10-03

- Branched from `website` at `94a962d3` for the user-authorized fix and deployment. Private page routes now receive a clean application shell instead of the prerendered homepage. Auth images remain static assets. Initial marketing stylesheet links are released when React takes ownership, restoring auth/download typography, contrast and artwork sizing.
- The Mac download CTA is a native installer link. Route pending, account/profile/setup, auth session, invitation and desktop-connection loading use the shared Stage logo/spinner with reduced-motion support.
- Verification: production build, SEO checks, page-shell routing regression checks, desktop browser inspection of auth/download, homepage-to-login navigation, and HTTP 200 responses for both installer architectures. Download layout inspected using its existing development-only preview; no account data changed.
- Stage-specific Cloudflare API access is configured outside the repository. Testing deployment `c0289cd0-20ee-4673-9aba-02f99dd679b1` passed browser verification of the clean app shell, auth typography/contrast and artwork. Production release follows integration into `website`; deployment versions are recorded in Cloudflare.


## Marketplace introductions and search visibility — 2026-10-03

- User approved publishing the larger directory headings after reviewing local previews. Marketplace, Components, Skills and Tools now use concise, distinct headings and supporting copy, with shared responsive typography. Catalogs, navigation, filtering and save behavior are unchanged.
- One content source supplies headings and page metadata. Marketplace now has its own canonical and indexing directive; all four directories are included in the sitemap. Prerendered and client metadata agree; existing CollectionPage, ItemList and breadcrumb structured data describe the rendered resources without added claims.
- Validation: production build, SEO checks for 49 indexable pages, page-shell checks for 12 routes, Worker dry run, structured-list/card parity, and desktop/mobile browser inspection. Release is prepared on `codex/marketplace-headlines` from `website` at `1406777`.


## Nine component-library additions — 2026-10-03

- Added Skiper UI, Thinking Orbs, Liveline, ObsidianUI, OriginKit, BeautifulUI, AICSS, coss/ui and Componentry using the existing catalog, dynamic resource route and detail markup template. The catalog now contains 35 libraries. Existing entries and layout styles remain unchanged.
- Reviewed official source information and cached original logos/social images; BeautifulUI uses a capture of its official gallery. Source provenance and the requested V2/V3 grouping are in `public/marketplace-assets/library-sources-october-2026.json`. Thinking Orbs links to its current Libraries.dev home and retains the original URL in the sidebar.
- Synchronized backend profile resource IDs. Tests cover catalog parity and saving/reloading all nine additions; 13 profile/route tests pass. Production build and SEO checks cover 58 pages. Extended structure audit verifies canonical/Open Graph parity, one H1, JSON-LD/breadcrumbs, 292 internal library links and 690 image references. Desktop/mobile detail-page checks pass. Convex dry run passes type checking and reports no index deletion.
- User confirmed the additional audit request means SEO/GEO and authorized publication. All nine pages passed deployed testing checks, including canonical metadata and HTTP responses.
