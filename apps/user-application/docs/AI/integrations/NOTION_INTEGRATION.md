# Notion Integration

Last updated: 2026-06-07

## Decision

Stage uses the Notion OAuth API integration for product exports. It does not require a local Notion MCP server.

This keeps Notion export available for every authenticated Stage user, including users without a local Notion desktop process. Convex owns the encrypted OAuth token, export API calls, stored default parent page, and durable destination records.

## User flow

1. The user connects Notion from onboarding or Settings.
2. Electron supplies the approved desktop OAuth return URL.
3. Convex starts Notion OAuth and stores the encrypted token after callback.
4. On the first Research or Strategy export, the user selects a parent Notion page.
5. Stage stores that parent page on the connection for later exports.
6. A successful export creates or updates an `artifactDestinations` record with the final Notion URL.

## Ownership

| Layer | Responsibility |
|---|---|
| React | Connection UI, parent-page prompt, export status, open final URL |
| Electron | Desktop OAuth return URL and callback handoff |
| Convex | OAuth, encrypted credentials, Notion API writes, destination persistence |
| Rust Stage Engine | No Notion responsibility in V1 |

## Supported exports

- Research artifact to a native Notion page
- Strategy artifact to a native Notion page

Wireframes remain delivery assets and export to Code, Paper, Figma Design, or FigJam rather than Notion.

## Security and reliability

- Notion access tokens never enter the renderer or Rust sidecar.
- Every export verifies artifact ownership and project access.
- Successful exports are persisted as durable artifact destinations.
- Repeated exports update the destination record for that artifact/action.
- Project deletion removes its destination records.

## Release checks

- Connect and disconnect Notion from Settings.
- Connect Notion during onboarding and confirm Settings reflects the same connection.
- Export Research, reload, and confirm the destination remains recorded.
- Export Strategy using the stored parent page.
- Verify an unauthorized artifact cannot be exported.
