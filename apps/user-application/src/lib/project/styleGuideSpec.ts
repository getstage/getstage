import type { CSSProperties } from "react";
import type { MoodboardStyleGuide, StyleGuideSpec } from "@stage/data-ops/contracts";
import type { MoodboardItem } from "@/types/project/moodboardTab";

export type ThemeMode = "light" | "dark";

const NEUTRAL_LABEL = /neutral|gray|grey|slate|graphite|stone|zinc|ink/i;

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((start) => {
    const channel = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const isHex = (value: string | undefined): value is string => !!value && /^#[0-9a-fA-F]{6}$/.test(value);

// Text colour that stays readable on `background` (white or near-black).
export function readableOn(background: string) {
  return luminance(background) > 0.45 ? "#0A0A0A" : "#FFFFFF";
}

// The values the AI generated, expressed in the editor's shape. Team edits are
// stored per section on top of this, so clearing them restores the generated guide.
function generatedSpec(guide: MoodboardStyleGuide, directionName: string, references: MoodboardItem[]): StyleGuideSpec {
  const palettes = guide.colorPalettes;
  const accent = palettes.find((palette) => !NEUTRAL_LABEL.test(palette.label)) ?? palettes[0];
  const neutral = palettes.find((palette) => NEUTRAL_LABEL.test(palette.label))?.colors.filter(isHex) ?? [];
  const primary = isHex(accent?.hex) ? accent.hex : "#18181B";
  const pick = (index: number, fallback: string) => neutral[index] ?? fallback;
  const light = {
    background: "#FFFFFF",
    surface: pick(0, "#F4F4F5"),
    text: pick(neutral.length - 1, "#09090B"),
    mutedText: pick(Math.floor(neutral.length / 2), "#71717A"),
    border: pick(1, "#E4E4E7"),
    primary,
  };
  const dark = {
    background: pick(neutral.length - 1, "#09090B"),
    surface: pick(neutral.length - 2, "#18181B"),
    text: pick(0, "#FAFAFA"),
    mutedText: pick(Math.floor(neutral.length / 2), "#A1A1AA"),
    border: pick(neutral.length - 3, "#27272A"),
    primary,
  };
  const rows = guide.typography.rows;
  const scaleLabels = ["Display", "Heading 1", "Heading 2", "Heading 3", "Body"];
  const fallbackScale = [40, 32, 24, 20, 16];

  return {
    intent: { name: directionName, line: guide.subtitle ?? "" },
    references: references.map((reference) => ({
      referenceId: reference.id,
      label: reference.title ?? "Reference",
      likes: "",
      lookAt: ["Everything"],
    })),
    colors: { light, dark },
    fonts: {
      heading: guide.typography.fontFamily,
      body: guide.typography.fontFamilies[1] ?? guide.typography.fontFamily,
      mono: "JetBrains Mono",
      size: "default",
    },
    shape: { corners: 8, depth: "soft", density: "balanced" },
    rules: { do: guide.implementationNotes.slice(0, 20), dont: [] },
    roles: [
      { id: "background", label: "Background", hint: "Page", light: light.background, dark: dark.background },
      { id: "sidebar", label: "Sidebar", hint: "Menu", light: light.surface, dark: dark.surface },
      { id: "content", label: "Content", hint: "Main area", light: light.background, dark: dark.background },
      { id: "header", label: "Header", hint: "Top bar", light: light.surface, dark: dark.surface },
      { id: "button", label: "Button", hint: "Primary action", light: primary, dark: primary },
      { id: "footer", label: "Footer", hint: "Bottom bar", light: light.surface, dark: dark.surface },
    ],
    typescale: scaleLabels.map((label, index) => {
      const row = rows[index];
      return {
        id: label.toLowerCase().replace(/\s+/g, "-"),
        label,
        size: row?.size ?? fallbackScale[index],
        lineHeight: index === 4 ? 150 : 120,
        weight: Number.parseInt(row?.weight ?? "", 10) || (index === 4 ? 400 : 700),
        tracking: index === 4 ? 0 : -0.02,
      };
    }),
    layout: { theme: "light", borderWidth: 1, maxWidth: 1280, variance: 5, rule: "" },
    motion: { duration: 160, easing: "ease-out", animate: ["hover", "state"] },
    components: { buttonShape: "corners", buttonLabel: "sentence", containers: "sentence" },
  };
}

export function resolveStyleGuideSpec(
  guide: MoodboardStyleGuide,
  directionName: string,
  references: MoodboardItem[],
): StyleGuideSpec {
  return { ...generatedSpec(guide, directionName, references), ...guide.spec };
}

const DENSITY_SPACE = { compact: 0.75, balanced: 1, airy: 1.3 } as const;
const FONT_SCALE = { compact: 0.9, default: 1, large: 1.12 } as const;
const DEPTH_SHADOW = {
  flat: "none",
  soft: "0 1px 3px rgb(0 0 0 / 0.08), 0 4px 12px rgb(0 0 0 / 0.06)",
  hard: "3px 3px 0 0 var(--foreground)",
} as const;

// shadcn/ui reads its theme from CSS variables; this maps the guide onto them so
// real shadcn components render the Direction exactly as the export will.
export function shadcnThemeVars(spec: StyleGuideSpec, mode: ThemeMode): CSSProperties {
  const c = spec.colors[mode];
  const radius = `${spec.shape.corners}px`;
  const buttonRadius = { pill: "9999px", rounder: `${spec.shape.corners + 6}px`, corners: radius }[spec.components.buttonShape];
  return {
    "--background": c.background,
    "--foreground": c.text,
    "--card": c.background,
    "--card-foreground": c.text,
    "--popover": c.background,
    "--popover-foreground": c.text,
    "--primary": c.primary,
    "--primary-foreground": readableOn(c.primary),
    "--secondary": c.surface,
    "--secondary-foreground": c.text,
    "--muted": c.surface,
    "--muted-foreground": c.mutedText,
    "--accent": c.surface,
    "--accent-foreground": c.text,
    "--destructive": "#DC2626",
    "--border": c.border,
    "--input": c.border,
    "--ring": c.primary,
    "--radius": radius,
    "--sg-button-radius": buttonRadius,
    "--sg-border-width": `${spec.layout.borderWidth}px`,
    "--sg-shadow": DEPTH_SHADOW[spec.shape.depth],
    "--sg-space": String(DENSITY_SPACE[spec.shape.density]),
    "--sg-font-scale": String(FONT_SCALE[spec.fonts.size]),
    "--sg-font-heading": `"${spec.fonts.heading}", ui-sans-serif, system-ui`,
    "--sg-font-body": `"${spec.fonts.body}", ui-sans-serif, system-ui`,
    "--sg-font-mono": `"${spec.fonts.mono}", ui-monospace, monospace`,
    "--sg-button-case": spec.components.buttonLabel === "uppercase" ? "uppercase" : "none",
    "--sg-container-case": spec.components.containers === "uppercase" ? "uppercase" : "none",
    "--sg-duration": spec.motion.animate.length ? `${spec.motion.duration}ms` : "0ms",
    "--sg-easing": spec.motion.easing,
  } as CSSProperties;
}

function colorTable(spec: StyleGuideSpec) {
  return [
    "| Role | Light | Dark |",
    "|---|---|---|",
    ...(Object.keys(spec.colors.light) as Array<keyof StyleGuideSpec["colors"]["light"]>).map(
      (role) => `| ${role} | \`${spec.colors.light[role]}\` | \`${spec.colors.dark[role]}\` |`,
    ),
    ...spec.roles.map((role) => `| ${role.label} (${role.hint}) | \`${role.light}\` | \`${role.dark}\` |`),
  ];
}

// DESIGN.md is derived from the same spec as the preview, so the two never drift.
export function styleGuideDesignMarkdown(spec: StyleGuideSpec, references: MoodboardItem[]) {
  const lines = [`# ${spec.intent.name} — DESIGN.md`, "", spec.intent.line, "", "## Colours", "", ...colorTable(spec)];
  lines.push(
    "",
    "## Fonts",
    "",
    `- Headings: ${spec.fonts.heading}`,
    `- Body: ${spec.fonts.body}`,
    `- Mono (numbers, code): ${spec.fonts.mono}`,
    `- Size: ${spec.fonts.size}`,
    "",
    "| Style | Size | Line height | Weight | Tracking |",
    "|---|---:|---:|---:|---:|",
    ...spec.typescale.map((row) => `| ${row.label} | ${row.size}px | ${row.lineHeight}% | ${row.weight} | ${row.tracking}em |`),
    "",
    "## Shape and density",
    "",
    `- Corners: ${spec.shape.corners}px`,
    `- Depth: ${spec.shape.depth}`,
    `- Density: ${spec.shape.density}`,
    `- Default theme: ${spec.layout.theme}`,
    `- Border width: ${spec.layout.borderWidth}px`,
    `- Max content width: ${spec.layout.maxWidth}px`,
    `- Layout variance: ${spec.layout.variance}/10${spec.layout.rule ? ` — ${spec.layout.rule}` : ""}`,
    "",
    "## Motion",
    "",
    `- ${spec.motion.duration}ms ${spec.motion.easing}; animate: ${spec.motion.animate.join(", ") || "nothing"}`,
    "",
    "## Components (shadcn/ui)",
    "",
    `- Button shape: ${spec.components.buttonShape}; label: ${spec.components.buttonLabel}`,
    `- Container titles: ${spec.components.containers}`,
  );
  if (spec.rules.do.length || spec.rules.dont.length) {
    lines.push("", "## Do", "", ...spec.rules.do.map((rule) => `- ${rule}`), "", "## Don't", "", ...spec.rules.dont.map((rule) => `- ${rule}`));
  }
  if (spec.references.length) {
    lines.push("", "## References");
    for (const entry of spec.references) {
      const image = references.find((reference) => reference.id === entry.referenceId);
      lines.push("", `### ${entry.label}`, "");
      if (image?.imageUrl) lines.push(`![${entry.label}](${image.imageUrl})`, "");
      if (entry.likes) lines.push(`What we like: ${entry.likes}`, "");
      lines.push(`Look at it when building: ${entry.lookAt.join(", ")}`);
    }
  }
  return lines.join("\n");
}
