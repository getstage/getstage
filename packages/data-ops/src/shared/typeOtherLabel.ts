import { z } from "zod";

/** Custom label when project type is `other` — short, display-safe text only. */
export const typeOtherLabelSchema = z
  .string()
  .trim()
  .min(2, "Please use at least 2 characters.")
  .max(60, "Keep the project type under 60 characters.")
  .regex(
    /^[\p{L}\p{N}][\p{L}\p{N} &\-/()'.,+]*$/u,
    "Use a short label with letters and numbers only (no links or special symbols).",
  )
  .refine((value) => !/https?:\/\/|www\.|<|>|\{|\}|script|javascript:/i.test(value), {
    message: "That doesn't look like a project type.",
  });

export type TypeOtherLabel = z.infer<typeof typeOtherLabelSchema>;

export function requireTypeOtherLabel(raw: string): TypeOtherLabel {
  const parsed = typeOtherLabelSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Please specify your project type.");
  }
  return parsed.data;
}
