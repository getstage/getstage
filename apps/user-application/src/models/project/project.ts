import { z } from "zod";
import { phaseSchema, taskSchema } from "@stage/project-ui/kanban";
import { projectFlowSchema, projectScreenSchema } from "@stage/project-ui/flows/model";
import { projectAssetSchema } from "@stage/project-ui/assets/model";

export { phaseSchema, projectAssetSchema, projectFlowSchema, projectScreenSchema, taskSchema };
export type { ProjectFlow, ProjectScreen } from "@stage/project-ui/flows/model";
export type { ProjectAsset } from "@stage/project-ui/assets/model";

export const projectTabSchema = z.enum([
  "overview",
  "research",
  "strategy",
  "flows",
  "moodboard",
  "wireframes",
  "assets",
]);

export const projectReferenceSchema = z.object({
  id: z.string(),
  title: z.string(),
  source: z.string(),
  date: z.string(),
});


export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  clientName: z.string(),
  status: z.enum(["active", "paused", "completed"]),
  projectImageUrl: z.string().optional(),
  phases: z.array(phaseSchema),
  research: z.object({
    clientWebsite: z.string(),
    competitors: z.array(z.string()),
    references: z.array(z.string()),
    brief: z.string(),
    notes: z.string(),
  }),
  moodboard: z.object({
    references: z.array(projectReferenceSchema),
  }),
  flows: z.array(projectFlowSchema),
  screens: z.array(projectScreenSchema).optional(),
  assets: z.array(projectAssetSchema),
});

export type ProjectTab = z.infer<typeof projectTabSchema>;
export type Task = z.infer<typeof taskSchema>;
export type Phase = z.infer<typeof phaseSchema>;
export type ProjectReference = z.infer<typeof projectReferenceSchema>;
export type Project = z.infer<typeof projectSchema>;
