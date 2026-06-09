# Stage macOS / Local Agent Concept - Client Intent Overview

Date: 2026-05-01

## Purpose Of This Document

This document is **not** an implementation plan.

It is a structured overview of:

- what the client appears to want
- what is explicitly stated
- what is implied but not confirmed
- possible technical solution directions
- open questions that affect scope and estimate

## High-Level Understanding

The client is describing a version of Stage that works beyond the web app.

The core idea seems to be:

> Stage should become a project-aware AI layer that helps designers while they work across Figma, browser, Notion, code editors, calls, and local files.

This does **not automatically mean** a full chat product like Codex or T3 Code. It can include chat-like input, but the Notion text mainly describes a companion/assistant, shortcuts, capture, screen context, and project-aware outputs.

## What The Client Explicitly Mentions

### 1. Native macOS Advantage

The Notion page says these features are only possible as a native desktop app because they need:

- screen access
- system-level shortcuts
- deep OS integration
- awareness of what the user is doing outside the web app

Meaning:

The client is not only asking for web UI improvements. They are thinking about capabilities that require a local desktop layer.

### 2. Cursor Companion

The client describes an always-on floating AI assistant.

Explicit behavior:

- triggered by a keyboard shortcut
- can accept voice or text input
- responds in a clean pop-up overlay
- stays out of the way near the cursor
- knows the active Stage project context

Project context includes:

- brief
- research
- strategy
- client preferences
- design decisions

Example questions:

- "What colors did we define for this brand?"
- "What did the client say about the hero section?"
- "Show me the competitors we researched."

Important nuance:

This suggests a command/assistant interface. It does not necessarily prove the client wants a full persistent chat app with threads, commits, provider switching, and terminal/session management.

### 3. Context-Aware Screen Reading

The client wants Stage to understand what app the user is working in.

Examples given:

- Figma: read/analyze layers, frames, components, or current design context
- Browser: analyze competitor websites, references, inspiration
- Notion: pull client notes, meeting summaries, project docs
- VS Code / Cursor: understand codebase context for design-to-dev handoff

Important distinction:

There are two very different ways to interpret "understand":

- visual/screenshot understanding of what is on screen
- structured data access through official APIs/plugins/local files

These have very different technical requirements.

### 4. Quick Capture

The client wants one shortcut to capture something from the screen into the active Stage project.

Explicit behavior:

- global shortcut activates capture mode
- user selects part of the screen
- Stage saves it into the active project
- Stage auto-categorizes it

Categories mentioned:

- reference image
- color palette
- typography sample
- UI pattern
- competitor screenshot

Possible output:

- saved asset
- AI-generated tags
- later usable in moodboard/research/design generation

### 5. Design Critique On Demand

The client wants Stage to critique design work while the user is in Figma.

The critique should compare the current design against:

- project brand strategy
- approved design direction
- client brief
- best practices

Important nuance:

This can be done at different levels:

- MVP: screenshot of the current Figma view + Stage project context
- deeper version: actual Figma layers/components/styles via Figma API or plugin

### 6. Voice-To-Brief

The client wants conversations to become structured project briefs.

Explicit behavior:

- record/listen during a client call
- transcribe in real time or after the call
- structure the result into project context

Structured output includes:

- project goals
- client preferences
- constraints and requirements
- timeline
- key decisions made

This has privacy/consent implications.

### 7. Ambient Research Mode

The client wants passive inspiration collection while browsing.

Explicit behavior:

- user enables "Research Mode"
- Stage watches what the user browses
- captures screenshots, colors, layout patterns, typography choices
- generates a moodboard at the end
- user approves/discards collected items

Important nuance:

This is broader than a normal browser extension because the client describes cross-app/macOS-level awareness. But the first version might still be browser-extension-based or screenshot-based.

### 8. Push-To-Figma

The client wants generated Stage assets to be pushed into Figma.

Assets mentioned:

- color systems as Figma color styles
- typography scales as Figma text styles
- wireframe layouts as Figma frames
- component structures
- design tokens

Important uncertainty:

This likely needs official Figma access if it must create real Figma objects. A local app can screenshot Figma, but it cannot reliably write structured frames/styles into Figma without Figma API, plugin, or another authorized integration path.

### 9. Smart Handoff Packages

The client wants one shortcut to package the project state for delivery.

Outputs mentioned:

- research summary
- strategy document
- approved brand assets
- design files with annotations
- client-ready PDF
- Notion page
- Stage Portal link

The goal is to reduce manual packaging work from hours to a short automated flow.

## What You Added / Clarified

You compared this to T3 Code.

The important point:

T3 Code works locally because it can read local project files and use local Codex/Claude configuration/authentication.

That pattern could apply to:

- local project files
- `.codex`
- `.claude`
- local agent sessions
- local folders
- local repo context

But that same pattern does **not automatically apply** to:

- Figma cloud documents
- Notion private workspaces
- other SaaS tools that require OAuth/API permissions

