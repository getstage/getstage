# Stage AI Workflow Context Plan

Date: May 30, 2026 (plan) · **Research V1 status: June 1, 2026**  
Status: Discussion plan; Research desktop path **implemented** — see docs below  
Scope: Project AI workflows, Claude/Codex, Refero, voice, Figma-driven product flows

> **Research V1 (implemented):** [`RESEARCH_DEV_STATUS.md`](./research/RESEARCH_DEV_STATUS.md) — full structure, file map, Refero→R2 flow.  
> **May 31 dev session (logging, mock fix):** same file, history sections.  
> **Refero MCP rules:** `.agents/skills/refero-mcp/SKILL.md`

## CAPTION: Research V1 structure (June 2026)

Desktop Research uses this internal path only:

```txt
React (Configure + Research tab)
  → Electron IPC (mode: research)
  → Stage Engine workflow.rs
       → Convex getResearchInput / createResearchRun
       → Refero MCP (refero/service.rs + refero/parse.rs)
       → R2 upload (refero_assets.rs, purpose: research-refero)
       → Codex/Claude prompt (research/prompt.rs)
       → wire_refero_images_in_artifact
       → Convex completeResearchRun (replaces prior artifact + R2 keys)
  → React getLatestResearchArtifact → UI
```

React does **not** assemble AI context or call Refero. Stage Engine is the context owner for Research.

Other tabs (Strategy, Moodboard, Generate) are **not** fully on this path yet — this plan still applies to them.

---

## CAPTION: Why this document exists

We are intentionally bringing the AI workflow back to the basics.

The risk right now is not that Stage cannot call Claude, Codex, Refero, Figma, or
Notion. The risk is that every tab starts calling AI in its own way, with its own
context shape, its own prompt, and its own output format.

That would recreate the same problem we are trying to avoid:

```txt
Research has one AI flow.
Strategy has another.
Moodboard has another.
Chat has another.
Voice has another.
Generate has another.

Nobody knows what context was used, what output should look like, or where the
result should be stored.
```

The goal is one clear workflow architecture.

```txt
Input context -> workflow contract -> Claude/Codex execution -> typed artifact
-> editable UI -> approved project state
```

## CAPTION: Skills used as the standard

Use these local skills as the quality bar:

```txt
.agents/skills/stage-monorepo-architect/SKILL.md
.agents/skills/electron/SKILL.md
.agents/skills/rust-engineer/SKILL.md
.agents/skills/rust-async-patterns/SKILL.md
.agents/skills/rust-best-practices/SKILL.md
.agents/skills/tanstack-router-best-practices/SKILL.md
.agents/skills/tanstack-query-best-practices/SKILL.md
```

Core rule:

```txt
React renders workflows.
Convex stores project data and generated artifacts.
Electron owns the bridge and sidecar lifecycle.
Stage Engine reads/writes AI workflow context from Convex directly, then runs
Claude/Codex and local/deep context tasks.
Refero provides external design reference intelligence.
```

## CAPTION: May 31 architecture correction

This document previously leaned too much toward React or REST API as the context
handoff layer for AI runs.

That is not the clean internal desktop architecture.

Correct rule:

```txt
For in-app AI workflows, Stage Engine connects to Convex directly.
```

Why:

```txt
React often does not know enough.
React should not assemble the full AI context.
Workspace chat, critique, voice, Research, Strategy, Moodboard, and Generate all
need project context that lives in Convex.
Stage Engine is the AI brain and context runner, so it must be able to fetch and
write the relevant Convex data itself.
```

Use REST API for this:

```txt
external agents
Claude Code / Codex outside Stage
third-party integrations
public developer API
Agent Skill usage outside the desktop app
```

Do not use REST API as the main internal desktop path for Research/chat context.

Internal desktop path:

```txt
React -> Electron IPC -> Stage Engine -> Convex direct
                              -> Refero
                              -> Claude/Codex
                              -> Convex direct
                              -> React stream/update
```

External agent path:

```txt
Claude Code / Codex outside Stage -> Stage REST API -> Convex
```

This keeps the desktop workflow simple:

```txt
React sends intent and current surface.
Stage Engine fetches the full project context.
Convex remains the source of truth.
Stage Engine writes runs/messages/artifacts back to Convex.
```

## CAPTION: Stage Engine Convex auth decision

This is the next architecture blocker before Research can be completed.

Problem:

```txt
Electron/React already know the current desktop session.
Stage Engine needs to read/write Convex directly for AI workflows.
Stage Engine must not get unlimited database access.
Stage Engine must act only for the current authenticated user/workspace/project.
```

Recommended direction:

```txt
Electron owns the desktop auth session.
Electron gives Stage Engine a short-lived, scoped engine auth token.
Stage Engine uses that token when calling Convex queries/mutations.
Convex validates the token scope before returning or writing project data.
```

Token lifetime recommendation:

```txt
Default: 10-15 minutes.
Refresh: Electron can rotate/refresh while the desktop session is active.
Scope: current userId, workspaceId, allowed projectIds, allowed AI operations.
Revoke: token is invalidated when the user signs out, switches workspace, or
disconnects the desktop session.
```

Why not longer:

```txt
A long-lived token inside a local sidecar increases blast radius if anything
goes wrong.
```

Why not extremely short:

```txt
Research, voice, chat, and provider runs can take time.
If the token expires every 60 seconds, the system becomes annoying and fragile.
```

V1 acceptable rule:

```txt
Use a short-lived scoped token with a 15 minute TTL and refresh it through
Electron while the user remains signed in.
```

Open technical decision:

```txt
Should Convex validate this token as a custom JWT/session claim, or should
Stage Engine call a small Convex auth mutation first to exchange the desktop
session for an engine-scoped token?
```

This must be solved before:

