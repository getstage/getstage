# Wireframes session audit — 7–9 Aug 2026

> **Scope:** the React/Tailwind pipeline switch-on and everything it exposed.
> **Related:** [`WIREFRAMES_QUALITY_PLAN.md`](WIREFRAMES_QUALITY_PLAN.md) (standing plan) · engine `apps/stage-engine/src/wireframes/` · renderer `packages/wireframe-renderer/`

Every request in the order asked, with honest status.

**Legend:** `[x]` done and verified · `[~]` partially done · `[ ]` not done

---

## 1. Requests that produced shipped code

| # | You asked | Status | What actually happened |
|---|---|---|---|
| 1 | Add **bklit** as a third pack kind | `[x]` | 6 components (area, bar, line, donut, sparkline, legend) + geometry. Vendored as deterministic SVG — bklit's real source is `"use client"` + visx `ParentSize`, which measures the DOM and renders empty under SSR |
| 2 | "Start integrating everything" | `[~]` | Slot-table refactor across Rust + TS; killed nullable `sectionsLibraryId` and the `__missing-sections__` sentinel |
| 3 | Clean code — no null/`?`/undefined | `[x]` | New code uses sum types and non-optional construction. Existing `ProjectSelection` kept its `\| null` shape rather than being rewritten |
| 4 | Apply the **ponytail** skill | `[x]` | Deleted dead `base()` method; extended existing structures instead of adding parallel ones; slot table is net-simplifying |
| 5 | Explain `workflow.rs` code quality | `[x]` | 883 lines, depth 9, 115 control-flow statements. You were right |
| 6 | Flatten the `if let Ok` pyramid | `[x]` | Extracted `collect_repair_artifact`; failures now logged instead of silently swallowed |
| 7 | "All components must work, not a handful" | `[x]` | Full 12/12 matrix passes: 4 bases × (none/2 sections) × charts |
| 8 | Adapt to Tailwind / rip out the HTML-design path | `[x]` | Split `HIFI_REACT_RULES` from `HIFI_RULES`; dropped the six `pack.css` cosplay packs on React runs. Prompt 301K → 262K → 221K |
| 9 | Rename Charts → **Data visuals** | `[x]` | Panel label, prompt, slot table. Internal id stays `charts` |
| 10 | Output must follow the **moodboard** | `[x]` | `brand_theme()` extracts palette + font → renderer writes `:root` overrides. **Confirmed live: `brand_theme_applied=true`, `failed=0`** |
| 11 | Charts/graphs look wrong | `[x]` | Removed the `text-primary` default; charts inherit the section's colour |
| 12 | Do we clean up `.stage-batches`? | `[x]` | Self-deleting `finally` + age sweep. 13 dirs / 1.0 MB purged; verified 0 left after a run |
| 13 | This audit | `[x]` | — |
| 14 | Model importing names a library doesn't export | `[x]` | `validateNamedImports` checks against the manifest. `Group`/`Stack`/`Text`/`Title` from Kokonut now returns "kokonut-ui does not export Group, Stack… Available: …" instead of a Node stack trace, so the repair pass can act on it |

## 2. Bugs I found and fixed that you did not ask for

| Bug | Status | Note |
|---|---|---|
| Mantine never worked in the React renderer | `[x]` | Duplicate React instance via the `os.tmpdir()` symlink. Pre-existing, not from this work |
| Magic UI `BentoCard` killed whole screens | `[x]` | Required `Icon` prop; now optional and degrades |
| Renderer swallowed its own error output | `[x]` | Exit code checked before stdout, so real per-screen errors were lost |
| Model emitted zero `tsx` | `[x]` | Shape example had no `tsx`, pre-flight only checked `html`, rules buried under 290K of skills |
| pack.css prompt/normalize tests went stale when React mode dropped pack injection | `[x]` | Rewritten: pack order / base-supply now asserted on `selected_component_packs` directly, the stylesheet prepend on `with_pack_css`, and react-mode prompt asserts the real-library bindings |

