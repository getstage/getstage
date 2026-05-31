import { z } from "zod";

import { referoContextSchema } from "./refero";

export const researchMatrixScoreSchema = z.enum(["Strong", "OK", "Weak"]);

export const researchArtifactSectionSchema = z.enum([
  "summary",
  "companySnapshot",
  "competitiveAnalysis",
  "uiPatterns",
  "targetUsers",
  "opportunities",
]);

export const researchInputSchema = z.object({
  projectId: z.string().min(1),
  projectName: z.string().min(1),
  clientName: z.string().min(1).optional(),
  industry: z.string().min(1),
  website: z.string().min(1).optional(),
  projectBrief: z.string().min(1).optional(),
  competitorUrls: z.array(z.string().min(1)).default([]),
  targetUsers: z.string().min(1).optional(),
  additionalNotes: z.string().min(1).optional(),
  uploadedAssetIds: z.array(z.string().min(1)).default([]),
});

export const researchCompanySnapshotRowSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

export const researchCompetitorSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  url: z.string().min(1).optional(),
  logoUrl: z.string().url().optional(),
  mark: z.string().min(1).optional(),
  color: z.string().min(1).optional(),
  positioning: z.string().min(1).optional(),
  summary: z.string().min(1).optional(),
  strengths: z.array(z.string().min(1)).default([]),
  weaknesses: z.array(z.string().min(1)).default([]),
  sourceReferenceIds: z.array(z.string().min(1)).default([]),
});

export const researchCompetitiveMatrixCellSchema = z.object({
  competitorId: z.string().min(1),
  score: researchMatrixScoreSchema,
  note: z.string().optional(),
});

export const researchCompetitiveMatrixRowSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  cells: z.array(researchCompetitiveMatrixCellSchema).default([]),
});

export const researchCompetitiveAnalysisSchema = z.object({
  competitors: z.array(researchCompetitorSchema).default([]),
  matrixRows: z.array(researchCompetitiveMatrixRowSchema).default([]),
});

export const researchUiPatternExampleSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  imageUrl: z.string().url().optional(),
  sourceProduct: z.string().min(1).optional(),
  sourceReferenceId: z.string().min(1).optional(),
});

export const researchUiPatternGroupSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1).optional(),
  patternCountLabel: z.string().min(1).optional(),
  recognizedPatterns: z.array(z.string().min(1)).default([]),
  examples: z.array(researchUiPatternExampleSchema).default([]),
});

export const researchTargetUserSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  role: z.string().min(1),
  goals: z.array(z.string().min(1)).default([]),
  frustrations: z.array(z.string().min(1)).default([]),
  context: z.string().min(1).optional(),
  relevance: z.string().min(1).optional(),
  assumptions: z.array(z.string().min(1)).default([]),
});

export const researchOpportunitySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).optional(),
  description: z.string().min(1),
  sourceSection: researchArtifactSectionSchema.optional(),
});

export const researchSourceReferenceSchema = z.object({
  id: z.string().min(1),
  provider: z.enum(["refero", "figma", "notion", "sheets", "website", "user"]),
  label: z.string().min(1),
  url: z.string().url().optional(),
  externalId: z.string().min(1).optional(),
});

export const researchArtifactSchema = z.object({
  apiVersion: z.literal("v1"),
  artifactKind: z.literal("researchArtifact"),
  projectId: z.string().min(1),
  title: z.string().min(1),
  summary: z.array(z.string().min(1)).default([]),
  companySnapshot: z.array(researchCompanySnapshotRowSchema).default([]),
  competitiveAnalysis: researchCompetitiveAnalysisSchema,
  uiPatterns: z.array(researchUiPatternGroupSchema).default([]),
  targetUsers: z.array(researchTargetUserSchema).default([]),
  opportunities: z.array(researchOpportunitySchema).default([]),
  openQuestions: z.array(z.string().min(1)).default([]),
  sourceReferences: z.array(researchSourceReferenceSchema).default([]),
  referoContext: referoContextSchema.optional(),
  generatedAt: z.number().int().nonnegative(),
});

export const researchArtifactPatchSchema = z.object({
  artifactId: z.string().min(1),
  section: researchArtifactSectionSchema,
  patch: z.unknown(),
  reason: z.string().min(1).optional(),
});

export type ResearchMatrixScore = z.infer<typeof researchMatrixScoreSchema>;
export type ResearchArtifactSection = z.infer<typeof researchArtifactSectionSchema>;
export type ResearchInput = z.infer<typeof researchInputSchema>;
export type ResearchCompanySnapshotRow = z.infer<typeof researchCompanySnapshotRowSchema>;
export type ResearchCompetitor = z.infer<typeof researchCompetitorSchema>;
export type ResearchCompetitiveMatrixCell = z.infer<typeof researchCompetitiveMatrixCellSchema>;
export type ResearchCompetitiveMatrixRow = z.infer<typeof researchCompetitiveMatrixRowSchema>;
export type ResearchCompetitiveAnalysis = z.infer<typeof researchCompetitiveAnalysisSchema>;
export type ResearchUiPatternExample = z.infer<typeof researchUiPatternExampleSchema>;
export type ResearchUiPatternGroup = z.infer<typeof researchUiPatternGroupSchema>;
export type ResearchTargetUser = z.infer<typeof researchTargetUserSchema>;
export type ResearchOpportunity = z.infer<typeof researchOpportunitySchema>;
export type ResearchSourceReference = z.infer<typeof researchSourceReferenceSchema>;
export type ResearchArtifact = z.infer<typeof researchArtifactSchema>;
export type ResearchArtifactPatch = z.infer<typeof researchArtifactPatchSchema>;
