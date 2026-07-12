import { z } from "zod";

export const projectTypeSchema = z.enum([
  "branding",
  "web-design",
  "product-design",
  "app-design",
  "web-app",
  "packaging",
  "motion-design",
  "illustration",
  "other",
]);

export const projectStatusSchema = z.enum(["active", "paused", "completed"]);

export const projectStepSchema = z.enum([
  "overview",
  "research",
  "strategy",
  "moodboard",
  "flows",
  "wireframes",
  "assets",
]);

// The steps a project can toggle on/off. "overview" is the always-on project home and is
// never part of this set. Absent enabledSteps resolves to all of these (every step on).
export const WORKFLOW_STEPS = [
  "research",
  "strategy",
  "moodboard",
  "flows",
  "wireframes",
  "assets",
] as const satisfies readonly z.infer<typeof projectStepSchema>[];

export const projectSummarySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  clientName: z.string(),
  projectImageUrl: z.string().optional(),
  type: projectTypeSchema,
  typeOtherLabel: z.string().optional(),
  status: projectStatusSchema,
  startDate: z.number().int().nonnegative(),
  endDate: z.number().int().nonnegative(),
  progress: z.number().min(0).max(100),
});

export const projectDetailSchema = projectSummarySchema.extend({
  clientEmail: z.string().optional(),
  clientAvatarUrl: z.string().optional(),
  accessRole: z.enum(["owner", "editor"]),
  phaseCount: z.number().int().nonnegative(),
  taskCount: z.number().int().nonnegative(),
  completedTaskCount: z.number().int().nonnegative(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
  shareToken: z.string().optional(),
  shareUrl: z.string().url().optional(),
  portalEnabled: z.boolean().optional(),
  // Workflow steps enabled for this project (excludes the always-on "overview").
  // Resolved at the read boundary, so consumers always get a concrete array.
  enabledSteps: z.array(projectStepSchema),
});

export type ProjectType = z.infer<typeof projectTypeSchema>;
export type ProjectStatus = z.infer<typeof projectStatusSchema>;
export type ProjectStep = z.infer<typeof projectStepSchema>;
export type ProjectSummary = z.infer<typeof projectSummarySchema>;
export type ProjectDetail = z.infer<typeof projectDetailSchema>;