```txt
Stage Engine can fetch full Research context from Convex.
Stage Engine can store projectAiRuns.
Stage Engine can store projectAiArtifacts.
Workspace chat can reliably answer project-aware questions.
```

## CAPTION: Product split

The product should be split into two large tracks.

### Track 1: Project intelligence

This is the thinking layer.

```txt
Overview
Research
Strategy
Moodboard
Style Guide
```

Purpose:

```txt
Understand the project, client, market, visual direction, and design rules.
```

### Track 2: Generation and delivery

This is the production layer.

```txt
Flows
Generate
Wireframes
Assets
Client Portal / Export
```

Purpose:

```txt
Turn the approved intelligence into screens, flows, wireframes, assets, and
client-facing deliverables.
```

Voice and chat are not separate product tracks. They are input methods that can
operate inside both tracks.

## CAPTION: Current React implementation status

Important discovery:

```txt
Much of the Figma UI already exists in React.
The next work should not start by rebuilding all Figma screens.
The next work should connect the existing React UI to real workflow contracts,
artifacts, and providers.
```

Existing project shell:

```txt
apps/user-application/src/project/components/ProjectDetailView.tsx
```

Existing tab entrypoints:

```txt
apps/user-application/src/components/project/tabs/research/ResearchTab.tsx
apps/user-application/src/components/project/tabs/strategy/StrategyTab.tsx
apps/user-application/src/components/project/tabs/moodboard/MoodboardTab.tsx
apps/user-application/src/components/project/tabs/flows/FlowsTab.tsx
apps/user-application/src/components/project/tabs/wireframes/WireframesTab.tsx
apps/user-application/src/components/project/tabs/assets/AssetsTab.tsx
apps/user-application/src/components/project/tabs/GenerateTab.tsx
```

Research is already split into smaller React components:

```txt
apps/user-application/src/components/project/tabs/research/ResearchTab.tsx
apps/user-application/src/components/project/tabs/research/ResearchSummary.tsx
apps/user-application/src/components/project/tabs/research/CompanySnapshot.tsx
apps/user-application/src/components/project/tabs/research/CompetitiveAnalysis.tsx
apps/user-application/src/components/project/tabs/research/UiPatterns.tsx
apps/user-application/src/components/project/tabs/research/TargetUsers.tsx
apps/user-application/src/components/project/tabs/research/Opportunities.tsx
apps/user-application/src/components/project/tabs/research/ResearchActions.tsx
apps/user-application/src/components/project/tabs/research/PhotoLightbox.tsx
apps/user-application/src/components/project/tabs/research/ResearchPrimitives.tsx
apps/user-application/src/components/project/tabs/research/researchIcons.tsx
```

Current Research UI already includes:

```txt
Research Summary
Company Snapshot
Competitive Analysis
Card View
Matrix View
UI Patterns
Target Users
Opportunities
Edit state
Photo lightbox
Generate Strategy action
```

Current limitation:

```txt
The Research UI is mostly fixture-driven.
It reads from:

apps/user-application/src/data/fixtures/project/researchTabFixtures.ts

It is not yet connected to:
  real researchArtifact data
  Convex persistence
  Refero results
  Claude/Codex generation
  voice-filled input
```

Generate tab status:

```txt
apps/user-application/src/components/project/tabs/GenerateTab.tsx

This tab currently looks more placeholder-level than Research.
Do not treat Generate as equally complete yet.
```

Practical conclusion:

```txt
Tomorrow's work should be:
1. Audit the existing tab UI.
2. Preserve the React UI that already matches Figma.
3. Replace fixture data with typed artifacts.
4. Connect workflow generation after the artifact contract is agreed.
```

## CAPTION: What Stage should always know

Stage should not ask the user for context it already has.

Global project context:

```txt
projectId
projectName
clientName
industry
website
projectBrief
targetPlatform
projectStage
uploadedFiles
projectNotes
existingTasks
existingDecisions
approvedArtifacts
connectedIntegrations
```

User context:

```txt
userId
workspaceId
role
providerPreferences
connectedLocalProviders
connectedCloudIntegrations
```

Design context:

```txt
selectedMoodboards
uploadedScreens
approvedStyleGuide
approvedFlows
approvedWireframes
assetLibrary
```

External context:

```txt
Refero screens
Refero flows
Figma files or selected frames
Notion pages
Google Sheets rows
```

Important privacy/product rule:

```txt
AI should have full project context inside Stage, but not uncontrolled access to
everything on the user's computer.
```

Desktop file access must be explicit, scoped, and run through Stage Engine.

## CAPTION: Context levels

Not every AI call needs all context.

Use three levels.

### Level 1: Current surface context

Used for quick chat, local explanations, small edits.

```txt
current tab
current selected object
current visible artifact
current user prompt
```

Example:

```txt
"What does this opportunity mean?"
```

### Level 2: Project context

Used for research, strategy, styleguide, flow generation.

```txt
project details
brief
industry
website
competitors
previous approved artifacts
current tab state
user prompt
```

Example:

```txt
"Generate strategy from this research."
```

### Level 3: Extended external context

Used when the workflow needs outside intelligence.

```txt
project context
Refero search results
Figma selected frames
Notion source notes
Google Sheets imported rows
uploaded images/files
```

Example:

```txt
"Generate a moodboard direction using Refero examples and these uploaded
screens."
```

## CAPTION: Workflow contract

Every AI workflow should have the same contract shape.

```ts
type StageAiWorkflowRequest = {
  workflow: StageAiWorkflow;
  projectId: string;
  provider: "claude" | "codex";
  modelId: string;
  input: unknown;
  context: StageWorkflowContext;
  options: StageWorkflowOptions;
};
```

The important part is not the exact TypeScript yet. The important part is that
every workflow follows the same mental model:

```txt
Which workflow is this?
Which project is this for?
Which provider should run it?
What explicit user input was provided?
What Stage context is included?
What output artifact should be returned?
```

