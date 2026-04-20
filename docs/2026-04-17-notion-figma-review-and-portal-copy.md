# Notion + Figma Review And Portal Copy

Date: 17-april

## Purpose

This document is the copy-paste setup guide for:
- partner handoff in the client portal
- Figma public app review
- Notion integration setup

It is written to match the current Stage setup as closely as possible.

## Current status

What can be configured now:
- Notion OAuth app
- Figma OAuth app
- testing and production callback URLs
- Stage reviewer login flow
- Figma scope explanations

What is planned next:
- native Stage export actions from project tabs
- Notion webhook sync per project
- deeper Figma generate/write flow beyond simple OAuth connect and handoff

## Shared URLs

### Stage auth entry

- Testing auth URL: `https://testing.getstage.co/auth`
- Production auth URL: `https://getstage.co/auth`

### Redirect URLs

#### Notion

- `https://testing.getstage.co/integrations/notion/callback`
- `https://getstage.co/integrations/notion/callback`

#### Figma

- `https://testing.getstage.co/integrations/figma/callback`
- `https://getstage.co/integrations/figma/callback`

## Figma setup

### Recommended Figma scopes for V1

Enable these scopes:
- `current_user:read`
- `file_comments:read`
- `file_comments:write`
- `file_content:read`
- `file_metadata:read`
- `file_versions:read`
- `library_assets:read`
- `library_content:read`
- `file_dev_resources:read`
- `file_dev_resources:write`
- `projects:read`
- `webhooks:read`
- `webhooks:write`

Leave these off for now unless they become explicitly required:
- `file_code_connect:write`
- `file_variables:read`
- `file_variables:write`
- `library_analytics:read`
- `team_library_content:read`

Reason:
- the enabled set is enough for account connection, file reading, review comments, project discovery, dev resource linking, and webhook-based sync
- the disabled set would widen review scope without helping the current V1

### Figma review copy for each scope

Use the following text in the Figma scope review form.

#### `current_user:read`

Stage uses this scope to identify the connected Figma account and show the correct connected user inside Stage settings.

#### `file_comments:read`

Stage uses this scope to read file comments so review activity in Figma can be reflected in the matching Stage project.

#### `file_comments:write`

Stage uses this scope to post or manage review comments tied to project outputs and approval workflows.

#### `file_content:read`

Stage uses this scope to read file structure and file contents so generated outputs and linked deliverables can be mapped to the right Figma file context.

#### `file_metadata:read`

Stage uses this scope to read file metadata such as file identity, ownership context, and timestamps for linking and sync.

#### `file_versions:read`

Stage uses this scope to read version history so Stage can track when reviewed or exported design files have changed.

#### `library_assets:read`

Stage uses this scope to read published component and style asset data when exported work needs design system context.

#### `library_content:read`

Stage uses this scope to read published component and style content from source files so Stage can align generated deliverables with existing system patterns.

#### `file_dev_resources:read`

Stage uses this scope to read Dev Mode resources attached to Figma files so linked implementation resources can stay visible in Stage.

#### `file_dev_resources:write`

Stage uses this scope to write Dev Mode resources back into Figma so Stage project records and implementation links stay connected in both systems.

#### `projects:read`

Stage uses this scope to list available projects and files so users can choose the correct Figma destination during setup and export flows.

#### `webhooks:read`

Stage uses this scope to read webhook subscriptions and verify that the correct sync subscriptions are active for the connected Figma context.

#### `webhooks:write`

Stage uses this scope to create and manage webhook subscriptions so important Figma changes can sync back into the matching Stage project.

### Figma testing instructions for app review

Paste this in the main reviewer instructions field:

1. Open `https://testing.getstage.co/auth`
2. On the Stage auth screen, click `Continue with demo`
3. No password is required for the demo path
4. Once inside Stage, open `Settings`
5. Open `Integrations`
6. Select `Figma`
7. Click `Connect`
8. Approve the Figma OAuth request
9. Return to Stage and confirm the Figma integration shows as connected
10. If needed, disconnect and reconnect once to verify the OAuth flow is stable

If the reviewer lands on an email-first screen, they should still use the `Continue with demo` option at the bottom. The demo path does not require a password.

### Figma testing form values

If Figma asks for a start link:
- `https://testing.getstage.co/auth`

If Figma asks whether an account is needed:
- choose `Create a free account (or no account needed)`

Reason:
- reviewers can access the demo environment through the Stage demo flow
- we do not require a password-based test account for the review path

### Figma webhook note

For V1 we want Figma webhook support so Stage can track project or file changes that matter to review visibility and linked handoff state.

Important:
- webhook sync is part of the implementation plan
- the OAuth review can still describe webhook usage now
- only add the final production webhook subscription once the Stage webhook handler is live

## Notion setup

### Recommended Notion capabilities

Enable these capabilities:
- `Read content`
- `Insert content`
- `Update content`
- `Read comments`
- `Insert comments`
- `User information with email addresses`

Reason:
- this gives Stage enough access to publish research, strategy, and generated outputs to Notion
- it also supports comment-based review flows and user/workspace identification

### Notion setup copy for partner portal

Use this text in the partner/client portal:

1. Open the Notion integration settings for Stage
2. Add both redirect URLs:
   - `https://testing.getstage.co/integrations/notion/callback`
   - `https://getstage.co/integrations/notion/callback`
3. Enable these capabilities:
   - Read content
   - Insert content
   - Update content
   - Read comments
   - Insert comments
   - User information with email addresses
4. Save the integration
5. Copy the Notion client ID and client secret into the Stage backend environment
6. After the Stage webhook endpoint is live, create a webhook subscription so Notion changes can sync back into Stage per project

### Notion webhook sync plan

Goal:
- keep Stage and Notion aligned per project

Desired behavior:
- when Stage publishes a research, strategy, or deliverable item to Notion, Stage stores the returned Notion URL and entity identifiers
- when the linked Notion content changes, Notion sends a webhook event to Stage
- Stage uses that event to update the matching project record inside Stage

Important:
- this is planned and should be treated as a required sync layer for the Notion integration
- if the Stage Notion webhook handler is not yet live, do not mark webhook sync as complete in production

Reserved webhook endpoints for Stage:
- Testing: `https://testing.getstage.co/integrations/notion/webhook`
- Production: `https://getstage.co/integrations/notion/webhook`

Only configure these once the Stage handler is live and verified.

## Short partner summary

Use this if you want a short note in the client portal:

Stage is moving to native Notion and Figma integrations. For setup, add the testing and production redirect URLs, use the recommended scope/capability set, and use the Stage demo path for reviewer access. Notion webhook sync is planned so each Stage project can stay aligned with the matching Notion project content. Figma OAuth will cover connect, review, file access, and sync foundations, while deeper Figma generation remains a separate implementation layer.
