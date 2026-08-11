import { z } from "zod";

export const wireframeKindSchema = z.enum(["lofi", "hifi"]);

export const wireframeBrandSourceSchema = z.enum(["style-guide", "brand-kit"]);

export const wireframeScreenKindSchema = z.enum(["Page", "Section"]);

export const wireframeRenderModeSchema = z.enum(["react", "html-fallback"]);

/** The frame a run was designed for. Derived from the project type by the engine. */
export const wireframeViewportSchema = z.enum(["mobile", "desktop"]);

export const wireframeConfigureScreenSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  kind: wireframeScreenKindSchema,
  priority: z.string().min(1),
  required: z.boolean(),
  selected: z.boolean(),
});

export const wireframeBrandKitSchema = z.object({
  fileName: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  fileSizeLabel: z.string().min(1),
});

export const wireframeBlockKindSchema = z.enum([
  "header",
  "hero",
  "feature-grid",
  "testimonial",
  "pricing-table",
  "cta",
  "form",
  "logo-strip",
  "footer",
  "stat-strip",
  "faq",
  "media",
  "text",
  "list",
  "table",
  "navigation",
]);

export const wireframeBlockEmphasisSchema = z.enum(["primary", "secondary", "tertiary"]);

export const wireframeBlockSchema = z.object({
  id: z.string().min(1),
  kind: wireframeBlockKindSchema,
  intent: z.string().min(1),
  copySlots: z.record(z.string(), z.string()).optional(),
  emphasis: wireframeBlockEmphasisSchema.default("secondary"),
  notes: z.string().optional(),
});

export const wireframeSectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  blocks: z.array(wireframeBlockSchema).default([]),
});

export const wireframeBrandTokensSchema = z.object({
  paletteRef: z.string().optional(),
  typographyRef: z.string().optional(),
});

export const wireframeGeneratedScreenSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  priority: z.string().min(1),
  generatedAtLabel: z.string().min(1),
  // Numeric ms timestamp for this specific screen. Partial regen updates only
  // the regenerated screens' timestamps, so cards render honest per-screen times
  // instead of the artifact-level time. Optional for legacy artifacts.
  generatedAt: z.number().int().nonnegative().optional(),
  figmaUrl: z.string().url().optional(),
  goal: z.string().optional(),
  sections: z.array(wireframeSectionSchema).default([]),
  brandTokens: wireframeBrandTokensSchema.optional(),
  // Hi-Fi source of truth: a self-contained HTML fragment that renders this
  // screen as a final design. Absent for Lo-Fi (block-only) screens.
  html: z.string().optional(),
  // React-rendered screens offload their fragment to R2 (the compiled Tailwind
  // build made inline html blow the Convex 1 MiB document limit). `htmlUrl` is
  // the stored object key at rest; reads resolve it to a URL. `html` stays for
  // Lo-Fi, model-HTML fallbacks, and artifacts from before the offload.
  htmlUrl: z.string().optional(),
  // The interactive React build (React + motion), offloaded to R2 like `htmlUrl` and
  // present only for React-rendered screens. The live preview runs it in a sandboxed
  // iframe; `liveUrl` is the stored object key at rest, resolved to a URL on read.
  liveHtml: z.string().optional(),
  liveUrl: z.string().optional(),
  // How that HTML was produced. The React path falls back silently, so without this
  // a screen built from real library components is indistinguishable from one the
  // model hand-wrote. Artifacts predating the React renderer are all fallbacks.
  renderMode: wireframeRenderModeSchema.default("html-fallback"),
});

export const wireframesStatsSchema = z.object({
  flowsScreenCount: z.number().int().nonnegative(),
  moodboardPatternCount: z.number().int().nonnegative(),
  totalConfigureScreenCount: z.number().int().nonnegative(),
});

export const wireframesInputSchema = z.object({
  projectId: z.string().min(1),
  projectName: z.string().min(1),
  wireframeKind: wireframeKindSchema,
  brandSource: wireframeBrandSourceSchema,
  selectedScreenIds: z.array(z.string().min(1)).default([]),
  layoutPreference: z.string().max(2000).optional(),
  styleDirectionId: z.string().min(1).optional(),
});

export const wireframesArtifactSchema = z.object({
  apiVersion: z.literal("v1"),
  artifactKind: z.literal("wireframesArtifact"),
  projectId: z.string().min(1),
  title: z.string().min(1),
  wireframeKind: wireframeKindSchema,
  // Artifacts predating the viewport axis were all designed at desktop width.
  viewport: wireframeViewportSchema.default("desktop"),
  frameWidth: z.number().int().positive().default(1440),
  brandSource: wireframeBrandSourceSchema.optional(),
  styleDirectionId: z.string().min(1).optional(),
  stats: wireframesStatsSchema,
  configureScreens: z.array(wireframeConfigureScreenSchema).default([]),
  brandKit: wireframeBrandKitSchema.optional(),
  layoutPreference: z.string().optional(),
  // One compiled stylesheet per run, stored in R2 and shared by every
  // React-rendered screen. Resolved to a URL on read; absent on older artifacts
  // (their screens carry the CSS inline).
  cssUrl: z.string().optional(),
  generatedScreens: z.array(wireframeGeneratedScreenSchema).default([]),
  generatedAt: z.number().int().nonnegative(),
  generatedAtLabel: z.string().min(1),
  figmaSymbolUrl: z.string().url(),
});

export type WireframeKind = z.infer<typeof wireframeKindSchema>;
export type WireframeBrandSource = z.infer<typeof wireframeBrandSourceSchema>;
export type WireframeScreenKind = z.infer<typeof wireframeScreenKindSchema>;
export type WireframeRenderMode = z.infer<typeof wireframeRenderModeSchema>;
export type WireframeViewport = z.infer<typeof wireframeViewportSchema>;
export type WireframeConfigureScreen = z.infer<typeof wireframeConfigureScreenSchema>;
export type WireframeBrandKit = z.infer<typeof wireframeBrandKitSchema>;
export type WireframeBlockKind = z.infer<typeof wireframeBlockKindSchema>;
export type WireframeBlockEmphasis = z.infer<typeof wireframeBlockEmphasisSchema>;
export type WireframeBlock = z.infer<typeof wireframeBlockSchema>;
export type WireframeSection = z.infer<typeof wireframeSectionSchema>;
export type WireframeBrandTokens = z.infer<typeof wireframeBrandTokensSchema>;
export type WireframeGeneratedScreen = z.infer<typeof wireframeGeneratedScreenSchema>;
export type WireframesStats = z.infer<typeof wireframesStatsSchema>;
export type WireframesInput = z.infer<typeof wireframesInputSchema>;
export type WireframesArtifact = z.infer<typeof wireframesArtifactSchema>;
