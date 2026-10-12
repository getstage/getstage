# STA-31 monitoring: build spec (Grafana, Prometheus, Loki on Railway)

> **Status:** Railway Testing stack, separate authenticated telemetry intake and protected React audit portal are deployed (2026-10-06). Synthetic metric/log checks pass. Local Research/section sender and timed steps default on for unpackaged desktops targeting the exact Testing backend; packaged Testing remains opt-in and production stays disabled; nine telemetry tests, all 196 engine tests, strict Clippy and six Rust/TS fixtures pass. A real signed-in Research run in Grafana remains unverified. Other workflows, dependencies, persistent desktop opt-out, cloud reporting, tested alerts, DNS and retention acceptance remain open. Production is untouched.
> **Owner:** Wessel (Linear `STA-31`)
> **Last updated:** 2026-10-06
> **Background and decisions:** [`STA-31_STA-47_MONITORING_AND_CMS_PLAN.md`](STA-31_STA-47_MONITORING_AND_CMS_PLAN.md) (Part 1). This file is the build spec; that file holds the decisions.
> **Agent prompt:** see [the last section](#agent-prompt).

## Current implementation boundary

The audit source is `apps/monitoring/src/data/rollout.json`; implementation is not acceptance. `apps/stage-engine/src/observability/telemetry.rs` queues only allow-listed metadata from Research/section runs, not serialized UI events. Electron passes app version/OS and clamps opt-in off for packaged production; Rust independently requires the exact Testing Convex deployment and channel. The run's session credential is transport-only. Existing workflow tool events supply context/Details/Refero timing; brief/provider/parse/save timings do not change UI events or workflow results. Non-provider error taxonomy is incomplete and may report `unknown`; dependency call events and file-count reconciliation are still phase 4.

The sender uses `try_send`, a 500-event waiting queue, 50-event/10-second active batches, 15-second age limit, five-second total HTTP flush and no retries/idle polling. `POST /v1/telemetry/disable` aborts its worker/in-flight request and purges pending data without stopping runs. It cannot enable reporting. Persistent Settings opt-out remains unimplemented and production release remains blocked. As approved on 2026-10-09, unpackaged local desktops default to collection only for the exact Testing backend; `STAGE_TELEMETRY_ENABLED=0` disables it. Packaged Testing stays opt-in and packaged production is forcibly disabled. Normal `pnpm run dev` reads the local `.env` Convex URL for both Electron and the renderer. Testing commands and the real-session verification gate are in `apps/monitoring/README.md`.

## 1. Why

Today we learn about failures from users in Slack. Examples from the last week:

| Incident | What the user saw | What we could have seen |
|---|---|---|
| Details MCP token expired (401) | "Website inspiration could not be loaded." on every website research run | `research` failure rate jumps to 100 %, `step=details-context`, `error_kind=details_unauthorized`, from one minute after the token died |
| `DETAILS_MCP_TOKEN` missing in production | "Details is not configured for this Stage deployment." | `error_kind=details_not_configured`, only in `channel=production` |
| Brief files never read | Research ignored the uploaded briefs, no error at all | `brief_files_loaded=0` while `brief_files_uploaded>0` |
| Codex update timed out | "`codex` command timed out." | `provider_update` failures, `provider=codex`, duration > 120 s |
| Re-run research looked stuck | Nothing happened for several seconds | Long `context_save` step duration before `run_started` |

Goal: **every AI run, every step inside it, every external dependency and every app-level failure is counted, timed and logged**, and Grafana alerts us before a user reports it.

## 2. What we monitor (inventory)

Every row becomes events (section 5), metrics (section 6) and log lines (section 7).

### 2.1 AI module runs (stage-engine, user's Mac)

Run modes from `apps/stage-engine/src/models/runs.rs` (`RunMode`):

| `module` label | Engine workflow | Steps (`tool_call_id` already emitted via `tool_started` / `tool_completed`) |
|---|---|---|
| `research` | `src/research/workflow.rs` | `stage-context` → `brief-files` (new) → `details-context` (websites) or `refero-context` (apps) → `provider` → `parse` → `save` |
| `research_section` | same, `regenerate_section` path | `stage-context` → `brief-files` → `provider` → `parse` → `save` |
| `strategy` | `src/strategy/workflow.rs` | `stage-context` → `provider` → `parse` → `save` |
| `moodboard` | `src/moodboard/workflow.rs` | `stage-moodboard` → `moodboard-import` → `refero-context` / `figma` → `provider` → `save` |
| `styleguide` | `src/styleguide/workflow.rs` | `stage-styleguide` → `provider` → `parse` → `save` |
| `flows` | `src/flows/workflow.rs` | `stage-context` → `provider` → `parse` → `save` |
| `wireframes` | `src/wireframes/workflow.rs` | `verify-provider` → `stage-context` → `brand-kit` → `provider` → `parse` → `save` (Lo-Fi and Hi-Fi via `wireframe_kind` label) |
| `chat` | `src/chat/workflow.rs` | `provider` |
| `voice`, `critique`, `generation` | runs module | `provider` |

`provider`, `parse` and `save` are not emitted as tool calls today. Add them as steps in the telemetry module (section 8.1), not as UI tool calls.

### 2.2 External dependencies (called from the engine)

| `dependency` | Where | Failure kinds to distinguish |
|---|---|---|
| `details_mcp` | `src/details/` | `unauthorized` (401), `not_configured`, `timeout`, `http_error`, `empty_result` |
| `refero_mcp` | `src/refero/` | same as Details |
| `figma` | `src/figma/` | `unauthorized`, `rate_limited`, `http_error` |
| `paper_mcp` | `src/exports/` (Paper) | `not_running` (local MCP at 127.0.0.1:29979), `http_error` |
| `convex` | `src/convex_store/` | `unauthorized` (expired session), `function_error`, `timeout` |
| `r2_upload` | `ConvexAssetUploader` | `http_error`, `timeout` |
| `r2_download` | `helpers/r2_files.rs` (brief files, brand kits) | `not_configured` (no public base URL), `http_error`, `too_large` |
| `provider_cli` | `src/providers/` | `missing_binary`, `not_authenticated`, `spawn_failed`, `timeout`, `process_failed`, `cancelled` |

### 2.3 Engine-level and desktop events

| `event` | Where | Why |
|---|---|---|
| `provider_status` | `src/providers/service.rs` | Setup friction: CLI missing, not logged in, outdated version |
| `provider_update` | `update_provider_with_spec` | Codex/Claude updates: outcome, duration, install source (`native` / `homebrew` / `npm`) |
| `brief_files` | `src/research/brief_files.rs` | Uploaded vs loaded per type (`pdf`, `docx`, `txt`, image); unreadable files |
| `export` | `src/exports/` + desktop project export | Figma, FigJam, code, Paper, project zip: outcome, duration |
| `sidecar` | `apps/user-application/electron/sidecar.ts` | Engine start time, crash, restart, idle shutdown, port conflict |
| `desktop_update` | `electron/helpers/auto-update.ts` | Check, download, install failures per version |
| `renderer_error` | renderer `window.onerror` / React error boundary | Uncaught UI errors (message + component stack, no user content) |
| `auth` | desktop sign-in (`stage://` / `stage-testing://`) | Sign-in loops, expired sessions |

### 2.4 Cloud side

| `source` | Where | What |
|---|---|---|
| `worker` | `apps/web-application/worker/index.ts` | 5xx, latency, `/auth/desktop` failures, `/billing/return` hits |
| `convex` | `packages/data-ops/convex/` | Function errors (billing, rewards, invites, projectAi), Stripe webhook failures |
| `stripe_webhook` | `lib/billing/handlers/webhooks.ts` | Event type, outcome, credit grant/revoke |
| `rewards` | `lib/rewards/handlers.ts` | Claim outcome (`approved`, `unrelated`, `unavailable`, `claimed`) |

## 3. Architecture

```txt
stage-engine (Rust, user's Mac) ─┐
desktop main + renderer (Electron)┤  batched JSON events, HTTPS, user's Stage session
                                  ▼
Worker  POST /api/telemetry   (apps/web-application/worker)
  - verifies the Convex auth token (same token the desktop already sends)
  - zod allow-list per event type, drops unknown fields, rate limit per user
  - converts events to OTLP (metrics + logs) and forwards with a bearer token
  - also emits its own 5xx/latency events (ctx.waitUntil)
                                  ▼
Railway project "stage-observability"
  ├─ otel-collector   (only public service; checks bearer token)
  │     ├─▶ prometheus  (OTLP receiver on; volume; 90-day retention)
  │     └─▶ loki        (volume; 30-day retention)
  └─ grafana          (grafana.getstage.co; login; provisioned from repo)

Convex ── log stream (webhook) ──▶ Worker POST /api/convex-logs ──▶ collector
```

Rules:

- The desktop app **never** holds the collector token. Only the Worker does (`wrangler secret put OTEL_COLLECTOR_TOKEN`).
- Prometheus and Loki are **not public**. They live on Railway's private network; only the collector and Grafana have public domains.
- Telemetry never blocks or slows a run: events go into an in-memory queue, are sent in batches every 10 s or 50 events, and are dropped (not retried forever) when offline. Maximum queue: 500 events.
- Convex stays the system of record for runs (`projectAiRuns`) and credits. Grafana is for health, not billing.
- Convex log streams need a paid Convex plan. Check the plan first; if it is not available, Convex functions report failures by calling the same Worker endpoint from a small `internal.telemetry.report` action (section 8.4).

## 4. Privacy

**Never sent:** prompts, AI output, brief text or files, project names, client names, URLs (including competitor and website URLs), file names, image data, email addresses.

**Sent:** ids and enums only (module, step, provider, model, error kind, outcome), durations, counts, token counts, app version, OS version, channel (`testing` / `production`), Stage user id and project id **in logs only** (never as metric labels), and an error message that has passed `scrub()`:

- `scrub()` replaces URLs with `<url>`, emails with `<email>`, file paths with `<path>`, and anything longer than 300 characters is cut.

Consent: Settings → Privacy → "Share anonymous diagnostics", on by default. When off, the engine and desktop send nothing. Update the privacy policy (what, where: Railway EU region, retention 30/90 days).

## 5. Event schema

One schema, shared by engine (Rust structs), desktop (TypeScript) and Worker (zod). Put the zod schema in `packages/data-ops/src/contracts/telemetry.ts` so the Worker and desktop import the same file; mirror it in Rust in `apps/stage-engine/src/observability/telemetry.rs`.

```ts
// Common to every event
type TelemetryBase = {
  event: "run" | "step" | "dependency" | "provider_status" | "provider_update"
       | "brief_files" | "export" | "sidecar" | "desktop_update" | "renderer_error" | "auth";
  ts: number;                 // epoch ms
  appVersion: string;         // "0.2.54"
  channel: "testing" | "production";
  os: string;                 // "macOS 26.0"
  sessionId: string;          // random per app launch, not the user id
  userId?: string;            // Stage user id, logs only
  projectId?: string;         // logs only
  runId?: string;             // engine run id, joins events of one run
};

type RunEvent = TelemetryBase & {
  event: "run";
  module: "research" | "research_section" | "strategy" | "moodboard" | "styleguide"
        | "flows" | "wireframes" | "chat" | "voice" | "critique" | "generation";
  provider: "claude" | "codex";
  model?: string;             // "claude-sonnet-5", "gpt-5.5"
  mode?: "default" | "fast";
  outcome: "succeeded" | "failed" | "cancelled";
  errorCode?: EngineErrorCode; // existing enum, see below
  errorKind?: string;          // fine-grained, see section 5.1
  failedStep?: string;         // step id where it failed
  durationMs: number;
  tokensIn?: number;
  tokensOut?: number;
  projectCategory?: "websites" | "web_apps" | "ios_apps";
  wireframeKind?: "lofi" | "hifi";
  message?: string;            // scrubbed
};

type StepEvent = TelemetryBase & {
  event: "step";
  module: RunEvent["module"];
  step: string;                // "stage-context" | "brief-files" | "details-context" | ... | "provider" | "parse" | "save"
  outcome: "succeeded" | "failed" | "skipped";
  durationMs: number;
  errorKind?: string;
};

type DependencyEvent = TelemetryBase & {
  event: "dependency";
  dependency: "details_mcp" | "refero_mcp" | "figma" | "paper_mcp" | "convex"
            | "r2_upload" | "r2_download" | "provider_cli";
  operation: string;           // MCP tool name ("search_inspirations"), Convex function name, "upload"
  outcome: "succeeded" | "failed";
  httpStatus?: number;
  errorKind?: string;
  durationMs: number;
};

type BriefFilesEvent = TelemetryBase & {
  event: "brief_files";
  uploaded: number;
  loaded: number;
  byType: Record<"pdf" | "docx" | "doc" | "txt" | "md" | "image", { uploaded: number; loaded: number }>;
  failedKinds: string[];       // ["pdf_unreadable", "r2_not_configured"]
};

type ProviderUpdateEvent = TelemetryBase & {
  event: "provider_update";
  provider: "claude" | "codex";
  installSource: "native" | "homebrew" | "npm" | "unknown";
  versionBefore?: string;
  versionAfter?: string;
  outcome: "updated" | "failed";
  errorKind?: string;          // "timeout" | "exit_nonzero" | "missing_binary"
  durationMs: number;
};
// provider_status, export, sidecar, desktop_update, renderer_error, auth: same pattern,
// enums + outcome + durationMs + errorKind + scrubbed message.
```

**Local contract checkpoint:** `packages/data-ops/src/contracts/telemetry.ts` now defines all 12 client variants (including heartbeat) and four separate cloud variants. It reuses the existing TypeScript snake-case provider error codes, bounds numeric values and versions, allow-lists models/steps/operations/routes/error kinds, and reconciles brief counts. Unknown fields are stripped. Unlike the sketch above, client `userId`, arbitrary messages and component stacks are deliberately omitted: the Worker must derive identity from verified auth, and free-text diagnostics require privacy approval. Unknown/custom models and routes must be normalized to `other` by future senders; custom strings must never become metric labels. These are local contracts, not a deployed intake endpoint; Rust parity and server-side timestamp/channel/byte-limit checks are still pending.

`EngineErrorCode` (existing, `apps/stage-engine/src/models/errors.rs`): `MissingBinary`, `VersionTimeout`, `NotAuthenticated`, `ReadinessFailed`, `InvalidRequest`, `RunSpawnFailed`, `RunTimeout`, `RunCancelled`, `ProviderProcessFailed`, `IoError`, `InternalError`.

### 5.1 `errorKind`: fine-grained failure reasons

`errorCode` is too coarse (most module failures end as `InvalidRequest` or `ProviderProcessFailed`). Add `errorKind`, derived where the error is created. Each workflow's `WorkflowError` already has variants per cause (for example `WorkflowError::Details(_)` maps to "Website inspiration could not be loaded."); map each variant to a kind in one function per workflow, next to the existing user-message mapping.

| `errorKind` | Source |
|---|---|
| `details_unauthorized`, `details_not_configured`, `details_timeout`, `details_http_error` | Details MCP |
| `refero_unauthorized`, `refero_not_configured`, `refero_timeout`, `refero_http_error` | Refero MCP |
| `brief_unreadable` | all brief files unreadable and no typed brief |
| `provider_missing_binary`, `provider_not_authenticated`, `provider_timeout`, `provider_exit_nonzero`, `provider_rate_limited` | provider CLI |
| `json_extract_failed`, `artifact_incomplete`, `artifact_invalid` | parsing the AI output (`extract_*_artifact`, `validate_complete_*`) |
| `convex_unauthorized`, `convex_function_error` | Convex reads/writes |
| `r2_upload_failed`, `r2_download_failed`, `r2_not_configured` | assets |
| `cancelled_by_user` | cancel button |
| `unknown` | anything not mapped (should trend to zero) |

## 6. Metrics (Prometheus)

The Worker converts events into OTLP metrics. Labels are low-cardinality enums only. **Never** use user, project, run or session ids as labels.

| Metric | Type | Labels |
|---|---|---|
| `stage_runs_total` | counter | `module`, `provider`, `model`, `outcome`, `error_kind`, `app_version`, `channel`, `project_category` |
| `stage_run_duration_seconds` | histogram (buckets 5, 15, 30, 60, 120, 300, 600, 1200) | `module`, `provider`, `outcome`, `channel` |
| `stage_run_steps_total` | counter | `module`, `step`, `outcome`, `error_kind`, `channel` |
| `stage_run_step_duration_seconds` | histogram (0.1 … 300) | `module`, `step`, `channel` |
| `stage_dependency_calls_total` | counter | `dependency`, `operation`, `outcome`, `error_kind`, `channel` |
| `stage_dependency_duration_seconds` | histogram | `dependency`, `channel` |
| `stage_tokens_total` | counter | `provider`, `model`, `direction` (`in`/`out`), `module` |
| `stage_brief_files_total` | counter | `type`, `result` (`uploaded`/`loaded`/`failed`) |
| `stage_provider_updates_total` | counter | `provider`, `install_source`, `outcome`, `error_kind` |
| `stage_provider_update_duration_seconds` | histogram (30 … 1800) | `provider`, `install_source` |
| `stage_provider_status_total` | counter | `provider`, `status` (`ready`, `missing`, `not_authenticated`, `outdated`) |
| `stage_exports_total` | counter | `target` (`figma`, `figjam`, `code`, `paper`, `zip`), `outcome`, `error_kind` |
| `stage_sidecar_events_total` | counter | `kind` (`start`, `crash`, `restart`, `idle_stop`, `port_conflict`), `app_version` |
| `stage_desktop_update_total` | counter | `phase` (`check`, `download`, `install`), `outcome`, `app_version` |
| `stage_renderer_errors_total` | counter | `app_version`, `route` (route template, e.g. `/projects/$id/research`) |
| `stage_worker_requests_total` | counter | `route` (template), `status_class` (`2xx`…`5xx`) |
| `stage_worker_request_duration_seconds` | histogram | `route` |
| `stage_convex_function_errors_total` | counter | `function` (e.g. `billing:createCheckoutSession`), `channel` |
| `stage_stripe_webhooks_total` | counter | `event_type`, `outcome` |
| `stage_reward_claims_total` | counter | `result` |
| `stage_active_sessions` | gauge (from heartbeat every 5 min) | `app_version`, `channel` |

## 7. Logs (Loki)

One JSON log line per event, with only these **stream labels** (low cardinality): `source` (`engine`, `desktop`, `worker`, `convex`), `channel`, `event`, `level` (`info`, `warn`, `error`). Everything else is in the JSON body (`module`, `step`, `errorKind`, `message`, `userId`, `projectId`, `runId`, `appVersion`).

Useful LogQL queries (save them in Grafana's "Failures" dashboard):

```logql
# All failed runs in the last hour, newest first
{source="engine", event="run", level="error"} | json | outcome="failed"

# Everything that happened in one run
{source=~"engine|desktop"} | json | runId="<run-id>"

# Support: "my research failed" for one user
{source=~"engine|desktop|convex"} | json | userId="<stage-user-id>"

# Details failures with HTTP status
{source="engine", event="dependency"} | json | dependency="details_mcp" | outcome="failed"
```

## 8. Code to build

### 8.1 Engine (`apps/stage-engine`)

- New `src/observability/telemetry.rs`:
  - `TelemetryClient` with an in-memory bounded queue (`tokio::sync::mpsc`, 500), a background task that batches (10 s or 50 events) and POSTs to `{STAGE_TELEMETRY_URL}/api/telemetry` with the user's auth token (the same token runs already receive as `auth_token`).
  - Drops events on failure. Never blocks a run. No retries beyond the next batch.
  - Disabled when `STAGE_TELEMETRY_ENABLED=0` (set by Electron from the privacy toggle) or when there is no auth token.
  - `scrub(message)`, as in section 4.
- `RunManager` (`src/runs/mod.rs`): on `RunStarted` store the start time; on `RunCompleted`/`RunFailed`/`RunCancelled` emit one `run` event with duration, outcome, `error_code`, `error_kind` and `failed_step`.
- The `tool_started` / `tool_completed` helpers in every workflow also emit `step` events, timed. Add `brief-files`, `provider`, `parse` and `save` steps.
- Wrap the Details, Refero, Figma, Paper, Convex and R2 clients so every call emits a `dependency` event (operation, HTTP status, duration).
- Token usage: parse the Claude CLI `result` event (`usage.input_tokens`, `usage.output_tokens`) and the Codex `token_count` event in `src/providers/`.
- `provider_status`: emit on each refresh, deduplicated (only when the status changes per launch).
- `provider_update`: emit at the end of `update_provider_with_spec` with install source, versions, duration.
- `brief_files`: emit from `load_brief_files` (uploaded, loaded and failed per type).
- Config: `STAGE_TELEMETRY_URL` baked in via `desktopBuildEnv` (testing → `https://testing.getstage.co`, production → `https://getstage.co`).

### 8.2 Desktop (`apps/user-application`)

- `electron/helpers/telemetry.ts`: the same queue and batching for main-process events (`sidecar`, `desktop_update`, `auth`), sent with the stored desktop session token.
- Sidecar (`electron/sidecar.ts`): emit `start` (with time to ready), `crash` (exit code, signal), `restart`, `idle_stop`, `port_conflict`.
- Auto-update (`electron/helpers/auto-update.ts`): `check`, `download` and `install` outcomes.
- Renderer: a top-level React error boundary plus `window.onerror` and `unhandledrejection` → IPC `telemetry:renderer-error` (message scrubbed, route template, component stack without props).
- Settings → Privacy: toggle "Share anonymous diagnostics" (default on), stored in desktop preferences; passes `STAGE_TELEMETRY_ENABLED` to the engine on (re)start.
- Heartbeat every 5 minutes while the app is open, for `stage_active_sessions`.

### 8.3 Worker (`apps/web-application/worker`)

- `POST /api/telemetry`:
  1. Requires `Authorization: Bearer <convex auth token>`; verify it with the same JWKS the app already uses (`JWKS` / `auth.config.ts`), and reject when it is invalid.
  2. Body is `{ events: TelemetryEvent[] }`, at most 100 events and 256 KB per request.
  3. Validate each event with the shared zod schema, and drop unknown fields and invalid events.
  4. Rate limit 600 events per user per hour (Cloudflare Rate Limiting binding or a Durable Object counter).
  5. Convert to OTLP JSON: counters and histograms as metrics, and every event as a log record. POST to `OTEL_COLLECTOR_URL` with `Authorization: Bearer OTEL_COLLECTOR_TOKEN`, using `ctx.waitUntil` so the response returns at once (`204`).
- Middleware for every request: `stage_worker_requests_total` and its duration; on 5xx, a log line with the route template.
- `POST /api/convex-logs` (only when Convex log streams are available): verify the Convex webhook secret, keep `error` lines from functions, map them to `stage_convex_function_errors_total` plus a Loki line.
- Secrets: `wrangler secret put OTEL_COLLECTOR_URL`, `OTEL_COLLECTOR_TOKEN`, `CONVEX_LOG_WEBHOOK_SECRET` for `-e testing` and `-e production`.

### 8.4 Convex (`packages/data-ops/convex`)

- Preferred: Convex dashboard → Settings → Integrations → Log streams → Webhook → `https://getstage.co/api/convex-logs` (production) and `https://testing.getstage.co/api/convex-logs` (testing).
- Fallback (no log streams): `internal.telemetry.report` action that POSTs to the Worker with a server-to-server token (`TELEMETRY_SERVER_TOKEN`); call it from the Stripe webhook handlers, the rewards claim and the checkout and portal actions on failure.
- Do not change billing logic; only add reporting.

### 8.5 Railway (`stage-observability`)

1. Testing is deployed as `stage-observability` in Adrien Ninet's Pro workspace, currently in EU West (Amsterdam) because the attached volumes are there. The user accepts a common or inexpensive region, including the US; no Singapore or EU requirement applies. Confirm long-term ownership and any region move before production.
2. Services (template `grafana-loki-and-prometheus-with-otel-co` as a starting point, or 4 services from images):
   - `otel-collector`: `otel/opentelemetry-collector-contrib`, public domain `otel.getstage.co`, config from `infra/otel/collector.yaml` (bearer token auth extension, OTLP HTTP receiver, exporters `prometheusremotewrite` → Prometheus, `otlphttp` → Loki).
   - `prometheus`: `prom/prometheus`, flags `--web.enable-otlp-receiver --web.enable-remote-write-receiver --storage.tsdb.retention.time=90d`, volume `/prometheus`, private only.
   - `loki`: `grafana/loki`, config `infra/loki/config.yaml` (filesystem storage on a volume, `retention_period: 720h`, `allow_structured_metadata: true`), private only.
   - `grafana`: `grafana/grafana`, public domain `grafana.getstage.co`, volume `/var/lib/grafana`, provisioning from `infra/grafana/provisioning/` (data sources plus dashboards as JSON), `GF_AUTH_ANONYMOUS_ENABLED=false`, admin password as a Railway variable, SMTP for alert emails.
3. Generate `OTEL_COLLECTOR_TOKEN` (32+ random bytes) and set it on the collector and in the Worker secrets.
4. DNS: CNAME `otel` and `grafana` in Cloudflare to the Railway domains (proxy off for the collector if OTLP payloads are large).
5. Users: Werner = Admin, Adrien = Viewer (Business dashboard only, via a folder permission).

Everything under `infra/` is versioned in the repo; Grafana dashboards are edited as JSON and provisioned, not hand-edited in production.

## 9. Dashboards (Grafana)

**Testing Research dashboard deployed 2026-10-09:** https://grafana-testing-038e.up.railway.app/d/stage-research/stage-c2b7-research, also the default Grafana home. Source: `infra/grafana/dashboards/research.json`. Eight panels show recorded runs, success rate, duration, failures, run/step tables and logs, with channel and Run ID filters. Persisted Loki events give accurate selected-window counts even when event-driven Prometheus series are inactive. Deployment `d8f533da-fdcf-4333-b4ee-0886bc8e65d2` is SUCCESS; query/data-source/browser checks pass for the real run, Run ID drill-down and empty Production state. This is Research-only acceptance; remaining dashboards and alert delivery below are still planned.

Variables on every planned full-workflow dashboard: `channel` (testing/production, default production), `app_version` (multi), `module` (multi), `provider` (multi).

### 9.1 Health (overview, the first screen)

| Panel | Query (PromQL) |
|---|---|
| Success rate per module, last 1 h (stat, red < 90 %) | `sum by (module) (rate(stage_runs_total{outcome="succeeded",channel="$channel"}[1h])) / sum by (module) (rate(stage_runs_total{outcome=~"succeeded\|failed",channel="$channel"}[1h]))` |
| Runs per module per hour (bars) | `sum by (module) (increase(stage_runs_total{channel="$channel"}[1h]))` |
| p50 / p95 duration per module | `histogram_quantile(0.95, sum by (le, module) (rate(stage_run_duration_seconds_bucket{channel="$channel"}[1h])))` |
| Failures by provider | `sum by (provider) (increase(stage_runs_total{outcome="failed"}[24h]))` |
| Dependency health (Details, Refero, Figma, Convex, R2) | success rate per `dependency`, same pattern as above |
| Active desktop sessions by version | `sum by (app_version) (stage_active_sessions{channel="$channel"})` |

### 9.2 Failures (where and why)

| Panel | Query |
|---|---|
| Top error kinds, 24 h (table) | `topk(15, sum by (module, error_kind) (increase(stage_runs_total{outcome="failed"}[24h])))` |
| Failing step per module (heatmap) | `sum by (module, step) (increase(stage_run_steps_total{outcome="failed"}[6h]))` |
| Failures by app version (catch bad releases) | `sum by (app_version) (increase(stage_runs_total{outcome="failed"}[24h])) / sum by (app_version) (increase(stage_runs_total[24h]))` |
| Dependency errors by HTTP status | Loki: `sum by (dependency, httpStatus) (count_over_time({event="dependency", level="error"} \| json [1h]))` |
| Latest failed runs (logs panel) | Loki: `{source="engine", event="run", level="error"} \| json` |
| Renderer errors by route | `sum by (route) (increase(stage_renderer_errors_total[24h]))` |

### 9.3 Per module (one row per module, collapsible)

For Research, Strategy, Moodboard, Style guide, Flows and Wireframes: runs, success rate, p95 duration, step durations (stacked bars: context, external search, provider, parse, save), top `error_kind`, Claude vs Codex success, and tokens per run.

Research also gets: Details vs Refero (website vs app projects), brief files uploaded vs loaded per type, and competitor count.

### 9.4 Setup friction (providers and desktop)

- Provider status: missing / not logged in / outdated (`stage_provider_status_total`).
- Provider updates: success rate, p95 duration (expect Codex downloads to take minutes), failures by install source.
- Sidecar crashes and restarts per version, engine start time.
- Desktop auto-update: check, download and install failures.
- Sign-in failures (`auth` events) by channel; a sign-in loop shows up as many attempts per session.

### 9.5 Cloud

- Worker: requests, 5xx rate and p95 per route.
- Convex function errors (top functions).
- Stripe webhooks per event type and outcome; credit grants and revokes.
- Reward claims by result.

### 9.6 Business (Adrien, read-only)

Runs per day per module, active users per day (count of distinct `userId` from Loki, daily), Claude vs Codex share, export targets used, reward claims, and app versions in use.

## 10. Alerts

Grafana alerting → email (Werner + Adrien) and phone push (Grafana OnCall or the Grafana mobile app). Every alert links to the matching dashboard panel.

| Alert | Condition | For |
|---|---|---|
| Module broken | success rate of any `module` < 70 % over 30 min with ≥ 5 runs (production) | 10 min |
| Dependency down | `details_mcp` or `refero_mcp` failure rate > 50 % over 15 min with ≥ 3 calls | 5 min |
| Dependency unauthorized | any `error_kind=~".*_unauthorized\|.*_not_configured"` in production | immediately |
| Brief files not read | `stage_brief_files_total{result="failed"}` > 0 for 3 runs in 1 h | 0 |
| Bad release | newest `app_version` failure rate > 2× the previous version over 2 h with ≥ 10 runs | 30 min |
| Sidecar crash loop | > 3 `crash` events per session in 10 min | 0 |
| Provider updates failing | `stage_provider_updates_total{outcome="failed"}` > 3 in 1 h | 0 |
| Worker 5xx | 5xx rate > 2 % over 10 min | 5 min |
| Stripe webhook failures | any `outcome="failed"` | 0 |
| Silence | 0 runs in production for 6 h between 08:00 and 22:00 CET | 0 |
| Disk | any Railway volume > 80 % | 15 min |

## 11. Build order and acceptance

| Phase | Content | Done when |
|---|---|---|
| 1. Stack | Railway services, `infra/` configs, domains, Grafana login, data sources | Grafana opens at grafana.getstage.co; a test OTLP metric sent with curl to the collector shows up in Prometheus, and a log line shows up in Loki; requests without the token get 401 |
| 2. Worker endpoint | `/api/telemetry`, zod schema in `packages/data-ops`, OTLP conversion, rate limit, secrets | Valid batch → 204 and visible in Grafana; invalid token → 401; unknown fields dropped; 101 events → 413 |
| 3. Engine runs and steps | telemetry module, `run` and `step` events, `errorKind` mapping for all workflows | A research run on testing shows one `run` event, its steps with durations, and the same `runId` in Loki |
| 4. Dependencies and briefs | Details, Refero, Figma, Paper, Convex, R2 wrappers, `brief_files`, provider status and update, tokens | Setting an invalid `DETAILS_MCP_TOKEN` on **testing** fires "Dependency unauthorized" within 5 minutes |
| 5. Desktop | sidecar, auto-update, renderer errors, auth, heartbeat, privacy toggle | Killing the engine process shows a `crash`; with the toggle off, no events leave the Mac (check with the Worker logs) |
| 6. Cloud | Worker middleware, Convex log stream or fallback, Stripe webhooks, rewards | A forced Convex function error appears in "Cloud" within 1 minute |
| 7. Dashboards and alerts | JSON in `infra/grafana/dashboards/`, alert rules in `infra/grafana/provisioning/alerting/` | Every panel shows data on testing; each alert was triggered once on purpose and reached email |

Tests: Rust unit tests for `scrub()`, the `errorKind` mapping and the batching queue (bounded, drops when full); Worker tests for auth, validation, rate limit and OTLP output; desktop tests for the privacy toggle.

## Implementation tracker (2026-10-06)

- Local portal: [`../apps/monitoring/README.md`](../apps/monitoring/README.md), `pnpm monitoring:dev` → http://127.0.0.1:4310. Stage-styled overview, full living spec, seven phase gates, setup checklist and searchable/exportable audit.
- Canonical audit: `apps/monitoring/src/data/rollout.json` (23 findings, strict Zod validation). Update statuses only with acceptance evidence; no browser-only completion state.
- Infrastructure: [`../infra/README.md`](../infra/README.md). Pinned four-service stack, authenticated Collector, private backends, volume/retention configs, native validators and an initial Health dashboard. All four services are deployed in Railway testing; the remote smoke test passed bearer rejection, synthetic ingest/query through Prometheus and Loki, and Grafana dashboard provisioning. Local Compose runtime and long-term retention remain unverified.
- Railway project `stage-observability` is in Adrien Ninet's Pro workspace, testing environment. Only Collector and Grafana have public Railway domains; Prometheus and Loki are private. All four services currently run in Amsterdam with volumes attached. No custom DNS or production deployment was made.
- App build/typecheck, data/infra checks and desktop/mobile browser checks pass. Phase 2 has started locally with shared contracts: 62 validation tests and data-ops typecheck pass. Worker auth, rate limits, OTLP conversion and remote acceptance are still pending; phases 3–7 are not started. No changes to billing logic, desktop or engine runtime.

### Safety issues requiring resolution before the affected phase

| Finding | Required change | Phase |
|---|---|---|
| Schemas are incomplete | Define heartbeat/cloud and all sketched event variants; bound strings/enums/metrics labels; derive user identity from verified auth. | 2 |
| Stateless Worker metrics | Prove delta/cumulative conversion, concurrent producers, histograms and restart behavior. | 2 |
| Anonymous wording vs ids | Approve honest identifying-metadata wording or remove ids; arbitrary error text needs more than URL/email/path redaction. | 5 |
| Opt-out applies only on launch | Disable both live senders/heartbeat immediately and clear queues; do not wait for another engine launch. | 5 |
| Heartbeat gauge has no expiry model | Define server-side active-session aggregation without id metric labels. | 5 |
| Cloud fallback auth is unspecified | Add the separate authenticated server-to-server Worker path if Convex log streams are unavailable. | 6 |
| Business-only folder is insufficient | Isolate data sources/organization or another reviewed boundary so Adrien cannot query operational Loki/user ids. | 7 |
| Some alerts lack input metrics | Supply disk data, per-session crash aggregation, per-run brief counts and release ordering; use rate/increase and testing-only fault injection. | 7 |
| Future V3 Agent events missing | Extend contracts for Ask/Create and per-tool calls when the Agent is built; do not implement the Agent as part of this foundation. | 3 / V3 |

The audit contains the detailed owners, changes, checks and current evidence. The portal is unauthenticated and **must remain local** until separately access-protected. These findings do not authorize production collection, deployment or a change to billing logic.

## 12. Open before building

1. **Railway account:** testing stack is deployed in Adrien Ninet's Pro workspace; confirm the long-term owner before production rollout.
2. **Convex plan:** are log streams available? If not, use the fallback in 8.4.
3. **Privacy policy text** and the in-app consent wording (Adrien).
4. **Alert recipients and phone push:** Grafana mobile app or OnCall.

## Agent prompt

Copy this into Claude Code or Codex in the repo root:

```text
You are building STA-31 monitoring for Stage. Read these first, in order:
1. AGENTS.md, PROJECT_STATUS.md, ARCHITECTURE.md
2. docs/STA-31_STA-47_MONITORING_AND_CMS_PLAN.md (decisions)
3. docs/STA-31_MONITORING_BUILD_SPEC.md (this spec: the source of truth)

Goal: every AI run (research, strategy, moodboard, style guide, flows, wireframes,
chat), every step inside it, every external dependency (Details MCP, Refero MCP,
Figma, Paper, Convex, R2, provider CLIs) and every app-level failure (engine sidecar,
desktop auto-update, renderer errors, sign-in, Worker 5xx, Convex function errors,
Stripe webhooks) is counted, timed and logged, and shown in Grafana with alerts.

Rules:
- Follow the spec's architecture exactly: engine/desktop -> Worker POST /api/telemetry
  -> OTel Collector (bearer token) -> Prometheus + Loki -> Grafana, all on Railway.
  The desktop never holds the collector token.
- Privacy (spec section 4) is mandatory: no prompts, AI output, brief content, names,
  URLs, file names or emails. Ids only in logs, never as metric labels. Respect the
  "Share anonymous diagnostics" toggle.
- Telemetry must never block, slow down or fail a run: bounded queue, batching, drop
  on failure.
- Use the existing code: RunManager and the tool_started/tool_completed helpers in each
  workflow, the WorkflowError variants (map them to errorKind next to the existing
  user-message mapping), EngineErrorCode, desktopBuildEnv for baked config, the
  existing Convex auth/JWKS in the Worker. Reuse and extract; do not duplicate.
- One shared zod schema in packages/data-ops/src/contracts/telemetry.ts, mirrored in
  Rust. Grafana dashboards and alert rules are JSON/YAML under infra/grafana/,
  collector and Loki config under infra/otel/ and infra/loki/.
- pnpm only. Do not change billing or credit logic. Do not deploy to production
  or set production secrets: build and verify on testing, then stop and report.
- Work in the phase order of spec section 11. After each phase, run the checks in
  its "Done when" column and report the result before starting the next phase.
- Production-grade code: no unused code, clippy clean, typecheck clean, tests for
  scrub(), errorKind mapping, the queue, and the Worker endpoint.

Start by listing, per phase, the exact files you will create or change, then
build phase 1 and stop for review.
```