## Authentication Difference By Tool

### Codex / Claude

Possible local approach:

- detect local `.codex` or `.claude`
- use the user's already-authenticated local CLI/session
- run or orchestrate existing local agents
- avoid becoming an official OAuth app for those agents

This is why T3 Code-like behavior is plausible.

### Figma

Possible local-only access:

- screenshots
- screen recording
- visible UI analysis
- user-pasted Figma links
- local exported files, if the user provides them

Structured Figma access likely requires:

- Figma OAuth
- Figma personal access token
- Figma plugin
- public/shared Figma file access

So the question is:

Does the customer need "Stage can see what is visually on my screen" or "Stage can read/write real Figma document structure"?

Those are not the same product.

### Notion

Possible access:

- public Notion pages
- user-pasted content
- exported markdown
- official Notion OAuth/integration

Private workspace content likely requires:

- Notion OAuth
- integration token
- explicit page/database permissions

Local Notion cache scraping should not be assumed as a safe product approach.

## Possible Technical Solution Directions

These are options, not decisions.

### Option A: Local Agent GUI

Similar category to T3 Code.

Capabilities:

- open/select local project
- read local files
- detect `.codex` / `.claude`
- switch between Codex and Claude
- inject Stage project context
- store local session state
- sync approved summaries/artifacts back to Stage

Good for:

- local file research
- coding/design-dev handoff
- agent orchestration
- project-aware conversations

Weak for:

- real Figma document access
- private Notion workspace access
- cross-app capture unless desktop permissions are added

### Option B: macOS Companion Overlay

Native desktop assistant.

Capabilities:

- global shortcuts
- floating overlay
- screen capture
- selected-area capture
- active app detection
- voice capture
- local notifications

Good for:

- Cursor Companion
- Quick Capture
- screenshot-based Figma critique
- ambient research

Weak for:

- structured SaaS data access unless combined with OAuth/plugins

### Option C: Browser Extension

Browser-specific research/capture helper.

Capabilities:

- capture current tab
- inspect page URL/title/content
- save references to Stage
- collect browsing inspiration

Good for:

- competitor research
- website inspiration
- lighter ambient research

Weak for:

- Figma desktop app
- Notion desktop app
- system-wide shortcuts
- non-browser tools

### Option D: Figma Plugin / Figma API Integration

Official Figma route.

Capabilities:

- read layers/frames/components/styles
- create frames
- create/update styles
- import generated design assets

Good for:

- Push-To-Figma
- structured design critique
- design token sync

Weak for:

- requires Figma permission/auth/plugin install
- cannot be treated like local `.codex` auth

### Option E: Notion Integration

Official Notion route.

Capabilities:

- read selected Notion pages/databases
- create handoff pages
- sync summaries/docs

Good for:

- Smart Handoff Packages
- client notes
- meeting summaries

Weak for:

- requires integration setup and page permissions

## Current Stage Architecture Context

The current Stage repo appears to use:

- React + Vite frontend
- TanStack Router
- Convex for backend/database/functions/auth-related logic
- R2 via Convex integration for file/blob storage
- Cloudflare Worker as app host and proxy for `/api/*` and `/stripe/*`

This means a local app would likely talk to existing Stage cloud services rather than replace them.

Possible cloud/local boundary:

- local app reads local files and local agent state
- Convex remains source of truth for projects/tasks/clients/research/strategy
- R2 stores approved uploaded files/assets
- local app only syncs what the user approves

## Open Scope Questions

These questions materially affect time estimate.

1. Does the client want a full chat/thread GUI, or only a shortcut command overlay?
2. Should Codex/Claude run through local CLI sessions, or through Stage-owned API keys?
3. Does Stage need to read real Figma layers, or is screenshot-based analysis acceptable for MVP?
4. Does Stage need to write into Figma, or only produce assets that the user can import?
5. Does Notion need official workspace integration, or only public/exported pages?
6. Is ambient research allowed to watch browser activity continuously, or only after explicit capture?
7. What data may be uploaded to Stage cloud, and what must remain local?
8. Should the desktop app be Tauri, Electron, or a lighter local web app wrapper?
9. Does this need to work only on macOS first, or cross-platform later?
10. What is the minimum demo the client would consider valuable?

## Estimate-Relevant Buckets

For estimating, this should be split into separate product/technical buckets:

- local agent GUI
- Stage project context sync
- local filesystem indexing
- Codex/Claude session orchestration
- macOS shortcuts/overlay/screen capture
- research capture and moodboard generation
- Figma read/write integration
- Notion read/write integration
- voice transcription and brief generation
- handoff package generation
- privacy/security/permissions model

## Key Interpretation To Keep In Mind

The client is describing an ambitious product vision.

The safest interpretation is:

> Stage should help designers by combining project context, local work context, and AI agents.

The unresolved question is **how much of that should be local agent GUI, how much should be native macOS capture, and how much should be official integrations like Figma/Notion**.
