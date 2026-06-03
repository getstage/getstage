import { strategyInputSchema, type StrategyInput } from "@stage/data-ops/contracts";
import type { Project } from "@/models/project/project";
import { z } from "zod";

const MAX_NOTES_LENGTH = 2000;
const MAX_FOCUS_AREAS = 8;
const MAX_FOCUS_AREA_LENGTH = 80;

export type StrategyGenerateFormValues = {
  additionalNotes: string;
  focusAreas: string[];
};

export type StrategyGenerateField = keyof StrategyGenerateFormValues | "focusInput";

export type StrategyGenerateFieldErrors = Partial<Record<StrategyGenerateField, string>>;

export const DEFAULT_STRATEGY_GENERATE_FORM_VALUES: StrategyGenerateFormValues = {
  additionalNotes: "",
  focusAreas: [],
};

export const validatedStrategyGenerateInputSchema = z.object({
  additionalNotes: z.string().trim().min(1).max(MAX_NOTES_LENGTH).optional(),
  focusAreas: z.array(z.string().trim().min(1).max(MAX_FOCUS_AREA_LENGTH)).max(MAX_FOCUS_AREAS),
});

export type ValidatedStrategyGenerateInput = z.infer<typeof validatedStrategyGenerateInputSchema>;

const focusAreaValueSchema = z
  .string()
  .trim()
  .min(1, "Enter a focus area")
  .max(MAX_FOCUS_AREA_LENGTH, `Focus areas must be ${MAX_FOCUS_AREA_LENGTH} characters or fewer`);

export function parseFocusArea(
  value: string,
): { ok: true; value: string } | { ok: false; error: string } {
  const result = focusAreaValueSchema.safeParse(value);
  if (!result.success) {
    return {
      ok: false,
      error: result.error.issues[0]?.message ?? "Enter a valid focus area",
    };
  }

  return { ok: true, value: result.data };
}

export function validateStrategyGenerateForm(
  values: StrategyGenerateFormValues,
):
  | { success: true; data: ValidatedStrategyGenerateInput }
  | { success: false; errors: StrategyGenerateFieldErrors } {
  const errors: StrategyGenerateFieldErrors = {};
  const notes = values.additionalNotes.trim();

  if (notes.length > MAX_NOTES_LENGTH) {
    errors.additionalNotes = `Notes must be ${MAX_NOTES_LENGTH} characters or fewer`;
  }

  if (values.focusAreas.length > MAX_FOCUS_AREAS) {
    errors.focusAreas = `Add up to ${MAX_FOCUS_AREAS} focus areas`;
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  try {
    const data = validatedStrategyGenerateInputSchema.parse({
      additionalNotes: notes || undefined,
      focusAreas: values.focusAreas,
    });

    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      for (const issue of error.issues) {
        const field = issue.path[0];
        if (field === "additionalNotes" || field === "focusAreas") {
          errors[field] = issue.message;
        }
      }
    }

    return { success: false, errors };
  }
}

export function parseStoredStrategyGenerateInput(value: unknown): ValidatedStrategyGenerateInput | null {
  const result = validatedStrategyGenerateInputSchema.safeParse(value);
  return result.success ? result.data : null;
}

export function strategyInputToFormValues(
  input: ValidatedStrategyGenerateInput,
): StrategyGenerateFormValues {
  return {
    additionalNotes: input.additionalNotes ?? "",
    focusAreas: [...input.focusAreas],
  };
}

export function isStrategyGenerateFormSubmittable(values: StrategyGenerateFormValues) {
  return validateStrategyGenerateForm(values).success;
}

export function buildStrategyInput(
  project: Pick<Project, "id" | "name">,
  input: ValidatedStrategyGenerateInput,
  researchArtifactId?: string | null,
): StrategyInput {
  return strategyInputSchema.parse({
    projectId: project.id,
    projectName: project.name,
    researchArtifactId: researchArtifactId ?? undefined,
    additionalNotes: input.additionalNotes,
    focusAreas: input.focusAreas,
  });
}
