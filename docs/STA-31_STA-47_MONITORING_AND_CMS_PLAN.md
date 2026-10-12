# STA-31 monitoring and STA-47 CMS

> **Status:** STA-47 built on branch `feat/sta-44-seo-pages` as repo-based content (Strapi dropped 2026-09-30). STA-31 has a protected online Testing audit portal, Railway Testing stack and separate authenticated intake deployed on 2026-10-06. A local Research sender is built (automatic for unpackaged local Testing desktops; packaged Testing remains opt-in); real signed-in application telemetry is not yet verified and production is untouched.
> **Owner:** Wessel (Linear `STA-31`, `STA-47`)
> **Last updated:** 2026-09-30

## Goal

Two things, so that Wessel can keep building the product without being the bottleneck:

1. **STA-31: monitoring the agentic flow.** Show, in Grafana, whether the Stage **Agent** works. The Agent is the V3 right-hand panel that adds things to the canvas, with Ask / Create modes, skills, component libraries and tools such as Limora and Figma. Track how many requests run, how many fail and why, how long they take, which tools it calls and what they cost. Alert when something breaks, before a user reports it. The existing module runs (Research, Strategy, Moodboard, Style guide, Flows, Wireframes) use the same pipeline.
2. **STA-47: Adrien publishes the website himself.** He builds and edits **every marketing page** on getstage.co in the repo and ships it with one command, without waiting for Wessel, and SEO must not get worse.

Out of scope: a web-app version of the Agent ("Jev AI + Stage as a web app"). That is a separate product decision.

## Decisions (2026-09-30)

| Question | Decision |
|---|---|
| What is "the agentic flow"? | The Agent in the app (V3 section 3, "Agentic chat") plus the existing module runs. The nightly GitHub loop is not included. |
| Who uses Grafana? | Werner and Adrien. Both get a Grafana login, and Adrien gets a read-only "business" dashboard. |
| Hosting | Monitoring: self-hosted Grafana, Prometheus and Loki on **Railway**. Website content: no server (see Part 2). |
| Publishing | Adrien publishes straight to production. The CMS is his responsibility. |
| Website content | All marketing pages, built from blocks, edited in the repo. No Strapi (decided 2026-09-30, see Part 2). |
| Telemetry consent | On by default, with an opt-out in Settings → Privacy. The data is metadata only (see below). |

## How the system works today (constraints)

| Fact | Where | Consequence |
|---|---|---|
| AI work runs **on the user's Mac**, in the Rust `stage-engine`, through the Claude/Codex CLIs. The Agent will run there too. | `apps/stage-engine/src/runs/mod.rs`, `chat/`, `providers/` | Prometheus normally **pulls** (`/metrics` scraped every 15 s). It cannot reach laptops behind home routers, so telemetry must be **pushed** from the engine. |
| The engine logs only to stdout. No metrics or traces leave the machine. | `apps/stage-engine/src/observability/mod.rs` | Failed runs are invisible unless a user reports them. |
| The engine already has an error taxonomy (`MissingBinary`, `NotAuthenticated`, `RunTimeout`, `ProviderProcessFailed`, …). | `apps/stage-engine/src/models/errors.rs` | This becomes the `error_code` label as-is. |
| Token usage and cost per run are **not** captured. | `providers/` | The provider CLI result event must be parsed. |
| The Agent panel is not built yet. | V3 design, Part 1 due 2026-10-12 | Build telemetry into it from day one instead of retrofitting it. |
| Run records exist in Convex (`projectAiRuns`, `creditLedger`). | `packages/data-ops/convex/schema.ts` | Convex stays the **system of record**. Grafana covers operational health, not billing. |
| The website is a Vite SPA on **Cloudflare Workers**, and marketing pages are pre-rendered at build time. | `apps/web-application/wrangler.jsonc`, `scripts/prerender-marketing.mjs` | No server-side CMS on Workers. Content is bundled **at build time**; publishing is a rebuild + deploy. |
| Blog and use-case content was hard-coded in TypeScript. | formerly `src/marketing/blogPosts.ts`, `useCases.ts` | Moved into `content.json` with a validated schema. |
| Website deploys are manual from a laptop; there is no CI for the web app. | `.github/workflows/` | Kept on purpose: `pnpm web:ship` adds the safety checks locally. |

