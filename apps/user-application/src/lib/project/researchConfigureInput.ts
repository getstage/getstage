import { researchInputSchema, type ResearchInput } from "@stage/data-ops/contracts";
import type { Project } from "@/models/project/project";
import { z } from "zod";

const MAX_INDUSTRY_LENGTH = 120;
const MAX_BRIEF_LENGTH = 5000;
const MAX_NOTES_LENGTH = 2000;
const MAX_COMPETITORS = 10;

export type ResearchConfigureFormValues = {
  industry: string;
  website: string;
  projectBrief: string;
  additionalNotes: string;
  competitorUrls: string[];
  briefFileName: string | null;
};

export type ResearchConfigureField = keyof ResearchConfigureFormValues | "competitorInput";

export type ResearchConfigureFieldErrors = Partial<Record<ResearchConfigureField, string>>;

export const DEFAULT_RESEARCH_CONFIGURE_FORM_VALUES: ResearchConfigureFormValues = {
  industry: "",
  website: "",
  projectBrief: "",
  additionalNotes: "",
  competitorUrls: [],
  briefFileName: null,
};

export function normalizeWebsite(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function isValidWebsite(value: string): boolean {
  const normalized = normalizeWebsite(value);
  if (!normalized) {
    return false;
  }

  try {
    const url = new URL(normalized);
    const hostname = url.hostname;
    return hostname.includes(".") && !hostname.startsWith(".") && !hostname.endsWith(".");
  } catch {
    return false;
  }
}

const websiteValueSchema = z
  .string()
  .trim()
  .min(1, "Enter a website URL")
  .refine(isValidWebsite, "Enter a valid website such as acme.com or https://acme.com");

const optionalWebsiteValueSchema = z
  .string()
  .trim()
  .refine(
    (value) => !value || isValidWebsite(value),
    "Enter a valid website such as acme.com or https://acme.com",
  )
  .transform((value) => {
    const normalized = normalizeWebsite(value);
    return normalized || undefined;
  });

const industryValueSchema = z
  .string()
  .trim()
  .min(1, "Industry is required")
  .max(MAX_INDUSTRY_LENGTH, `Industry must be ${MAX_INDUSTRY_LENGTH} characters or fewer`);

export const validatedResearchConfigureInputSchema = z.object({
  industry: industryValueSchema,
  website: optionalWebsiteValueSchema.optional(),
  projectBrief: z.string().trim().min(1).max(MAX_BRIEF_LENGTH),
  competitorUrls: z.array(websiteValueSchema.transform(normalizeWebsite)).max(MAX_COMPETITORS),
  additionalNotes: z.string().trim().min(1).max(MAX_NOTES_LENGTH).optional(),
  uploadedAssetIds: z.array(z.string().min(1)).default([]),
});

export type ValidatedResearchConfigureInput = z.infer<typeof validatedResearchConfigureInputSchema>;

export function parseCompetitorWebsite(
  value: string,
): { ok: true; value: string } | { ok: false; error: string } {
  const result = websiteValueSchema.safeParse(value);
  if (!result.success) {
    return {
      ok: false,
      error: result.error.issues[0]?.message ?? "Enter a valid competitor website",
    };
  }

  return { ok: true, value: normalizeWebsite(result.data) };
}

export function validateResearchConfigureForm(
  values: ResearchConfigureFormValues,
):
  | { success: true; data: ValidatedResearchConfigureInput }
  | { success: false; errors: ResearchConfigureFieldErrors } {
  const errors: ResearchConfigureFieldErrors = {};

  const industryResult = industryValueSchema.safeParse(values.industry);
  if (!industryResult.success) {
    errors.industry = industryResult.error.issues[0]?.message;
  }

  const websiteResult = optionalWebsiteValueSchema.safeParse(values.website);
  if (!websiteResult.success) {
    errors.website = websiteResult.error.issues[0]?.message;
  }

  const briefText = values.projectBrief.trim();
  const hasBriefText = briefText.length > 0;
  const hasBriefFile = values.briefFileName !== null;

  if (!hasBriefText && !hasBriefFile) {
    errors.projectBrief = "Add a project brief or upload a brief file";
  } else if (hasBriefText && briefText.length > MAX_BRIEF_LENGTH) {
    errors.projectBrief = `Brief must be ${MAX_BRIEF_LENGTH} characters or fewer`;
  }

  const notes = values.additionalNotes.trim();
  if (notes.length > MAX_NOTES_LENGTH) {
    errors.additionalNotes = `Notes must be ${MAX_NOTES_LENGTH} characters or fewer`;
  }

  if (values.competitorUrls.length > MAX_COMPETITORS) {
    errors.competitorUrls = `Add up to ${MAX_COMPETITORS} competitors`;
  }

  if (Object.keys(errors).length > 0 || !industryResult.success) {
    return { success: false, errors };
  }

  const projectBrief = hasBriefText ? briefText : `[Uploaded brief: ${values.briefFileName}]`;

  try {
    const data = validatedResearchConfigureInputSchema.parse({
      industry: industryResult.data,
      website: websiteResult.data,
      projectBrief,
      competitorUrls: values.competitorUrls,
      additionalNotes: notes || undefined,
      uploadedAssetIds: [],
    });

    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      for (const issue of error.issues) {
        const field = issue.path[0];
        if (typeof field === "string" && field in DEFAULT_RESEARCH_CONFIGURE_FORM_VALUES) {
          errors[field as keyof ResearchConfigureFormValues] = issue.message;
        }
      }
    }

    return { success: false, errors };
  }
}

export function parseStoredResearchConfigureInput(
  value: unknown,
): ValidatedResearchConfigureInput | null {
  const result = validatedResearchConfigureInputSchema.safeParse(value);
  return result.success ? result.data : null;
}

export function isResearchConfigureFormSubmittable(values: ResearchConfigureFormValues) {
  return validateResearchConfigureForm(values).success;
}

export function buildResearchInput(
  project: Pick<Project, "id" | "name" | "clientName">,
  input: ValidatedResearchConfigureInput,
): ResearchInput {
  return researchInputSchema.parse({
    projectId: project.id,
    projectName: project.name,
    clientName: project.clientName,
    industry: input.industry,
    website: input.website,
    projectBrief: input.projectBrief,
    competitorUrls: input.competitorUrls,
    additionalNotes: input.additionalNotes,
    uploadedAssetIds: input.uploadedAssetIds,
  });
}
