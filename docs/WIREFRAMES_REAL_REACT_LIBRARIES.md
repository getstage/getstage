# !!! WIREFRAMES — REAL REACT LIBRARIES (target) !!!

> **This is the direction.** The goal is NOT better static HTML. The goal is real,
> interactive React + Tailwind + Motion, built from the actual component libraries
> (Kokonut UI, Magic UI, Aceternity UI, cult-ui, coss/ui, reactbits, bklit, …),
> fetched/vendored from their registries — not a small local snapshot.
>
> Progress (where we are / stuck / left off): [`WIREFRAMES_REAL_REACT_AUDIT.md`](WIREFRAMES_REAL_REACT_AUDIT.md).  
> Component inventory (data, not progress): `packages/wireframe-renderer/manifests/wireframesQualityInventory.ts`.

---

## 1. What we want

- **Output = real React components.** The model writes TSX; Stage keeps TSX/React
  through to the user-facing preview (and export), not a one-time static flatten.
- **Motion + Tailwind are first-class.** Hover, click, animated stacks, liquid-glass
  filters, bento reveals — the things that make these libraries worth using — must
  actually render and move in the preview.
- **Real libraries, not subsets.** Fetch/vendor from the real registries and sources
  (e.g. `https://kokonutui.com/r/<component>.json`, Magic UI docs/registry, Aceternity,
  cult-ui, coss/ui, reactbits). "100+ components" must mean 100+, not 4 extra files.
- **Motion skills become usable.** Emil's skills and design-motion-principles stop
  being prompt noise and start driving real output once the render path supports JS.

---

## 1.1 Quality model (provider-neutral)

Real components are ingredients, not the quality system. Claude and Codex receive the same semantic contract through a **run-local, read-only provider workspace** instead of one repeated mega-prompt.

1. **Explicit context manifest:** Stage materializes every permitted input as a named file and records its path, role, size, hash, and access policy in `context-manifest.json`.
2. **Required reads are exact:** every provider call receives an explicit ordered list of the files it must read. There is no vague “inspect the workspace” instruction.
3. **Large references are searchable, not mandatory:** full component examples and sanitized skill references remain available on demand. Requiring every screen call to read every large file would recreate the current token and latency problem through tool calls.
4. **Run-level design system:** one validated design plan governs typography, palette roles, spacing, radius, elevation, density, variance, and motion across all screens.
5. **Page-specific execution:** each screen reads the shared plan plus its own brief, relevant flow, selected skill adapters, selected library metadata, and visual assets.
6. **Deterministic gates:** Stage audits context access, response integrity, rendering, plan conformance, and cross-screen consistency before saving.

**Skill selection rule:** no skill is automatic. An empty selection exposes no skill. Selected skills are stored as concise Stage adapters plus sanitized reference material; raw provider/plugin commands are never exposed as instructions.

### Generalization contract — preserve individual characteristics

- Each explicitly selected skill declares its role, applicability, conflicts, concise Stage guidance, and optional sanitized reference files.
- Each component declares semantic role, visual weight, required props, motion/runtime needs, complete static resting state, suitable density/screen types, incompatibilities, and anti-use cases.
- Each selected library exposes a compact catalog and real composition examples. Component source is available on demand when exact API details are needed.
- The quality gate combines universal invariants with the selected skill/library metadata. It never treats component count as quality.

## 1.2 Run-local provider workspace (approved target)

For each wireframe run, the Rust engine creates one isolated directory owned by Stage:

```text
<system-temp>/stage-wireframes-workspaces/<run-id>-<nonce>.ready/
├── context-manifest.json
├── contracts/
│   ├── runtime.md
│   └── output-schema.json
├── project/
│   ├── research.md
│   ├── strategy.md
│   └── flows.json
├── design/
│   ├── style-guide.json
│   ├── design-plan.json
│   └── assets/
│       └── moodboard-01.png
├── skills/
│   └── <selected-skill>/
│       ├── adapter.md
│       └── references/
├── libraries/
│   └── <selected-library>/
│       ├── catalog.json
│       ├── recipes.json
│       └── examples/
└── screens/
    └── <screen-id>/
        ├── brief.json
        ├── relevant-flow.json
        └── existing.tsx
```

`context-manifest.json` is the source of truth. Every entry contains:

- exact relative path;
- semantic role;
- byte size and SHA-256 digest;
- `required` or `onDemand` access policy;
- applicable call: Design Director, a named screen, repair, or all;
- sensitivity and provenance.