## Part 1: STA-31 monitoring (self-hosted on Railway)

Build spec (events, metrics, dashboards, alerts, agent prompt): [`STA-31_MONITORING_BUILD_SPEC.md`](STA-31_MONITORING_BUILD_SPEC.md).

### Architecture

```txt
stage-engine (user's Mac)
  └─ per Agent request / module run: metadata events (no prompts, no canvas content)
       │ HTTPS, signed-in user's session
       ▼
Stage telemetry endpoint (Worker, POST /api/telemetry)
  - authenticates the user, rate-limits, allow-list validation (zod)
       │ OTLP over HTTPS + bearer token
       ▼
Railway project "stage-observability"
  ├─ OpenTelemetry Collector   (only public service; checks the bearer token)
  │     │ Railway private network
  │     ├─▶ Prometheus  (OTLP receiver enabled, volume)   ← counters, durations
  │     └─▶ Loki        (volume)                           ← one log line per request
  └─ Grafana  (public, login required; Werner = admin, Adrien = viewer)
        └─ alerts → email + phone push
```

- **Why push through our endpoint:** a write token inside the desktop app can be extracted and abused. The Worker checks the user, drops unknown fields and keeps the collector token server-side.
- **Why a Collector in front:** Prometheus and Loki have no real authentication. They stay on Railway's private network, and only the Collector is exposed.
- **Storage:** Railway volumes. Retention is set on Prometheus (`--storage.tsdb.retention.time=90d`) and Loki (30 days). If a volume is lost, only operational history is gone, because Convex holds the real records.
- **Cost:** a few dollars a month for 4 small services and volumes. It grows with volume size.
- **Our maintenance:** version updates, and watching disk usage on the volumes. Grafana alerts on disk > 80 %.

### What we store (and what we never store)

Every request is recorded, **not only failures**. Without successes there is no failure rate, and slow-but-successful requests are a problem too.

**Stored, one event per Agent request:**

| Field | Example |
|---|---|
| mode | `ask` / `create` |
| surface | `flows`, `moodboard`, … (the canvas tab) |
| provider, model | `claude`, `claude-sonnet-5` |
| skills / libraries / tools enabled | `ux-writing`, `shadcn-ui`, `limora` (marketplace ids; user-made skills become `custom`) |
| tool calls | name, success/failure, duration (e.g. `canvas.add_node` ok 120 ms, `limora.generate` failed `timeout`) |
| outcome | `succeeded`, `failed`, `cancelled` |
| error code | `NotAuthenticated`, `RunTimeout`, … |
| duration, tokens in/out | 8.4 s, 3,120 / 890 |
| app version, OS, channel | `0.2.46`, `macOS 26.0`, `production` |
| Stage user id | logs only (for support: "why did my request fail?"), never a metric label |

**Never stored:** prompt text, the Agent's answers, canvas content, file contents, project names, URLs, competitor names, uploaded images.

### Metrics

User, project and request ids never go into metric labels, because they would multiply the number of series. They are kept in the log line only.

| Metric | Type | Labels |
|---|---|---|
| `stage_agent_requests_total` | counter | `mode`, `surface`, `provider`, `model`, `outcome`, `error_code`, `app_version` |
| `stage_agent_request_duration_seconds` | histogram | `mode`, `surface`, `provider`, `outcome` |
| `stage_agent_tool_calls_total` | counter | `tool`, `outcome` |
| `stage_agent_tokens_total` | counter | `provider`, `model`, `direction` |
| `stage_ai_runs_total` / `_duration_seconds` | counter / histogram | `module`, `provider`, `outcome`, `error_code`, `app_version` |

### Dashboards

