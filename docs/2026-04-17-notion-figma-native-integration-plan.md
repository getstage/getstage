# Notion + Figma Native Integration Plan

Date: 17-april

## Goal

Replace the current Claude-mediated Notion/Figma export flow with real public Stage integrations.

Target state:
- Stage connects directly to Notion
- Stage connects directly to Figma
- Stage exports directly from Stage
- Claude remains optional for generation, not required for publishing

## Why

The current Claude flow is not reliable enough for product use.

Current limitation:
- Stage opens Claude and passes a prompt
- Claude may or may not complete the action inside Claude's UI
- Stage does not control Notion/Figma export from its own product

Conclusion:
- native third-party integrations are required

## V1 Scope

We build Notion and Figma together in the same release, but keep the first version tight and public from day one.

### Notion V1

- Connect Notion in Settings
- Store the connected account/workspace
- Let the user choose a destination page or database
- Export research outputs to Notion
- Export strategy outputs to Notion
- Export generated outputs to Notion
- Save returned Notion URL back into Stage
- Add per-project webhook sync so changes in Notion can be reflected back into the matching Stage project
- Show export status and retry state in Stage

### Figma V1

- Connect Figma in Settings
- Store the connected account/team metadata
- Let the user choose a destination file or handoff target
- Export generated outputs into a deterministic Figma handoff flow
- Save returned Figma URL back into Stage
- Support Figma webhook subscriptions for file/project change tracking where this improves sync and review visibility
- Show export status and retry state in Stage

Important:
- Figma V1 should focus on a real native export/handoff flow
- actual deep design editing or true design generation inside Figma is a separate agent/plugin layer beyond OAuth alone

## Product Rules

- Claude is not the publisher
- Stage is the publisher
- Claude can still be used for research/generation
- Notion/Figma publishing must succeed without needing Claude's UI

## Backend Plan

### 1. Add native integration storage

Add tables or equivalent models for:
- user integrations
- integration accounts
- integration destinations
- export jobs

Each integration record should store:
- provider
- user id
- workspace/account metadata
- scopes
- access token
- refresh token if supported
- connected at
- last synced at
- last error
- status

### 2. Implement OAuth flows

Add native OAuth routes for:
- Notion connect
- Notion callback
- Figma connect
- Figma callback

### 3. Add token lifecycle handling

- secure token storage
- token refresh if provider supports it
- reconnect flow
- revoked token handling

### 4. Add export execution layer

Add provider-specific export actions:
- export artifact to Notion
- export artifact to Figma

This should update export state directly in Stage:
- requested
- in progress
- completed
- failed

### 5. Keep shared export tracking

Reuse or evolve the current artifact destination model so it becomes the shared export ledger.

The system should record:
- provider
- action
- destination label
- destination URL
- status
- error message
- timestamps

### 6. Webhook layer

Required in V1 where it improves system parity:
- Notion webhook handling for per-project content sync back into Stage
- Figma webhook handling for file/project change events where relevant to review state or handoff visibility

## Frontend Plan

### Settings

Replace the current Claude-style export messaging with real integration controls:
- Connect Notion
- Connect Figma
- account/workspace info
- reconnect
- disconnect
- destination selection
- error state

### Project UI

Replace:
- Add to Notion via Claude
- Open in Figma via Claude

With:
- Export to Notion
- Send to Figma

### Per-artifact state

Each artifact should show:
- export status
- last exported destination
- last error
- retry action

### Claude UI cleanup

Claude should be described as:
- generation workflow
- optional agent workflow

Claude should no longer be presented as the required publishing mechanism for Notion/Figma.

## Rollout Plan

### Phase 1

Validate end-to-end:
- connect
- export
- retry
- disconnect
- reconnect
- revoked token behavior
- Notion webhook subscription, verification, signature validation, and project-level sync

### Phase 2

Prepare public review:
- Notion public listing
- Figma public app approval

## Definition of Done

The work is done when:
- a user can connect Notion in Stage
- a user can connect Figma in Stage
- Stage can export without relying on Claude UI
- Stage stores returned destination URLs
- Notion webhook changes can be mapped back into the matching Stage project
- export success/failure is visible inside Stage
- retry works
- disconnect/reconnect works

## Risks

- Figma V1 scope can grow too fast if we try to do deep design writing immediately
- public review feedback may force scope tightening, especially on Figma
- token refresh/revocation handling must be robust
- current Claude-based wording in the UI may confuse users until replaced

## Recommended Build Order

1. OAuth foundation for both providers
2. Integration storage and token handling
3. Native Notion export
4. Notion webhook sync
5. Native Figma export/handoff
6. Settings and project UI cleanup
7. Retry/error state polish
8. Public review preparation

## Open Decisions

These still need confirmation before implementation:

1. For Figma V1, is native handoff/export enough, or do we want real design creation/editing immediately?
2. Does Claude stay generation-only once native publishing is live?
