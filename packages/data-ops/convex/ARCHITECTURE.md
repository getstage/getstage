# Convex backend architecture (`packages/data-ops/convex`)

> **Living document.** All new Convex code must follow these layers.

## Layers

| Layer | Path | Responsibility |
|-------|------|----------------|
| **Transport** | `convex/*.ts`, `convex/integrations/*.ts` | Register `query` / `mutation` / `action` / `httpAction` only. Max ~300 lines per file (`schema.ts` excepted). |
| **Handlers** | `convex/lib/<feature>/handlers/` | `*Args` validators + `*Handler(ctx, args)` with DB and side effects. |
| **Domain** | `convex/lib/<feature>/domain/`, `convex/domain/` | Pure transforms, read-model builders, no Convex exports. |
| **Models** | `convex/models/` | Shared TypeScript types and small validators for handlers (no `ctx`). |
| **Helpers** | `convex/helpers/` | Pure utilities: env, time, CSV parse, OAuth PKCE, external API formatters (no `ctx`, no DB). |
| **Contracts** | `packages/data-ops/src/contracts/` | Cross-app Zod/TS contracts (research, strategy). Import from handlers; do not duplicate. |

## Reference implementations

- **Gold standard:** [`projectAi.ts`](projectAi.ts) + [`lib/projectAi/handlers/`](lib/projectAi/handlers/) + [`lib/projectAi/domain/`](lib/projectAi/domain/)
- **Rust analogue:** `apps/stage-engine/src/` — `models/`, `helpers/`, `service/`, `repository/`, thin `server/`

## Rules

1. **API stability** — Never rename transport module paths (e.g. keep `integrations/contentPlatforms.ts`; clients use `api.integrations.contentPlatforms.*`).
2. **No `as any`** on `internal` API references.
3. **Resolve asset URLs at read boundaries** — R2 keys → HTTPS in handlers before returning to clients.
4. **Public functions** — `args` + prefer `returns` validators (see `desktop.ts`).
5. **Generated only in `_generated/`** — Do not commit `schema.js` / `schema.d.ts`; source of truth is `schema.ts`.
6. **Handler files may exceed 300 lines** — e.g. `lib/integrations/stripeConnect/handlers/`; split further when editing, but transport files stay thin.

## REST vs Convex models

- `convex/api/models.ts` — Zod schemas for Hono REST routes.
- `convex/models/` — Convex-internal types shared across handlers.
