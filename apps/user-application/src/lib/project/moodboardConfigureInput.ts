import {
  moodboardInputSchema,
  type MoodboardInput,
  type MoodboardUploadedFile,
} from "@stage/data-ops/contracts";
import type { Project } from "@/models/project/project";
import type { MoodboardMode } from "@/types/project/moodboardTab";
import { z } from "zod";

const MAX_NOTES_LENGTH = 2000;
const MAX_UPLOADED_FILES = 20;

export type MoodboardConfigureFormValues = {
  importMode: MoodboardMode;
  figmaUrl: string;
  uploadedFiles: MoodboardUploadedFile[];
  additionalNotes: string;
};

export type MoodboardConfigureField = keyof MoodboardConfigureFormValues | "upload";

export type MoodboardConfigureFieldErrors = Partial<Record<MoodboardConfigureField, string>>;

export const DEFAULT_MOODBOARD_CONFIGURE_FORM_VALUES: MoodboardConfigureFormValues = {
  importMode: "upload",
  figmaUrl: "",
  uploadedFiles: [],
  additionalNotes: "",
};

export function normalizeExternalUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function isValidFigmaUrl(value: string): boolean {
  const normalized = normalizeExternalUrl(value);
  if (!normalized) {
    return false;
  }

  try {
    const url = new URL(normalized);
    return url.hostname.includes("figma.com");
  } catch {
    return false;
  }
}

const figmaUrlSchema = z
  .string()
  .trim()
  .min(1, "Paste a Figma link")
  .refine(isValidFigmaUrl, "Enter a valid Figma file or board URL");

const uploadedFileSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  sizeBytes: z.number().int().nonnegative(),
  uploadedAssetId: z.string().min(1).optional(),
});

export const validatedMoodboardConfigureInputSchema = z.object({
  importMode: z.enum(["upload", "figma"]),
  figmaUrl: z.string().url().optional(),
  uploadedAssetIds: z.array(z.string().min(1)).default([]),
  uploadedFiles: z.array(uploadedFileSchema).default([]),
  additionalNotes: z.string().trim().min(1).max(MAX_NOTES_LENGTH).optional(),
});

export type ValidatedMoodboardConfigureInput = z.infer<typeof validatedMoodboardConfigureInputSchema>;

export function validateMoodboardConfigureForm(
  values: MoodboardConfigureFormValues,
):
  | { success: true; data: ValidatedMoodboardConfigureInput }
  | { success: false; errors: MoodboardConfigureFieldErrors } {
  const errors: MoodboardConfigureFieldErrors = {};
  const notes = values.additionalNotes.trim();

  if (notes.length > MAX_NOTES_LENGTH) {
    errors.additionalNotes = `Notes must be ${MAX_NOTES_LENGTH} characters or fewer`;
  }

  if (values.uploadedFiles.length > MAX_UPLOADED_FILES) {
    errors.uploadedFiles = `Upload up to ${MAX_UPLOADED_FILES} files`;
  }

  if (values.importMode === "figma") {
    const figmaResult = figmaUrlSchema.safeParse(values.figmaUrl);
    if (!figmaResult.success) {
      errors.figmaUrl = figmaResult.error.issues[0]?.message;
    }
  }

  if (values.importMode === "upload" && values.uploadedFiles.length === 0) {
    errors.upload = "Upload at least one reference file";
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  try {
    const data = validatedMoodboardConfigureInputSchema.parse({
      importMode: values.importMode,
      figmaUrl:
        values.importMode === "figma" ? normalizeExternalUrl(values.figmaUrl) : undefined,
      uploadedAssetIds: values.uploadedFiles
        .map((file) => file.uploadedAssetId)
        .filter((assetId): assetId is string => Boolean(assetId)),
      uploadedFiles: values.uploadedFiles,
      additionalNotes: notes || undefined,
    });

    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      for (const issue of error.issues) {
        const field = issue.path[0];
        if (typeof field === "string") {
          errors[field as MoodboardConfigureField] = issue.message;
        }
      }
    }

    return { success: false, errors };
  }
}

export function parseStoredMoodboardConfigureInput(value: unknown): ValidatedMoodboardConfigureInput | null {
  const result = validatedMoodboardConfigureInputSchema.safeParse(value);
  return result.success ? result.data : null;
}

export function isMoodboardConfigureFormSubmittable(values: MoodboardConfigureFormValues) {
  return validateMoodboardConfigureForm(values).success;
}

export function buildMoodboardInput(
  project: Pick<Project, "id" | "name">,
  input: ValidatedMoodboardConfigureInput,
): MoodboardInput {
  return moodboardInputSchema.parse({
    projectId: project.id,
    projectName: project.name,
    importMode: input.importMode,
    figmaUrl: input.figmaUrl,
    uploadedAssetIds: input.uploadedAssetIds,
    uploadedFiles: input.uploadedFiles,
    additionalNotes: input.additionalNotes,
  });
}
