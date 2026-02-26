# STAGE — Screen Inventory & Design Specs

## Document Index

This folder contains the complete screen-by-screen specification for Stage. Each file covers a specific flow or screen group and is designed to be fed into design tools (e.g., Figma MCP) individually.

---

### Files

| # | File | Covers |
|---|------|--------|
| 00 | `00-design-system.md` | Global design principles, typography, colors, spacing, UI components, navigation, transitions |
| 01 | `01-auth-flow.md` | Email input screen, 6-digit verification code screen, routing logic |
| 02 | `02-onboarding-flow.md` | Name & role, first project creation, AI path, manual path, roadmap preview |
| 03 | `03-dashboard.md` | Timeline hero, project blocks, hover interaction, contextual tooltips, empty states |
| 04 | `04-project-detail.md` | Phase roadmap, checklist, progress feedback, share modal, project actions |
| 05 | `05-task-detail.md` | Freeform content page, text editing, file uploads, auto-save |
| 06 | `06-project-creation-modal.md` | New project modal from dashboard, AI + manual paths, centered modal pattern |
| 07 | `07-paywall-upgrade.md` | Upgrade modal, payment form, standalone pricing page, cancellation |
| 08 | `08-settings.md` | Profile, plan & billing, clients management, account deletion |
| 09 | `09-client-portal.md` | Read-only client views, shared link access, mobile notes |

---

### How to Use with Figma MCP

1. Always start with `00-design-system.md` — feed this first to establish the visual foundation
2. Then feed individual screen files as needed
3. Each file is self-contained but references the design system for shared patterns
4. Cross-references between files use the format "(see XX-filename.md)"

---

### Navigation Model (Global)

```
Auth (01) → Onboarding (02) → Dashboard (03) → Project Detail (04) → Task Detail (05)
                                    ↓
                          Project Creation Modal (06)
                                    ↓
                          Paywall / Upgrade (07)
                                    ↓
                             Settings (08)

External: Client Portal (09) — accessed via shared link
```

---

### Three-Level Depth Model

```
Level 1: Dashboard      — macro overview of all projects across time
Level 2: Project Detail — mid-level view of phases and checklist
Level 3: Task Detail    — micro-level notes and files for a single task
```

Each level deeper uses a zoom-in transition. Going back reverses it. The user always knows where they are.