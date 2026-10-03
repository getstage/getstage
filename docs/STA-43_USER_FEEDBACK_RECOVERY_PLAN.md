# STA-43 User Feedback and Production Recovery

> **Status:** Core changes shipped in `prod-v0.2.46`; live acceptance and seat-downgrade policy remain open
> **Priority:** P0 project creation recovery, then STA-43
> **Last updated:** 2026-09-24
> **Sources:** Linear `STA-43`; Figma file `1r1quTKtqFy9E2UZt3rnOd`, node `1844:2274`

This is the single active plan for the September 20 user-feedback batch. It replaces the stale team-members implementation plan. Desktop `prod-v0.2.46` and matching production Convex functions were deployed on September 24; authenticated end-to-end acceptance is still open. Draft PR #81 and Stripe portal plan switching are not released.

## Executive diagnosis

Historical incident diagnosis (September 22): users could not create projects because the released desktop and active Convex backend did not share one project-category contract. The matching `prod-v0.2.46` desktop/Convex deployment addresses the version mismatch, but project creation has not been re-verified end to end.

- The client sends the new canonical categories: `websites`, `web-apps`, and `ios-apps`.
- The failing deployment still validates the old project-type values such as `web-design` and `web-app`.
- Local source already contains the new categories in the schema and shared project validators, but `lib/desktop/handlers/index.ts` still duplicates the old return validator.
- The onboarding error (`workCategory: "websites"`) and project-create error (`type: "web-apps"`) prove that backend deployment parity is broken, not that the user entered invalid data.
- `workspaceMembers:listPending` previously failed before execution because the desktop called a public function absent from the then-active deployment. The production function-spec after the September 24 deployment includes `listPending` and `listSpaces`; authenticated behavior still requires acceptance.

The versioned desktop/Convex deployment has now happened; follow up with authenticated project creation and workspace smoke tests before treating recovery as complete.

## Audit table

| Priority | Area | Observed behavior | Verified cause / current limitation | Required outcome | Status |
|----------|------|-------------------|-------------------------------------|------------------|--------|
| **P0** | Project creation | `desktop:createProject` rejects `type: "web-apps"` | Active Convex validator serves the legacy enum; local desktop handler also retains a duplicate legacy return validator | One imported category contract accepts all three canonical categories across args, storage, returns, onboarding, desktop, and web | Not started |
| **P0** | Onboarding completion | `workCategory: "websites"` is rejected | Active deployment is older than local onboarding/schema contract | Onboarding and project creation use the same canonical category validator | Not started |
| **P0** | Team settings query | `workspaceMembers:listPending` reports “Could not find public function” | Desktop bundle and Convex deployment expose different APIs | Client calls only functions present in the deployed backend; release gate checks generated API parity | Not started |
| **P0** | Release process | Paid users received a client that the backend could not serve | Desktop and Convex were released independently without a contract smoke gate | Testing release is deployed as one versioned unit before any production promotion | Production `prod-v0.2.46` and matching Convex backend deployed; live flows still need acceptance |
| **STA-43.1** | Model picker | AI-default model menu leaves the visible settings area | Menu used an absolute dropdown with no viewport collision handling | Menu stays inside the window, flips when needed, and scrolls internally | Done |
| **STA-43.2** | Workspace spaces | Member sees a union of projects but cannot choose personal versus team context | `projectCollaborators.ownerUserId` already represents real spaces, but `resolveWorkspaceContext` collapses access to one workspace and the UI has no active-space state | Sidebar selector lists personal space plus every real team space; projects and members are scoped to the selected owner | Local source. Not click-tested |
| **STA-43.3** | Team members | Settings does not match the Figma Teams view and pending query currently fails | Existing member/invite data is real, but presentation and deployed API are incomplete | Settings → Teams shows real members, Invite Member, owner-only Remove, and calm loading/error/empty states | UI and backend on `prod-v0.2.46`; live acceptance pending |
| **STA-43.4** | Brief uploads | Only the first selected file is retained | UI reads `files[0]`; state, Convex context, R2 attachment fields, and engine input are singular | Multiple validated brief files can be added, removed, persisted, and supplied to Research | Done |
| **STA-43.5** | PDF and Markdown | PDF is allowed; `.md` appears in the input accept list but fails shared upload validation | `research-brief` upload rules omit `.md` and Markdown MIME types | PDF and Markdown work end to end using the shared upload policy | Done |
| **STA-43.6** | Competitor links | Every URL must be added separately, and a run times out above about 3–4 competitors | Paste of several URLs is in. The form stops at 4 and shows that maximum on the field. The run itself is unchanged | Paste accepts several URLs. The field shows the working maximum before any link is added. That maximum stays at 4 until a run with more competitors finishes | Local source. Cap is 4 |
| **STA-43.7** | Help & Feedback | Clicking opens unexpected demo behavior | One click calls both `onOpenDemo()` and `openExternalLink()` | One click performs exactly one clear action: open the feedback URL externally | Done |
| **STA-43.8** | Undefined Linear item | Linear ends with an empty item 8 | No requirement exists | Do not invent work; clarify in Linear only if a requirement is later supplied | Blocked by missing requirement |