1. **Business (Adrien):** Agent requests per day, success rate, Ask vs Create, most-used skills, libraries and tools, and active desktop versions.
2. **Health:** success rate and p50/p95 duration by mode, surface and provider.
3. **Failures:** top error codes, failing tools, failures by app version and failures by provider.
4. **Setup friction:** `MissingBinary` / `NotAuthenticated` counts, plus tool connect failures (Limora, Figma).
5. **Infra:** Worker 5xx and latency, and Railway volume disk usage.

### Alerts

| Alert | Condition |
|---|---|
| Agent broken | success rate < 70 % over 1 h with ≥ 10 requests |
| Tool broken | one tool fails > 30 % over 1 h |
| Bad release | newest `app_version` failure rate > 2× the previous version |
| Silence | 0 requests in 6 h between 08:00 and 22:00 CET |
| Disk | a Railway volume > 80 % |

### Work items (STA-31)

- [x] Railway testing project `stage-observability`: Collector, Prometheus, Loki, Grafana and volumes. Railway domains are active; custom `grafana.getstage.co` DNS remains open.
- [x] Collector config with bearer-token auth and Prometheus ingest, verified with a synthetic smoke test.
- [ ] Worker `POST /api/telemetry`: auth, zod allow-list, rate limit, forward to the Collector.
- [ ] Engine: a telemetry module with a local queue and background send that drops events on failure and never blocks a request. Hook it into `RunManager` (module runs) and into the Agent loop (requests and tool calls).
- [ ] Engine: token usage from the Claude and Codex CLI result events.
- [ ] Desktop: Settings → Privacy toggle ("Share anonymous diagnostics", on by default).
- [ ] Dashboards as JSON in `infra/grafana/` (versioned) and alert rules.
- [ ] Privacy policy: what is sent, its actual Railway region, and retention.

## Part 2: STA-47 website content (repo-based, no CMS)

Guide for Adrien: [`apps/web-application/src/marketing/content/README.md`](../apps/web-application/src/marketing/content/README.md).

### Why no Strapi

A Strapi version was built and tested locally on 2026-09-30, then dropped the same day. Adrien writes HTML/CSS with his agent, so forms in an admin UI are a detour for him. Strapi also needs a Node server and Postgres, which Cloudflare Workers cannot host, so it meant Railway (Pro plan for a shared workspace), a Cloudflare Tunnel, Access and R2. The Strapi code is not in git. If a non-technical editor ever needs a UI, a git-based CMS (Keystatic, Decap) can sit on top of `content.json` without a server.

### How it works

```txt
getstage.co = branch `website`
  developers: finished work from `work` → merge into `website` → ship
  Adrien:     edits on `website` (marketing folders only) → commit → ship

pnpm web:test  → testing.getstage.co (no push)     pnpm web:ship → getstage.co
  1. on `website`, everything committed, up to date with GitHub   (else stop)
  2. non-developers: only own commits, only marketing folders,
     no merge commits                                              (else stop)
  3. print commits + files going live
  4. production build: zod schema + content rules + pre-render     (else stop)
  5. web:ship only: git push origin website
  6. wrangler deploy -e testing|production --tag <commit> --message <subject>
```

- No CI/CD. Publishing runs on the machine of whoever ships.
- testing.getstage.co is shared with desktop testing (desktop login runs through it). A `web:test` from `website` replaces the app there until the next testing deploy from `work`.
- Pushing before deploying means every live version is a commit in git, and Cloudflare's deployment list shows which commit is live.
- The "up to date" check stops one person from deploying an old copy over the other's newer work.
- Unfinished app work on `work` can never go live through Adrien. Only developers merge into `website`, and ship refuses developer commits when a non-developer ships.
- Developers (full access) are listed by git email in `DEVELOPERS` in `scripts/ship.mjs`. Everyone else is limited to `MARKETING_PATHS`.
- Merge `website` back into `work` regularly so Adrien's content changes are there too.

### What is built

