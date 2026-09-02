# Wireframes reliability checklist

Living acceptance checklist for the current Hi-Fi retrieval and generation
workflow. This is not a second architecture. It defines the conditions the
existing workflow must satisfy before the reliability work is considered done.

Companion documents:

- [`WIREFRAMES_GENERATION_CODEMAP.md`](./WIREFRAMES_GENERATION_CODEMAP.md)
- [`WIREFRAMES_LIVE_FAILURES.md`](./WIREFRAMES_LIVE_FAILURES.md)

## Non-negotiable boundaries

- [ ] Lo-Fi remains the original Work flow and is not modified by this work.
- [ ] Hi-Fi keeps the existing maximum of five concurrent screen tasks.
- [ ] Every screen is generated, validated, persisted, and reported independently.
- [ ] One failed screen never removes or blocks accepted sibling screens.
- [ ] A failed regeneration never overwrites the last accepted version of a screen.
- [ ] No component names, registry aliases, or missing imports are hardcoded.
- [ ] No new parallel generation architecture is introduced.

## What “component dependencies” means

A retrieved component is often more than its entry file. For example:

```text
dashboard.tsx
  -> ./use-mobile
  -> ./chart-formatters
  -> @/components/ui/button
```

The entry file cannot compile unless those imported local files are also
available. Stage must use the exact files already stored in R2. Relative imports
come from the same source bundle. Declared `registryDependencies` may resolve to
another catalog library: for example, an Aceternity component may legitimately
depend on `shadcn-ui/button` or `shadcn-ui/use-mobile`. It must never invent a
missing file or rewrite an import to a hardcoded fallback.

- [ ] Parse local imports from every retrieved entry file.
- [ ] Resolve relative imports from the current bundle's complete `files` list.
- [ ] Recursively load exact `registryDependencies` by component ID from the
      catalog, regardless of their library.
- [ ] Prevent dependency cycles and duplicate files with a visited component-ID
      set.
- [ ] Send the same resolved files to both the model and the renderer.
- [ ] If a candidate bundle is incomplete, skip that candidate and try the next
      verified RAG result.
- [ ] If no verified component remains, continue generating that screen without
      catalog components and report the degraded retrieval; do not stop the run.

## RAG search must not stop generation

- [ ] Build the embedding query from a short screen search brief, not the full
      design-director plan.
- [ ] Keep the query within the existing Convex 1–2000 character contract before
      calling Convex.
- [ ] Keep the full design plan in the generation prompt; only the embedding
      query is shortened.
- [ ] A too-long, empty, unavailable, or zero-result RAG search becomes a
      per-screen retrieval warning, not a run failure.
- [ ] Selected libraries remain filters for top-level design candidates.
      Dependencies declared by those candidates may come from other libraries;
      they are technical dependencies, not additional RAG design choices.
- [ ] Retrieval evidence records the query, selected libraries, accepted
      candidates, skipped candidates, and skip reasons.

## Model instruction checklist

The system prompt should tell the model to verify these requirements before it
returns its structured response. The model does not need to emit a second
checkbox document; that wastes output tokens. Stage independently validates the
same requirements after the response.

- [ ] Return every requested screen ID exactly once.
- [ ] Return complete TSX, never a partial file or prose explanation.
- [ ] Use only package imports and exact catalog paths supplied in the request.
- [ ] Do not invent imports, components, icons, files, or registry aliases.
- [ ] Ensure every local import exists in the supplied source files.
- [ ] Keep initial rendered content visible without requiring animation or user
      interaction.
- [ ] Maintain readable foreground/background contrast.
- [ ] Avoid accidental full-viewport blank regions and arbitrary fixed heights.
- [ ] Keep the screen consistent with the shared style guide and sibling-screen
      design context.
- [ ] Follow the strict JSON Schema supplied by the gateway.

## Machine validation after the model

- [ ] JSON matches the gateway schema.
- [ ] Requested screen IDs are present once; unknown IDs are rejected.
- [ ] Empty or obviously truncated TSX is rejected for that screen only.
- [ ] All imports resolve from supplied catalog files or allowed packages.
- [ ] TSX compiles and server-renders for that screen only.
- [ ] A renderer failure preserves accepted siblings and the previous saved
      version of the failed screen.
- [ ] Static HTML contains meaningful visible content.
- [ ] Obvious invisible-content patterns and extreme empty layout regions are
      rejected or warned before persistence.

## Minimal implementation surface

Expected existing files to change:

- [ ] `apps/stage-engine/src/wireframes/workflow.rs` — short search brief,
      retrieval fallback, and dependency materialization.
- [ ] `apps/wireframe-ai-gateway/src/generator.rs` — concise model checklist;
      retain strict structured output.
- [ ] `packages/wireframe-renderer/src/cli.ts` — validate the resolved source set;
      no fabricated fallback components.
- [ ] Existing tests under `apps/stage-engine/src/testing/wireframes/` and
      `packages/wireframe-renderer/test/` — regression coverage only.

Only change the Convex catalog loader if the exact R2 bundle cannot expose its
existing files. Do not change the Convex schema, Lo-Fi components, results UI,
or stored component names for this slice.

## Required automated evidence

- [ ] A design plan longer than 2000 characters still performs a bounded RAG
      search and continues generation.
- [ ] An empty or failed RAG search does not stop the screen or the run.
- [ ] A component with nested relative imports compiles when its bundle is
      complete.
- [ ] An incomplete component candidate is skipped without fabricated code.
- [ ] In a five-screen run, one deliberately broken screen does not block the
      other four.
- [ ] Accepted screens checkpoint before the run finishes.
- [ ] Lo-Fi regression tests prove its prompt and generation path are unchanged.
- [ ] Stage engine tests, gateway tests, renderer tests, TypeScript typecheck,
      formatting, and diff checks pass.
- [ ] The final diff is reviewed for deletion or replacement opportunities and
      does not add another orchestration layer.

## Werner's live acceptance

- [ ] Generate one Hi-Fi screen with Codex.
- [ ] Generate five Hi-Fi screens with one intentionally difficult screen.
- [ ] Repeat with Claude.
- [ ] Repeat with Nebius.
- [ ] Confirm successful siblings appear even when one screen reports a failure.
- [ ] Confirm existing Lo-Fi remains unchanged after Hi-Fi generation.
- [ ] Review contrast, spacing, visible initial content, and sibling consistency
      in the actual desktop UI.
- [ ] No commit, push, or PR until this live acceptance is complete.
