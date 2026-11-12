/**
 * Zod schemas for Hono REST (`/api/v1/*`). Convex-internal validators live in `convex/models/`.
 */
import { z } from "zod";
import { detailsSectionSchema } from "../../src/contracts/research";
import { typeOtherLabelSchema } from "../../src/shared/typeOtherLabel";

const trimmedString = (field: string) =>
  z.string().trim().min(1, `${field} is required`);

const optionalTrimmedString = z
  .string()
  .trim()
  .transform((value) => value || undefined)
  .optional();

export { typeOtherLabelSchema };

export const projectIdParamSchema = z.object({
  id: trimmedString("Project ID"),
});

export const phaseIdParamSchema = z.object({
  id: trimmedString("Phase ID"),
});

export const taskIdParamSchema = z.object({
  id: trimmedString("Task ID"),
});

export const artifactIdParamSchema = z.object({
  id: trimmedString("Artifact ID"),
});

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
  "websites",
  "web-apps",
  "ios-apps",
]);

export const projectCategorySchema = z.enum(["websites", "web-apps", "ios-apps"]);

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
  type: projectCategorySchema,
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

const aiModuleSchema = z.enum(["research", "strategy", "generate", "delivery"]);

const aiRunStatusSchema = z.enum([
  "draft",
  "running",
  "completed",
  "failed",
  "cancelled",
  "needs_input",
]);

const aiArtifactStatusSchema = z.enum([
  "draft",
  "ready",
  "approved",
  "superseded",
  "failed",
]);

const aiContentFormatSchema = z.enum(["markdown", "json", "link_set"]);

const exportProviderSchema = z.enum(["notion", "figma"]);

const exportStatusSchema = z.enum([
  "requested",
  "in_progress",
  "completed",
  "failed",
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

export const claudeHandshakeBodySchema = z.object({
  connectionId: z.string().trim().min(1).optional(),
  client: z.literal("claude_code").default("claude_code"),
  capabilities: z
    .object({
      notionMcp: z.boolean().optional(),
      figmaMcp: z.boolean().optional(),
    })
    .optional(),
});

export const upsertProjectAiContextBodySchema = z.object({
  clientWebsite: optionalTrimmedString,
  competitorUrls: z.array(z.string().trim()).default([]),
  referenceUrls: z.array(z.string().trim()).default([]),
  brief: optionalTrimmedString,
  briefAttachmentName: optionalTrimmedString.nullable().optional(),
  briefAttachmentR2ObjectKey: optionalTrimmedString.nullable().optional(),
  notes: optionalTrimmedString,
});

export const createProjectAiRunBodySchema = z.object({
  connectionId: z.string().trim().min(1).optional(),
  module: aiModuleSchema,
  title: trimmedString("Run title"),
  status: aiRunStatusSchema.optional().default("running"),
  trigger: z.enum(["user", "agent"]).optional().default("user"),
  inputSummary: optionalTrimmedString,
  externalRunId: optionalTrimmedString,
});

export const createProjectAiArtifactBodySchema = z.object({
  runId: z.string().trim().min(1).optional(),
  module: aiModuleSchema,
  kind: trimmedString("Artifact kind"),
  title: trimmedString("Artifact title"),
  summary: optionalTrimmedString,
  status: aiArtifactStatusSchema.optional().default("ready"),
  contentFormat: aiContentFormatSchema,
  contentMarkdown: optionalTrimmedString,
  contentJson: optionalTrimmedString,
  externalUrl: z.string().trim().url().optional(),
});

export const createArtifactExportBodySchema = z.object({
  provider: exportProviderSchema,
  action: trimmedString("Export action"),
  status: exportStatusSchema.optional().default("completed"),
  destinationLabel: optionalTrimmedString,
  destinationUrl: z.string().trim().url().optional(),
  errorMessage: optionalTrimmedString,
  lastSyncedAt: z.number().optional(),
});

export const stepParamSchema = z.object({
  id: trimmedString("Project ID"),
  step: z.enum(["research", "strategy", "flows", "generate"]),
});

export const saveStepBodySchema = z.object({
  title: trimmedString("Title"),
  summary: optionalTrimmedString,
  // Research only: the run from POST /projects/:id/research/start.
  runId: z.string().trim().min(1).optional(),
  result: z.record(z.string(), z.unknown()),
});

// The Research form (same fields as Stage for Mac's); screenTypes are its "Screens to analyze".
export const researchInputsBodySchema = z.object({
  industry: trimmedString("Industry"),
  website: optionalTrimmedString,
  brief: z.string().trim().min(40, "Brief: what the product does, who it's for and what makes it different (at least 40 characters)"),
  competitorUrls: z.array(z.string().trim().min(1)).max(4, "Up to 4 competitors, like the Mac form").default([]),
  screenTypes: z.array(detailsSectionSchema).min(1).max(6),
});

export const referenceSearchBodySchema = z.object({
  query: trimmedString("Query"),
  // Refero: app and web screens (moodboard, app Research). Details: website sections (website Research).
  source: z.enum(["refero", "details"]).default("refero"),
  platform: z.enum(["web", "ios", "android"]).default("web"),
});

export const moodboardImportBodySchema = z.object({
  screens: z.array(z.object({
    id: trimmedString("Screen id"),
    title: trimmedString("Screen title"),
    sourceUrl: z.string().url().optional(),
    thumbnailUrl: z.string().url().optional(),
    imageUrl: z.string().url().optional(),
  })).max(12).default([]),
  imageUrls: z.array(z.string().url()).max(12).default([]),
  figmaUrl: z.string().url().optional(),
  direction: optionalTrimmedString,
});

export const styleGuideBodySchema = z.object({
  direction: trimmedString("Direction"),
  styleGuide: z.record(z.string(), z.unknown()),
});
