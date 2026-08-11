# Wireframes prompt input & real components

> Snapshot of what Stage actually sends to the model on a Hi-Fi wireframes run,
> what "moodboard/style guide outranks skills" means, and which component packs
> are real vs UI-only.
>
> Related: `WIREFRAMES_REAL_REACT_AUDIT.md` (progress), `WIREFRAMES_REAL_REACT_LIBRARIES.md` (direction).
> Source of truth in code: `apps/stage-engine/src/wireframes/prompt.rs`,
> `packages/wireframe-renderer/manifests/libraries.json`.

---

## 1. Short answers

### Is the moodboard/style guide "simply color"?

**No.**

A moodboard style guide carries:

- **Color palettes** (`colorPalettes[]` — labels + hex + color sets)
- **Typography** (`fontFamily`, extra `fontFamilies`, size/weight/lineHeight rows, weight samples)
- **Atmosphere metrics** (density / variance / motion-style sliders as labeled values)
- **Direction metadata** (title, subtitle, which direction this guide belongs to)
- Plus the rest of the moodboard artifact in the prompt: **reference images**, directions, import mode

Two different things happen with that data:

1. **In the prompt (soft):** the full moodboard JSON is dumped into the model input, and the rule says moodboard/style guide outranks skill text when they conflict.
2. **In the renderer (hard):** `brand_theme()` extracts **palette hexes + fontFamily** from the selected style guide and writes them into CSS variables on the compiled stylesheet. That is mechanical, not "the model decides."

So "outranks" does **not** mean the moodboard replaces skills for layout craft.
It means: if Emil says "use indigo accents" and the style guide says "brand green + Inter", **brand wins**. Skills still own interaction craft, hierarchy, anti-slop, motion principles, etc.

### Do we have all these components?

**Only the ones vendored in the renderer.** The Integrations UI lists packs; the engine only uses packs that exist in `libraries.json` with real exports.

| Pack in UI | Real for wireframes? | Exports now |
|---|---|---|
| shadcn/ui | Yes (base) | 26 |
| Kokonut UI | Yes (base) | 21 |
| Origin UI | Yes (base) | 10 |
| Mantine | Yes (base) | 14 |
| Magic UI | Yes (sections) | 17 |
| Aceternity UI | Yes (sections) | **2** (thin) |
| Bklit UI | Yes (charts) | 6 |
| Radix UI | **No** | UI-only (`primitives`) |

We do **not** live-fetch Magic UI / Kokonut / marketplace pages at run time.
The model gets **Allowed import names + short usage notes**, then Stage renders those real React components.

---

## 2. Skill precedence (what that sentence means)

Prompt text:

```text
Where two skills conflict, the LATER block wins; moodboard/style guide outranks all of them.
```

Order of authority:

1. **Moodboard / style guide / brand kit** — brand colors, fonts, direction look
2. **Later skill block in the prompt** — if two skills disagree on craft
3. **Earlier skill blocks**
4. **Hard Stage rules** (`REACT_TSX_RULES`, allowed imports, JSON schema) — these are not overridden by skills

Example conflict:

- Skill says "use a purple gradient hero"
- Style guide palette is forest green + cream + Inter
- Model must follow the style guide for brand, and use the skill for hierarchy/craft within that brand

Taste skill (`design-taste-frontend`) is special: digest-only, appended last among skills so its anti-slop bans win skill-vs-skill conflicts. Moodboard still outranks Taste on brand tokens.

---

## 3. Exact input shape (example)

One screen ≈ one provider call. Typical enabled set:

- Skills: `ui-ux-pro-max`, `emil-design-eng`
- Packs: `kokonut-ui` (base), `magic-ui` (sections), `bklit-ui` (charts)