## CAPTION: Artifact model

AI output should not be stored as random chat text.

Each workflow returns a typed artifact.

```txt
researchArtifact
strategyArtifact
styleGuideArtifact
moodboardArtifact
flowArtifact
wireframeArtifact
assetArtifact
chatMessageArtifact
voiceTranscriptArtifact
```

Research decision:

```txt
Research is stored as one researchArtifact.
The UI may edit individual fields and regenerate sections/items, but storage
stays one artifact for the full Research result.
```

Artifacts should have lifecycle state:

```txt
draft
generated
edited
approved
exported
archived
```

This matters because the Figma designs clearly show review loops:

```txt
Generate -> edit -> regenerate -> save -> approve -> continue
```

## CAPTION: Claude/Codex role

Claude/Codex is the reasoning and generation layer.

Use it for:

```txt
research synthesis
strategy generation
styleguide extraction
flow planning
wireframe specification
design critique
project-aware chat
voice-command execution
```

Do not use it for:

```txt
OAuth
Notion file writes
Figma file writes
Google Sheets import
direct renderer file access
unscoped local shell access
```

Those belong to integration adapters or Stage Engine.

## CAPTION: Refero role

Refero should be treated as design reference intelligence.

Expected role:

```txt
Find relevant product screens.
Find relevant flows.
Return reference material for patterns, competitors, UI states, and moodboards.
```

Refero should not own Stage project logic.

Refero output becomes context for Claude/Codex:

```txt
Refero results -> Stage context builder -> Claude/Codex synthesis -> Stage artifact
```

Example:

```txt
Research asks Refero for fintech onboarding screens.
Claude/Codex summarizes the patterns and creates Stage research sections.
Convex stores the result as a research artifact.
React renders the Research tab.
```

Confirmed Refero decisions:

```txt
Refero is part of the default AI workflow.
Research should always use Refero when running generation.
All main workflows should eventually use Refero where visual/product references
matter, but implementation happens step by step.
The Refero token must not live in React.
The Refero token should be stored in desktop secure storage for the desktop app,
with an environment variable fallback for local development.
```

V1 implementation order:

```txt
1. Research
2. Moodboard / Style Guide
3. Flows
4. Generate / Wireframes
```

Technical boundary:

```txt
React:
  Shows workflow UI.
  Sends typed intent/surface requests.
  Renders typed artifacts.
  Does not fetch or assemble full AI context.

Electron:
  Owns secure IPC.
  Starts and supervises Stage Engine.
  Can provide secure token access to Stage Engine if needed.

Stage Engine:
  Reads workflow context from Convex directly.
  Writes runs/messages/artifacts back to Convex directly.
  Calls Refero.
  Calls Claude/Codex.
  Builds context.
  Normalizes external results.
  Streams run progress.

Convex:
  Stores project AI context.
  Stores project AI runs.
  Stores project AI artifacts.
```

Internal desktop AI runs should not depend on:

```txt
React manually collecting all project context.
HTTP cron-style Convex routes.
REST API roundtrips for normal in-app workflow context.
```

The REST API still exists, but it is not the default internal desktop workflow
path.

Refero should not be called directly from:

```txt
React components
random hooks
Convex actions without an explicit architecture decision
```

## CAPTION: Voice role

Voice is an input method, not a separate workflow architecture.

Pipeline:

```txt
microphone recording
-> Voxtral Mini Transcribe
-> transcript
-> intent detection
-> Stage workflow request
-> Claude/Codex run
-> typed artifact or chat answer
```

Voice should work across the project:

```txt
Research: "Find competitors for this project."
Strategy: "Generate a strategy from the current research."
Moodboard: "Create a darker premium direction."
Flows: "Generate onboarding flow variants."
Wireframes: "Make this high fidelity and use the approved styleguide."
Chat: "Explain what is missing in this project."
```

## CAPTION: Voice outside Stage

Stage voice should also work when the user is outside the Stage window.

Example:

```txt
The user is working in Figma.
The user triggers Stage voice.
The user says: "Critique this layout based on the brief."
Stage should understand the active project context and answer with relevant
feedback, not a generic design critique.
```

This is not a separate AI product. It is the same Stage workflow layer with a
system-wide input surface.

Figma design reference:

```txt
Figma node: 799:9
Design name: FIgma SS
Relevant states: Audio - Idle, Audio - Active, Audio <> Chatbot
```

The design shows a small audio/control surface that can sit on top of another
application. This should be treated as a desktop companion overlay, not as a
normal in-app page.

## CAPTION: Voice outside Stage workflow

System-wide voice flow:

```txt
global shortcut / tray action / floating control
-> open small Stage voice overlay
-> record user speech
-> transcribe with Voxtral Mini Transcribe
-> detect active app context
-> build Stage context from Convex
-> optionally add active app context, e.g. Figma file/frame/selection
-> send task to Claude/Codex through Stage Engine
-> show answer in compact overlay or expand into Stage chat
```

For Figma specifically:

```txt
active application: Figma
active file or known Figma URL
selected frame/page if available
current Stage project
approved research artifact
approved strategy artifact
approved styleguide artifact
open decisions
user voice transcript
```

The expected user experience:

```txt
The user does not need to switch back to Stage.
Stage listens, understands the current project context, and answers in place.
```

## CAPTION: Context policy for outside-Stage voice

The phrase "full context" means:

```txt
Claude/Codex can receive all relevant Stage context that belongs to the active
project and workspace.
```

It does not mean:

```txt
Claude/Codex gets uncontrolled access to the user's entire computer.
```

Use this policy:

```txt
Always available:
  active Stage workspace
  active Stage project
  project metadata
  Convex project data
  saved artifacts
  approved research
  approved strategy
  approved styleguide
  tasks and decisions

Available when connected/allowed:
  Figma file/frame context
  Notion source notes
  Google Sheets imported rows
  Refero search results

Never automatic:
  arbitrary local files
  unrelated folders
  unrelated projects
  browser/app data without permission
```

