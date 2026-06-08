# Figma Wireframe Export Plan

## Implementation Status

Implemented in the monorepo:

- Assets derives real cards and previews from the latest `wireframesArtifact`.
- Electron exposes an authenticated Figma-export engine command.
- Rust validates and compiles a selected screen into a typed `FigmaWritePlan`.
- Convex stores idempotent OAuth-bound export jobs.
- Hono exposes scoped plugin claim, complete, and fail endpoints.
- The Stage Exporter development plugin writes editable Figma auto-layout nodes.
- Successful exports update the source artifact with the created Figma URL.
- The same OAuth-bound job and plugin transport now supports editable FigJam flow-map exports.
- Assets now supports deterministic Code export and local Paper Desktop MCP export for the same wireframe source screens.
- Plugin claim heartbeat is implemented to keep long-running writes valid.

Still required before customer release:

- Deploy the Convex schema/functions.
- Publish or organization-distribute the Stage Exporter plugin.
- Replace the development plugin ID and confirm the production Convex site domain in its manifest.
- Run an end-to-end export against the production Figma OAuth app and published plugin.
- Run an end-to-end Paper export with Paper Desktop open; the local MCP is unavailable in CI.

## Goal

Allow every Stage user to export a generated wireframe from the Assets tab into a chosen Figma Design file as editable, native Figma layers.

The generated `wireframesArtifact` remains the source of truth. Assets only presents those generated screens and their export status.

## Architecture Decision

Use a hybrid export architecture:

- **Rust Stage Engine** owns export orchestration, artifact validation, deterministic compilation, retries, and error handling.
- **Convex** owns user identity, the existing Figma OAuth connection, durable export jobs, pairing-code hashes, and final destination status.
- A small **Stage Exporter Figma plugin** owns only the final canvas write because only code running inside Figma can call the Figma Plugin API.

The plugin must be JavaScript/TypeScript because Figma runs plugin code in its JavaScript sandbox. Rust cannot call `figma.createFrame()` directly. Rust should compile the Stage wireframe into a validated, Figma-neutral command plan; the plugin should execute that command plan with the Plugin API.

Figma OAuth alone cannot create or modify canvas nodes through the REST API. Figma's remote MCP can write native canvas content, but it is a separate authenticated MCP connection. The existing Stage Figma REST OAuth token does not automatically authenticate a user to `https://mcp.figma.com/mcp`. Remote write-to-canvas also remains a beta/usage-based capability with client and seat constraints. It should be implemented as an additional adapter, not silently substituted for the current OAuth-bound plugin transport.

## Ownership Boundaries

### Rust Stage Engine

- Add `/v1/exports/figma` endpoints behind the existing Electron-to-engine authenticated boundary.
- Load and validate the selected `wireframesArtifact` and `generatedScreen`.
- Verify through Convex that the Stage user has an active Figma OAuth connection.
- Compile the screen into a typed `FigmaWritePlan`.
- Create or join an idempotent export job.
- Generate a one-time pairing code and persist only its hash.
- Report job status to the renderer and handle retry/timeout behavior.

### Convex

- Keep the existing encrypted Figma OAuth token and connected Figma `accountId`.
- Store export jobs and the compiled write plan.
- Expose narrowly scoped plugin HTTP endpoints for claim, heartbeat, complete, and fail.
- Verify the one-time pairing code and require the plugin's Figma user ID to match the OAuth-connected `accountId`.
- Never return the Figma OAuth access token to the plugin.

### Stage Exporter Figma Plugin

- Run as TypeScript/JavaScript inside the open Figma Design file.
- Request the `currentuser` permission and send `figma.currentUser.id` when claiming a job.
- Use a Stage one-time pairing code to claim exactly one export job.
- Execute only the validated `FigmaWritePlan`.
- Return the created node IDs and completion status.
- Store no long-lived Stage or Figma credentials.

## Existing OAuth Connection

The current OAuth implementation already provides the required identity binding:

1. Stage completes Figma OAuth.
2. Convex calls Figma `/v1/me`.
3. Convex stores the returned Figma user ID in `nativeIntegrationConnections.accountId`.
4. When the plugin runs, it reads `figma.currentUser.id`.
5. Convex only allows the plugin to claim the export when:
   - the one-time pairing code is valid,
   - the job belongs to the connected Stage user,
   - `figma.currentUser.id` equals the stored OAuth `accountId`,
   - the job has not expired or already completed.

OAuth therefore connects the Stage account to the correct Figma identity. The plugin does not need a second OAuth flow.

## User Flow