## Architecture decision: spaces without a parallel workspace system

Do not add a new `workspaces` table for this ticket. The existing data already has a stable workspace identity:

- Personal space ID: the signed-in user's `users._id`.
- Team space ID: the owner's `users._id` from `projectCollaborators.ownerUserId`.
- Projects already belong to that same owner through `projects.userId`.
- Team membership and shared credit ownership already use `ownerUserId`.

Build one indexed `listAvailableSpaces` read model from the user plus their membership rows. Pass the selected `ownerUserId` explicitly to space-scoped reads and verify membership server-side. Keep the active selection in the desktop client unless cross-device persistence becomes a real requirement. This satisfies the Figma selector without duplicating ownership data or migrating every project.

### Security rules

- Never trust a client-provided owner ID without verifying owner-or-member access.
- Only the selected space owner may invite, resend, revoke, or remove members.
- Members may read and edit projects only through the existing project-access check.
- Personal projects and team projects must never leak across a selected-space query.
- Removing membership must immediately remove that space and its projects from the member's reads.
- Keep invite tokens hashed, expiring, single-use, and bound to the signed-in verified email.

## Seat downgrades and Stripe customer portal: release blocker

### Observed portal configuration (2026-09-24, screenshots)

| Setting | Observed | Required |
|---------|----------|----------|
| Customers can switch plans | On | On, **only after** the server changes below are deployed |
| Eligible products | Stage Agency, Studio, Solo; each monthly + yearly | Same six prices |
| Customers can change quantity | Off | Off (each tier has a fixed seat count) |
| End trials on subscription updates | On | **On.** If off, a trial user who switches plan gets a $0 proration invoice; `invoice.paid` would then grant the full tier allotment instead of the 150-credit trial cap |
| When customers change plans or quantities | Prorate charges and credits (updated 18:41) | **Prorate charges and credits**, charge timing **Invoice prorations immediately**. "No charges or credits" makes an upgrade free until the next renewal, which is up to a year of Agency for the Solo price on yearly plans |
| When switching to a cheaper plan | Wait until end of billing period (updated 18:41) | **Wait until end of billing period** (Stripe creates a subscription schedule) |
| When switching to a shorter interval | Wait until end of billing period (updated 18:41) | **Wait until end of billing period** |
| Promotion codes | Off | Off |

The screenshots show unsaved changes. Confirm in Stripe whether **Save changes** was pressed. If it was, plan switching is live now without seat enforcement, so turn it off until the server fix ships.

### Verified server gaps

Stage tiers: Solo (`start`) = 1 total seat, Studio (`pro`) = 5, Agency (`team`) = 15. The owner occupies one seat.

1. **Stale seat count.** `lib/billing/handlers/index.ts:resolveSeats` returns the larger of the current price's `includedSeats` and `metadata.seats`. Checkout writes `metadata.seats` equal to the tier's included seats, and the portal does not rewrite it. After Agency → Solo, the subscription still reports **15 seats**.
2. **No enforcement on existing members.** Invite creation and acceptance check capacity (`domain/collaborators/service.ts`). Nothing re-checks existing `projectCollaborators` rows. `helpers/access/projectAccess.ts` grants access when a membership row exists and the owner has **any** active subscription, including Solo. `workspaceMembers:listSpaces` lists memberships without a capacity check.

### AI credits on plan changes (verified in `lib/billing/handlers/webhooks.ts`, `lib/credits/service.ts`)

Monthly allotment: Solo 2,000, Studio 10,000, Agency 30,000. A `monthly_grant` **resets** the monthly bucket to the tier amount; top-up credits are never touched.

