import { z } from "zod";

export const dashboardMetricSchema = z.object({
  id: z.string(),
  icon: z.string(),
  value: z.string(),
  label: z.string(),
});

export const dashboardProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  logoLabel: z.string(),
  accentColor: z.string(),
  projectImageUrl: z.string().optional(),
});

export const dashboardTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  projectName: z.string(),
  projectImageUrl: z.string().optional(),
  dueDate: z.number().optional(),
  updatedAt: z.number(),
  isCompleted: z.boolean(),
});

export const dashboardChartPointSchema = z.object({
  label: z.string(),
  value: z.number().min(0),
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
export type DashboardProject = z.infer<typeof dashboardProjectSchema>;
export type DashboardTask = z.infer<typeof dashboardTaskSchema>;
export type DashboardChartPoint = z.infer<typeof dashboardChartPointSchema>;
export type DashboardPipelineStage = z.infer<typeof dashboardPipelineStageSchema>;
export type DashboardRevenue = z.infer<typeof dashboardRevenueSchema>;
