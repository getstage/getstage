# Stage observability infrastructure

STA-31 phase-1 foundation. **Not deployed.** Prometheus and Loki must stay private. Grafana requires login; the Collector requires a bearer token. The local monitoring app is a rollout/audit portal, not a telemetry backend.

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

Current pinned images: Collector `0.162.0`, Prometheus `v3.15.0`, Loki `3.7.8`, Grafana `13.2.3`. Recheck release advisories before deployment. Native Collector/Prometheus/Loki configs were validated with these versions; container startup and Grafana provisioning need runtime verification.

## Railway deployment gate

**Stop until Werner confirms the Stage workspace, EU region and budget.** The read-only account preflight found the personal `My Projects` workspace, not Stage. No account switch, project creation, secrets or DNS changes were made.

Create `stage-observability` in the approved workspace, using an explicitly selected **testing** environment. One replica per stateful service. Build from repo root with the Dockerfile paths below; do not set an app subdirectory as the build context because the Dockerfiles copy `infra/`.

| Service | Dockerfile | Volume | Variables / network |
|---|---|---|---|
| otel-collector | `infra/otel/Dockerfile` | none | `PORT=4318`, `OTEL_COLLECTOR_TOKEN`, `PROMETHEUS_REMOTE_WRITE_URL=http://prometheus.railway.internal:9090/api/v1/write`, `LOKI_OTLP_URL=http://loki.railway.internal:3100/otlp`; public **testing** HTTPS domain |
| prometheus | `infra/prometheus/Dockerfile` | `/prometheus` | private only, port 9090; no public domain |
| loki | `infra/loki/Dockerfile` | `/loki` | private only, port 3100; no public domain |
| grafana | `infra/grafana/Dockerfile` | `/var/lib/grafana` | `PORT=3000`, `GF_SECURITY_ADMIN_USER=werner`, `GF_SECURITY_ADMIN_PASSWORD`, `GF_SERVER_ROOT_URL=https://<approved-testing-domain>/`, `GF_SECURITY_COOKIE_SECURE=true`, `GF_SECURITY_COOKIE_SAMESITE=strict`, `PROMETHEUS_URL=http://prometheus.railway.internal:9090`, `LOKI_URL=http://loki.railway.internal:3100`; public login-protected **testing** domain |

Configure `RAILWAY_DOCKERFILE_PATH` per service when building the monorepo. Confirm private DNS names and actual IPv4/IPv6 reachability in that environment; do not assume names or expose backends to bypass connectivity failures. Enter secrets in Railway variables, and later in **testing** Worker secrets. Never set production secrets during this phase.

The Collector health endpoint is internal on port 13133; do not expose it or mistake it for the public OTLP receiver on 4318. Check Prometheus `/-/ready`, Loki `/ready` and Grafana `/api/health` internally. Configure Railway health checks against the correct service port; OTLP ingest acceptance is checked by the smoke script.

## Provisioning and privacy

- Data sources and the initial Health dashboard are provisioned from the repo, with UI editing disabled.
- Only `source`, `channel`, `event`, `level` become Loki stream labels. The future Worker must group log resources accordingly. Ids stay in the JSON body, never metric/resource labels.
- Metric resource-to-label conversion is disabled. The Collector includes `deltatocumulative`; phase 2 must prove stateless/concurrent Worker metrics and histograms are correct before real collection.
- Empty application panels are **No data**, not green/healthy. Only the separately named smoke metric is synthetic.
- The Business dashboard and remaining dashboards/alerts are not implemented in phase 1.
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
| Container startup, bearer rejection, backend ingest, Grafana login/health | Pending; Docker/approved Stage Railway workspace required |
| Railway volume persistence, retention behavior, public/private routing | Pending; testing deployment required |

Phase 1 is **not accepted** until all live checks pass. Record evidence in `apps/monitoring/src/data/rollout.json`, then report for review before phase 2.
