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

#### Wireframe provider context

```txt
Convex/project inputs
        ↓
stage-engine materializes <system-temp>/stage-wireframes-workspaces/<run-id>-<nonce>.ready
        ↓
hashed context manifest + exact per-call required-file manifest
        ↓
Claude/Codex read the isolated workspace (provider-specific permissions, same semantic contract)
        ↓
structured read audit → TSX/render/plan gates → per-screen checkpoint
```

Stage owns all workspace writes. Providers receive read-only access only to selected, size-bounded files; they never receive the repository, user home directory, secrets, or unrelated project data. Each run uses a unique nonce-named workspace, atomically renames `.building` to `.ready`, records an expiring Stage marker, and removes the directory through a `.deleting` tombstone on every Rust scope exit; creation also prunes only expired Stage-marked directories. Provider workspaces are never persisted to Convex/R2. Large project references are listed as `onDemand` instead of forced into every screen call. Sanitized debug evidence is separate and TTL-bound; accepted screens are checkpointed after response, plan, and renderer gates.

Catalog ingest is implemented: external registries → exact R2 source bundles + minimal Convex catalog records. Mandatory Hi-Fi retrieval validates R2 source, stores one Qwen3 vector per current component revision in an application-owned table, searches one native Convex vector index with authenticated library/runtime filters (up to 12 hits per screen), and lets Rust materialize only selected exact bundles into the sealed provider workspace. The local renderer writes those files into the batch and maps `@/` onto them so the selected Nebius model can import catalog paths instead of inlining. Nebius receives requested screens in sequential generation batches of at most 5, each with shared Stage design context; compile validation and repair remain per screen. Hi-Fi fails closed if verified source is unavailable. Generation never fetches public registries at run time and no longer uses static `@stage/*` component packs. See `docs/WIREFRAMES_LIBRARY_INGEST.md` and `docs/RAG/WIREFRAMES_AGENTIC_RAG_PLAN_AUG26.md`.

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