The context builder should have access to all Stage project data, but it should
pack only the relevant context into each Claude/Codex run.

Reason:

```txt
Full project intelligence is good.
Unbounded context dumping is expensive, noisy, and unsafe.
```

## CAPTION: Outside-Stage voice technical boundary

Ownership:

```txt
Electron:
  global shortcut
  tray/menu action
  floating always-on-top overlay window
  microphone permission surface
  frontmost app/window detection

React:
  voice overlay UI
  audio idle/listening/thinking/response states
  transcript review
  compact chat response

Stage Engine:
  provider execution
  cancellation
  streaming
  local context helpers
  future native app context helpers

Convex:
  workspace/project context
  saved artifacts
  integration state
  generated outputs
```

V1 should avoid deep native macOS APIs unless needed.

Recommended V1:

```txt
Use Electron globalShortcut.
Use a small always-on-top BrowserWindow for the voice overlay.
Use existing browser/Electron microphone capture where possible.
Use Voxtral Mini Transcribe for batch transcription.
Use Convex for project context.
Use explicit Figma integration/MCP context when available.
```

Later versions can add:

```txt
ScreenCaptureKit
Accessibility API
deeper active app extraction
native audio pipeline
```

## CAPTION: Outside-Stage voice open decisions

Decisions still needed:

```txt
1. How does Stage know which project is active when the user is in Figma?
2. Should the user manually pin a project to the voice overlay?
3. Should Stage infer the project from the Figma file link?
4. Should the overlay answer only, or also save results into artifacts?
5. Should voice commands mutate artifacts directly, or require confirmation?
6. Should Figma context come from MCP/plugin selection, pasted link, or connected file?
7. What is the first V1 command: critique, ask question, or fill workflow input?
```

## CAPTION: Research workflow

Research is the first workflow to implement end-to-end.

Input context:

```txt
project name
client name
industry
website
project brief
competitor websites
target users
additional notes
uploaded files or screenshots
optional Refero query
```

External context:

```txt
Refero screens
Refero flows
website data if available
Notion notes if connected
Google Sheets rows if imported
```

Output artifact:

```txt
research summary
company snapshot
competitive analysis
UI patterns
target users
opportunities
open questions
source references
```

Confirmed Research output shape:

```txt
Research is one researchArtifact.
Competitive Analysis supports both Card View and Matrix View.
UI Patterns should include real Refero screenshots/references when available.
Target Users are generated dummy/persona profiles, not only imported real users.
Regeneration is primarily per block/section, with optional per-item regeneration.
Editing can happen per visible field/cell/card, but the saved artifact is still one artifact.
The output should follow the Figma structure closely.
```

Competitive Analysis output:

```txt
cardView:
  competitor cards
  logo/name/domain
  positioning quote or summary
  strengths
  weaknesses

matrixView:
  competitors as columns
  criteria as rows
  rating per cell: Strong / OK / Weak
  optional note per cell
```

UI Patterns output:

```txt
pattern groups by page or flow type
examples:
  onboarding
  homepage
  pricing
  dashboard
  empty states
  search/filter
  navigation

Each pattern group can include:
  Refero screenshots
  source app/product
  pattern summary
  pattern count, e.g. "4 of 6 apps use progressive disclosure"
  recognized patterns
```

Target Users output:

```txt
generated persona cards
name and role
goals
frustrations
context
relevance to product
assumptions
```

UI states from Figma:

```txt
empty input state
generating state
generated read state
edit state
regenerate section
save/discard
export to Notion
generate strategy
```

Open discussion points:

```txt
Should competitor websites be required?
Should Research be allowed to use Notion and Google Sheets automatically?
What counts as enough input before "Generate Research" is enabled?
Which Research sections are mandatory in V1?
Which sections can be regenerated per item versus only per block?
```

Resolved:

```txt
Research should always call Refero.
```

## CAPTION: Research A-Z implementation plan

Goal:

```txt
Turn the existing Research React UI from fixture-driven display into a real
end-to-end workflow:

Research intent/input -> Stage Engine -> Convex project context -> Refero context
-> Claude/Codex synthesis -> researchArtifact -> Convex direct persistence
-> existing Research components render the artifact.
```

Correct Research ownership:

```txt
React:
  Displays the Research form, generated artifact, edit state, and actions.
  Sends the user's explicit input and current surface state to Stage Engine.
  Does not assemble the full Research prompt.
  Does not call Refero.
  Does not call Claude/Codex.

Electron:
  Sends the typed request over IPC to Stage Engine.
  Streams run progress/results back to React.
  Supervises the Stage Engine process.

Stage Engine:
  Reads the project, existing AI context, previous artifacts, tasks/decisions,
  uploaded context pointers, and integration state from Convex.
  Calls Refero for external product/design references.
  Builds the Research prompt.
  Runs Claude/Codex.
  Validates the generated ResearchArtifact.
  Writes projectAiRuns and projectAiArtifacts back to Convex.
  Streams status and final artifact back to React.

Convex:
  Stores source project data.
  Stores the Research run.
  Stores one researchArtifact.
  Stores later edits/approval state.
```

Research V1 run:

```txt
1. User fills Research input or dictates it with voice.
2. React sends:
     projectId
     current tab = research
     selected provider/model
     explicit form input / transcript
     optional selected screenshot/frame pointers
3. Stage Engine fetches the full project context from Convex.
4. Stage Engine calls Refero using the normalized ResearchInput.
5. Stage Engine creates a provider prompt from:
     ResearchInput
     Convex project context
     previous project artifacts
     Refero references
6. Stage Engine runs Claude/Codex.
7. Stage Engine validates the JSON as ResearchArtifact.
8. Stage Engine writes run + artifact to Convex.
9. React receives progress/final result and re-renders from Convex/artifact.
```

