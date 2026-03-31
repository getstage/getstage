# Stage Public API + AI Integration Plan

---

## Work Split: Frontend Agent vs Backend Agent

### Frontend Agent — Design & UI

This agent builds all user-facing pages and components.

| # | Deliverable | Files | Depends On |
|---|------------|-------|------------|
| F1 | `stage-api-docs.ts` — API endpoint data file (types, sections, endpoints, examples). Single source of truth for docs page + SKILL.md. Pattern: copy from Stepps `agent-api-docs.ts`. | `app/src/lib/stage-api-docs.ts` | Nothing |
| F2 | **Developer Tab** in Settings — Pro-only. API key management (create, list, revoke). One-time key reveal on create. Links to /docs and ClawHub. | `app/src/components/settings/DeveloperTab.tsx`, modify `SettingsPage.tsx`, `useSettingsTabs.ts`, `settings.ts` | `apiKeys.ts` backend (already done) |
| F3 | **API Docs Page** at `/docs` — Public, no auth. Stepps-style: sidebar nav, method badges (GET/POST/DELETE), 3-language code tabs (cURL/TS/Python), field tables, response examples, dark mode. AI-crawlable. | `app/src/routes/docs.tsx`, `app/src/components/api-docs/ApiDocsPage.tsx` | F1 |
| F4 | **SKILL.md** — Claude Code / OpenClaw skill file. YAML frontmatter + all endpoints + example flows. Served as static download from `/SKILL.md`. | `app/public/SKILL.md` | F1 |
| F5 | **OpenClaw Page** at `/openclaw` — Public landing page. "Get API Key" → `/settings?tab=developer`, "Download Skill File" → `/SKILL.md`. Terminal-style demo. Feature list. | `app/src/routes/openclaw.tsx`, `app/src/components/openclaw/OpenClawPage.tsx` | F4 |
| F6 | **ClawHub listing** — Title, description, tags, skill file URL. Manual submission to clawhub.ai. | Content only | F4 + backend deployed |
| F7 | **Stitch UI — "Generate Design" button** in project view. User enters a text prompt (e.g. "premium editorial homepage for a coffee brand"), hits generate, sees loading state, then the generated screens appear as project deliverables/attachments. | `app/src/components/project/StitchGeneratePanel.tsx` or similar, modify project detail view | B8 (Stitch backend) |
| F8 | **Stitch results viewer** — Display generated screens inline in the project. Preview thumbnails, full-size view, download as image, export to Figma (if supported by Stitch SDK). | `app/src/components/project/StitchResultsView.tsx` | F7 |

**Build order:** F1 → (F2 + F3 parallel) → (F4 + F5 parallel) → F6 | F7 → F8 (Stitch UI runs after B8 is ready)

### Backend Agent — Convex + Hono API

This agent builds all API routes, auth, and business logic.

