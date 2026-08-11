EXAMPLE — what Stage sends Claude for ONE screen (homepage)
Config: skills = ui-ux-pro-max + emil-design-eng
        packs  = kokonut-ui + magic-ui + bklit-ui

================================================================================
PROMPT START
================================================================================

<role>You are generating the Stage Wireframes artifact for a hifi pass.</role>

<rules>
- Return a SINGLE valid JSON object matching the Stage WireframesArtifact schema.
- Do NOT return markdown.
- artifactKind MUST be "wireframesArtifact".
- SCOPED GENERATION: Return generatedScreens[] containing ONLY these screen ids: screen-homepage
- Frame: desktop / 1440
</rules>

Brand source: style-guide (apply moodboard styleGuides[].palette/typography for Hi-Fi).
Selected moodboard style direction ID: direction_1

Saved research artifact JSON:
{
  "company": "Nordwind",
  "summary": "Design workflow tool for agencies...",
  "...": "≈70KB real research omitted"
}

Saved strategy artifact JSON:
{
  "positioning": "One working surface for briefs, files and decisions",
  "cta": "Create project",
  "...": "≈7KB strategy omitted"
}

Saved moodboard artifact JSON:
{
  "styleGuides": [{
    "directionId": "direction_1",
    "title": "Editorial warm",
    "colorPalettes": [
      {"label": "Primary", "hex": "#1A1A1A", "colors": ["#1A1A1A", "#F5F0E8", "#C4A35A"]},
      {"label": "Accent", "hex": "#2F6F4E", "colors": ["#2F6F4E"]}
    ],
    "typography": {
      "fontFamily": "Instrument Sans",
      "rows": [{"id":"h1","size":48,"weight":"600","lineHeight":"1.1"}]
    },
    "atmosphere": [{"label":"Density","value":"Airy","position":30}]
  }]
}

Saved flows artifact JSON:
{
  "flows": [{"id":"onboarding","screens":["screen-homepage","screen-signup"]}],
  "...": "flows for this screen"
}

Hi-Fi mode — the design IS a React component:
- The "tsx" field is the design.
- The "html" field is a short fallback only.
- Use Tailwind in tsx. Derive colors/fonts from the moodboard above.
- No Lorem ipsum. Anti-slop: strong hierarchy, cohesive spacing.

<skill_precedence>
Where two skills conflict, the LATER block wins; the moodboard/style guide outranks all of them.
</skill_precedence>

<skill id="ui-ux-pro-max">
---
name: ui-ux-pro-max-stage
description: Stage-adapted nextlevelbuilder UI UX Pro Max skill for Hi-Fi wireframe HTML.
source: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
---

# Stage Hi-Fi — UI UX Pro Max

Apply when generating Stage `generatedScreens[].html` fragments.
Upstream targets native/mobile app UI and ships CSV datasets plus Python search scripts. Stage generates

---
Full upstream reference:
<!-- Upstream source, vendored verbatim for provenance: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill -->

---
name: ui-ux-pro-max
description: "UI/UX design intelligence for web and mobile. Searchable local database with 84 styles, 192 color palettes, 74 font pairings, 192 product types, 98 UX guidelines, 104 icon entries, 16 GSAP motion presets, and 25 chart types across 22 stacks (React, Next.js, Vue, Nuxt, Svelte, Astro, SwiftUI, React Native, Flutter, Tailwind, shadcn/ui, Jetpack Compose, Angular, Laravel, JavaFX, WPF, WinUI, Avalonia, Uno Platform, UWP, Three.js, and HTML/CSS). Use when designing, building, or reviewing UI: pages, components, color schemes, typography, layout, accessibility, animation, or data visualization."
---

# UI/UX Pro Max - Design Intelligence
... (full upstream files continue, ~23KB total for this skill)
</skill>

<skill id="emil-design-eng">
---
name: emil-design-eng-stage
description: Stage-adapted emilkowalski design-engineering skill for Hi-Fi wireframe HTML.
source: https://github.com/emilkowalski/skills/tree/main/skills/emil-design-eng
---

# Stage Hi-Fi — Design Engineering


---
Full upstream reference:
... (full Emil source continues, ~27KB)
</skill>

React component mode:
- Add a "tsx" field: complete React function component.
- Default-export function Screen().
- Import ONLY from @stage/base, @stage/sections, @stage/charts.
- Also allowed: react, lucide-react.
- Import ONLY names listed below.
- Build from real components; don't recreate Button/Card/charts by hand.
- Keep a minimal html fallback. One visible frame. No display:none siblings.

Selected real component libraries for this run:
- Base: Kokonut UI (`kokonut-ui`). Allowed import:
  import { Badge, Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, CommandButton, GradientButton, Input, Label, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea, CardFlip, TweetCard } from "@stage/base";
  CardFlip is a showcase card (props: title, subtitle, description, features[]) — it flips on hover and renders its front face statically. TweetCard is a social-proof quote card (props: authorName, authorHandle, authorImage, content[], timestamp, href, optional reply={authorName, authorHandle, authorImage, content, timestamp}).

- Sections: Magic UI (`magic-ui`). Allowed import:
  import { BentoCard, BentoGrid, Marquee, GridPattern, DotPattern, Ripple, OrbitingCircles, AnimatedShinyText, AnimatedGradientText, AuroraText, ShineBorder, BorderBeam, ShimmerButton, RainbowButton, AvatarCircles, Iphone, Safari } from "@stage/sections";
  Compose sections from these instead of hand-writing markup. BentoGrid takes children; BentoCard requires name and description (className, background, Icon as a component reference, href, cta optional). Marquee repeats its children (props: reverse, vertical, pauseOnHover, repeat). GridPattern/DotPattern/Ripple are absolute background layers: place as the first child of a relative parent, content af...

- Data visuals: Bklit UI (`bklit-ui`). Allowed import:
  import { AreaChart, BarChart, ChartLegend, DonutChart, LineChart, Sparkline } from "@stage/charts";
  Every chart takes data: { label: string; value: number }[] and a label string for accessibility. DonutChart also takes centerLabel and derives the center total from the data. Charts inherit brand color from currentColor — set it with a text-* class on the chart or an ancestor. Give each chart a sized container (for example h-48) because they fill their parent.

================================================================================
PROMPT END
================================================================================

WHAT THE MODEL MUST RETURN (example):

{
  "artifactKind": "wireframesArtifact",
  "configureScreens": [{"id":"screen-homepage","title":"Homepage","selected":true}],
  "generatedScreens": [{
    "id": "screen-homepage",
    "title": "Homepage",
    "tsx": "import { Button, Card } from \"@stage/base\";\nimport { BentoGrid, AnimatedShinyText } from \"@stage/sections\";\nimport { AreaChart } from \"@stage/charts\";\n\nexport default function Screen() {\n  return (\n    <div className=\"p-10 bg-[#F5F0E8]\">\n      <h1 className=\"text-[48px] font-semibold text-[#1A1A1A]\">\n        Every brief, file and <AnimatedShinyText>decision</AnimatedShinyText> in one surface\n      </h1>\n      <Button>Create project</Button>\n      <BentoGrid>...</BentoGrid>\n      <AreaChart data={[...]} label=\"Activity\" />\n    </div>\n  );\n}\n",
    "html": "<div style=\"padding:40px;background:#F5F0E8\"><h1>Every brief...</h1></div>",
    "sections": [{"id":"hero","title":"Hero","blocks":[...]}]
  }]
}

THEN STAGE:
1) validates / normalizes that JSON
2) compiles the tsx with real Kokonut + Magic UI + Bklit components
3) saves rendered HTML (+ CSS offloaded to R2)
