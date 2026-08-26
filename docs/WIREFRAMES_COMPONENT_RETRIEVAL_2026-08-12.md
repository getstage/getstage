# Wireframes component retrieval decision — 2026-08-12

## Decision

Stage must stop asking the model to invent complete pages from design advice and component names.

The replacement direction is:

```text
Choose a proven template or block
→ retrieve its real source and working example
→ let the model adapt content, branding, and limited layout slots
→ typecheck
→ validate in a real browser
→ save
```

This document records the architecture discussion only. It is not an implementation status report.

## What Stage does today

Stage can use specific components, but only components already copied into and registered in `packages/wireframe-renderer`.

For example, the live run used real registered components through imports such as:

```tsx
import { AreaChart, ChartLegend } from "@stage/charts";
import { BentoGrid, BentoGridItem } from "@stage/sections";
```

Selecting a library does not currently provide the complete upstream library.

Therefore:

- selecting Aceternity UI exposes only the Aceternity-derived components already registered in Stage;
- components absent from the Stage renderer cannot be used;
- `GoogleGeminiEffect` cannot be used unless its real source, dependencies, example, and runtime behavior are added to Stage;
- the model cannot import components directly from the Aceternity website;
- library names and textual usage guidance do not give the model access to missing executable components.

## Current problems

1. **Incomplete libraries** — Stage contains only a subset of upstream components and templates.
2. **Excessive context** — one live screen call used approximately 52,000 prompt characters; its repair used approximately 78,000.
3. **Weak design mechanism** — skills are textual advice, not proven page compositions.
4. **Component presence is mistaken for design quality** — importing a chart or bento component does not guarantee coherent hierarchy, spacing, or geometry.
5. **Duplicated contracts drift** — manually maintained metadata can disagree with actual TypeScript props.
6. **Late validation** — basic import, prop, SVG, Unicode, overflow, and geometry failures are discovered after expensive model calls.
7. **Expensive repair** — deterministic code errors can trigger a second full provider call.
8. **False success** — the current gates can accept output that still contains invalid SVG paths, visible Unicode escapes, clipping, or poor composition.
9. **Live and static rendering are conflated** — interactive Motion components need a real client runtime, while Figma/export needs a deterministic resting frame.
10. **The orchestration path accumulated code instead of cleanly replacing obsolete behavior.**

## Storage architecture

Use Convex and R2 together. Do not add PostgreSQL at this stage.

### R2

Store large immutable or versioned assets:

- actual component TSX source bundles;
- complete template and block source bundles;
- working usage examples;
- screenshots and visual previews;
- local dependency files;
- static capture fixtures;
- optional documentation source.

### Convex

Store searchable structured metadata:

- component or template ID;
- upstream library;
- component/block/template kind;
- exact exports;
- prop schema;
- required npm dependencies;
- internal file dependencies;
- supported runtime;
- static-export behavior;
- compatible screen and block intents;
- visual tags;
- viewport requirements;
- source URL and license;
- upstream version;
- R2 object keys;
- verification status;
- embeddings used for semantic ranking.

### Convex RAG/vector search

Use retrieval to rank relevant verified components, blocks, templates, and examples.

Retrieval must happen after deterministic filters:

```text
selected library
→ verified status
→ supported runtime
→ installed dependencies
→ screen intent
→ block intent
→ semantic ranking
```

Vector similarity must not decide whether:

- an export exists;
- a prop is required;
- a dependency is installed;
- an import path is valid;
- a component supports SSR or static export.

Those are deterministic registry and build-system facts.

## Why not PostgreSQL

PostgreSQL with `pgvector` could implement the same search. It is not inherently wrong, but it adds:

- another database deployment;
- another authentication and authorization boundary;
- another backup and migration system;
- synchronization between Convex and PostgreSQL;
- more operational complexity without inherently improving retrieval quality.

Stage already uses Convex, and Convex already provides vector indexes and a RAG component. For hundreds or thousands of verified components and templates, Convex plus R2 is the simpler first architecture.

PostgreSQL should be reconsidered only if measured catalog size, filtering, query behavior, or cost exceeds Convex's practical limits.

## Required registry record

A verified component record should contain at least:

```ts
{
  id: "aceternity/google-gemini-effect",
  library: "aceternity-ui",
  kind: "hero-effect",
  sourceBundleKey: "r2-key",
  exampleBundleKey: "r2-key",
  screenshotKey: "r2-key",
  exports: ["GoogleGeminiEffect"],
  propsSchema: {},
  npmDependencies: ["motion/react"],
  fileDependencies: [],
  runtime: "client",
  staticCapture: {
    supported: true,
    restingState: "complete-paths"
  },
  viewportRequirements: {
    minHeight: "400vh",
    overflow: "clip"
  },
  compatibleIntents: ["marketing-hero", "ai-product"],
  visualTags: ["dark", "technical", "animated-paths"],
  sourceUrl: "upstream URL",
  license: "verified license",
  upstreamVersion: "version",
  verified: true
}
```