Before a provider starts, Stage derives a **call manifest** and names every required file one by one in the short stdin prompt. Claude receives explicit read permissions for those paths. Codex receives the workspace as its read-only working directory. Provider-specific process arguments may differ; the semantic file contract must remain identical.

### Workspace lifecycle — no ghost context

A provider workspace has one owner and a strict state machine:

```text
Building → Ready → InUse → Deleting → Deleted
                 ↘ failure/cancel/timeout ↗
```

1. **Create uniquely:** Stage uses `create_dir_new` for `<run-id>-<random-nonce>.building` with owner-only permissions. A path collision fails; it never opens or cleans an existing directory for use.
2. **Seal atomically:** Stage writes the selected source context and `context-manifest.json`, then atomically renames `.building` to `.ready`. Providers cannot start against `Building`. Stage may append generated plans, per-call manifests, and checkpoints atomically during `InUse`; it refreshes the manifest and integrity-checks all registered files before and after provider calls.
3. **Lease while active:** `.stage-workspace.json` contains the run ID, random engine-instance ID, owner PID, lifecycle state, and an expiry longer than the bounded provider-call timeout. Stage refreshes it before each call; no provider session outlives that bound.
4. **Read-only execution:** all provider children are started inside `InUse`; no provider writes are accepted. Stage waits for or kills and joins every child before cleanup.
5. **Close on every terminal path:** the Rust workflow scope owns the workspace guard. Success, provider failure, validation failure, timeout, and user cancellation first finish or kill/join provider children; scope exit then invokes the same guard cleanup, including early returns and propagated errors.
6. **Tombstone before deletion:** close atomically renames the directory to `.deleting`, making reuse impossible, then recursively removes it. A failed remove leaves only a non-runnable tombstone.
7. **Recover after a crash:** each workspace creation runs a bounded janitor over only Stage-marked `.building`, `.ready`, `.in-use`, and `.deleting` directories whose lease expired. It never deletes an unmarked path or an unexpired bounded-call lease.
8. **Separate debug evidence:** the provider workspace is always removed. Development debug dumps may copy a sanitized manifest/access report/prompt/output into a different debug directory with an explicit TTL. Production keeps no workspace copy. The same janitor prunes expired debug dumps.

No new run imports from an old workspace. Scoped regeneration creates a new workspace and copies only the saved artifact/design-plan inputs named by the new manifest, then hashes them again.

### Separation from Convex and R2 durable storage

The provider workspace is local ephemeral input. It is never uploaded to R2 and no workspace path or raw workspace file is written to Convex. Only validated wireframe artifacts and rendered outputs enter durable storage.

Current durable cleanup behavior:

- a successful replacement calls `deletePreviousWireframesArtifacts`, collects every R2 key from the previous artifact JSON, attempts each R2 delete, and removes the old `projectAiArtifacts` row before inserting the replacement;
- clearing selected screens collects those screens' R2 keys; the shared CSS key is removed only with the final screen;
- deleting project AI data uses the same recursive R2-key collection;
- newly uploaded objects that never become referenced remain in `uploadedAssets`; the hourly prune checks references and removes pending uploads older than 24 hours.

**Implemented 2026-08-11; live failure/retry scenario still unverified:** `deleteOldR2Asset` now creates a durable `r2DeletionQueue` tombstone before attempting physical deletion. A failure retains the key with exponential backoff; an hourly mutation retries it; a live reference defers deletion; and the queue row plus upload tracking are removed only after R2 deletion succeeds (including provider-confirmed absence). Artifact replacement, screen clearing, project cleanup, and abandoned-upload pruning all continue through the shared helper.

### Required-read policy

A call may not rely on “read everything.” Stage explicitly lists every required path. The provider must read all required files before answering. Large optional references are listed in the manifest but opened only when needed.

Typical Design Director required set:

1. runtime contract;
2. project research and strategy summaries;
3. target-screen list and relevant flows;
4. style-guide JSON and attached moodboard images;
5. selected skill adapters;
6. selected library catalogs and recipes.

Typical per-screen required set:

1. runtime and output contracts;
2. validated shared `design-plan.json`;
3. that screen's brief and relevant flow;
4. style-guide JSON and visual assets;
5. selected skill adapters applicable to that screen;
6. selected library catalog entries and recipes applicable to that screen.

### Runtime context-access audit

Stage records an audit row for every call:

| File | Policy | Expected | Observed provider read | Hash matched | Result |
|------|--------|----------|------------------------|--------------|--------|
| `design/style-guide.json` | required | yes | event from provider trace | yes | pass/fail |
| `libraries/magic-ui/recipes.json` | required for planned screen | yes | event from provider trace | yes | pass/fail |
| `libraries/magic-ui/examples/*` | on demand | no | optional | yes when read | informational |