This means Research is not finished yet.

Current status:

```txt
The contracts, Rust models, Refero adapter boundary, prompt builder, and service
skeleton are in place.

The missing piece is now clear:
Stage Engine still needs direct Convex client integration for AI workflow context
and persistence.
```

Step 1: Define the contracts.

Files:

```txt
packages/data-ops/src/contracts/research.ts
packages/data-ops/src/contracts/refero.ts
packages/data-ops/src/contracts/index.ts
apps/stage-engine/src/models/research.rs
apps/stage-engine/src/models/refero.rs
apps/stage-engine/src/models/mod.rs
```

Contracts:

```txt
ResearchInput
ResearchArtifact
ResearchCompetitor
ResearchCompetitiveMatrix
ResearchUiPatternGroup
ResearchTargetUser
ResearchOpportunity
ResearchSourceReference
ReferoSearchRequest
ReferoScreenReference
ReferoFlowReference
ReferoStyleReference
```

Step 2: Add the Refero adapter in Stage Engine.

Files:

```txt
apps/stage-engine/src/refero/mod.rs
apps/stage-engine/src/refero/client.rs
apps/stage-engine/src/refero/service.rs
apps/stage-engine/src/config.rs
apps/stage-engine/src/models/refero.rs
```

Responsibilities:

```txt
Read Refero token from secure runtime config.
Call Refero MCP/tools.
Search screens/styles/flows based on ResearchInput.
Normalize Refero responses into Stage ReferoReference models.
Return references to the Research workflow.
```

Step 3: Add the Research workflow in Stage Engine.

Files:

```txt
apps/stage-engine/src/research/mod.rs
apps/stage-engine/src/research/context.rs
apps/stage-engine/src/research/prompt.rs
apps/stage-engine/src/research/service.rs
apps/stage-engine/src/server/research.rs
```

Responsibilities:

```txt
Receive Research intent/input from Electron IPC.
Fetch project/workspace context from Convex directly.
Fetch Refero references.
Build the Claude/Codex prompt with project context and Refero context.
Require JSON output matching ResearchArtifact.
Validate/deserialize with serde.
Persist the run and typed ResearchArtifact back to Convex.
Return/stream typed ResearchArtifact to React.
```

Step 4: Add direct Convex access in Stage Engine.

Files:

```txt
apps/stage-engine/src/convex/mod.rs
apps/stage-engine/src/convex/client.rs
apps/stage-engine/src/convex/research_repository.rs
apps/stage-engine/src/config/mod.rs
apps/stage-engine/Cargo.toml
```

Responsibilities:

```txt
Read Convex URL and auth/session credentials from secure runtime config.
Use the Rust Convex client for queries/mutations.
Fetch project AI context by projectId.
Fetch prior artifacts relevant to Research.
Create/update projectAiRuns.
Create/update projectAiArtifacts.
Keep Convex access out of React.
Keep REST API out of the normal in-app AI workflow path.
```

Step 5: Store the Research run and artifact in Convex.

Existing tables already support the direction:

```txt
projectAiContexts
projectAiRuns
projectAiArtifacts
```

Files:

```txt
packages/data-ops/convex/projectAi.ts
packages/data-ops/convex/schema.ts
```

Responsibilities:

```txt
Save ResearchInput to projectAiContexts.
Create a projectAiRuns row when generation starts.
Save the final ResearchArtifact as projectAiArtifacts.contentJson.
Keep module = "research".
Keep kind = "researchArtifact".
```

Important:

```txt
This is direct Convex data access from Stage Engine, not HTTP cron-style
functions and not a REST API detour.
```

Step 6: Connect React to artifact data.

Current render components:

```txt
apps/user-application/src/components/project/tabs/research/ResearchSummary.tsx
apps/user-application/src/components/project/tabs/research/CompanySnapshot.tsx
apps/user-application/src/components/project/tabs/research/CompetitiveAnalysis.tsx
apps/user-application/src/components/project/tabs/research/UiPatterns.tsx
apps/user-application/src/components/project/tabs/research/TargetUsers.tsx
apps/user-application/src/components/project/tabs/research/Opportunities.tsx
apps/user-application/src/components/project/tabs/research/ResearchActions.tsx
```

New React data files:

```txt
apps/user-application/src/hooks/project/research/useResearchArtifact.ts
apps/user-application/src/hooks/project/research/useGenerateResearch.ts
apps/user-application/src/hooks/project/research/useUpdateResearchArtifact.ts
apps/user-application/src/hooks/project/research/useRegenerateResearchSection.ts
```

Responsibilities:

```txt
ResearchTab owns state composition.
Section components receive typed props.
Fixture data becomes fallback/dev-only only.
No section component calls Stage Engine directly.
No section component calls Refero directly.
```

Step 7: Add edit/regenerate behavior.

Rules:

```txt
Edit per visible field/cell/card is allowed.
Save still updates one researchArtifact.
Regenerate starts per block/section.
Per-item regeneration can come later.
Chat may propose artifact patches, but never silently saves them.
```

Step 8: Verify one vertical slice.

Smoke path:

```txt
Open project.
Fill Research input.
Run Research.
Stage Engine reads project context from Convex directly.
Stage Engine calls Refero.
Stage Engine calls Claude/Codex.
ResearchArtifact validates.
Stage Engine writes artifact to Convex directly.
React renders summary, snapshot, competitors, matrix, UI patterns, personas,
and opportunities from the artifact.
Refresh app.
Same artifact still renders.
```

This is how we know the changes work before expanding to Strategy, Moodboard,
Flows, and Generate.

## CAPTION: Research A-Z audit table

Last updated: May 31, 2026