A template record should additionally describe:

- constituent blocks;
- all source files;
- editable slots;
- responsive states;
- supported viewports;
- screenshots;
- live and static behavior;
- verified dependency closure.

## Generation flow

The intended flow is:

```text
1. Read the selected project, style direction, and screen intent.
2. Filter the registry to selected, verified, runtime-compatible libraries.
3. Retrieve a small set of relevant templates or blocks.
4. Prefer a proven complete template or coordinated block composition.
5. Fetch the exact source, examples, and contracts from R2.
6. Give the model one compact screen specification and only the selected source/examples.
7. Allow adaptation of content, brand tokens, and explicitly editable layout slots.
8. Typecheck generated TSX against the real component contracts.
9. Render in a real browser.
10. Reject invalid geometry, overflow, clipping, invalid SVG numbers, visible Unicode escapes, and runtime errors.
11. Save only after technical, render, and geometry validation pass.
```

## Prompt strategy

Stop injecting full skill bodies and complete library catalogs into every screen call.

Compile selected skills into a short, screen-specific design brief containing:

- visual thesis;
- hierarchy;
- spacing rhythm;
- typography;
- surface treatment;
- motion rule;
- explicit anti-patterns.

The screen call should receive only:

- one compact screen brief;
- one authoritative design-system snapshot;
- exact target viewport;
- selected template or blocks;
- actual source and working examples;
- exact prop contracts;
- editable slots;
- output schema.

## Component and template priority

Prioritize complete templates and coordinated blocks over isolated components.

Templates solve more of the difficult design problem:

- page composition;
- proportions;
- spacing;
- hierarchy;
- responsive coordination;
- section transitions.

The model should adapt proven compositions rather than assemble arbitrary cards from a component checklist.

## Validation

Separate acceptance into four explicit levels.

### Contract validity

- allowed imports only;
- exports exist;
- required props are present;
- prop types are correct;
- data shapes are valid;
- dependencies are installed.

### Render validity

- no runtime exception;
- no `NaN` or `Infinity` in SVG/HTML output;
- no visible `\\uXXXX` escape sequences;
- no broken assets;
- interactive components reach a valid visible state.

### Geometry validity

- exact viewport contract;
- no horizontal overflow;
- no clipped primary content or actions;
- no overlapping major regions;
- text stays within bounded regions;
- composition fits the intended preview frame.

### Visual acceptance

- clear hierarchy;
- coherent composition;
- alignment with the selected moodboard/style direction;
- appropriate component use;
- sufficient distinctiveness;
- improvement over the previous version when regenerating.

## Repair policy

Do not use an expensive model repair for deterministic failures such as:

- nonexistent imports;
- missing required props;
- incorrect prop types;
- malformed chart data;
- escaped Unicode;
- invalid SVG numbers.

Prevent these through registry contracts and typechecking, or reject them locally before another provider call.

Use model repair only for genuine design or composition failures that cannot be corrected deterministically.

## Interactive and static output

Interactive components such as `GoogleGeminiEffect` require two explicit modes:

1. **Live preview** — real client-side React and Motion behavior.
2. **Static/Figma capture** — a deterministic, complete resting state.

The registry must define both behaviors. A single SSR representation should not be expected to provide both interaction and static export quality automatically.

## Supporting tools

### Convex Agent

Potentially useful later for durable workflows, threads, tools, persistent progress, and reactive UI updates. It does not directly improve design quality and should not be adopted as a substitute for the registry and retrieval architecture.

### Helicone

Potentially useful for prompt, latency, token, cost, failure, and repair-chain observability. It helps diagnose the system but does not improve designs by itself. Full integration may require moving from opaque local CLI subprocesses to observable API/SDK calls or adding explicit tracing around those processes.

## Required simplification

Before adding more infrastructure, remove obsolete mechanisms during the cutover:

- repeated full skill injection;
- full library catalogs in every screen call;
- manually duplicated prop contracts where real TypeScript contracts can be authoritative;
- model repair for deterministic compiler/schema errors;
- obsolete monolithic generation branches;
- redundant prompt builders and context representations;
- validations duplicated by real typechecking;
- orchestration code that exists only for the replaced generation method.

The goal is not to move the same complexity into more modules. The goal is to delete mechanisms that the new retrieval-and-adaptation flow replaces.

## Final conclusion

Today:

```text
AI can use only the components already copied and registered in Stage.
```

Required:

```text
Store complete verified components/templates in R2
→ index exact metadata and embeddings in Convex
→ retrieve a few compatible proven designs
→ give their real source and examples to the model
→ allow bounded adaptation
→ typecheck and browser-validate before saving
```

RAG chooses relevant verified designs. R2 stores the large source and visual assets. Convex stores the searchable index and vectors. The typed registry and renderer guarantee correctness.

No separate PostgreSQL database is required unless measured constraints later prove Convex insufficient.
