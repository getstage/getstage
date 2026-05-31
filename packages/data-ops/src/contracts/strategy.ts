import { z } from "zod";

export const strategySectionStatusSchema = z.enum(["approved", "action"]);

export const strategySectionKindSchema = z.enum([
  "paragraph",
  "plain",
  "principles",
  "table",
  "cards",
  "boxes",
]);

export const strategyPrincipleSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  research: z.string().min(1).optional(),
});

export const strategyCardSchema = z.object({
  title: z.string().min(1),
  objective: z.string().min(1),
  kpi: z.string().min(1),
  keyElement: z.string().min(1),
});

export const strategyBoxSchema = z.object({
  title: z.string().min(1),
  bullets: z.array(z.string().min(1)).min(1),
});

export const strategyTableRowSchema = z.tuple([z.string().min(1), z.string().min(1)]);

export const strategySectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  status: strategySectionStatusSchema,
  kind: strategySectionKindSchema,
  body: z.array(z.string().min(1)).optional(),
  principles: z.array(strategyPrincipleSchema).optional(),
  table: z.array(strategyTableRowSchema).optional(),
  cards: z.array(strategyCardSchema).optional(),
  boxes: z.array(strategyBoxSchema).optional(),
});

export const strategyInputSchema = z.object({
  projectId: z.string().min(1),
  projectName: z.string().min(1),
  researchArtifactId: z.string().min(1).optional(),
  additionalNotes: z.string().min(1).max(2000).optional(),
  focusAreas: z.array(z.string().min(1).max(80)).max(8).default([]),
});

export const strategyArtifactSchema = z.object({
  apiVersion: z.literal("v1"),
  artifactKind: z.literal("strategyArtifact"),
  projectId: z.string().min(1),
  title: z.string().min(1),
  researchArtifactId: z.string().min(1).optional(),
  sections: z.array(strategySectionSchema).default([]),
  generatedAt: z.number().int().nonnegative(),
});

export type StrategySectionStatus = z.infer<typeof strategySectionStatusSchema>;
export type StrategySectionKind = z.infer<typeof strategySectionKindSchema>;
export type StrategyPrinciple = z.infer<typeof strategyPrincipleSchema>;
export type StrategyCard = z.infer<typeof strategyCardSchema>;
export type StrategyBox = z.infer<typeof strategyBoxSchema>;
export type StrategySection = z.infer<typeof strategySectionSchema>;
export type StrategyInput = z.infer<typeof strategyInputSchema>;
export type StrategyArtifact = z.infer<typeof strategyArtifactSchema>;