## 3. Not done

| # | You asked | Status | Why |
|---|---|---|---|
| 14 | **Store artifacts in R2, not Convex** | `[ ]` | **Asked ~3h before this audit. Discussed four times, never built. Mantine still dies at 1.53 MiB.** My failure |
| 15 | Fix the `EADDRINUSE` crash on port 48224 | `[ ]` | You picked it, I started, then redirected to wireframes. Never returned |
| 16 | "Research these skills a lot more" | `[ ]` | `ui-ux-pro-max` / `emil-design-eng` untouched. Still HTML-era, still the bulk of the prompt |
| 17 | bklit radar / gauge / choropleth (image #8) | `[ ]` | Only the 5 basic charts exist |
| 18 | Mobile output for `app-design` projects | `[~]` | Prompt + contract carry viewport and frame width; the **preview still doesn't render at 390px** |
| 19 | Live React preview (motion/hover) | `[~]` | Instead of the rewrite: CSS motion + hover rules added, since CSS survives the sanitizer. JS-driven motion still impossible |
| 20 | Deeper component libraries | `[ ]` | Magic UI still 3 components, Aceternity still 1. The week of vendoring |
| 21 | Atmosphere sliders (Density/Variance/Motion) | `[ ]` | Still reach nothing |

## 4. The six panel promises

| Promise | Start of day | Now |
|---|---|---|
| Design skill · UI UX Pro Max | Partly kept | Partly kept — unchanged |
| Motion skill · Emil Design Eng | Not kept | `[~]` CSS motion/hover now instructed; JS motion still impossible |
| Base system · Kokonut UI | Not really kept | `[x]` Real components **and** on-brand tokens — confirmed live |
| Page sections · Magic UI | Barely kept | Barely kept — still 3 components |
| Data visuals · Bklit | Did not exist | `[~]` Exists, renders, inherits brand colour |
| Style Guide · New Direction | Half kept | `[x]` Palette reaches components — confirmed in a live run |

## 4b. Open — added 9 Aug

| # | Item | Status | Note |
|---|---|---|---|
| 22 | **Delete wireframes quickly, for testing** | `[x]` | "Delete screens" button in the wireframes header. New `clearWireframeScreens` mutation empties `generatedScreens`, keeps `configureScreens`, drops back to the kind-picker — so the next run takes the **first-generation** path without creating a new project. Confirm dialog; not undoable |
| 23 | Adrien's error "right after the run" | `[ ]` | **Unconfirmed.** Prime suspect is the Convex 1 MiB save overflow — the failure fires at save, immediately after generation. **Need his exact error text.** If it says "Value is too large", item 15 closes it |
| 24 | Prompt rule: only import names the library exports | `[x]` | Landed in `REACT_TSX_RULES`: import only names in the library's "Allowed import" line, and never leave backslash-escaped quotes in the decoded tsx. Pairs with the runtime validation in `cli.ts` (item 14) |
| 25 | Renderer self-repairs double-escaped quotes | `[x]` | Model wrote `className=\"...\"` in the tsx on the 11:34 run — esbuild "Unexpected backslash" cost a 77s model repair pass. The renderer now decodes, re-validates, re-binds and retries once in-process (~0s), and Rust logs `repaired` so we can see how often it happens |
| 26 | Preview iframe "Blocked script execution" spam | `[x]` | Saved fragments still carry `<script>` tags; the sandbox blocks them one console error at a time. `buildWireframePreviewDocument` strips them — covers thumbnails, the full-size dialog, and Figma capture |
| 28 | Results grid hard-capped at 6 cards | `[x]` | `WIREFRAMES_RESULTS_PREVIEW_LIMIT = 6` + `buildResultCards(...).slice(0, limit)` — even a successful 17-screen save only showed 6. Removed the cutoff; the grid now renders every generated screen |
| 27 | Radix `DialogContent` a11y warnings | `[x]` | sr-only `Dialog.Description` added to the wireframe preview dialog, `ResearchRerunDialog`, `StrategyRegenerateDialog` |
| 28 | Run-fatal HTML-era validation in react mode | `[x]` | 10 Aug 07:37 run: a wizard screen's `html` fallback (which the react prompt explicitly requires) hit `validate_hifi_html`, whose hidden-steps heuristic doesn't read Tailwind classes — one screen killed all 17 before the renderer even ran. Fixed three ways: (a) a screen that fails normalization is dropped, not run-fatal; a run only fails when nothing survives, with the first rejection attached. (b) Screens carrying `tsx` skip the HTML-era validation entirely — the renderer is the real gate, the fallback is transient. (c) The hidden-only heuristic now also accepts Tailwind layout utilities (`flex`/`block`/`grid` in class attrs) as visible content. 3 new tests; 200/200 green |

## 5. Next, in order

| # | Item | Why it's next |
|---|---|---|
| 1 | `[x]` **Storage — stylesheet once per run, then R2** | Shipped 2026-08-09 PM: renderer emits one batch stylesheet + bare fragments; engine offloads CSS/HTML to R2 before save (inline fallback per screen on upload failure); queries resolve keys to URLs; desktop fetches text via `storage:fetch-r2-text`; Figma/Paper exports inline the CSS for capture; clear/replace deletes R2 objects. Proven live 20:23 run: 17/17 react screens offloaded to R2, artifact 219 KB, save 1 s, Figma export OK. Follow-up: Cloudflare email-obfuscation injects a script into R2 HTML responses — stripped at both fetch boundaries (IPC + engine) |
| 2 | `[ ]` Get Adrien's exact error text | One paste confirms or kills the hypothesis above |
| 3 | `[x]` Prompt rule for import names | Shipped (item 24) |
| 4 | `[x]` **Library depth** | Shipped 2026-08-09 evening: Magic UI 3 -> 17 exports (GridPattern, DotPattern, AnimatedShinyText, AnimatedGradientText, AuroraText, ShineBorder, BorderBeam, Ripple, OrbitingCircles, ShimmerButton, RainbowButton, AvatarCircles, Iphone, Safari + Bento/Marquee), Kokonut +CardFlip/+TweetCard; all vendored from upstream sources, static-safe only (motion-lib components dropped: they SSR invisible). Keyframes in globals.css, manifest + prompt rule extended. Verified: fixture importing all 19 renders clean |
| 5 | `[x]` Skills research | Verdict: digests only, model never saw full skills. Fixed: `CATALOG_SKILLS` now appends verbatim upstream sources after each digest (ui-ux-pro-max +23 KB, emil +27 KB, impeccable +11 KB, frontend-design +8 KB, motion +7 KB; taste stays digest-only at 87 KB). Prompt ~36.6 -> ~90 KB/screen. Old "assumes React/Tailwind" rationale was stale — renderer IS React/Tailwind |
| 6 | `[ ]` Loose ends | EADDRINUSE, mobile preview width (390px), Atmosphere sliders |

### Known-good config (pre-fix baseline)
Kokonut / shadcn / Origin → ~67–73 KB per screen, saved fine even before the fix.
**Mantine → was ~340 KB per screen and lost whole runs; after the fix the fragment is ~1–30 KB and the ~340 KB stylesheet lives once in R2.**

## 6. How I worked, and why it went badly

I let each screenshot set the agenda instead of keeping a list. The storage fix was agreed early, then displaced five times because something newer was on screen. Nothing tracked it, so nothing brought it back.

I also verified after nearly every single edit instead of batching, which made everything feel glacial — that was already written down as a preference and I ignored it.

Worth stating once: most of what broke during testing (Mantine, Magic UI's `Icon`, swallowed renderer errors, zero TSX, the 1.53 MiB save) was **already broken before this session**. It was invisible because the React path never ran and every screen silently fell back to hand-written HTML. Turning the path on exposed them rather than causing them.

Also: `ResultsGrid.tsx` and `workflow.rs` had uncommitted changes **before** this session started — not all of that diff is mine. Check before committing.
