import { z } from "zod";

export const phaseStatusSchema = z.enum(["completed", "active", "upcoming"]);

export const phaseSummarySchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  name: z.string().min(1),
  order: z.number().int().nonnegative(),
  status: phaseStatusSchema,
  progress: z.number().min(0).max(100),
  taskCount: z.number().int().nonnegative(),
  completedTaskCount: z.number().int().nonnegative(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});

export type PhaseStatus = z.infer<typeof phaseStatusSchema>;
export type PhaseSummary = z.infer<typeof phaseSummarySchema>;