| # | Deliverable | Files | Depends On |
|---|------------|-------|------------|
| B1 | **API key auth helper** — `authenticateApiKey(req)`: extract bearer token, SHA-256 hash, lookup user, touch lastUsed. Reusable middleware for all API routes. | `app/convex/apiAuth.ts` | `apiKeys.ts` (already done) |
| B2 | **Extract shared business logic** — Internal Convex functions for project/phase/task CRUD that both the existing UI mutations AND the new API routes can call. Avoid duplicating logic. | `app/convex/projectHelpers.ts` or similar | Nothing |
| B3 | **Hono router on Convex HTTP** — Set up Hono with Convex pattern (ref: https://stack.convex.dev/hono-with-convex). Mount at `/api/v1/*` in `http.ts`. | `app/convex/api.ts` (Hono app), modify `app/convex/http.ts` | B1 |
| B4 | **API route handlers** — All CRUD endpoints behind bearer auth: | `app/convex/api.ts` | B1 + B2 + B3 |
|   | `GET /api/v1/projects` — list user's projects | | |
|   | `GET /api/v1/projects/:id` — get project with phases + tasks | | |
|   | `POST /api/v1/projects` — create project | | |
|   | `POST /api/v1/projects/:id/phases` — add phase | | |
|   | `GET /api/v1/projects/:id/phases` — list phases | | |
|   | `POST /api/v1/phases/:id/tasks` — add task | | |
|   | `GET /api/v1/phases/:id/tasks` — list tasks | | |
|   | `POST /api/v1/tasks/:id/toggle` — toggle task completion | | |
| B5 | **AI project generation** — `POST /api/v1/projects/generate` — takes natural language description, uses Anthropic API to generate project structure, creates project + phases + tasks. | `app/convex/api.ts` + `app/convex/projectGenerator.ts` | B4 + `ANTHROPIC_API_KEY` env var |
| B6 | **Rate limiting** — Per-API-key rate limits on all endpoints. Use existing `rateLimits.ts` pattern. | modify `app/convex/rateLimits.ts` | B3 |
| B7 | **MCP Server** (later phase) — Separate package wrapping the same API endpoints as MCP tools with typed schemas. | `packages/mcp-server/` or similar | B4 deployed |
| B8 | **Google Stitch service layer** — Install `@google/stitch-sdk`. Build Convex action that calls Stitch `create_project` + `generate_screen_from_text`. Saves generated output images to R2. Creates attachment records in Convex linked to the project/phase. | `app/convex/stitch.ts` | R2 (already done) |
| B9 | **Stitch API endpoint** — `POST /api/v1/projects/:id/generate-design` — takes a text prompt + optional style parameters. Calls B8 Stitch service. Returns generated screen URLs. Also available as MCP tool `generate_visual_concept`. | `app/convex/api.ts` | B3 + B8 |

**Build order:** (B1 + B2 parallel) → B3 → (B4 + B6 parallel) → B5 → B7 | B8 → B9 (Stitch can start anytime, API endpoint needs B3)

### What Already Exists (no work needed)

| Component | File | Status |
|-----------|------|--------|
| API keys table (schema) | `app/convex/schema.ts` | ✅ Done |
| API key generate/list/revoke | `app/convex/apiKeys.ts` | ✅ Done |
| API key hash lookup | `app/convex/apiKeys.ts` (`getUserByHashedKey`) | ✅ Done |
| Settings tab routing | `useSettingsTabs.ts` | ✅ Done (add "developer" tab) |
| Projects/phases/tasks schema | `app/convex/schema.ts` | ✅ Done |
| R2 file storage | `@convex-dev/r2` in `convex.config.ts` | ✅ Done |
| Resend audience sync on signup | `app/convex/resendAudience.ts` | ✅ Done |

---

## The User Journey: How It Actually Works

### Step 1: A freelancer installs the Stage skill in Claude Code

They drop a `SKILL.md` file into their `~/.claude/skills/stage/` folder (or we publish it on ClawHub so they can install it with one command). They also set their API key:

```bash
# One-time setup
export STAGE_API_KEY=stg_a1b2c3d4e5f6...
```

They get this key from **Stage Settings > Developer > Generate API Key**.

---

### Step 2: They talk to Claude naturally

The freelancer opens Claude Code (or any OpenClaw agent) and just talks:

```
User: "I just signed a new client — Brew & Co, a specialty coffee shop.
       They need full branding. Budget is €3,000, deadline is 6 weeks
       from now. Set it up in Stage for me."
```

---

### Step 3: Claude reads the skill and knows what to do

Behind the scenes, Claude sees the `SKILL.md` in its context. The skill file tells Claude:

1. **What Stage is** — a project management tool for creatives
2. **What API endpoints exist** — create projects, add phases, add tasks
3. **What project types are valid** — branding, web-design, app-design, etc.
4. **Example API calls** — exact curl commands with request/response shapes

Claude doesn't need to be "trained" on Stage. The skill file IS the training. It's like giving Claude a reference manual that it reads every time it's relevant.

---

### Step 4: Claude makes the API calls

Claude decides to call `POST /api/v1/projects/generate` (the AI generation endpoint) OR builds the project structure itself by calling the individual endpoints. Here's what happens:

**Option A — AI Generation (one call):**
```
Claude calls: POST https://getstage.co/api/v1/projects/generate
{
  "description": "Full branding project for Brew & Co, a specialty coffee shop. Budget €3,000, deadline 6 weeks."
}

Stage responds with the generated project:
{
  "id": "k17abc...",
  "name": "Brew & Co — Brand Identity",
  "clientName": "Brew & Co",
  "type": "branding",
  "phases": [
    {
      "name": "Discovery",
      "tasks": ["Brand audit", "Competitor analysis", "Client interview", "Moodboard"]
    },
    {
      "name": "Strategy",
      "tasks": ["Brand positioning", "Tone of voice", "Visual direction"]
    },
    {
      "name": "Design",
      "tasks": ["Logo concepts", "Color palette", "Typography", "Brand patterns"]
    },
    {
      "name": "Deliverables",
      "tasks": ["Business cards", "Letterhead", "Social templates", "Brand guidelines PDF"]
    },
    {
      "name": "Handoff",
      "tasks": ["Asset package", "Client presentation", "Final revisions"]
    }
  ]
}
```

**Option B — Manual (Claude builds it step by step):**
```
1. POST /api/v1/projects         → Creates the project
2. POST /api/v1/projects/{id}/phases   → Adds "Discovery" phase
3. POST /api/v1/projects/{id}/phases/{phaseId}/tasks → Adds each task
4. ...repeats for each phase
```

The skill file teaches Claude both approaches. Claude picks the best one.

---

### Step 5: Claude confirms to the user

```
Claude: "Done! I've created your project in Stage:

  📋 Brew & Co — Brand Identity
  🎨 Type: Branding
  📅 Jan 15 → Feb 26 (6 weeks)

  5 phases, 16 tasks:
  1. Discovery (4 tasks)
  2. Strategy (3 tasks)
  3. Design (4 tasks)
  4. Deliverables (4 tasks)
  5. Handoff (3 tasks)

  Open it: https://getstage.co/projects/k17abc..."
```

---

### Step 6: The freelancer opens Stage and sees it

They go to Stage and the project is there — fully structured with all phases, tasks, and timeline. Ready to work. They can tweak anything in the UI.

---

## More Examples of What Becomes Possible

### "What's my workload this week?"
```
User: "What do I have coming up in Stage?"

Claude reads the skill → calls GET /api/v1/projects → returns list

Claude: "You have 3 active projects:
  - Brew & Co Branding (40% done, 3 tasks due this week)
  - Nova App Design (15% done, storyboard phase)
  - Zen Packaging (80% done, final delivery Friday)"
```

### "Mark those tasks as done"
```
User: "I finished the moodboard and competitor analysis for Brew & Co"

Claude calls:
  POST /api/v1/tasks/{moodboard-id}/toggle
  POST /api/v1/tasks/{competitor-id}/toggle

Claude: "Marked as complete. Discovery phase is now 50% done."
```

### "Create a project from this brief"
```
User: *pastes a client brief PDF or email*
      "Set this up as a project in Stage"

Claude parses the brief, extracts client name, scope, timeline,
then calls POST /api/v1/projects/generate with the extracted info.
```

### "Handle a messy real-world client intake"
```text
User: "I have a new client, Moonline Studio.
They want a rebrand + landing page + iOS app teaser.
Budget is 18k. Deadline is sometime before Paris Design Week.
First only brand strategy and homepage, app later maybe.
Below are the old brief, 3 emails, 12 screenshots, logo files,
a moodboard, and these references.
Oh and already make something in Stitch for a premium editorial feel.
And put everything neatly into Stage."
```

What should happen technically:

1. The user sends everything to Claude or OpenClaw
   - free text
   - attachments
   - screenshots
   - PDFs
   - links
   - email snippets

2. Claude identifies the request as a `Stage project intake`
   - This is not treated as a normal chat message
   - It is routed into the Stage skill or Stage MCP tools

3. Raw input is stored first before any live project write happens
   - text transcript
   - uploaded files
   - screenshots
   - reference links
   - generated outputs
   - Recommended split: raw assets in `R2`, structured metadata in `Convex`, routed through `Hono with Convex`

4. Claude turns the messy input into a structured draft
   - client name
   - likely project type
   - scope summary
   - budget
   - tentative timeline
   - proposed phases
   - proposed tasks
   - open questions
   - confidence score

5. Stage validates the draft server-side
   - project name cannot be empty
   - phases must be valid
   - tasks must belong to a phase
   - dates cannot be impossible
   - unsupported file types are rejected
   - duplicate writes are prevented with idempotency keys

6. Then Stage decides whether to create immediately or ask once for confirmation
   - High confidence + safe action:
     create automatically
   - Low confidence, conflicting scope, unclear dates, or destructive action:
     return a draft and ask Claude to confirm with the user before writing

7. If approved, Stage creates the real project in Convex
   - project
   - phases
   - tasks
   - linked assets
   - optional generated outputs such as Stitch concepts

8. Convex becomes the source of truth and pushes the update to the UI in real time
   - The dashboard may be used less over time
   - But it still reflects the canonical state of the workspace
   - Claude becomes the main operational interface while Stage remains the system of record

The key pattern is:

`messy human input -> structured draft -> validation -> optional confirmation -> live Stage project`

### MCP Server (for Claude Desktop / agent workflows)
```
Instead of raw API calls, Claude uses MCP tools:

Tool: create_project
Input: { name: "Brew & Co", type: "branding", ... }

This is richer than the skill because MCP tools have typed schemas,
validation, and can expose resources (live project data).
```

---

## How the Skill File Works (Technical)

The `SKILL.md` is just a markdown file with YAML frontmatter:

```yaml
---
name: stage
description: Manage creative projects in Stage — create projects with phases and tasks, track progress, toggle completions
requiredEnv:
  - STAGE_API_KEY
---

# Stage API Reference
...endpoints, examples, types...
```

**How Claude discovers it:**
- Claude Code scans `~/.claude/skills/` and `.claude/skills/` on startup
- It reads the `description` field from each skill
- When a user's message matches the description (e.g., mentions "project", "tasks", "Stage"), Claude loads the full skill content into its context
- Claude then follows the instructions in the skill to make API calls

**The skill is NOT code.** It's documentation that Claude reads and acts on. Think of it as a very smart API reference card.

---

## Architecture Summary

Reference architecture note:
- Use `Hono with Convex` as the routing layer pattern, not a separate second backend
- Reference: https://stack.convex.dev/hono-with-convex

```
┌─────────────────┐     ┌──────────────────┐
│  Claude Code    │     │  OpenClaw Agent   │
│  (SKILL.md)     │     │  (SKILL.md)       │
└────────┬────────┘     └────────┬──────────┘
         │                       │
         │   HTTP + Bearer Token │
         ▼                       ▼
┌─────────────────────────────────────────┐
│     Stage Hono Routes on Convex         │
│   /api/v1/projects, /tasks, /generate   │
│   auth, validation, limits, MCP tools   │
├─────────────────────────────────────────┤
│         API Key Auth Layer              │
│   Bearer stg_xxx → userId lookup        │
├─────────────────────────────────────────┤
│      Intake + Asset Storage Layer       │
│   raw text/files/images in R2           │
│   cleanup + retention rules             │
├─────────────────────────────────────────┤
│       Shared Business Logic             │
│   createProjectForUser()                │
│   structured writes into Convex         │
├─────────────────────────────────────────┤
│         Convex Database                 │
│   projects, phases, tasks, apiKeys      │
└─────────────────────────────────────────┘
```

---

## Automation Model

The long-term assumption should be:

- Users will increasingly operate Stage through Claude instead of only through the dashboard
- The dashboard remains important, but primarily as the canonical view and manual fallback editor
- Claude becomes the operational layer on top of Stage
- Stage still owns the real data model, permissions, auditability, and cleanup rules

That means the external API should support more than project creation. It should support:

- `get_project_status`
- `list_active_projects`
- `create_project_from_brief`
- `create_task`
- `update_task`
- `toggle_task`
- `attach_reference_assets`
- `generate_visual_concept`
- `save_generated_output_to_project`

In practice this means a user can ask:

- "What's the current status of Moonline Studio?"
- "Add 3 tasks to the homepage phase"
- "Generate 2 premium editorial visual directions in Stitch and attach them to the project"
- "Upload these screenshots to the project and summarize what they imply"

The agent does the orchestration, but Stage must enforce the rules.

## Security and Write Controls

Automation should not mean blind writes.

Recommended policy:

- Safe read actions:
  no confirmation required
- Additive writes with high confidence:
  can auto-execute
- Ambiguous writes:
  create a draft first
- Destructive writes:
  always require confirmation

Examples:

- "What is the status of this project?"
  read immediately
- "Create a branding project from this brief"
  create immediately only if the draft is high confidence
- "Delete these 14 tasks"
  never execute without explicit confirmation

This gives users strong automation without making the system reckless.

## Files, Images, Stitch, and Generated Outputs

Large attachments should not be stored as first-class Convex payloads.

Recommended split:

- `Hono with Convex`
  handles route structure, public API surface, MCP entrypoints, validation, and orchestration
- `R2`
  stores raw uploads, screenshots, PDFs, logo files, moodboards, and generated outputs
- `Convex`
  stores metadata, references, project linkage, task linkage, status, and realtime UI state

This keeps the architecture as one core backend system:

- `Convex` remains the source of truth
- `Hono` is the API/router layer on top of it
- `R2` handles large blobs and generated files

Example:

1. User uploads screenshots or logo files
2. Files go to `R2`
3. Metadata is written into Stage
4. Claude or another model analyzes the files
5. Structured findings are attached to the project
6. Stage UI updates in real time

For Stitch-style generation:

1. User asks Claude to create visuals
2. Claude calls the external generation API
3. Output files are saved to `R2`
4. Stage links those outputs to the relevant project, phase, or task
5. The project remains the source of truth for what was requested and what was produced

## Cleanup and Data Hygiene

Cleanup is not optional for this workflow.

Because users may send large raw context, images, and generated assets, Stage should have explicit retention rules:

- unfinished raw intake sessions can expire after a short window
- duplicate temporary uploads should be removed
- superseded generated outputs can be archived or deleted
- orphaned R2 objects must be pruned
- Convex records should track which assets are still referenced

This prevents automation from slowly turning into storage and bandwidth waste.

---

## Build Order (Combined)

Both agents can work in parallel. The frontend agent does not block on the backend agent (except F6 which needs the backend deployed, and F7/F8 which need B8).

```
Week 1 — Foundation
├── Frontend: F1 (stage-api-docs.ts)
├── Backend:  B1 (API key auth helper) + B2 (shared business logic)
│
Week 1–2 — Core
├── Frontend: F2 (Developer Tab) + F3 (API Docs Page)  ← parallel
├── Backend:  B3 (Hono router) → B4 (route handlers) + B6 (rate limits)
│
Week 2–3 — Integration & Stitch
├── Frontend: F4 (SKILL.md) + F5 (OpenClaw Page)  ← parallel
├── Backend:  B5 (AI project generation) + B8 (Stitch service layer)
│
Week 3–4 — Stitch UI + Distribution
├── Frontend: F6 (ClawHub listing) + F7 (Stitch generate UI) + F8 (Stitch results viewer)
├── Backend:  B7 (MCP Server) + B9 (Stitch API endpoint)
```

**Key dependency:** The frontend docs page (F3) and SKILL.md (F4) define the API contract. The backend agent should implement endpoints matching those definitions. If the backend needs to deviate, update `stage-api-docs.ts` to keep them in sync.

**Stitch dependency:** F7/F8 (Stitch UI) needs B8 (Stitch service) to be functional. B8 can start in parallel with everything else since it only depends on R2 (already done).

---

## Env Vars Needed

| Variable | Where | Purpose |
|----------|-------|---------|
| `RESEND_AUDIENCE_ID` | Convex | Audience sync (already set up) |
| `STAGE_RESEND_API_KEY` | Convex | Resend API (already set up) |
| `ANTHROPIC_API_KEY` | Convex | AI project generation |
| `GOOGLE_STITCH_API_KEY` | Convex | Google Stitch SDK authentication |
| `STAGE_API_KEY` | User's machine | For Claude Code / MCP to auth with Stage |
