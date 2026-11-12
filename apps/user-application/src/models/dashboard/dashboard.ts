import { z } from "zod";
import { dashboardProjectSchema } from "@stage/project-ui/sidebar/projects";

export { dashboardProjectSchema };
export type { DashboardProject } from "@stage/project-ui/sidebar/projects";

export const dashboardMetricSchema = z.object({
  id: z.string(),
  icon: z.string(),
  value: z.string(),
  label: z.string(),
});


export const dashboardTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  projectId: z.string().optional(),
  projectName: z.string(),
  projectImageUrl: z.string().optional(),
  dueDate: z.number().optional(),
  updatedAt: z.number(),
  isCompleted: z.boolean(),
});

export const dashboardChartPointSchema = z.object({
  label: z.string(),
  value: z.number().min(0),
  timestamp: z.number().optional(),
  isToday: z.boolean().optional(),
  showLabel: z.boolean().optional(),
});

export const dashboardPipelineStageSchema = z.object({
  id: z.string(),
  label: z.string(),
  accentColor: z.string(),
  barColor: z.string(),
});

export const dashboardRevenueSchema = z.object({
  outstanding: z.string(),
  received: z.string(),
  note: z.string(),
});

export type DashboardMetric = z.infer<typeof dashboardMetricSchema>;
export type DashboardTask = z.infer<typeof dashboardTaskSchema>;
export type DashboardChartPoint = z.infer<typeof dashboardChartPointSchema>;
export type DashboardPipelineStage = z.infer<typeof dashboardPipelineStageSchema>;
export type DashboardRevenue = z.infer<typeof dashboardRevenueSchema>;
