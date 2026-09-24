import { z } from "zod";

import { projectCategorySchema } from "./desktop-api/project";
import { referoContextSchema } from "./refero";

/** Codex/engine emits explicit null for absent fields — use nullish, not optional-only. */
const optionalText = z.string().min(1).nullish();
const optionalUrl = z.string().min(1).nullish();

export const DETAILS_STRUCTURE_SECTIONS = [
  "CTA",
  "Footer",
  "Hero",
  "Legal",
  "Navigation",
  "Drawer",
  "Dropdown",
  "Fullscreen",
  "Morphing",
] as const;

export const DETAILS_PAGE_SECTIONS = [
  "404",
  "Article",
  "Blog",
  "Case Study",
  "Contact",
  "Content",
  "About",
  "FAQ",
  "Features",
  "Services",
  "Steps",
  "Newsletter",
  "Portfolio",
  "Pricing",
  "Products",
  "Social Proof",
  "Logo",
  "Testimonial",
  "Stats",
  "Team",
  "Timeline",
] as const;

export const DETAILS_SECTIONS = [
  ...DETAILS_STRUCTURE_SECTIONS,
  ...DETAILS_PAGE_SECTIONS,
] as const;
export const REFERO_APP_SECTIONS = [
  "Onboarding",
  "Login / Sign up",
  "Homepage",
  "Dashboard",
  "Analytics / Reports",
  "Table / List",
  "Search",
  "Detail View",
  "Forms",
  "Settings",
  "Profile",
  "Team / Permissions",
  "Integrations",
  "Billing",
  "Pricing",
  "Checkout",
  "Browse / Discovery",
  "Notifications",
  "Empty State",
  "Success / Confirmation",
  "Splash Screen",
] as const;
export const REFERO_WEB_APP_SECTIONS = [
  "Onboarding",
  "Login / Sign up",
  "Homepage",
  "Dashboard",
  "Analytics / Reports",
  "Table / List",
  "Search",
  "Detail View",
  "Forms",
  "Settings",
  "Profile",
  "Team / Permissions",
  "Integrations",
  "Billing",
  "Pricing",
  "Checkout",
  "Notifications",
  "Empty State",
  "Success / Confirmation",
] as const;
export const REFERO_IOS_APP_SECTIONS = [
  "Splash Screen",
  "Onboarding",
  "Login / Sign up",
  "Homepage",
  "Browse / Discovery",
  "Search",
  "Detail View",
  "Dashboard",
  "Analytics / Reports",
  "Forms",
  "Pricing",
  "Checkout",
  "Profile",
  "Settings",
  "Notifications",
  "Empty State",
  "Success / Confirmation",
] as const;
export const RESEARCH_REFERENCE_SECTIONS = [
  ...DETAILS_SECTIONS,
  "Onboarding",
  "Login / Sign up",
  "Homepage",
  "Checkout",
  "Dashboard",
  "Analytics / Reports",
  "Table / List",
  "Search",
  "Detail View",
  "Forms",
  "Settings",
  "Profile",
  "Team / Permissions",
  "Integrations",
  "Billing",
  "Browse / Discovery",
  "Notifications",
  "Empty State",
  "Success / Confirmation",
  "Splash Screen",
] as const;
export const DEFAULT_DETAILS_SECTIONS = [
  "Hero",
  "Features",
  "Social Proof",
  "Pricing",
  "Contact",
] as const;
export const DEFAULT_REFERO_APP_SECTIONS = [
  "Onboarding",
  "Homepage",
  "Pricing",
  "Checkout",
  "Dashboard",
] as const;
export const detailsSectionSchema = z.enum(RESEARCH_REFERENCE_SECTIONS);

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
  projectCategory: projectCategorySchema,
  clientName: z.string().min(1).optional(),
  industry: z.string().min(1),
  website: z.string().min(1).optional(),
  projectBrief: z.string().min(1).optional(),
  competitorUrls: z.array(z.string().min(1)).default([]),
  detailsSections: z.array(detailsSectionSchema).min(1).default([...DEFAULT_DETAILS_SECTIONS]),
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
  url: optionalText,
  logoUrl: optionalUrl,
  mark: optionalText,
  color: optionalText,
  positioning: optionalText,
  summary: optionalText,
  strengths: z.array(z.string().min(1)).default([]),
  weaknesses: z.array(z.string().min(1)).default([]),
  sourceReferenceIds: z.array(z.string().min(1)).default([]),
});

export const researchCompetitiveMatrixCellSchema = z.object({
  competitorId: z.string().min(1),
  score: researchMatrixScoreSchema,
  note: z.string().nullish(),
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
  imageUrl: optionalUrl,
  thumbnailUrl: optionalUrl,
  sourceProduct: optionalText,
  sourceReferenceId: optionalText,
});

export const researchUiPatternGroupSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: optionalText,
  patternCountLabel: optionalText,
  recognizedPatterns: z.array(z.string().min(1)).default([]),
  examples: z.array(researchUiPatternExampleSchema).default([]),
});

export const researchTargetUserSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  role: z.string().min(1),
  goals: z.array(z.string().min(1)).default([]),
  frustrations: z.array(z.string().min(1)).default([]),
  context: optionalText,
  relevance: optionalText,
  assumptions: z.array(z.string().min(1)).default([]),
});

export const researchOpportunitySchema = z.object({
  id: z.string().min(1),
  title: optionalText,
  description: z.string().min(1),
  sourceSection: researchArtifactSectionSchema.nullish(),
});

export const researchCustomSectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
});

export const researchSourceReferenceSchema = z.object({
  id: z.string().min(1),
  provider: z.enum(["refero", "details", "figma", "notion", "sheets", "website", "user"]),
  label: z.string().min(1),
  url: optionalUrl,
  externalId: optionalText,
});

export const researchArtifactSchema = z.object({
  apiVersion: z.literal("v1"),
  artifactKind: z.literal("researchArtifact"),
  projectId: z.string().min(1),
  title: z.string().min(1),
  summary: z.array(z.string().min(1)).min(1).default([]),
  companySnapshot: z.array(researchCompanySnapshotRowSchema).min(1).default([]),
  competitiveAnalysis: researchCompetitiveAnalysisSchema,
  uiPatterns: z.array(researchUiPatternGroupSchema).default([]),
  uiPatternProvider: z.enum(["refero", "details"]).optional(),
  targetUsers: z.array(researchTargetUserSchema).min(1).default([]),
  opportunities: z.array(researchOpportunitySchema).min(1).default([]),
  customSections: z.array(researchCustomSectionSchema).default([]),
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
export type DetailsSection = z.infer<typeof detailsSectionSchema>;
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
export type ResearchCustomSection = z.infer<typeof researchCustomSectionSchema>;
export type ResearchSourceReference = z.infer<typeof researchSourceReferenceSchema>;
export type ResearchArtifact = z.infer<typeof researchArtifactSchema>;
export type ResearchArtifactPatch = z.infer<typeof researchArtifactPatchSchema>;