- **Upgrade** (prorated, invoiced immediately): Stripe sends `invoice.paid` with `billing_reason = subscription_update`. The existing handler skips only `subscription_create`, so it resets the monthly bucket to the new tier's amount. The customer pays the prorated difference and gets the full new allotment at once. No code change; verify in test mode.
- **Downgrade** (scheduled at period end): nothing changes until renewal. At renewal the schedule switches the price and the renewal `invoice.paid` resets the bucket to the lower tier. No mid-period credit reduction, so no refund logic is needed.
- **Risk to fix:** `handleInvoicePaid` reads the tier from the *synced subscription*, not from the invoice. If the invoice webhook arrives before the subscription sync at the downgrade renewal, it grants the old (higher) tier. Read the price from the invoice line instead (small change in one function).
- **Existing gap, separate from downgrades:** yearly plans get one `invoice.paid` per year, and nothing else grants credits, so yearly customers receive a single month's allotment per year. Needs its own fix (e.g. a monthly refill for active yearly subscriptions). Not part of this change.

### Decision: derived, reversible seat entitlement

The Stripe portal cannot ask Stage before it applies a plan change, so a downgrade cannot be blocked there. Instead, entitlement is **derived at read time** from the current plan. No data is written or deleted when a plan changes:

- Seat limit = `includedSeats` of the current price. Ignore `metadata.seats`.
- A member is **active** if they are among the first `seatLimit - 1` members of that owner, ordered by `projectCollaborators.createdAt` (earliest joined first).
- Members beyond that count stay stored as **over limit**: no project access, their team space is hidden, and they cannot use the owner's credits.
- An upgrade restores them automatically. The rule does not depend on webhook order or retries because it is recomputed from the current subscription on every read.
- The owner's projects and data are never touched.
- Pending invites: no change. Creating and accepting an invite already check free seats.
- Canceled or ended subscriptions: the existing "owner needs an active subscription" check already applies.

Out of scope (YAGNI until a customer asks): the owner choosing *which* members stay active, a stored suspension state, webhook reconciliation jobs, a blocked-invite UI. The owner can remove members to free seats.

### Local implementation (ponytail-sized)

No new table, field, webhook handler, or screen. Implemented on `fix/team-invite-upgrade-gate` (local, not deployed):

- [x] `resolveSeats`: seats come from the current price's `includedSeats` only. Checkout only ever sold exactly the included seats (quantity 1), so no customer loses paid seats.
- [x] `handleInvoicePaid`: tier comes from the invoice's positive subscription line, falling back to the synced subscription. This also fixes upgrades, where the invoice can arrive before the subscription sync and grant the old tier.
- [x] `helpers/access/seatEntitlement.ts`: the single place that decides who is over the limit (`listOverLimitMemberIds`, `isActiveMembership`, `listActiveMembershipsForUser`).
- [x] Applied at every membership read: `projectAccess.ts`, `readModel.ts` (project list), `projectService.ts` (space check), `resolveWorkspaceContext` (credits and settings), `workspaceMembers` (`listSpaces`, readable space owner).
- [x] `workspaceMembers:list` returns `overLimit`; Settings → Teams shows "No access: over your plan's seat limit. Upgrade or remove a member." The existing Remove action stays.
- [x] Task assignee list (`tasks:getProjectMembers`): lists the **project owner** instead of the viewer, skips over-limit members, and never lists a person twice. Before, a member viewing the board saw themselves twice and the owner was missing.
- [ ] Verify (security path, not trimmed): Studio → Solo with members, Agency → Studio over capacity, stale `metadata.seats`, re-upgrade restores access. Run as a Convex test if a harness exists by then, otherwise as a scripted smoke on Testing.
- [ ] Stripe test mode: apply the required portal settings; run Solo → Studio (prorated charge, credits reset to 10,000), Studio → Solo (scheduled; at renewal credits 2,000 and seats enforced), upgrade during trial, and monthly ↔ yearly.
- [ ] After deploy: set the live portal to the required settings and verify with an authorized account.

Draft PR #81 (`fix/team-invite-upgrade-gate`) adds a Solo invite guard and Studio/Agency upgrade cards that open the Stripe portal. It does not include the items above. Do not use a second subscription checkout as a workaround.

## Delivery order

### 0. Freeze and establish parity

- [ ] Record desktop version, Convex deployment, web testing version, and git commit in this document.
- [ ] Confirm which deployment produced both validation errors.
- [ ] Do not add STA-43 feature code until project creation works in Testing.

