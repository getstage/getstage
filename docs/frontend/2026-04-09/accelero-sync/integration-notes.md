# Integration Notes

These notes are here so frontend design can move forward without waiting for every backend decision.

## Stitch

Frontend can design now:
- connected state
- not connected state
- syncing state
- sync failed state
- preview grid state

Frontend should not assume now:
- final sync transport
- final user key flow details
- final preview import lifecycle

## Figma

Frontend can design now:
- connected badge
- linked file list
- sync action
- extract/design-system action

Frontend should not assume now:
- final OAuth flow
- final extraction pipeline
- final file metadata contract

## Notion

Frontend can design now:
- connect state
- empty state
- synced documents list
- disconnected/error state

Frontend should not assume now:
- final page/database sync model
- final object hierarchy

## Research / Browser Rendering

Frontend can design now:
- prompt/input surface
- loading state
- result cards
- sources and snapshots area
- failed run state

Frontend should not assume now:
- final browser automation stack
- final rendering backend
- final cloud job orchestration

## Cloud / Cloth / Automation

Current status:
- product direction still unclear

Frontend rule:
- keep surfaces provider-neutral where possible
- prefer generic wording like:
  - connect
  - syncing
  - configured
  - unavailable

## MCP

Frontend can mention it as a future access layer.

Frontend should not make MCP a dependency for the main product design pass.

Reason:
- MCP is an integration/access mechanism
- it is not the first thing that should block the logged-in UI quality
