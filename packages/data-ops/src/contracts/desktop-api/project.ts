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
  // Skills / component libraries chosen for this project (Integrations catalog ids).
  // Resolved at the read boundary; empty = nothing chosen yet.
  skillIds: z.array(z.string()),
  componentPackIds: z.array(z.string()),
});

export type ProjectType = z.infer<typeof projectTypeSchema>;
export type ProjectStatus = z.infer<typeof projectStatusSchema>;
export type ProjectSummary = z.infer<typeof projectSummarySchema>;
export type ProjectDetail = z.infer<typeof projectDetailSchema>;
