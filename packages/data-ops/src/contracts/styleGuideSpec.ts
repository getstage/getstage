import { z } from "zod";

// The editable Style Guide a team works on together. Every section is optional on the
// stored guide: an absent section falls back to what the AI generated, so "Reset to
// generated" is simply clearing the overrides.

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const styleGuideLookAtOptions = [
  "Everything",
  "Layout",
  "Navigation",
  "Typography",
  "Color",
  "Components",
  "Forms",
  "Data",
] as const;

export const styleGuideColorRoles = ["background", "surface", "text", "mutedText", "border", "primary"] as const;

const colorSetSchema = z.object(
  Object.fromEntries(styleGuideColorRoles.map((role) => [role, hex])) as Record<
    (typeof styleGuideColorRoles)[number],
    typeof hex
  >,
);

export const styleGuideSpecSchema = z.object({
  intent: z.object({
    name: z.string().max(80),
    line: z.string().max(240),
  }),
  references: z
    .array(
      z.object({
        referenceId: z.string().min(1),
        label: z.string().max(80),
        likes: z.string().max(500),
        lookAt: z.array(z.enum(styleGuideLookAtOptions)),
      }),
    )
    .max(24),
  colors: z.object({ light: colorSetSchema, dark: colorSetSchema }),
  fonts: z.object({
    heading: z.string().min(1).max(80),
    body: z.string().min(1).max(80),
    mono: z.string().min(1).max(80),
    size: z.enum(["compact", "default", "large"]),
  }),
  shape: z.object({
    corners: z.number().int().min(0).max(24),
    depth: z.enum(["flat", "soft", "hard"]),
    density: z.enum(["compact", "balanced", "airy"]),
  }),
  rules: z.object({
    do: z.array(z.string().max(200)).max(20),
    dont: z.array(z.string().max(200)).max(20),
  }),
  roles: z
    .array(z.object({ id: z.string().min(1), label: z.string().max(40), hint: z.string().max(60), light: hex, dark: hex }))
    .max(16),
  typescale: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().max(40),
        size: z.number().int().min(8).max(120),
        lineHeight: z.number().int().min(80).max(200),
        weight: z.number().int().min(100).max(900),
        tracking: z.number().min(-0.2).max(0.2),
      }),
    )
    .max(10),
  layout: z.object({
    theme: z.enum(["light", "dark"]),
    borderWidth: z.number().int().min(0).max(3),
    maxWidth: z.union([z.literal(1120), z.literal(1280), z.literal(1440)]),
    variance: z.number().int().min(0).max(10),
    rule: z.string().max(200),
  }),
  motion: z.object({
    duration: z.number().int().min(0).max(1000),
    easing: z.enum(["linear", "ease-in", "ease-out", "ease-in-out"]),
    animate: z.array(z.enum(["hover", "state", "entrances", "pages"])),
  }),
  components: z.object({
    buttonShape: z.enum(["pill", "rounder", "corners"]),
    buttonLabel: z.enum(["uppercase", "sentence"]),
    containers: z.enum(["uppercase", "sentence"]),
  }),
});

export const styleGuideSectionSchema = styleGuideSpecSchema.keyof();

// One collaborative edit: replace one section, or drop every override.
export const styleGuideEditSchema = z.union([
  z.object({ kind: z.literal("section"), section: styleGuideSectionSchema, value: z.unknown() }),
  z.object({ kind: z.literal("reset") }),
]);

export type StyleGuideSpec = z.infer<typeof styleGuideSpecSchema>;
export type StyleGuideSection = z.infer<typeof styleGuideSectionSchema>;
export type StyleGuideEdit = z.infer<typeof styleGuideEditSchema>;
export type StyleGuideLookAt = (typeof styleGuideLookAtOptions)[number];
export type StyleGuideColorRole = (typeof styleGuideColorRoles)[number];

export function parseStyleGuideSection<S extends StyleGuideSection>(section: S, value: unknown): StyleGuideSpec[S] {
  return styleGuideSpecSchema.shape[section].parse(value) as StyleGuideSpec[S];
}
