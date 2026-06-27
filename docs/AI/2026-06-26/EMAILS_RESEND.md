# Transactional Emails → Resend + Convex — 2026-06-26 (separate track)

Planning doc. No code shipped here yet. See [PRIORITY_ALERT.md](./PRIORITY_ALERT.md).

## Goal
Send transactional emails for product events using the **already-designed React email
templates** in `getstage/getstage @ emails/all-templates`, delivered via **Resend**, triggered
from **Convex** events.

## What exists
- React email templates (designed) in the GitHub repo branch `emails/all-templates`.
- GitHub MCP is set up.
- Convex integration still needs wiring (events → email send).

## Tasks
- [ ] Pull the React email templates into the app (package or `apps/.../emails`), render with
      `@react-email/render` (or Resend's React support).
- [ ] Add Resend API key to runtime secrets; create a small `sendEmail(template, props)` helper.
- [ ] Store the email-worthy events in Convex (per Adrien: events stored in Convex).
- [ ] Map each event → template:
      - [ ] welcome / signup
      - [ ] first payment / subscription started
      - [ ] (enumerate the rest from the Notion list + template set)
- [ ] Trigger sends from Convex (action) on event insert; idempotent (don't double-send).
- [ ] Dev/test: a way to preview + send a test email without firing real product events.

## References
- Templates: https://github.com/getstage/getstage/tree/emails/all-templates
- Event list (Notion): https://app.notion.com/p/480dd47b69c84167bb94200798225066
- Resend React email docs.

## Open questions for Wessel
- Full list of events that should send email (from the Notion page)?
- From-address / domain for Resend (SPF/DKIM/DMARC set up)?
- Priority vs the reliability bugs — partner is asking; is this after P0/P1 or parallel?

## Acceptance
A product event (e.g. signup) fires the matching designed template via Resend, once, with
correct props; previewable in dev.