A missing required read fails the context gate before output is accepted. This requires structured provider event capture: Claude/Codex text output alone cannot prove which files were opened. The debug dump stores the workspace manifest, per-call manifest, observed read events, prompt, output, render summary, and final gate report.

### Performance contract and trade-offs

This architecture should reduce repeated input tokens and overall wall time for multi-screen runs because shared context is materialized once and large references are opened selectively. Local file creation is negligible compared with provider generation.

It is **not automatically faster** if every screen is forced to read every file: file-tool round trips add latency and the model still consumes the contents as context. Therefore:

- list every available file in the manifest;
- require every small, relevant file explicitly;
- keep large source/example collections on demand;
- reuse the persisted design plan during scoped regeneration;
- measure first-token time, provider duration, input tokens, required-read coverage, and total run time against the current inline-prompt baseline.

Costs and risks:

- provider event formats differ and need adapters;
- workspace lifecycle, cleanup, size limits, path normalization, and concurrent-run isolation become security-critical;
- local files do not remove model context limits after the model reads them;
- weak manifests can omit important context, while oversized required sets recreate the existing problem;
- image support remains provider-specific at process level, even though Stage exposes the same asset contract;
- file-read evidence proves access, not comprehension, so render and visual acceptance gates remain necessary.

---

## 2. How it will work## 2. How it will work (target — same shape as today's diagnosis)

Today: *small local subset → model writes TSX → flatten to HTML.*  
Target: *fetch/vendor real libraries → model writes TSX with Motion → live React in app, static capture only for Figma.*

### 2.1 Model still writes React/TSX (keep)

Same as now: `tsx` is the design (`HIFI_REACT_RULES`). That part already matches the product.

### 2.2 Prompt stops forbidding Motion on the live path (change)

| Today | Target |
|-------|--------|
| "CSS only — JS does not survive" | Live preview: **use** `motion/react`, hover/click/springs |
| Motion skills are dead text | Motion skills drive real interaction |

Figma path keeps a separate rule: resting state only (Figma cannot run JS).

### 2.3 Libraries are real — registry/GitHub, not 4-file cosplay (change)

| Today | Target |
|-------|--------|
| Manual copies under `packages/wireframe-renderer/src/libraries/*` | Fetch/vendor from registries (e.g. `kokonutui.com/r/<name>.json`) + GitHub |
| Kokonut = CommandButton, GradientButton, CardFlip, TweetCard | Kokonut = shape-hero, bento-grid, liquid-glass-card, card-stack, beams, … |
| `@stage/base` → thin local folder | `@stage/base` → same virtual import, but the folder is the **full** allowed set for that pack |

Still sandboxed (virtual modules). We do **not** let the model import arbitrary npm. We **do** grow what those modules export to match the real library.

### 2.4 Allowed imports include Motion where the live path runs (change)

| Today | Target |
|-------|--------|
| `FREE_IMPORTS = react, lucide-react` only | Live: also `motion` / `motion/react` (and whatever the vendored components need) |
| Validate rejects Motion | Validate allows Motion on live; static/Figma path still strips or freezes to resting state |

### 2.5 Preview keeps React alive; Figma gets a deliberate static capture (change)

| Today | Target |
|-------|--------|
| `renderToStaticMarkup` = **the** output for preview + Figma | **App preview:** mount/hydrate the Screen so Motion/hover/click work |
| One path kills everything | **Figma export:** separate static capture (screenshot / resting SSR) — Figma is static-only |

So: one TSX source of truth, **two consumers** — live React (app), static frame (Figma).

### 2.6 Work order (short)

1. **R1/R2** — Live React + Motion preview. **Done.**
2. **W0** — Freeze the current inline-prompt baseline and remove hidden automatic skill selection.
3. **W1** — Build an isolated run workspace plus hashed context and per-call manifests.
4. **W2** — Give Claude/Codex exact read access and capture structured file-read events.
5. **W3** — Replace repeated context blobs with short manifest-driven Design Director and per-screen prompts.
6. **W4** — Persist the validated design plan and checkpoint each successful screen independently.
7. **W5** — Gate required reads, response integrity, rendering, plan conformance, and bounded repair.
8. **W6** — Compare speed, token use, coverage, and visual quality on the same four-screen Claude/Codex set.
9. **R3b** — Vendor more components only when acceptance evidence proves a recipe gap.

