# Stage Monitoring

Internal STA-31 rollout portal using Stage's own wordmark, black-gradient active navigation, neutral gray panel frames, white surfaces, Inter typography and lavender accents from the desktop design. It is a **protected Testing rollout portal**, not a replacement for Grafana and not a live health dashboard yet.

## Online Testing

Open **https://stage-monitoring-testing.steep-resonance-f13d.workers.dev** using the existing `werner` Grafana Testing admin login. All HTML, JavaScript, fonts and images are protected server-side. The real Research dashboard is **https://grafana-testing-038e.up.railway.app/d/stage-research/stage-c2b7-research**; Grafana's home page also opens it. It defaults to Testing / last 24 hours, with recorded run results, durations, steps and logs. Click a Run ID to inspect that run. Other workflow dashboards and alerts are still pending. The telemetry POST endpoint is not a browser dashboard.

## Local preview

From the repo root:

```sh
pnpm install --frozen-lockfile
pnpm monitoring:dev
```

Open **http://127.0.0.1:4310**. The server deliberately binds to loopback and refuses to silently change its port. A `Stage monitoring` herdr tab can keep the dev server running.

## Views

- **Overview:** honest disconnected state, pipeline, phases and blockers; no fake live charts.
- **Build plan:** seven phases, exact target locations, acceptance criteria and the full source specification.
- **Implementation audit:** owner/status/phase/search filters, expanded change/verification/evidence and CSV export.
- **Your setup:** access and decisions needed from Werner/Adrien.

### Maintain the audit

The shared state is **`src/data/rollout.json`**, committed and reviewed in git. Update `status` only with evidence; `verified` means its acceptance check actually passed. Browser clicks do not silently mark shared work complete. Zod validates strict shapes, enums, text limits, dates, phase coverage and unique audit ids. Validation runs during every build; invalid data fails closed in the UI.

The full spec is imported directly from `docs/STA-31_MONITORING_BUILD_SPEC.md`. Its Markdown is rendered without raw HTML execution. No telemetry, collector token, billing logic, external fonts or credentials are embedded in this app. Inter is self-hosted from the existing Stage font asset.

## Verify

```sh
pnpm monitoring:build          # data/infra tests + strict typecheck + Vite build
pnpm monitoring:test
pnpm monitoring:typecheck
pnpm --filter @stage/monitoring exec playwright install chromium
pnpm monitoring:test:browser   # desktop + mobile navigation/filter/download checks
```

Browser screenshots/results are gitignored. Infrastructure setup and runtime acceptance are in [`../../infra/README.md`](../../infra/README.md). The Railway Testing stack and separate telemetry Worker are deployed. Synthetic local-workerd → Railway checks passed; deployed positive-auth acceptance still needs a real Stage Testing session. There are 68 shared-contract tests (including six Rust serialization fixtures), 12 Worker tests and nine engine telemetry tests. All 196 engine tests, strict Clippy and desktop TypeScript checks pass. Research/section run outcomes and timed steps are implemented locally; no real application run has yet been verified in Grafana. Other workflows, dependency/file-count events, desktop/cloud diagnostics and alerts remain open.

## Security boundary

**Never publish the static bundle without its access Worker.** The separate Testing Worker verifies Basic credentials against Grafana `/api/user`, permits only `werner`, rate-limits authentication and protects every asset with no-store and CSP. It is deployed independently of the shared website. Grafana folder permissions alone do not protect shared data sources; Business access must be genuinely isolated before inviting Adrien.

## Research acceptance on Testing

Local unpackaged desktops now enable Research diagnostics automatically **only against the exact Stage Testing Convex deployment**. The normal local `.env` must contain `VITE_CONVEX_URL=https://reliable-bullfrog-917.convex.cloud`; Electron and the renderer both load this URL. From `apps/user-application`:

```sh
pnpm run dev
```

Or from the repository root: `pnpm --filter stage-user-application dev`. After updating, restart the desktop so a new engine receives the launch configuration. To opt out for a launch, use `STAGE_TELEMETRY_ENABLED=0 pnpm run dev`. Packaged Testing builds still require explicit opt-in; packaged production stays disabled even with `STAGE_TELEMETRY_ENABLED=1`.

Sign in through that desktop's normal Stage Testing login and run Research on a Testing project. Never paste a session token into chat. The engine reuses the run's existing bearer only in the authenticated HTTPS header. It sends only bounded metadata to the fixed Testing intake; prompts, outputs, attachments, paths, tool labels and raw error text are never queued. Log ids make these diagnostics **not anonymous**. Production desktop builds forcibly disable the opt-in, and the engine independently checks the Testing channel and exact Convex deployment.

The queue holds at most 500 waiting events, flushes at 50 events or ten seconds from the first event, drops records older than 15 seconds, bounds a whole HTTP flush to five seconds and never retries. It has no idle timer. Each run generates at most one terminal observation; delivery is best-effort and may be lost offline or at capacity.

To stop diagnostics for an already-running Testing engine without cancelling Research:

```sh
curl --fail --silent --show-error --request POST http://127.0.0.1:48231/v1/telemetry/disable
```

This aborts the sender/request and purges its queue. It cannot re-enable collection; a new desktop launch is required. Persistent Settings opt-out across launches is **not implemented** and remains a release blocker. No production enablement is approved. Acceptance remains pending until a real run's count, duration and matching sanitized log are read back through Grafana.

Never add `OTEL_COLLECTOR_TOKEN`, Grafana passwords or API tokens to `VITE_*` variables. Live data, if added later, must flow through an authenticated server, never directly from the browser to private Prometheus/Loki or an admin-token Grafana proxy.
