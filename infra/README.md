# Stage observability infrastructure

STA-31 phase-1 foundation. **Deployed to Railway testing on 2026-10-06** in the `stage-observability` project under Adrien Ninet's Pro workspace. All four services and three volumes currently run in EU West (Amsterdam); Railway publishes the same usage rates across regions, and a region change for the attached volumes remains separate work. Prometheus and Loki are private. Grafana requires login; the Collector requires a bearer token. The protected Cloudflare Testing monitoring app (and its local preview) is a rollout/audit portal, not a telemetry backend.

## Local stack

Requires Docker with Compose. Docker is not installed on the implementation Mac, so Compose runtime and the end-to-end check remain pending.

```sh
cp infra/local.env.example infra/.env
# Edit infra/.env locally: set two independently generated secrets.
# Generate each with openssl rand -hex 32. Never commit or share the output.
docker compose --env-file infra/.env -f infra/compose.yaml config --quiet
docker compose --env-file infra/.env -f infra/compose.yaml up -d
node --env-file=infra/.env infra/scripts/smoke.mjs
```

- Grafana: `http://localhost:3001`, user `werner`, password from `infra/.env`.
- Authenticated OTLP HTTP: `http://localhost:4318/v1/metrics` and `/v1/logs`.
- Prometheus/Loki have **no published ports**. Grafana queries them over the Compose network.
- Named volumes preserve Prometheus (90 days), Loki (30 days), and Grafana state. Do not run `down -v` unless intentionally deleting operational history.
- `smoke.mjs` checks missing/wrong credentials, sends a synthetic metric/log, then queries both backends through Grafana and verifies the dashboard. It has timeouts and refuses production/unnamed remote hosts. It requires Node 22+.
- For remote testing use explicit `OTEL_COLLECTOR_URL` and `GRAFANA_URL` with `testing` in the hostname, HTTPS, and local environment credentials. Never put the collector token in browser or desktop code.

Current pinned images: Collector `0.162.0`, Prometheus `v3.15.0`, Loki `3.7.8`, Grafana `13.2.3`. Native Collector/Prometheus/Loki configs were validated with these versions; Railway container startup and Grafana provisioning passed in testing.

## Railway testing deployment

The testing project is `7f561e4e-2133-43cd-9ffd-60806aefc37a`, environment `b526c305-9fd8-4a29-b12f-071906dcb153`. Werner identified Adrien Ninet's Pro workspace as the Stage deployment target. No production environment, Worker secrets, application telemetry or custom DNS was deployed.

- Research dashboard: https://grafana-testing-038e.up.railway.app/d/stage-research/stage-c2b7-research (admin user `werner`; password stored in Railway variables). The Grafana root URL now opens this dashboard by default.
- Authenticated Collector: `https://otel-collector-testing-c9d7.up.railway.app`.
- Prometheus and Loki have no public domains. Their Railway private names are `prometheus.railway.internal` and `loki.railway.internal`.
- The first CLI upload flattened `infra/` and failed to find the Dockerfiles. The successful upload used a minimal archive with `infra/` at its root. Stateful services use `RAILWAY_RUN_UID=0` for Railway volume permissions.

The deployed stack uses one replica per stateful service. Build from repo root with the Dockerfile paths below; do not set an app subdirectory as the build context because the Dockerfiles copy `infra/`.

| Service | Dockerfile | Volume | Variables / network |
|---|---|---|---|
| otel-collector | `infra/otel/Dockerfile` | none | `PORT=4318`, `OTEL_COLLECTOR_TOKEN`, `PROMETHEUS_REMOTE_WRITE_URL=http://prometheus.railway.internal:9090/api/v1/write`, `LOKI_OTLP_URL=http://loki.railway.internal:3100/otlp`; public **testing** HTTPS domain |
| prometheus | `infra/prometheus/Dockerfile` | `/prometheus` | private only, port 9090; no public domain |
| loki | `infra/loki/Dockerfile` | `/loki` | private only, port 3100; no public domain |
| grafana | `infra/grafana/Dockerfile` | `/var/lib/grafana` | `PORT=3000`, `GF_SECURITY_ADMIN_USER=werner`, `GF_SECURITY_ADMIN_PASSWORD`, `GF_SERVER_ROOT_URL=https://<approved-testing-domain>/`, `GF_SECURITY_COOKIE_SECURE=true`, `GF_SECURITY_COOKIE_SAMESITE=strict`, `PROMETHEUS_URL=http://prometheus.railway.internal:9090`, `LOKI_URL=http://loki.railway.internal:3100`; public login-protected **testing** domain |

