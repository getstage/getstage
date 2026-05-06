# Stage Data Ops

Shared Stage domain and contract package.

This package is the clean TypeScript layer between:

- Convex project data in `apps/web-application/convex`
- Desktop UI and Electron code in `apps/user-application`
- Rust serde mirrors in `apps/data-service`

Current scope:

- Zod contracts for engine commands and events.
- Zod domain model for selected project context.
- No full Convex backend migration yet.

Later scope:

- Move selected Convex domain modules here after package boundaries are proven.
- Add generated or shared schema tooling only after the contracts stabilize.
