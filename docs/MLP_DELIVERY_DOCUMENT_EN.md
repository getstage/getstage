# Platform Delivery & Handover Document

## 1. Introduction

This document marks the delivery of the current live version of the platform.

The product is already available as a strong, fully usable platform and includes the main workflows, integrations, and operational structure needed for real use. While the project will continue to evolve through future improvements and refinements, the current version already represents a substantial delivered product rather than a simple prototype.

This document covers the following points:
- project overview and objectives
- delivered scope and key platform features
- technical architecture and overall system setup
- technologies, frameworks, and integrations used
- access, ownership, and permissions
- guides, operational usage, and onboarding support
- support, contact details, and feedback collection

**Feedback form:** [https://tally.so/r/pbGZlB](https://tally.so/r/pbGZlB)

---

## 2. Project Overview & Objectives

**Project name:**  
**Client:**  
**Platform live date:** 19-03-2026  
**Document date:** 28-03-2026  
**Prepared by:**  

### Project Summary
The goal of this project was to deliver a modern, structured, and scalable platform that can be used in practice from day one. The platform went live on 19-03-2026 and now supports the main user journey, project and task management, client-facing visibility, billing flows, data integrations, and internal administration.

### Main Objectives
- deliver a strong first live version of the platform
- create a clear and usable experience for both internal users and clients
- establish the technical and operational foundation for future growth
- centralize workflows, visibility, collaboration, and feedback into one product

---

## 3. Delivered Scope

### Delivered Platform Overview

| Area | Delivered now | Notes |
| --- | --- | --- |
| Core platform | A live authenticated Stage workspace is available. | This includes the main internal product environment and protected access. |
| Dashboard | The dashboard is live with project visibility, upcoming work, activity, timeline visibility, and payment-related insights. | Gives users a practical overview of the workspace. |
| Onboarding | A structured onboarding flow is in place for new users. | Supports first access, setup, and product entry. |
| Project management | Users can create and manage projects, define phases, and work with tasks inside each phase. | This forms the central operational workflow of the platform. |
| Timeline and progress | Projects are visualized through timeline and progress logic. | Supports planning, visibility, and project tracking. |
| Client portal | A shareable client portal is live. | Clients can review progress, phases, and tasks in a read-only environment. |
| Team collaboration | Team member invites are supported for eligible users. | Collaboration access is available within the Stage workspace. |
| Billing flow | The billing flow is connected to Stripe checkout. | Users can start upgrade or subscription-related actions inside the platform. |
| Stripe Connect | Stripe Connect can be linked and synced. | Supports financial data sync and payment visibility. |
| Google Sheets and CSV import | Users can connect a Google Sheet or upload CSV data. | Supports structured data import into the product. |
| Settings and administration | General settings, billing settings, integration settings, and portal settings are available. | Includes profile settings and client portal branding controls. |
| Feedback collection | Feedback can be collected through Tally. | Supports internal and client-facing feedback collection. |

### Summary Of What Has Been Delivered
At this stage, the platform already supports the core operational experience needed to work with it in practice: onboarding, project setup, phase and task management, client portal sharing, billing, integrations, and structured feedback handling.

---

## 4. Technical Architecture & System Setup

The platform is built around a modern web application architecture with one main frontend application and Convex as the backend platform layer.

### Current Architecture
- a React frontend application for the product experience
- Convex for backend logic, database, authentication, and server functions
- R2 integration for file and asset handling
- Stripe and Stripe Connect for billing and payment-related flows
- Google Sheets and CSV import for structured data ingestion
- Cloudflare / Wrangler deployment flow for environment management and rollout

### System Design Principles
- one internal authenticated workspace for platform users
- one read-only client-facing portal for visibility and sharing
- structured onboarding before deeper product usage
- product-integrated administration instead of a separate custom backoffice
- centralized feedback collection through Tally

---

## 5. Technologies, Frameworks & Integrations

| Layer | Technology |
| --- | --- |
| Frontend | React 19 |
| Language | TypeScript |
| Build tool | Vite |
| Routing | TanStack Router |
| Query layer | TanStack Query |
| Styling | Tailwind CSS v4 + custom styles |
| Backend | Convex |
| Authentication | Convex Auth |
| Database | Convex database |
| File storage | R2 via `@convex-dev/r2` |
| Billing | Stripe |
| Connected payments | Stripe Connect |
| Data import | Google Sheets + CSV |
| Deployment | Cloudflare / Wrangler |
| Feedback collection | Tally |

### Main Integrations
- Stripe Checkout
- Stripe Connect
- Google Sheets import
- CSV upload and import
- Tally feedback collection

---

## 6. Access, Ownership & Permissions

| Item | Link / Location | Owner | Notes |
| --- | --- | --- | --- |
| Live platform | [https://getstage.co](https://getstage.co) | Logiaweb / Lumen Apps | Main production environment |
| GitHub repository | [https://github.com/getstage/getstage](https://github.com/getstage/getstage) | Logiaweb / Lumen Apps | Source code and version control |
| Cloudflare | [https://dash.cloudflare.com](https://dash.cloudflare.com) | Logiaweb / Lumen Apps | Domain, DNS, and deployment-related access |
| Convex | [https://dashboard.convex.dev](https://dashboard.convex.dev) | Logiaweb / Lumen Apps | Backend, database, functions, and logs |
| Stripe | [https://dashboard.stripe.com](https://dashboard.stripe.com) | Logiaweb / Lumen Apps | Billing, checkout, and payment configuration |
| Client onboarding portal | [Adrien Ninet Notion Portal](https://www.notion.so/Client-Onboarding-Portal-Adrien-Ninet-3118714fd55780ffbf37f8903a3c4d7c?source=copy_link) | Logiaweb / Lumen Apps | Primary support and onboarding reference |
| Feedback form | [https://tally.so/r/pbGZlB](https://tally.so/r/pbGZlB) | Logiaweb / Lumen Apps | Feedback collection |

### Access Notes
- confirm which accounts have already been transferred
- confirm which services remain internally managed
- confirm which users should retain administrative access
- confirm who owns billing, hosting, repository, and domain access
- client-specific portal links inside Stage are generated per project when sharing is enabled
- Cloudflare Worker observability logs are enabled for operational review

---

## 7. Guides, Usage & Operational Instructions

The purpose of this section is to point users to the correct practical guides rather than writing every instruction directly into the document.

### Platform Usage Guide

| Guide | Purpose | Stepps link |
| --- | --- | --- |
| How to Use the Stage Platform | Covers the main user-facing workflow of the platform, including navigation, project usage, client portal usage, billing, integrations, and feedback. | [https://stepps.ai/shared/92cabb42-f1be-49d5-b95b-487614d248b9](https://stepps.ai/shared/92cabb42-f1be-49d5-b95b-487614d248b9) |

### Operational Note
Stepps should primarily be used for repeatable user-facing workflows. Technical maintenance or developer-only setup steps should remain internal unless they are explicitly needed by the client.

---

## 8. Installation & Implementation Notes

The current platform is already deployed and accessible in its live environment at [https://getstage.co](https://getstage.co).

For day-to-day usage, no technical installation is required beyond:
- access to the live platform
- the correct user account and permissions
- access to the relevant Stepps guides and key links

### Local Installation

If the platform needs to be reviewed locally, the fastest setup is:

```bash
git clone https://github.com/getstage/getstage.git
cd getstage/app
pnpm install
```

Create a local `.env.local` file with at least:

```bash
VITE_CONVEX_URL=https://quirky-snail-763.convex.cloud
```

Then start the local development environment:

```bash
pnpm run dev
```

This allows the platform to be opened and browsed locally in a development environment.

### Implementation Note

Advanced infrastructure setup, deployment, integrations, and operational maintenance are documented separately in the Stepps guides below. The full command-line history does not need to be included in this document.

### Setup & Implementation Guides

| Guide | Purpose | Stepps link |
| --- | --- | --- |
| Cloudflare DNS and Stripe Setup | Covers the initial Cloudflare DNS and Stripe-related setup completed during implementation. | [https://stepps.ai/shared/5792e7d3-9abf-44d3-a3c8-ed30ee67780d](https://stepps.ai/shared/5792e7d3-9abf-44d3-a3c8-ed30ee67780d) |
| Cloudflare R2 Setup | Covers the R2 setup used for storage and file handling. | [https://stepps.ai/shared/7814a185-3faf-4bce-bd83-bf59df6c97d0](https://stepps.ai/shared/7814a185-3faf-4bce-bd83-bf59df6c97d0) |
| Google, Stripe and Loops Integration Setup | Covers the integration setup required to connect the main external services used by the platform. | [https://stepps.ai/shared/39e37b05-5d23-4096-8281-99577072dbb2](https://stepps.ai/shared/39e37b05-5d23-4096-8281-99577072dbb2) |

### Recommended Additional Guides
- how to review Cloudflare, Convex, Stripe, R2, and Loops for monitoring and logging
- where to find the most important operational settings and error surfaces
- how to verify that the platform, billing, and integrations are working correctlys

### Monitoring Note
- Cloudflare Worker observability logs are enabled
- Cloudflare Worker invocation logs are enabled
- Cloudflare Worker traces are currently disabled
- Convex remains the main place for backend function logs and database-related troubleshooting

---

## 9. Support, Contact & Feedback

### Support
With the platform now live, the role of Logiaweb / Lumen Apps moves from active build delivery into ongoing support, refinement, and maintenance. This helps keep the platform stable, usable, and ready for future growth.

### Availability
For clear and structured communication, the following channels are recommended:

- **Client onboarding portal (preferred):** the most practical place for questions, onboarding follow-up, implementation notes, and support-related context.  
  Portal link: [Adrien Ninet Notion Portal](https://www.notion.so/Client-Onboarding-Portal-Adrien-Ninet-3118714fd55780ffbf37f8903a3c4d7c?source=copy_link)
- **Email:** if the portal is not available or a quick direct message is easier, email remains available as a fallback channel.
- **Phone:** for urgent issues affecting the platform directly, phone remains the fastest way to escalate.

### Contact Details
**Wessel Dieben**  
Owner, Lumen Apps

- Email: [contact@lumenapps.dev](mailto:contact@lumenapps.dev)
- Phone: +31 6 40976514
- Website: [https://www.lumenapps.dev](https://www.lumenapps.dev)

### Feedback Form
**Form title:** `MLP Delivery Feedback`

**Form link:** [https://tally.so/r/pbGZlB](https://tally.so/r/pbGZlB)

### Recommended Feedback Questions
1. How satisfied were you with the collaboration throughout this project so far?  
   Type: 1-5 rating
2. How satisfied are you with the current version of the platform?  
   Type: 1-5 rating
3. Did you find the client portal clear and easy to use?  
   Type: short answer or yes/no
4. What do you feel is still missing the most?  
   Type: long answer
5. What is the main improvement you would suggest for the next phase?  
   Type: long answer
6. If you could give us one piece of advice to improve our service, what would it be?  
   Type: long answer

These questions are intended to keep the feedback round short, useful, and easy to complete.

---

## 10. Next Phase

The project continues after this delivery milestone.

The next phase will focus on:
- refinement of the current experience
- improvements based on live usage and feedback
- additional features based on priority and value

---

## 11. Closing Note

This document confirms the delivery of the current live platform milestone. The system is already active, usable, and structured around real workflows, while the project itself remains open for further iteration and improvement.

If you would like to share feedback on the current platform, please use the following form:  
[https://tally.so/r/pbGZlB](https://tally.so/r/pbGZlB)