1. The user generates wireframes in the Wireframes tab.
2. Assets shows each `generatedScreen` from the latest `wireframesArtifact`.
3. The user clicks **Export**, selects **Export in Figma**, and chooses or pastes a Figma Design file.
4. Electron sends the authenticated request to the Rust Stage Engine.
5. Rust validates and compiles the wireframe, then creates one export job for `(artifactId, screenId, destinationFileKey)`.
6. Stage opens Figma and shows a short-lived one-time pairing code.
7. The user runs the Stage Exporter plugin in the destination Figma file and enters the pairing code.
8. The plugin claims the job using the code and its `figma.currentUser.id`.
9. The plugin converts the write plan into native Figma nodes in the open file.
10. The plugin completes the job with the created node ID.
11. Stage constructs and stores the destination URL and shows an **Open in Figma** action.

## Implementation

### 1. Make Assets use real wireframes

- Derive Assets wireframe cards from the latest `wireframesArtifact.generatedScreens`.
- Reuse the existing wireframe preview renderer instead of placeholder thumbnails.
- Do not require a separate `assetsArtifact` to display generated wireframes.

### 2. Add the Rust export domain

Create `apps/stage-engine/src/exports/figma/` with:

- typed requests and responses
- `FigmaWritePlan` and command models
- a deterministic `WireframeGeneratedScreen -> FigmaWritePlan` compiler
- a Convex export-job repository
- an export service with idempotency, timeout, and retry handling
- `/v1/exports/figma` create and status routes

Electron remains the only caller of these local Rust endpoints and supplies the authenticated Stage access token.

### 3. Add durable export jobs

Add a dedicated `wireframeExportJobs` model, or extend `artifactDestinations` with:

- `screenId`
- `provider: "figma"`
- `destinationFileKey`
- `destinationNodeId`
- `status: "requested" | "claimed" | "completed" | "failed"`
- `claimTokenHash`, `claimExpiresAt`
- `attemptCount`, `errorMessage`
- timestamps and an idempotency key

Convex mutations must verify project ownership, Figma connection, artifact ownership, and screen existence. A repeated click must return the existing active or completed job.

Add public plugin endpoints with a very small attack surface:

- `POST /figma-export/claim`
- `POST /figma-export/heartbeat`
- `POST /figma-export/complete`
- `POST /figma-export/fail`

These endpoints accept a one-time or short-lived scoped token, never the user's Stage session or Figma OAuth token.

### 4. Build the Stage Exporter Figma plugin

Create a TypeScript Figma plugin with:

- a minimal pairing/job-selection UI
- `permissions: ["currentuser"]`
- network access restricted to the Stage export API domain
- one-time Stage pairing and short-lived job sessions
- job claim, heartbeat, complete, and fail calls
- a deterministic executor from `FigmaWritePlan` to Figma Plugin API nodes
- auto-layout frames, text styles, spacing, fills, borders, and reusable block renderers
- rollback or a clearly named failed frame when a write fails partway through

The plugin must only claim jobs owned by the OAuth-connected Figma user. A public/community plugin cannot reliably read the current file key, so the first version must clearly instruct the user to open the chosen destination file before running the plugin. The plugin should show the expected and current document names before writing.

### 5. Connect the Assets export dialog

- Replace fixture connection state with the real Figma OAuth connection state.
- Create the export job from the selected wireframe card.
- Disable duplicate submissions while an export is active.
- Show waiting-for-plugin, exporting, completed, and failed states.
- Persist and display the returned Figma URL.

## Delivery Slices

1. **Assets correctness:** real generated wireframes appear in Assets with real previews.
2. **Rust export domain:** typed write-plan compiler and authenticated local export endpoints.
3. **Export job backend:** secure, idempotent Convex job lifecycle and OAuth-bound pairing.
4. **Plugin MVP:** export one wireframe screen into the open Figma file as editable nodes.
5. **Product integration:** export dialog, Figma file targeting, progress, retry, and Open in Figma.
6. **Hardening:** permissions, expired claims, wrong Figma user, duplicate clicks, partial failures, telemetry, and end-to-end tests.

## Acceptance Criteria

- A connected Stage user can export any generated wireframe screen into a Figma Design file they can edit.
- The result consists of editable native Figma nodes, not a screenshot.
- Rust owns the export workflow and the Figma plugin owns only the canvas write.
- Export works without an external MCP server.
- Duplicate clicks do not create duplicate frames.
- Failed or interrupted exports can be retried safely.
- Stage stores and displays the final Figma node URL.

## Future Option

Evaluate Figma remote MCP as an additional export adapter:

- implement a standards-compliant MCP client in Rust
- add a separate Figma MCP authorization/connection state
- discover and validate write-to-canvas tools at runtime
- keep the existing REST OAuth connection for identity and non-MCP API operations
- fall back to the Stage Exporter plugin when MCP authorization, seat access, or tool availability is missing

The plugin remains the controlled default until the remote MCP authentication and production guarantees can be embedded reliably for every Stage customer.
