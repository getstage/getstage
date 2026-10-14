# !!! Agentic sidebar: Claude / Codex acting inside Stage (MCP)

> **Status:** Plan. Nothing is built. Not scheduled.
> **Owner:** Wessel
> **Last updated:** 2026-09-30
> **Source:** Stage V3 prototypes, section 3 "Agentic chat" (right-hand panel per tab)

## What it is

A right-hand sidebar on every project tab with the user's own Claude or Codex. It
**sees what you are working on** (the open tab: Research, Strategy, Moodboard, Style
guide, Flows, Wireframes) and **makes changes in Stage directly**:

- "Make the accent warmer" → the accent colour in the style guide changes.
- "Tag the 6 untagged references for me" → six references get a section tag.
- "Which sections have too few references?" → an answer from the project data.
- "Pull the look from the Hero references only" → the existing style-guide
  generation runs again with only Hero references.

**It does not replace anything.** Research, Strategy, Moodboard, Style guide,
Flows and Wireframes generation stay exactly as they are. The sidebar is for extra
edits and questions on top of what exists, and can always be used again to change
things back.

## Today (from the code)

| Fact | Where | Meaning for the sidebar |
|---|---|---|
| The chat already runs the user's Claude / Codex CLI with bounded project context from Convex. | `apps/stage-engine/src/chat/`, `providers/claude.rs`, `providers/codex.rs` | Provider login, model choice, context loading and image attachments exist. |
| It is one-shot: `--print`, text output, no session, no Stage tools. | `providers/claude.rs` (`claude_args`) | The chat can talk about a project but cannot change it. This is the gap. |
| Generation pipelines call the CLI once and scrape JSON from text, then repair and normalize it (~13k lines of Rust). | `helpers/provider_json.rs`, `providers/process/heuristics.rs`, `*/normalize.rs` | This is what makes Research etc. reliable. The sidebar must not bypass it. |
| Every tab already has an update mutation. | `packages/data-ops/convex/projectAi.ts` (`updateResearchArtifact`, `updateStrategyArtifact`, `saveMoodboardArtifact`, `updateFlowsArtifact`, `updateWireframesArtifact`) | Edit actions reuse these; no new storage needed. |
| The app updates live when Convex data changes. | Convex subscriptions | A change made by the sidebar appears on screen by itself. |
| A public REST API with API keys exists. | `packages/data-ops/convex/api/` (`/api/v1`) | Useful later for external agents; not needed for the sidebar. |
| No MCP server exists. The V3 prototype's `npx @getstage/mcp` is a mock. | none | To build. |

## Decision: MCP, hosted by the local stage-engine

**MCP** (Model Context Protocol) is an API for AI models: the server describes its
actions (name, explanation, input schema), and Claude or Codex call them. Stage
still performs every change itself.

Why MCP instead of letting the model write JSON that Stage reads afterwards (how
the pipelines work):

| | MCP actions | Model writes JSON, Stage parses it |
|---|---|---|
| Reliability | Each action is validated on its own; on an error the model sees it and corrects | Known fragility: Codex narration, broken JSON, repair code |
| Back and forth | Look, act, check | One answer |
| Live feedback | "✓ Accent updated" while it happens | Only at the end |
| Support | Built into Claude Code and Codex | Custom parsing |
| Reuse | Same actions later for external agents (V3 screen 9, "Wireframes & MCP") | None |

### Architecture

```txt
Sidebar (renderer)
  │ message + current view (project, tab, selection)
  ▼
Electron main → stage-engine (local, already running)
  ├─ MCP endpoint on 127.0.0.1, secret token per sidebar session
  └─ starts Claude / Codex with that MCP server attached
        Claude: --mcp-config <stage server> --allowedTools "mcp__stage__*"
        Codex:  mcp_servers.stage in its config
  ◄─ model calls an action, e.g. set_color(role: "accent", hex: "#4F6B35")
  ├─ engine: load artifact from Convex → apply only that change
  │          → validate with the existing normalizer → save via existing mutation
  │          → store previous version for undo
  └─ result back to the model
Convex → app refreshes live
```

- MCP library: `rmcp` (official Rust SDK), inside the engine's existing Axum server.
- The engine decides the project and user; the model never chooses them.
- The sidebar keeps one CLI session per conversation (resume or streaming input)
  instead of starting a new process per message.

### Example: "Make the accent warmer"

```txt
Claude → get_styleguide()
Stage  ← accent #2F5D3F, background #FAF8F4, text #1C1917, look "Warm editorial…"
Claude → set_color(role: "accent", hex: "#4F6B35")
Stage  checks: valid hex, contrast with background and text, saves, keeps old version
Claude: "Accent #2F5D3F → #4F6B35: warmer, more olive. Contrast still passes."  [Undo]
```

Taste comes from the model. What may change, and whether it is valid, is decided by Stage.

## Actions (first draft)

Three kinds: **read**, **small edit** (the model picks the value, Stage validates),
**existing pipeline with options** (the model only starts it; after user confirmation).