### 1. Restore project creation

- [ ] Remove the duplicate project-type union from `lib/desktop/handlers/index.ts`; import the canonical validator.
- [ ] Make the shared contract the source for canonical category values wherever technically possible.
- [ ] Check `projects.create`, `desktop.createProject`, onboarding writes, schema storage, API return validators, and frontend Zod schemas against the same three values.
- [ ] Generate Convex types and deploy backend plus matching desktop candidate to Testing as one release.
- [ ] Werner verifies creation of one Websites, one Web apps, and one iOS apps project.

### 2. Restore deployed team API parity

- [ ] Decide whether pending invite management remains in STA-43; if retained, deploy `listPending` with its matching client.
- [ ] Ensure generated API declarations and deployed public functions match before packaging.
- [ ] Keep existing secure invitation acceptance behavior; do not rebuild billing or seats in this ticket.

### 3. Fix model-picker containment

- [x] Reuse the current custom select and change only its positioning/size behavior.
- [x] Bound width to available space and height to the viewport.
- [x] Add internal scrolling and collision-aware vertical placement.
- [x] Preserve keyboard focus, Escape, outside-click, and selected-model visibility.

### 4. Add real personal/team space selection

- [ ] Add an authenticated, indexed read model for all accessible spaces.
- [ ] Scope project/sidebar/dashboard reads to the selected owner ID.
- [ ] Render the Figma selector using real owner name/avatar data and the existing sidebar primitives.
- [ ] Handle removed membership by falling back to personal space without exposing stale data.

### 5. Match Settings → Teams to Figma

- [ ] Rename the tab to `Teams` and heading to `Team Members` where specified by Figma.
- [ ] Render real member name, email, avatar, role, and owner/member actions.
- [ ] Show `+ Invite Member` and `Remove` only to the owner.
- [ ] Do not seed placeholder members.

### 6. Improve Research inputs

- [x] Change the brief contract from singular attachment fields to a bounded attachment array with a safe migration path for existing contexts.
- [x] Accept multiple files and validate every file through the shared upload rules.
- [x] Add `.md`, `text/markdown`, and safe plain-text Markdown fallback handling to the shared policy.
- [x] Upload sequentially or with tightly bounded concurrency; retain successful files and report individual failures.
- [x] Parse multiple competitor URLs from paste or submit; normalize and deduplicate.
- [x] Show the competitor maximum on the field before the user adds a link.
- [x] Keep that maximum at 4 while runs above 3–4 competitors time out.
- [ ] Raise it above 4 only after a research run with that many competitors finishes. Do not leave a silent cap of 10.

### 7. Fix Help & Feedback

- [x] Remove the unrelated demo callback from the Help & Feedback click.
- [x] Keep one external URL action and one user-visible failure path if opening fails.

## Ponytail delete-list before implementation

- No new workspace table, workspace migration, or duplicate membership system.
- No billing rewrite, seat-price changes, or landing-page changes.
- No second project-category enum beside the canonical contracts.
- No new generic dropdown framework for one model-picker bug.
- No speculative roles, workspace branding, workspace creation, or workspace renaming.
- No custom upload service; extend the existing R2/upload-policy path.
- No invented Linear item 8.
- Remove comments or helpers that only restate a single call.

Security, validation, data-loss protection, keyboard access, and clear errors are excluded from deletion.

## Acceptance gates

### Automated checks performed by the implementation agent

- Data-ops typecheck and Convex code generation pass.
- Desktop typecheck passes.
- Testing build passes.
- No `as any`, `@ts-ignore`, or duplicate category union is introduced.
- A source scan confirms every public client call exists in generated Convex API output.

### Manual acceptance performed by Werner

- Create all three project categories in Testing.
- Switch between personal and team spaces and confirm projects never mix.
- As owner: invite and remove a real member.
- As member: see the team space but no owner-only controls.
- Open the model picker at constrained window sizes. Done.
- Upload multiple PDF and Markdown briefs, and remove one. Done. Leaving the page and coming back is still open.
- Paste several competitor URLs at once. Done. Showing a maximum of 4 before adding links is still open.
- Click Help & Feedback and confirm only the intended external page opens. Done.

## Release boundary

- Local and Testing only until every P0 and relevant STA-43 row is marked accepted by Werner.
- No production deploy in this ticket without a separate explicit instruction.
- Keep unrelated current working-tree changes out of the STA-43 commit.