| Step | Area | Files | Status | Notes |
|---:|---|---|---|---|
| 1 | Shared Research contract | `packages/data-ops/src/contracts/research.ts` | done | Adds `ResearchInput`, `ResearchArtifact`, section models, patch model, and Zod validation. |
| 1 | Shared Refero contract | `packages/data-ops/src/contracts/refero.ts` | done | Adds Refero search/context/reference contracts for screens, flows, and styles. |
| 1 | Contract exports | `packages/data-ops/src/contracts/index.ts` | done | Exports Research and Refero contracts from `@stage/data-ops/contracts`. |
| 1 | Rust Research models | `apps/stage-engine/src/models/research.rs` | done | Mirrors the shared TypeScript contract with serde structs/enums. |
| 1 | Rust Refero models | `apps/stage-engine/src/models/refero.rs` | done | Mirrors normalized Refero context/reference models. |
| 2 | Refero config boundary | `apps/stage-engine/src/config/mod.rs` | done | Adds `REFERO_MCP_URL` and `REFERO_MCP_TOKEN` env boundary. Token stays out of React. |
| 2 | Refero client skeleton | `apps/stage-engine/src/refero/client.rs` | done | Adds JSON-RPC MCP `tools/call` client boundary with bearer token support. |
| 2 | Refero normalization service | `apps/stage-engine/src/refero/service.rs` | done | Adds screen/flow search methods and normalizes loose Refero responses into Stage references. |
| 2 | Rust module wiring | `apps/stage-engine/src/main.rs` | done | Registers the Refero module in Stage Engine. |
| 2 | Rust dependency | `apps/stage-engine/Cargo.toml` | done | Adds `reqwest` with `rustls-tls` and JSON support for outbound Refero calls. |
| 3 | Research Refero query builder | `apps/stage-engine/src/research/context.rs` | done | Builds the first Refero search request from `ResearchInput`. |
| 3 | Research provider prompt builder | `apps/stage-engine/src/research/prompt.rs` | done | Builds a provider-ready prompt from `ResearchInput` + `ReferoContext`. |
| 3 | Research workflow service skeleton | `apps/stage-engine/src/research/service.rs` | done | Builds prompt bundle with Refero context for the Research workflow. |
| 4 | Stage Engine Convex auth decision | `apps/user-application/docs/STAGE_AI_WORKFLOW_CONTEXT_PLAN.md` | partial | Architecture decision is documented. Current implementation passes the desktop bearer token from Electron to Stage Engine, then Stage Engine uses that token against Convex directly. Scoped engine token is still the cleaner next step. |
| 4 | Stage Engine Convex client | `apps/stage-engine/src/convex_store/*`, `apps/stage-engine/Cargo.toml`, `apps/stage-engine/src/config/mod.rs` | done | Added direct Rust Convex client integration with `convex = 0.10.4` and `CONVEX_URL` runtime config. |
| 4 | Research context repository | `apps/stage-engine/src/convex_store/research_repository.rs` | done | Fetches normalized Research input from Convex with authenticated direct access. |
| 4 | Research persistence repository | `apps/stage-engine/src/convex_store/research_repository.rs` | done | Creates Research runs, completes Research runs, saves artifacts, and marks failed runs directly in Convex. |
| 5 | Convex artifact functions | `packages/data-ops/convex/projectAi.ts` | done | Added `getResearchInput`, `createResearchRun`, `completeResearchRun`, and `failResearchRun` for direct Stage Engine usage. |
| 5 | Research workflow orchestration | `apps/stage-engine/src/research/workflow.rs`, `apps/stage-engine/src/runs/mod.rs`, `apps/stage-engine/src/server/runs.rs`, `apps/stage-engine/src/app.rs` | done | Research runs now go through Stage Engine -> Convex direct -> Refero -> Claude/Codex -> Convex direct, using the existing `/v1/runs` path. |
| 5 | Provider final-text collection | `apps/stage-engine/src/providers/process.rs`, `apps/stage-engine/src/providers/adapter.rs`, `apps/stage-engine/src/providers/claude.rs`, `apps/stage-engine/src/providers/codex.rs` | done | Added collect-path so Research can parse the final provider JSON and persist a typed artifact. |
| 5 | Electron auth handoff to Stage Engine | `apps/user-application/electron/ipc.ts`, `apps/user-application/electron/helpers/sidecar.ts`, `apps/user-application/electron/sidecar.ts` | done | Electron now forwards the current bearer token to Stage Engine requests and SSE run streaming. |
| 6 | React artifact hooks | `apps/user-application/src/hooks/project/research/*` | partial | `useResearchArtifact`, `useResearchRun`, `useSaveResearchContext`, `useResearchTab` wired. Mock off by default. |
| 6 | Research component props | `apps/user-application/src/components/project/tabs/research/*` | partial | Renders Convex artifact when present; configure form saves context. |
| 6 | Dev logging + errors | `docs/AI/research/RESEARCH_DEV_STATUS.md`, stage-engine + electron/ipc | partial | Engine logs in pnpm dev terminal; UI shows error detail. See RESEARCH_DEV_STATUS.md. |
| 7 | Edit/regenerate | Research hooks + Convex mutations | todo | Section-level regenerate first; per-item later. |
| 8 | Vertical slice verification | data-ops + stage-engine + user-application | partial | `cargo check`, typecheck pass. Manual E2E not signed off. See RESEARCH_DEV_STATUS.md checklist. |

Verification so far:

```txt
cargo check
pnpm --dir packages/data-ops run convex:typecheck
pnpm --dir apps/user-application run typecheck
```

## CAPTION: Strategy workflow

Strategy is generated from approved or current Research.

Input context:

```txt
research artifact
project brief
target users
business goals
competitor insights
UI pattern insights
user instructions
```

Output artifact:

```txt
design direction
design principles
target audience strategy
content strategy
competitive positioning
key pages and objectives
accessibility and constraints
```

UI states from Figma:

