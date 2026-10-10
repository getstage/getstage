# Stage — Architecture (1 page)

> **Living document.** Change only when boundaries move.

---

## Monorepo map

```txt
apps/user-application   Desktop product (Electron + React + Vite)
apps/stage-engine       Rust local engine (AI runs, files, exports orchestration)
apps/web-application    Web (auth, billing, marketing, desktop handoff)
apps/monitoring         Internal STA-31 rollout/audit portal (protected Cloudflare testing + local preview; not Grafana)
packages/data-ops       Convex schema, functions, Zod contracts — see `packages/data-ops/convex/ARCHITECTURE.md`
```

---

## Runtime flows

### Cloud data (projects, tasks, artifacts)

```txt
Renderer → Convex client → Convex deployment → packages/data-ops
```

### Local / AI (chat, research, wireframes, exports)

```txt
Renderer → preload IPC → Electron main → stage-engine → provider CLIs / filesystem
```

### Auth & billing

```txt
Desktop → browser → web-application → deep link / callback → Electron main
```

---

## Branches (team convention)

| Branch | Role |
|--------|------|
| **`work`** | **Primary target branch** — PRs merge here; daily desktop dev |
| `monorepo` | Also OK — integration / iMac merge when needed |
| `main` | Legacy default on GitHub — not the active Stage desktop line |

---

## Observability (STA-31, foundation only)

`apps/monitoring` tracks rollout and implementation audit. Its Cloudflare testing frontend gates all assets through the approved `werner` Grafana testing admin login, with rate limiting, no-store and CSP; local preview remains available. Versioned stack configs are in `infra/`. The Railway Testing stack and telemetry-only Cloudflare intake are deployed. Local Research/section instrumentation now sends bounded metadata directly from Rust to the fixed Testing Worker using the run's existing bearer; Electron supplies version/OS/channel launch context and rejects production opt-in. Collection defaults on only for unpackaged local desktops targeting the exact Testing backend; `STAGE_TELEMETRY_ENABLED=0` opts out. Packaged Testing remains opt-in and packaged production stays disabled. Engine runtime disable aborts exports without cancelling runs; persistent desktop Settings opt-out and other workflow/desktop/cloud senders remain pending. Two real Research runs and the provisioned Research dashboard are verified on Testing. Runtime flow: Engine/Desktop → authenticated Worker → Collector → private Prometheus/Loki → Grafana. The portal does not receive telemetry or hold service credentials.

## Security baseline (desktop)

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`
- Renderer never calls Node, filesystem, or providers directly

---

## Deep docs (reference only)

- Desktop perf: `apps/user-application/docs/AI/desktop/DESKTOP_PERFORMANCE.md`
- Desktop public bundle: `apps/user-application/docs/AI/desktop/DESKTOP_PUBLIC_BUNDLE_INVENTORY.md`

**Do not read those for daily status — use `PROJECT_STATUS.md`.**