Configure `RAILWAY_DOCKERFILE_PATH` per service when building the monorepo. Confirm private DNS names and actual IPv4/IPv6 reachability in that environment; do not assume names or expose backends to bypass connectivity failures. Enter secrets in Railway variables, and later in **testing** Worker secrets. Never set production secrets during this phase.

The Collector health endpoint is internal on port 13133; do not expose it or mistake it for the public OTLP receiver on 4318. Check Prometheus `/-/ready`, Loki `/ready` and Grafana `/api/health` internally. Configure Railway health checks against the correct service port; OTLP ingest acceptance is checked by the smoke script.

## Provisioning and privacy

- Data sources, the initial Health scaffold and the Research dashboard are provisioned from the repo, with UI editing disabled. `infra/grafana/dashboards/research.json` uses persisted Loki engine events for selected-window run counts, success rate, duration, failures, run/step tables and logs; inactive push metrics cannot hide a completed run. It defaults to Testing / last 24 hours and supports Run ID drill-down. No traffic shows No data, never synthetic health.
- Only `source`, `channel`, `event`, `level` become Loki stream labels. The future Worker must group log resources accordingly. Ids stay in the JSON body, never metric/resource labels.
- Metric resource-to-label conversion is disabled. The Collector includes `deltatocumulative`; phase 2 must prove stateless/concurrent Worker metrics and histograms are correct before real collection.
- Empty application panels are **No data**, not green/healthy. Only the separately named smoke metric is synthetic.
- The Business dashboard, other workflow dashboards and alert delivery remain unimplemented. Research dashboard deployment `d8f533da-fdcf-4333-b4ee-0886bc8e65d2` reached SUCCESS on Railway Testing on 2026-10-09. Provisioning, both data-source health checks and browser checks passed: one real run, 100% success, 212.580s, seven successful steps, Run ID drill-down, empty Production state and the default home page. No production deployment or access-policy change.
- **Do not invite Adrien as an org-1 Viewer yet.** Folder visibility is not a complete Grafana data-source boundary. Resolve audit `MON-018` using an isolated Business organization/data source or another reviewed boundary first.
- Grafana public exposure requires a strong admin password and HTTPS. The standalone `apps/monitoring` portal has no auth and must remain local until separately protected.

## Acceptance evidence

| Check | Current evidence |
|---|---|
| Collector native config validation | Passed, `otelcol-contrib 0.162.0 validate` |
| Prometheus native config validation | Passed, `promtool 3.15.0 check config` |
| Loki native config validation | Passed, `loki 3.7.8 -verify-config=true` |
| Native loopback Collector → Prometheus/Loki | Passed with temporary local-only ports/storage: missing/wrong bearer → 401; authenticated synthetic metric queried in Prometheus and log in Loki. Does not verify Grafana or container networking. |
| Structural privacy/network/provisioning tests | `pnpm monitoring:test` |
| Container startup, bearer rejection, backend ingest, Grafana data-source health/dashboard | Passed on Railway testing 2026-10-06: all four latest deployments `SUCCESS`; missing/wrong bearer → 401; authenticated synthetic metric and log visible through Grafana in Prometheus/Loki; Health dashboard provisioned. |
| Railway public/private routing | Passed: only Collector and Grafana have public Railway domains; Prometheus/Loki are private. |
| Railway volume persistence and retention behavior | Prometheus mounted its volume and replayed its WAL after redeploy; longer-term retention remains unverified. |

Phase 1 stack deployment is verified on Testing. Custom `getstage.co` DNS, long-term retention and production rollout remain open. Phase 2 intake is deployed in a separate authenticated telemetry-only Cloudflare Worker. Its 12 local tests and isolated synthetic local-workerd → Railway metric/log bridge pass; deployed positive auth still needs a real Stage Testing session. Phase 3 has a local Testing-only Research/section sender and timed steps, with nine telemetry tests, all 196 engine tests, strict Clippy, desktop typecheck and six Rust/TS fixtures passing. It defaults on for unpackaged local desktops targeting the exact Testing backend, honors `STAGE_TELEMETRY_ENABLED=0`, and has an immediate engine stop endpoint. Packaged Testing remains opt-in and packaged production stays disabled; persistent Settings opt-out remains a release blocker. A real Research run, remaining senders and alerts are unverified. See `apps/monitoring/README.md` for Testing login/run instructions. Production and the shared website bundle are untouched.