```txt
generated sections
approved sections
action required sections
edit strategy
approve and save
regenerate with AI
add section
add to Notion
continue to Flows
```

Open discussion points:

```txt
Can Strategy be generated from unapproved Research?
Does each Strategy section need independent approval?
Should "Continue to Flows" require all sections approved?
```

Stage Engine module layout (copy Research shape, not Research code):

```txt
apps/stage-engine/src/strategy/
  workflow.rs       # thin run loop (like research/workflow.rs)
  context.rs        # load research artifact + build provider context
  prompt.rs         # provider instructions
  post_process.rs   # validate/merge strategyArtifact
```

Shared platform stays in `refero/`, `runs/`, `providers/`, `convex_store/`. See [`apps/stage-engine/ARCHITECTURE.md`](../../../stage-engine/ARCHITECTURE.md).

## CAPTION: Moodboard and styleguide workflow

Moodboard is where visual direction becomes structured design rules.

Input context:

```txt
project brief
research artifact
strategy artifact
uploaded moodboard images
selected Refero screens
brand notes
target platform
```

Output artifact:

```txt
moodboard directions
styleguide JSON
palette
typography
layout rules
components
motion rules
anti-patterns
source image references
```

UI states expected:

```txt
upload/select images
create direction
generate styleguide
regenerate styleguide
edit styleguide
approve direction
```

Open discussion points:

```txt
Should styleguide generation require approved Strategy?
Should Refero screens be saved into the moodboard, or only used as context?
Should the styleguide be DTCG-compatible from day one?
```

## CAPTION: Flows workflow

Flows define product journeys before wireframes.

Input context:

```txt
research artifact
strategy artifact
approved styleguide
project goals
target users
selected pages
Refero flows
user instructions
```

Output artifact:

```txt
flow map
screen list
step-by-step user journey
decision points
edge states
required screens
content requirements
```

Open discussion points:

```txt
Do flows generate screens directly, or only define the screen plan?
Should flows be regenerated per page, per user journey, or whole project?
Should Refero flows be required before generation?
```

## CAPTION: Generate and wireframe workflow

Generate turns approved context into screen output.

Input context:

```txt
approved research
approved strategy
approved styleguide
approved flows
selected platform
selected fidelity
brand kit
uploaded assets
selected screen or flow
```

Output artifact:

```txt
lo-fi wireframe spec
hi-fi wireframe spec
screen prompts
layout sections
component list
asset requirements
handoff notes
```

Important rule:

```txt
Generation should not happen from a blank prompt.
It should happen from approved project context.
```

Open discussion points:

```txt
Should Stage generate actual UI code, Figma frames, or structured screen specs first?
Should Refero provide visual examples for every generated screen?
Should Lo-Fi and Hi-Fi use different context contracts?
```

## CAPTION: Chat workflow

Chat is project-aware, not a generic chatbot.

Input context:

```txt
React sends:
  user message
  current projectId
  current route/tab
  selected visible artifact/section/entity if any
  selected provider/model
  optional screenshot/frame pointer

Stage Engine fetches:
  current project
  project AI context
  previous artifacts
  tasks/decisions
  provider connection state
  integration state
  relevant external context when allowed
```

Output:

```txt
chat answer
suggested action
optional workflow trigger
optional artifact patch
```

Examples:

```txt
"What is missing in this research?"
"Regenerate the opportunities section."
"Use Refero to find examples for this flow."
"Turn this voice note into a strategy update."
```

Open discussion points:

```txt
Should chat be allowed to mutate project artifacts directly?
Should chat always ask for confirmation before changing saved artifacts?
How should tagged integrations work: @Refero, @Figma, @Notion, @Sheets?
```

Technical rule:

```txt
Workspace chat, critique, and voice commands should use Stage Engine as the
context owner.

React provides the user's current surface.
Stage Engine fetches the real context from Convex directly.
```

This prevents the fragile pattern where React has to know and send everything.

## CAPTION: Research chatbox overlay

Figma reference:

```txt
File: Stage -- Main
Node: 1076:53
Section: ChatBox
Frame: Projects - Research - Chatbox
```

Meaning:

```txt
This is not a separate chat page.
This is a contextual chat overlay on top of the current workflow.
In this screen the current workflow is Research.
```

The important product idea:

```txt
Chat can answer a question, but it can also propose a concrete artifact action.
```

Example from the Figma screen:

```txt
User:
  "Can you do a proper competitive analysis on Zapier?"

Stage:
  Answers inside the chat.
  Offers an action:
  "Add to competitive analysis"
```

This means the chat response must not be treated as plain text only.
It needs a typed action layer.

Input context:

```txt
projectId
currentTab = "research"
activeArtifact = researchArtifact
selectedArtifactSection = "competitiveAnalysis"
selectedEntity = "Zapier"
userMessage
providerId = claude | codex
modelId
availableIntegrations
optional Refero context
optional Figma selection/frame context
```

Output contract:

```txt
chatAnswer
followUpSuggestions
suggestedArtifactAction
suggestedPatch
requiresUserConfirmation
```

Suggested action examples:

```txt
add_competitor_analysis
update_competitor_analysis
regenerate_research_section
add_ui_pattern_reference
add_target_user
add_opportunity
```

Safety rule:

```txt
The chat may propose a patch.
The chat may preview a patch.
The chat must not silently save the patch to Convex.
The user confirms before the researchArtifact is changed.
```

Technical implication:

```txt
Do not build chat as a generic message list only.
Build chat messages so assistant responses can include typed actions.
The UI renders those actions as buttons.
The action calls a mutation that validates and applies a patch to the artifact.
```

For Research V1, this should target one artifact:

```txt
researchArtifact
```

Not:

```txt
separate invisible research records per chat message
```

## CAPTION: Data ownership

Use this ownership model.

