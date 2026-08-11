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

Real components are ingredients, not the quality system. Claude and Codex receive the same Stage prompt and must follow the same compact contract:

1. **Run-level design system:** one aesthetic thesis plus shared typography, palette roles, spacing, radius, elevation, density, variance, and motion vocabulary across every parallel screen.
2. **Page-specific override:** screen purpose and information hierarchy decide density, composition, and which component recipe fits.
3. **Semantic component fit:** use a signature component only when it serves the content. Decorative effects do not count as structure; charts require meaningful data relationships.
4. **Purposeful motion:** motion explains state, space, feedback, or a feature. High-frequency interactions stay restrained; first-time/showcase moments may carry delight. Every static resting frame remains complete for Figma.
5. **Deterministic quality gate:** inspect the returned TSX and repair only screens that are missing, invalid, generic despite a fitting recipe, visually repetitive, or inconsistent with the shared system.

Skill source files are reference material. Provider/plugin instructions, CLI commands, and “respond only” behavior are not injected into generation prompts. Stage injects only adapted design guidance or a queried product-specific slice.

---

## 2. How it will work (target — same shape as today's diagnosis)

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

1. **R1** — Live React preview (architecture of the two consumers). **Done.**  
2. **R2** — Allow Motion on the live path. **Done** (allowed; model still under-uses → Q1).  
3. **R3a** — Vendor static-safe showcase pieces. **Partial.**  
4. **Q1** — Prompt pressure so showcase comps + motion are actually used (see audit). **Next.**  
5. **R3b** — Vendor Motion set once Q1 demands them.  
6. **R5** — Explicit Figma static capture. **Done.**  
7. **Skills** — Taste React rewrite, ui-ux-pro-max lookup, Emil/motion actually useful.

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