```text
<role>You are generating the Stage Wireframes artifact for a hifi pass.</role>

<rules>
- Return a SINGLE valid JSON object matching the Stage WireframesArtifact schema.
- Do NOT return markdown.
- Do NOT add explanatory text before or after the JSON.
- artifactKind MUST be "wireframesArtifact".
- Allowed block kinds: header, hero, feature-grid, testimonial, pricing-table, cta, form, logo-strip, footer, stat-strip, faq, media, text, list, table, navigation.
- Each generated screen MUST have 1-6 sections; each section MUST have 1-5 blocks.
- One screen per generatedScreens[] entry.
- Screen set: <project type guidance>
- Frame: desktop / 1440
- When a flows artifact is present, its screens are the authoritative screen list.
- SCOPED GENERATION: Return generatedScreens[] containing ONLY these screen ids: screen-homepage
- configureScreens[] must still list every screen; only generatedScreens[] is limited.
</rules>

Brand source: style-guide (apply moodboard styleGuides[].palette/typography for Hi-Fi).
Selected moodboard style direction ID: direction_1

Saved research artifact JSON:
{ ... full research JSON ... }

Saved strategy artifact JSON:
{ ... full strategy JSON ... }

Saved moodboard artifact JSON:
{ ... directions, references, styleGuides (palettes + typography + atmosphere) ... }

Saved flows artifact JSON (screens in scope and the flows they belong to):
{ ... flows JSON ... }

Hi-Fi mode — the design IS a React component:
- The "tsx" field is the design. Stage compiles it against the real component libraries.
- The "html" field is a fallback shown ONLY if compilation fails. Keep it SHORT and plain.
- Style the TSX with Tailwind utility classes.
- Still fill sections[]/blocks[] for Figma naming and Lo-Fi view.
- Derive palette/typography from moodboard or brand kit.
- Use realistic copy from strategy/research. No Lorem ipsum.
- Anti-slop: cohesive spacing/radius/shadows, strong hierarchy, no generic AI layouts.

<skill_precedence>
Where two skills conflict, the LATER block wins; moodboard/style guide outranks all of them.
</skill_precedence>

<skill id="ui-ux-pro-max">
<<< Stage SKILL.md >>>

---
Full upstream reference:
<<< SOURCE_ui-ux-pro-max.md >>>
<<< SOURCE_pro-rules.md >>>
</skill>

<skill id="emil-design-eng">
<<< Stage SKILL.md >>>

---
Full upstream reference:
<<< SOURCE_emil-design-eng.md >>>
</skill>

React component mode (Stage renders TSX → static HTML; no client JavaScript):
- For EACH generatedScreens[] entry, add a "tsx" field: a complete React function component as a string.
- Default-export function Screen() and return one visible root.
- Import components ONLY from @stage/base, @stage/sections, @stage/charts.
- Only other allowed imports: react and lucide-react.
- Import ONLY names shown in the Allowed import lines below.
- Build the screen OUT of those components. Do not recreate buttons/cards/charts/patterns the libraries already export.
- Keep a minimal "html" fallback of the same single visible frame. No display:none siblings.

Selected real component libraries for this run:
- Base: Kokonut UI (`kokonut-ui`). Allowed import: import { Badge, Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, CommandButton, GradientButton, Input, Label, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea, CardFlip, TweetCard } from "@stage/base";
  usage notes for CardFlip / TweetCard...
- Sections: Magic UI (`magic-ui`). Allowed import: import { BentoCard, BentoGrid, Marquee, GridPattern, DotPattern, Ripple, OrbitingCircles, AnimatedShinyText, AnimatedGradientText, AuroraText, ShineBorder, BorderBeam, ShimmerButton, RainbowButton, AvatarCircles, Iphone, Safari } from "@stage/sections";
  usage notes...
- Data visuals: Bklit UI (`bklit-ui`). Allowed import: import { AreaChart, BarChart, ChartLegend, DonutChart, LineChart, Sparkline } from "@stage/charts";
  usage notes...
```

### What the model must return

```json
{
  "artifactKind": "wireframesArtifact",
  "configureScreens": [],
  "generatedScreens": [
    {
      "id": "screen-homepage",
      "title": "Homepage",
      "tsx": "import { Button, Card } from \"@stage/base\";\nimport { BentoGrid } from \"@stage/sections\";\nexport default function Screen() {\n  return (\n    <div className=\"p-10\">...</div>\n  );\n}\n",
      "html": "<div style=\"padding:40px\"><h1>Headline</h1></div>",
      "sections": []
    }
  ]
}
```

After that, Stage:

1. Normalizes the JSON
2. Compiles `tsx` with the real libraries + Tailwind
3. Applies brand theme CSS vars from the style guide
4. Offloads HTML/CSS to R2
5. Saves the artifact to Convex

---

## 4. Skills: full vs digest

| Skill | In wireframes catalog? | Injected content |
|---|---|---|
| `ui-ux-pro-max` | Yes | Full (SKILL.md + upstream SOURCE files) |
| `emil-design-eng` | Yes | Full |
| `frontend-design` | Yes | Full |
| `impeccable` | Yes | Full |
| `design-motion-principles` | Yes | Full |
| `design-taste-frontend` | Yes | **Digest only** (~3 KB; upstream ~87 KB too large) |
| `shadcn-ui-skill` | No | Not in the wireframes skill catalog |

We do **not** fetch skills from GitHub during a run. Files live under `apps/stage-engine/skills/<id>/`.

---

## 5. Components we actually have (exports)

### Base — `shadcn-ui` (26)
Badge, Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs, TabsContent, TabsList, TabsTrigger, Textarea

### Base — `kokonut-ui` (21)
Badge, Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, CommandButton, GradientButton, Input, Label, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea, CardFlip, TweetCard

### Base — `origin-ui` (10)
Badge, Button, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea

### Base — `mantine` (14)
Badge, Button, Card, Grid, Group, Paper, Select, Stack, Table, Tabs, Text, Textarea, TextInput, Title

### Sections — `magic-ui` (17)
BentoCard, BentoGrid, Marquee, GridPattern, DotPattern, Ripple, OrbitingCircles, AnimatedShinyText, AnimatedGradientText, AuroraText, ShineBorder, BorderBeam, ShimmerButton, RainbowButton, AvatarCircles, Iphone, Safari

### Sections — `aceternity-ui` (2)
BentoGrid, BentoGridItem

### Charts — `bklit-ui` (6)
AreaChart, BarChart, ChartLegend, DonutChart, LineChart, Sparkline

### Not real in wireframes
- **Radix UI** — shown in Integrations, `packKind: "primitives"`, never bound as `@stage/*`

---

## 6. What we intentionally do NOT send

- Live marketplace / GitHub pages
- Full source code of every Magic UI / Kokonut component (only names + usage)
- Full Design Taste upstream (digest only)
- Client JS / motion libraries that would be invisible under static SSR

---

## 7. Why this matters

Quality levers today are:

1. **Full skill text** for enabled catalog skills (except Taste)
2. **Real component allowlists** (Magic UI expanded; Aceternity still thin)
3. **Moodboard brand tokens** applied both in prompt and in renderer CSS
4. **Hard compile/validate path** — wrong imports fail render and fall back to model HTML

If output still looks generic, the next lever is usually: richer Aceternity depth, better composition exemplars in the prompt, or project-level pack/skill selection — not "fetch the marketplace at runtime."
