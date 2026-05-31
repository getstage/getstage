# Stage AI Workflow Context Plan

Date: May 30, 2026  
Status: Discussion plan  
Scope: Project AI workflows, Claude/Codex, Refero, voice, Figma-driven product flows

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
Stage Engine runs Claude/Codex and local/deep context tasks.
Refero provides external design reference intelligence.
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
apps/user-application/src/project/components/tabs/ResearchTab.tsx
apps/user-application/src/project/components/tabs/StrategyTab.tsx
apps/user-application/src/project/components/tabs/MoodboardTab.tsx
apps/user-application/src/project/components/tabs/FlowsTab.tsx
apps/user-application/src/project/components/tabs/WireframesTab.tsx
apps/user-application/src/project/components/tabs/AssetsTab.tsx
apps/user-application/src/project/components/tabs/GenerateTab.tsx
```

Research is already split into smaller React components:

```txt
apps/user-application/src/project/components/tabs/research/ResearchTab.tsx
apps/user-application/src/project/components/tabs/research/ResearchSummary.tsx
apps/user-application/src/project/components/tabs/research/CompanySnapshot.tsx
apps/user-application/src/project/components/tabs/research/CompetitiveAnalysis.tsx
apps/user-application/src/project/components/tabs/research/UiPatterns.tsx
apps/user-application/src/project/components/tabs/research/TargetUsers.tsx
apps/user-application/src/project/components/tabs/research/Opportunities.tsx
apps/user-application/src/project/components/tabs/research/ResearchActions.tsx
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

apps/user-application/src/project/data/fixtures/researchTabFixtures.ts

It is not yet connected to:
  real researchArtifact data
  Convex persistence
  Refero results
  Claude/Codex generation
  voice-filled input
```

Generate tab status:

```txt
apps/user-application/src/project/components/tabs/GenerateTab.tsx

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
Should Research always call Refero, or only when the user asks?
Should competitor websites be required?
Should Research be allowed to use Notion and Google Sheets automatically?
What counts as enough input before "Generate Research" is enabled?
Which Research sections are mandatory in V1?
Which sections can be regenerated per item versus only per block?
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
current project
current tab
selected artifact
selected text/section
provider preference
user message
optional tagged integration or source
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
apps/stage-engine/src/providers/
apps/stage-engine/src/runs/
apps/stage-engine/src/context/
apps/stage-engine/src/voice/
```

Convex:

```txt
packages/data-ops/convex/schema.ts
packages/data-ops/convex/aiArtifacts.ts
packages/data-ops/convex/integrations.ts
```

## CAPTION: Audit table

| Area | Current status | Risk | Decision needed | Next action |
|---|---|---|---|---|
| Claude/Codex provider detection | Works | Connection preference UX still young | Should providers auto-enable after detection? | Keep explicit connect/disconnect |
| Claude/Codex chat run | Basic run works | Not yet tied to project artifacts | What context level does chat receive by default? | Define chat context contract |
| Research | Output shape partly confirmed | Must match Figma and support edit/regenerate | Mandatory V1 sections | Define Research artifact schema |
| Strategy | Figma flow exists | Approval rules unclear | Can it generate from draft Research? | Define Strategy artifact |
| Moodboard | Product concept exists | Refero + uploads + styleguide can get messy | What is required for styleguide generation? | Define Moodboard/Styleguide artifact |
| Flows | Product concept exists | Could jump too quickly to screens | Does it produce flow plans or screens? | Define Flow artifact |
| Generate/Wireframes | Product concept exists | Too easy to generate from weak context | Lo-Fi/Hi-Fi output shape | Define Wireframe artifact |
| Voice | Provider chosen: Voxtral Mini Transcribe | Could duplicate chat workflow | Is voice command or dictation first? | Define transcript -> intent flow |
| Refero | MCP planned/configured | Exact tool contract still needs confirmation | Which Refero results are stored? | Create Refero adapter contract |
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