| Tab | Read | Small edits | Existing pipeline |
|---|---|---|---|
| All | `get_current_view`, `get_project_summary` | none | none |
| Research | `get_research` | `edit_insight`, `edit_persona`, `remove_item` | `regenerate_research_section(section)` |
| Strategy | `get_strategy` | `edit_priority`, `reorder_priorities`, `edit_positioning` | `regenerate_strategy_section(section)` |
| Moodboard | `get_moodboard`, `get_reference_images` | `tag_reference(id, section)`, `rename_reference`, `remove_reference` | none |
| Style guide | `get_styleguide` | `set_color(role, hex)`, `set_font(role, family)`, `set_radius`, `update_look_text` | `regenerate_styleguide(sections[])` |
| Flows | `get_flows` | `add_step`, `rename_step`, `move_step`, `remove_step`, `link_insight` | `regenerate_flows` |
| Wireframes | `get_screens` | `annotate_screen`, `rename_screen` | `regenerate_screen(id)` |

The exact edit actions per tab follow the artifact shapes in `apps/stage-engine/src/*/normalize.rs`.

## Skills

- **MCP = the hands** (what it can do). **Skill = the knowledge** (how to do it well).
- Not needed to start: a good per-tab instruction plus clear action descriptions.
- Later, for taste-sensitive requests: a colour/typography skill for Style guide
  (next to the existing `apps/stage-engine/skills/design-taste-frontend`), and the
  skills the user ticks in the panel (UX writing, Accessibility) passed to the sidebar.

## Guardrails (enforced by Stage, not by the prompt)

| Guardrail | Why |
|---|---|
| Claude's / Codex's own tools off (no shell, no file writes, no web unless needed) | Otherwise the agent can run commands on the user's Mac. **Most important.** |
| Only the current tab's actions | No edits outside what the user is looking at |
| Ask = read actions only; Create = edits too | Questions never change data |
| Every action validates input (hex, contrast, font exists, tag is a known section, text length) | Invalid data never reaches Convex |
| Project and user set by the engine | No access to other projects |
| Undo for every change; version check on save | Mistakes and concurrent manual edits are safe |
| Regenerate / delete need a user click | No surprise large changes |
| Max actions per request, timeout, stop button | No runaway loops or burned subscriptions |
| Reference and web text is data, not instructions | Limits prompt injection; bounded by the actions anyway |
| Log each action (outcome, duration, error) | Feeds STA-31 monitoring |

## Expected performance

| Request | Expectation |
|---|---|
| Questions about the project | Very good |
| One small edit | Very good |
| Several edits at once | Good; occasional wrong choice → undo |
| Latency | A few seconds to ~30 s per request |
| Cost | The user's Claude / Codex subscription; more turns than a single generation |

## Open risks (verify first)

1. **Codex + MCP in non-interactive mode.** Stage runs Codex with approvals set to
   `never`; confirm MCP tool calls run and are not cancelled.
2. **Session per conversation.** Today each message starts a new CLI process.
   Multi-turn latency depends on keeping or resuming the session.
3. **Token usage** per request on normal subscriptions.
4. **Images to the model** for moodboard questions (reference images from R2 as local files).
5. **Concurrent edits** while the user edits by hand (version check).

## Plan

| Step | Content | Estimate |
|---|---|---|
| 0. Spike | MCP endpoint in engine + 3 actions on Style guide / Moodboard; 15 fixed tasks on Claude and Codex; measure success, time, tokens | 1–2 days |
| 1. MCP foundation | Endpoint, session token, CLI wiring for Claude and Codex, guardrails, logging | 2–3 days |
| 2. Sidebar UI | Messages, live action feed, undo, stop, Ask / Create, current-view context | ~1 week (builds on the current chat) |
| 3. Actions per tab | 4–6 actions per tab incl. validation and undo; Style guide first | ~1 week per tab |
| 4. Skills | Colour/typography skill, user-selected skills | 2–3 days |
| **Total (6 tabs)** | | **~5–8 weeks** |

Part 1 of V3 is due 2026-10-12. The full sidebar does not fit in that window;
the spike plus one tab (Style guide) does.

## Scope

This is a new feature with architectural changes (new MCP layer in the engine, an
agent loop instead of one-shot chat, per-tab actions with validation, undo/history,
guardrails, new UI). It is outside maintenance and support and is estimated and
priced separately, like the other V3 items:

| V3 item | Scope |
|---|---|
| Agentic sidebar (this plan) | New feature + architecture |
| Canvas with step-specific blocks | New feature / redesign |
| Visuals tab with image AI (Limora, Higgsfield) | New feature + integrations |
| Client role in the workspace | New feature (roles, permissions) |
| Wireframes via the user's own agent over MCP | New feature (reuses this MCP layer) |
| Bug fixes, small copy/UI tweaks, keeping current flows working | Support |

## Confidence

| Outcome | Confidence | Why |
|---|---|---|
| The approach works technically (MCP in the engine, Claude calls Stage actions, changes appear live) | **~90 %** | Standard protocol, native in Claude Code; the engine already has provider handling, Convex access, auth and per-tab save mutations. |
| Claude in the sidebar handles questions and small edits well enough to ship | **~80 %** | Small, validated actions on existing data are the model's strongest case; undo covers mistakes. Remaining risk: latency per message. |
| Codex reaches the same level | **~60 %** | MCP is supported, but tool calls in Stage's non-interactive Codex mode are unverified. Fallback: Claude first, Codex later. |
| Taste-heavy requests ("warmer", "more premium") feel right most of the time | **~70 %** | Depends on per-tab instructions and a colour/typography skill; improves with iteration. |
| All six tabs done by 2026-10-12 | **~10 %** | ~5–8 weeks of work. Spike + Style guide by then: **~65 %**. |

The spike (step 0) turns the lower numbers into measurements before the larger
build starts.
