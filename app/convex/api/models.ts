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

const projectDatesAreOrdered = (
  value: {
    startDate: number;
    endDate: number;
  },
) => value.endDate >= value.startDate;

const projectDateRangeError = {
  path: ["endDate"],
  message: "End date must be on or after the start date.",
};

const projectBodyFieldsSchema = z.object({
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
    .min(2, "Select at least two phases.")
    .optional(),
});

export const createProjectBodySchema = projectBodyFieldsSchema.refine(
  projectDatesAreOrdered,
  projectDateRangeError,
);

export const importProjectPlanBodySchema = projectBodyFieldsSchema
  .omit({ method: true })
  .extend({
    phases: z
      .array(
        z.object({
          name: trimmedString("Phase name"),
          tasks: z.array(trimmedString("Task name")).optional(),
        }),
      )
      .min(2, "Select at least two phases."),
  })
  .refine(projectDatesAreOrdered, projectDateRangeError);

export const createPhaseBodySchema = z.object({
  name: trimmedString("Phase name"),
  tasks: z.array(trimmedString("Task name")).optional(),
});

export const createTaskBodySchema = z.object({
  title: trimmedString("Task title"),
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

const stitchProviderSchema = z.literal("stitch");

const stitchDeviceTypeSchema = z.enum([
  "DEVICE_TYPE_UNSPECIFIED",
  "MOBILE",
  "DESKTOP",
  "TABLET",
  "AGNOSTIC",
]);

const stitchModelIdSchema = z.enum([
  "MODEL_ID_UNSPECIFIED",
  "GEMINI_3_PRO",
  "GEMINI_3_FLASH",
]);

export const upsertDesignConnectionBodySchema = z.object({
  provider: stitchProviderSchema.default("stitch"),
  externalProjectUrl: z.string().trim().url("Stitch project URL must be a valid URL."),
  externalProjectId: optionalTrimmedString,
  title: optionalTrimmedString,
});

export const createDesignUploadUrlBodySchema = z.object({
  fileName: trimmedString("File name"),
  fileSize: z.number().int().positive("File size must be greater than 0."),
  mimeType: trimmedString("MIME type"),
});

const syncDesignScreenSchema = z.object({
  stitchScreenId: trimmedString("Stitch screen ID"),
  stitchScreenUrl: z.string().trim().url("Stitch screen URL must be a valid URL.").optional(),
  r2ObjectKey: trimmedString("R2 object key"),
  title: optionalTrimmedString,
  prompt: optionalTrimmedString,
  phaseId: z.string().trim().min(1).optional(),
  deviceType: stitchDeviceTypeSchema.optional(),
  modelId: stitchModelIdSchema.optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const syncProjectDesignsBodySchema = z
  .object({
    externalProjectUrl: z.string().trim().url("Stitch project URL must be a valid URL."),
    externalProjectId: optionalTrimmedString,
    title: optionalTrimmedString,
    screens: z.array(syncDesignScreenSchema).min(1, "At least one screen is required."),
  })
  .superRefine((value, ctx) => {
    const stitchScreenIds = new Set<string>();

    value.screens.forEach((screen, index) => {
      if (stitchScreenIds.has(screen.stitchScreenId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["screens", index, "stitchScreenId"],
          message: "Each Stitch screen ID must be unique within the sync request.",
        });
        return;
      }

      stitchScreenIds.add(screen.stitchScreenId);
    });
  });
