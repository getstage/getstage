import { z } from "zod";

const projectTypeValues = [
  "branding",
  "web-design",
  "product-design",
  "app-design",
  "packaging",
  "motion-design",
  "illustration",
  "other",
] as const;

export const signInEmailSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
});

export const verificationCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .length(6, "Code must be 6 digits.")
    .regex(/^\d{6}$/, "Digits only."),
});

export const profileNameSchema = z
  .string()
  .trim()
  .min(1, "Please enter your name.")
  .max(80, "Please keep your name under 80 characters.");

export const projectTypeSchema = z.enum(projectTypeValues, {
  message: "Please choose your field of work.",
});

export const projectBasicsSchema = z.object({
  projectName: z
    .string()
    .trim()
    .min(1, "Please enter a project name.")
    .max(120, "Please keep the project name under 120 characters."),
});

export const clientInfoSchema = z.object({
  clientName: z
    .string()
    .trim()
    .min(1, "Please enter a client name.")
    .max(120, "Please keep the client name under 120 characters."),
  clientEmail: z
    .string()
    .trim()
    .email("Please enter a valid email address."),
});

export const manualPhaseSelectionSchema = z
  .number()
  .min(2, "Select at least two phases.");

export const dateRangeInputSchema = z
  .object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Select a valid start date."),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Select a valid end date."),
  })
  .superRefine((value, ctx) => {
    const start = new Date(value.startDate);
    const end = new Date(value.endDate);

    if (Number.isNaN(start.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startDate"],
        message: "Select a valid start date.",
      });
    }

    if (Number.isNaN(end.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "Select a valid end date.",
      });
    }

    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end < start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "End date must be on or after the start date.",
      });
    }
  });

export const googleSheetsUrlSchema = z
  .string()
  .trim()
  .url("Please enter a valid Google Sheets URL.")
  .refine(
    (value) =>
      /^https:\/\/docs\.google\.com\/spreadsheets\/d\/[^/]+/i.test(value) ||
      /^https:\/\/docs\.google\.com\/spreadsheets\/u\/\d+\/d\/[^/]+/i.test(value),
    "Please paste a valid Google Sheets document URL.",
  );
