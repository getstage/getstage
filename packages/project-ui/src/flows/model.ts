import { z } from "zod";

// A flow and a screen as the Flows details view shows them (mapped from the saved Flows result).
export const projectFlowSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.string(),
  screenCount: z.number().optional(),
  category: z.string().optional(),
  steps: z.array(z.string()).optional(),
});

export const projectScreenSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  flowCount: z.number(),
  keyElements: z.array(z.string()),
});

export type ProjectFlow = z.infer<typeof projectFlowSchema>;
export type ProjectScreen = z.infer<typeof projectScreenSchema>;

export type FlowsTabStats = {
  approvedFlowCount: number;
  totalFlowCount: number;
  identifiedScreenCount: number;
  uniqueScreenCount: number;
};

export type FlowsTabData = {
  flows: ProjectFlow[];
  screens: ProjectScreen[];
  stats: FlowsTabStats;
};

