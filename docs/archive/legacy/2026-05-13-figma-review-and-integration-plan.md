# 2026-05-13 Figma Review And Integration Plan

Date: 13 May 2026  
Status: Active implementation document  
Scope: Figma OAuth review flow, testing reviewer access, and scope alignment for the web app

## Current Status Summary

Short answer as of now:

- Auth redirect to `/dashboard`: fixed in code
- Runtime Figma OAuth scope request: aligned in code
- Post-Figma redirect back to the app UI: aligned in code
- Testing reviewer Pro access: supported in code via env flags
- Full `file_dev_resources:read/write` product use case: not implemented yet
- Full push-to-Figma / export-to-Figma feature: not implemented yet

So the current state is:

- **OAuth/account connection review:** close to ready
- **True full Figma integration:** still incomplete

## Goal

Make the Figma reviewer journey work end-to-end on `testing.getstage.co`:

1. Open `https://testing.getstage.co/auth`
2. Create an account with email or Google
3. Complete Loops OTP / auth
4. Land on `/dashboard`
5. Open `Settings -> Integrations`
6. Click `Figma`
7. Complete Figma OAuth
8. Return to `https://testing.getstage.co/settings?tab=integrations`
9. See Figma connected

## Approved Figma Scopes

Use exactly these five scopes in the Figma app review and runtime OAuth request:

- `current_user:read`
- `file_content:read`
- `file_metadata:read`
- `file_dev_resources:read`
- `file_dev_resources:write`

Do not request extra scopes for now, including:

- `file_comments:read`
- `file_comments:write`
- `file_versions:read`
- `library_assets:read`
- `library_content:read`
- `team_library_content:read`
- `webhooks:read`
- `webhooks:write`

Reason: the current product can honestly justify the five scopes above, while the broader scope set is not clearly implemented in this repo.

## Runtime Source Of Truth

The runtime OAuth scope request is defined in:

- `apps/web-application/convex/integrations/contentPlatforms.ts`

The post-auth dashboard redirect is handled in:

- `apps/web-application/src/components/auth/AuthPage.tsx`

Testing reviewer Pro access is controlled in:

- `apps/web-application/convex/auth.ts`

The written review-safe implementation plan is stored in:

- `docs/2026-05-13-figma-review-and-integration-plan.md`

## What Is Implemented

- Figma OAuth start URL generation
- PKCE and state handling
- Figma token exchange
- `GET /v1/me`
- token storage in `nativeIntegrationConnections`
- connected / disconnected state in Settings
- testing reviewer Pro hooks via env configuration
- `/auth -> /dashboard` redirect for successful sign-in
- centralized five-scope runtime OAuth definition
- post-OAuth redirect back to the public app URL via `SITE_URL`

## What Is Not Fully Implemented Yet

- true native design push into the Figma canvas
- true native export of project artifacts into a Figma file or FigJam board
- a complete in-product `file_dev_resources:read/write` flow wired to the visible Figma buttons

For review, the safest product claim is:

- users can connect their Figma account from Settings -> Integrations

Do not rely on "push project to Figma" as the review proof point until the native export path is implemented.

## What Works Now Vs Not Yet

### Working in code

- users should land on `/dashboard` after successful auth instead of staying on `/auth`
- the app requests exactly the five approved Figma scopes
- the backend stores the Figma connection and token after OAuth
- the backend is set up to redirect users back to the real app URL after callback
- reviewer accounts can be made Pro on testing through env config

### Still missing

- a visible in-product flow that truly reads dev resources from Figma
- a visible in-product flow that truly writes dev resources back into Figma
- a native Stage action that truly pushes project/design output into a Figma file or FigJam board

### Important dependency outside the code

Even with the code aligned, Figma OAuth will still fail if these are wrong in the external setup:

- `FIGMA_CLIENT_ID`
- `FIGMA_CLIENT_SECRET`
- registered callback URL in the Figma developer console
- `SITE_URL`
- reviewer Pro env configuration

So the honest status is:

- **Auth:** yes, fixed in code
- **Scopes:** yes, aligned in code
- **Full feature behind those scopes:** not yet
- **Full push/export to Figma:** not yet

## Manual Figma Console Checklist

Your partner should verify all of this in the Figma developer console:

1. The active OAuth app still exists
2. The app client id exactly matches `FIGMA_CLIENT_ID`
3. The callback URL includes:
   `https://reliable-bullfrog-917.convex.site/integrations/figma/callback`
4. The submitted scope set matches the five approved scopes above
5. The application text describes only the implemented use cases
6. `SITE_URL` in the backend environment points at `https://testing.getstage.co`
7. reviewer Pro env is configured for testing if reviewers will use personal accounts

## Recommended Application Text

Use case summary:

- Connect a user's Figma account to Stage
- Read connected-user identity
- Read file content and metadata needed for Stage design context
- Read and write Stage-linked dev resources in Figma Dev Mode

Suggested short scope explanations:

- `current_user:read`  
  Identify the connected Figma user and display their profile in Stage.

- `file_content:read`  
  Read linked Figma file contents needed for Stage design context and imports.

- `file_metadata:read`  
  Read file metadata such as file names and related details shown in Stage.

- `file_dev_resources:read`  
  Read Stage-linked dev resources attached to accessible Figma files.

- `file_dev_resources:write`  
  Create and update Stage-linked dev resources back into Figma files.

## Testing Reviewer Pro Access

The backend now supports two testing-only options:

1. `ENABLE_TESTING_DEFAULT_PRO=true`  
   All testing signups become Pro on `testing.getstage.co`

2. `TESTING_PRO_EMAIL_ALLOWLIST=email1@example.com,email2@example.com`  
   Only listed reviewer emails become Pro on `testing.getstage.co`

Recommended option:

- prefer `TESTING_PRO_EMAIL_ALLOWLIST`

Use `ENABLE_TESTING_DEFAULT_PRO=true` only if a broad testing shortcut is acceptable.

## Required Environment And Config

- `SITE_URL=https://testing.getstage.co`
- `FIGMA_CLIENT_ID=<active figma oauth app client id>`
- `FIGMA_CLIENT_SECRET=<matching figma oauth app secret>`
- one of:
  - `TESTING_PRO_EMAIL_ALLOWLIST=...`
  - `ENABLE_TESTING_DEFAULT_PRO=true`

## Verification Checklist

- New user signs in and lands on `/dashboard`
- Integrations page is visible and reachable
- Clicking `Figma` starts OAuth successfully
- After callback, browser lands on `https://testing.getstage.co/settings?tab=integrations`
- Figma connection appears as connected
- Reviewer-created account has Pro-level access on testing
- No extra Figma scopes beyond the five approved scopes are submitted for review

## What We Should Tell Reviewers

For the current review, the safe and honest reviewer story is:

- create an account
- sign in
- land on `/dashboard`
- open `Settings -> Integrations`
- connect Figma
- return to Stage and see the Figma connection as active

Do **not** position the current product as a full native design-export-to-Figma workflow until that implementation exists in the product.

## Remaining Implementation Work

1. Add a real `file_dev_resources:read/write` use case to justify the dev-resource scopes in product behavior
2. Decide whether visible buttons such as `Open in Figma` and `Send to FigJam` should:
   - remain request placeholders, or
   - become true native Figma export actions
3. Keep the Figma review text aligned with the actual shipped behavior