Progress tracker + **quality diagnosis from real dumps**: [`WIREFRAMES_REAL_REACT_AUDIT.md`](WIREFRAMES_REAL_REACT_AUDIT.md) (§ Quality diagnosis).

---

## 3. What happens today (code evidence)

> Some bullets below are historical diagnosis from before R1/R2. For current truth + dump findings, prefer the audit.

### 3.1 Model is told to write React/TSX

`apps/stage-engine/src/wireframes/prompt.rs` — `HIFI_REACT_RULES`: the `tsx` field is the design.

### 3.2 Motion is allowed on the live path (updated 2026-08-11)

Prompt + `FREE_IMPORTS` allow `motion/react`. Live preview runs the esbuild bundle; Figma/thumbnail stay static resting frame. **Dump reality:** model still often writes zero motion — that is a prompt/usage gap (Q1), not a forbid.

### 3.3 Nothing is fetched at runtime — imports are rewritten to local vendored copies

`packages/wireframe-renderer/src/cli.ts` — `rewriteModuleBindings` (line ~145):

```ts
function rewriteModuleBindings(tsx: string, bindings: [string, string][]) {
  return bindings.reduce(
    (acc, [module, libraryId]) =>
      acc
        .replaceAll(`"${module}"`, `"@/libraries/${libraryId}"`)
        .replaceAll(`'${module}'`, `'@/libraries/${libraryId}'`),
    tsx,
  );
}
```

`@stage/base` → `@/libraries/kokonut-ui` → files inside
`packages/wireframe-renderer/src/…`. No registry fetch, no `npx shadcn add @kokonutui/…`.

### 3.4 Allowed imports (updated 2026-08-11)

`FREE_IMPORTS` includes `react`, `lucide-react`, `motion`, `motion/react`. Everything else must come from bound `@stage/base` / `@stage/sections` / `@stage/charts`.
### 3.5 Preview/export kills React — `renderToStaticMarkup` is the end product

`packages/wireframe-renderer/src/cli.ts` — `renderScreen` (line ~209):

```ts
const markup = renderToStaticMarkup(root);
return markup.startsWith("<") ? markup : `<div>${markup}</div>`;
```

TSX → one SSR pass → static HTML string → that is what the user sees and what ships
to Figma. No hydration. No Motion. No hover-via-React-state.

### 3.6 "Kokonut UI" at Stage = 4 extra files, not the real 100+ library

`packages/wireframe-renderer/src/libraries/kokonut-ui/index.ts`:

```ts
export * from "@/libraries/shadcn-ui";
export { default as CommandButton } from "@/components/kokonutui/command-button";
export { default as GradientButton } from "@/components/kokonutui/gradient-button";
export { default as CardFlip } from "@/components/kokonutui/card-flip";
export { default as TweetCard } from "@/components/kokonutui/tweet-card";
```

Upstream (kokonutui.com): 100+ components. Registry JSONs include Motion-dependent
components (`card-stack` → `"dependencies": ["motion"]`) and SVG-filter components
(`liquid-glass-card` → `feDisplacementMap`, backdrop-filter). We have neither.

---

## 4. Figma: static only

**Figma does not run JS / hover / motion.** The Figma export path is a static capture
— the plugin screenshots/renders the current frame and imports layers. So:

- **Figma = static.** It will only ever receive the resting state.
- **Web preview = the place React + Motion pays off.** That is what users see first,
  what sells "this is real React", and what the motion skills are for.
- Therefore we need **two honest modes**: (a) live React preview for the app, and
  (b) a deliberate static render for Figma/export — not static-everywhere by accident.

---

## 5. The gap to close

1. **Live React preview/export path** — replace `renderToStaticMarkup` as the final
   answer with a path that can run Motion/JS (web preview), while keeping a separate,
   explicit static capture for Figma.
2. **Real component acquisition** — registry/GitHub fetch (or vendor) for Kokonut,
   Magic UI, Aceternity, cult-ui, coss/ui, reactbits, bklit — with a static-safety
   story for Figma export and a full-motion story for preview.
3. **Motion allowed where the renderer supports it** — stop globally forbidding JS
   motion in the prompt once the render path can run it.
4. **Libraries stop being 4-file cosplay** — exports grow to cover the real blocks
   (hero, bento, cards, liquid glass, stack, charts, forms, nav) mapped in the
   inventory file.

---

## 6. Where progress and inventory live

- Progress (where we are / stuck): [`WIREFRAMES_REAL_REACT_AUDIT.md`](WIREFRAMES_REAL_REACT_AUDIT.md)
- Component inventory (data): `packages/wireframe-renderer/manifests/wireframesQualityInventory.ts`
