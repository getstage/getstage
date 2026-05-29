# Stage Data Ops

Shared Stage domain and contract package.

This package is the clean TypeScript layer between:

- Convex project data in `packages/data-ops/convex`
- Desktop UI and Electron code in `apps/user-application`
- Rust serde mirrors in `apps/stage-engine`

Current scope:

- Zod contracts for engine commands and events.
- Zod domain model for selected project context.
- Convex schema, functions, generated API, and data model types.
- Shared upload validation and demo-auth helpers used by app and Convex code.
- Public package exports for app access:
  - `@stage/data-ops/convex/api`
  - `@stage/data-ops/convex/data-model`
  - `@stage/data-ops/shared/demo-auth`
  - `@stage/data-ops/shared/upload-rules`

Current rule:

- Apps may import Convex generated API/types from `@stage/data-ops`.
- Apps must not import through another app folder.