| Piece | Where |
|---|---|
| All marketing content (6 use cases, 2 blog posts, pages, redirects) | `src/marketing/content/content.json` |
| Schema + cross-checks (reserved/duplicate URLs, dead links, missing hero, SEO lengths) | `src/marketing/content/schema.ts`, `integrity.ts` |
| 11 page blocks: hero, richText, steps, checklist, faq, cardGrid, useCaseLinks, blogList, video, image, cta | `src/components/marketing/ContentPage.tsx`, `RichText.tsx` |
| `/<slug>` route for pages; route policy allows them | `src/routes/$slug.tsx`, `src/lib/webRoutePolicy.ts` |
| Pre-render of pages, `noindex`, sitemap without noindex pages, `_redirects` | `scripts/prerender-marketing.mjs` |
| Ship command with branch, freshness and folder guards | `scripts/ship.mjs`, `pnpm web:ship` |

Verified: production build and pre-render pass. A test page with every block renders correctly (H1, FAQ markup, video, redirect, noindex). Invalid content stops the build with a list of problems. The ship guards were tested in a throwaway repo: wrong branch, uncommitted changes, behind GitHub, app files by a non-developer, a developer's commit shipped by a non-developer, and merge commits are all refused; marketing-only commits and developer commits pass. Not yet run for real: an actual `pnpm web:ship` to production.

### Open

- [ ] Create the `website` branch on GitHub from the commit that is live on getstage.co today, then merge this work into it.
- [ ] Give Adrien repo write access and Cloudflare access for `wrangler login`.
- [ ] Homepage copy into content (sections are hand-built in `src/components/stage-landing/markup/`).
- [ ] Optional later: Markdown for blog bodies (hand-writing rich-text JSON is clumsy).

## STA-31 implementation checkpoint (2026-10-06)

`apps/monitoring` is the internal rollout portal: local preview (`pnpm monitoring:dev`, port 4310) plus protected Testing hosting at https://stage-monitoring-testing.steep-resonance-f13d.workers.dev using the existing `werner` Grafana admin login. Every asset is access-gated. It contains the living build spec, seven phase gates, user setup checklist and 24 Zod-validated audit findings. The canonical audit is `apps/monitoring/src/data/rollout.json`; the app is not a replacement for Grafana.

`infra/` contains the phase-1 four-service configs, Dockerfiles, local Compose, initial Grafana Health provisioning and a testing-only smoke script. Native config validation and app tests/build/typecheck pass. The four services are deployed in Railway testing under Adrien Ninet's Pro workspace. The Railway smoke test passed: bearer rejection, authenticated synthetic data through Prometheus/Loki, and Grafana dashboard provisioning. The telemetry-only Testing Worker is deployed separately from the website; 12 Worker tests and a local-workerd → real Railway count/histogram/log bridge passed. The 68 shared-contract tests include six Rust serialization fixtures. Phase 3 now has a local Research/section sender: bounded/non-blocking queue, one terminal observation, timed steps, metadata-only transport, Testing-only gates and runtime stop. On 2026-10-09, the user approved default-on diagnostics for normal unpackaged local Testing launches; `.env` supplies the shared Convex URL, an explicit launch opt-out remains available, and packaged production stays disabled. Nine telemetry tests, all 196 engine tests, strict Clippy and desktop typecheck pass. Deployed positive auth and a real Research run still need a signed-in Testing session. Persistent desktop opt-out, remaining workflows/dependencies/cloud instrumentation, alerts, custom DNS and production are unfinished. No billing logic changed.

The newer build spec is authoritative for deployment routing: authenticated public Collector and login-protected Grafana, private Prometheus/Loki. The older Tunnel/Access wording below is not an extra requirement for that stack. The standalone portal, however, must remain local until explicitly access-protected.

Privacy wording, immediate opt-out, complete event contracts, stateless OTLP counters and Business data-source isolation need the fixes listed in the build spec's implementation tracker and app audit.

## Order

1. **Website content:** built; first real ship, then homepage copy.
2. **Observability stack** on Railway (behind a Cloudflare Tunnel + Access) plus the Worker endpoint.
3. **Agent telemetry**, built into the Agent while it is being developed (Part 1 of V3, due 2026-10-12).
4. Dashboards and alerts.
