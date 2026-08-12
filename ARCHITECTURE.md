# Stage — Architecture (1 page)

> **Living document.** Change only when boundaries move.

---

## Monorepo map

```txt
apps/user-application   Desktop product (Electron + React + Vite)
apps/stage-engine       Rust local engine (AI runs, files, exports orchestration)
apps/web-application    Web (auth, billing, marketing, desktop handoff)
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

#### Wireframes retrieval (concept — not shipped)

Target cutover: [`docs/WIREFRAMES_RETRIEVAL_CONCEPT.md`](docs/WIREFRAMES_RETRIEVAL_CONCEPT.md). Keep the sealed run workspace as isolation. Stop materializing full libraries into it. n8n ingests complete upstream source into R2 + Convex; the provider RAG-searches Convex inside hard filters; only retrieved bundles land in the workspace.

```txt
n8n ingest → R2 blobs + Convex index (verified gate via Stage)
        ↓
generate: filter Convex → provider RAG search → fetch hit bundles
        ↓
thin workspace (brief + retrieved source) → typecheck / browser → save
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

## Security baseline (desktop)

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`
- Renderer never calls Node, filesystem, or providers directly

---

## Deep docs (reference only)

- Desktop perf: `apps/user-application/docs/AI/desktop/DESKTOP_PERFORMANCE.md`
- Desktop public bundle: `apps/user-application/docs/AI/desktop/DESKTOP_PUBLIC_BUNDLE_INVENTORY.md`

**Do not read those for daily status — use `PROJECT_STATUS.md`.**
