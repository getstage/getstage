import { z } from "zod";

const trimmedString = (field: string) =>
  z.string().trim().min(1, `${field} is required`);

const optionalTrimmedString = z
  .string()
  .trim()
  .transform((value) => value || undefined)
  .optional();

export const projectIdParamSchema = z.object({
  id: trimmedString("Project ID"),
});

export const phaseIdParamSchema = z.object({
  id: trimmedString("Phase ID"),
});

export const taskIdParamSchema = z.object({
  id: trimmedString("Task ID"),
});

export const projectTypeSchema = z.enum([
  "branding",
  "web-design",
  "product-design",
  "app-design",
  "packaging",
  "motion-design",
  "illustration",
  "other",
]);

export const createProjectBodySchema = z.object({
  name: trimmedString("Project name"),
  clientName: trimmedString("Client name"),
  clientEmail: z.string().trim().email().optional(),
  clientAvatarUrl: optionalTrimmedString,
  projectImageUrl: optionalTrimmedString,
  startMarkerImageUrl: optionalTrimmedString,
  endMarkerImageUrl: optionalTrimmedString,
  type: projectTypeSchema,
  method: z.enum(["ai", "manual"]).optional().default("manual"),
  startDate: z.number(),
  endDate: z.number(),
  phases: z
    .array(
      z.object({
        name: trimmedString("Phase name"),
        tasks: z.array(trimmedString("Task name")).optional(),
      }),
    )
    .optional(),
});

export const createPhaseBodySchema = z.object({
  name: trimmedString("Phase name"),
  tasks: z.array(trimmedString("Task name")).optional(),
});

export const createTaskBodySchema = z.object({
  title: trimmedString("Task title"),
});

export const generateProjectBodySchema = z.object({
  description: trimmedString("Project description"),
  model: optionalTrimmedString,
});

export const generateDesignBodySchema = z.object({
  prompt: trimmedString("Design prompt"),
  phaseId: z.string().trim().min(1).optional(),
  deviceType: z
    .enum(["DEVICE_TYPE_UNSPECIFIED", "MOBILE", "DESKTOP", "TABLET", "AGNOSTIC"])
    .optional()
    .default("DESKTOP"),
  modelId: z
    .enum(["MODEL_ID_UNSPECIFIED", "GEMINI_3_PRO", "GEMINI_3_FLASH"])
    .optional(),
});