```txt
Convex:
  Project data
  User/workspace data
  Integration connection state
  Generated artifacts
  Approval state
  Export state

Stage Engine:
  Direct Convex access for in-app AI workflows
  Project/workspace context fetching
  Research/chat/voice context building
  AI run and artifact persistence
  Claude/Codex local provider runs
  Deep file search
  Local provider discovery
  Streaming run output
  Voice transcript handoff when needed

Electron:
  App lifecycle
  Sidecar supervision
  Secure IPC
  Preload bridge

React:
  UI
  TanStack Router
  TanStack Query
  Local UI state
  Workflow forms
```

## CAPTION: What not to do

Do not do this:

```txt
Do not call Claude/Codex directly from each React tab.
Do not put Refero calls inside random UI components.
Do not make React responsible for assembling full project AI context.
Do not route normal desktop AI workflow context through the public REST API.
Do not store generated research as plain chat text.
Do not let voice become a separate duplicate AI system.
Do not make Figma, Notion, and Sheets look like local AI providers.
Do not give AI uncontrolled access to the user's whole computer.
```

## CAPTION: Proposed implementation order

Start with one workflow before building all screens.

```txt
1. Define shared workflow contracts and artifact models.
2. Implement Research V1 end-to-end.
3. Implement Strategy V1 from Research.
4. Implement Moodboard + Styleguide V1.
5. Implement Flows V1.
6. Implement Generate/Wireframe V1.
7. Add Voice as a cross-workflow input method.
8. Add deeper chat actions and artifact patching.
```

Why Research first:

```txt
Research is the first serious input/output context problem.
If Research is clean, Strategy and Moodboard can reuse the same architecture.
If Research is messy, every later tab becomes messy.
```

## CAPTION: Files likely needed

Shared contracts:

```txt
packages/data-ops/src/ai/artifacts.ts
packages/data-ops/src/ai/workflows.ts
packages/data-ops/src/ai/context.ts
packages/data-ops/src/ai/refero.ts
```

User application workflow layer:

```txt
apps/user-application/src/project-ai/context/
apps/user-application/src/project-ai/hooks/
apps/user-application/src/project-ai/prompts/
apps/user-application/src/project-ai/components/
apps/user-application/src/project-ai/types/
```

Research UI:

```txt
apps/user-application/src/project/components/tabs/research/
```

Strategy UI:

```txt
apps/user-application/src/project/components/tabs/strategy/
```

Stage Engine:

```txt
apps/stage-engine/src/convex/
apps/stage-engine/src/providers/
apps/stage-engine/src/runs/
apps/stage-engine/src/context/
apps/stage-engine/src/research/
apps/stage-engine/src/voice/
```

Convex:

```txt
packages/data-ops/convex/schema.ts
packages/data-ops/convex/projectAi.ts
packages/data-ops/convex/integrations.ts
```

## CAPTION: Audit table

| Area | Current status | Risk | Decision needed | Next action |
|---|---|---|---|---|
| Claude/Codex provider detection | Works | Connection preference UX still young | Should providers auto-enable after detection? | Keep explicit connect/disconnect |
| Claude/Codex chat run | Basic run works | Not yet tied to project artifacts | What context level does chat receive by default? | Define chat context contract |
| Research | Contracts, Rust models, Refero boundary, prompt builder, and service skeleton exist | Still not end-to-end; Stage Engine does not yet read/write Convex directly | Exact Convex query/mutation surface for Stage Engine | Add Stage Engine Convex client/repository, then wire artifact data |
| Strategy | End-to-end V1 now wired: stage-engine workflow, Convex persistence, desktop editing, section regenerate, and Notion export | Flow gating and approval policy are still product decisions | Should Flows require all Strategy sections approved? | Validate live provider output quality and decide the Flow gate |
| Moodboard | Product concept exists | Refero + uploads + styleguide can get messy | What is required for styleguide generation? | Define Moodboard/Styleguide artifact |
| Flows | Product concept exists | Could jump too quickly to screens | Does it produce flow plans or screens? | Define Flow artifact |
| Generate/Wireframes | Product concept exists | Too easy to generate from weak context | Lo-Fi/Hi-Fi output shape | Define Wireframe artifact |
| Voice | Provider chosen: Voxtral Mini Transcribe | Could duplicate chat workflow | Is voice command or dictation first? | Define transcript -> intent flow |
| Refero | MCP access/token available; default for Research confirmed; Rust adapter boundary started | Token must not leak to React; results need normalized Stage types | Which exact screen/style/flow fields are stored? | Connect Refero adapter into Research workflow after Convex context is available |
| Figma | Designs available | Top-level frames are too broad | Which subframes map to V1? | Inspect sublayers when implementing |
| Notion | Basic integration exists | Export vs source context must stay separate | Can AI read Notion automatically? | Define Notion context permission |
| Google Sheets | Basic integration exists | Imported rows need schema | Which sheets become project context? | Define Sheets import schema |

## CAPTION: Immediate discussion checklist

Before implementing more code, answer these in order:

```txt
1. What should Stage always know about a project?
2. What should Research require from the user before generation?
3. Should Research automatically use Refero?
4. Should Strategy require approved Research?
5. Should Moodboard require approved Strategy?
6. Should chat be allowed to change artifacts, or only suggest changes?
7. Should voice start as dictation only, or command execution too?
8. Which outputs must be editable before approval?
9. Which outputs should be exportable to Notion?
10. Which workflow is V1 critical and which can wait?
```

## CAPTION: Recommended next decision

The next decision should be Research V1.

Research is the right first workflow because it defines the base context for
everything that follows.

Recommended starting contract:

```txt
Required:
  project name
  industry
  project brief

Optional but strongly recommended:
  client website
  competitor websites
  target users
  additional notes
  Refero query
  uploaded screenshots

Output:
  research summary
  company snapshot
  competitive analysis
  UI patterns
  target users
  opportunities
  open questions
```

Once this is agreed, implementation can start without guessing.
