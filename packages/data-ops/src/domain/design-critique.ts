import { z } from "zod";
import { projectContextSchema } from "../contracts/project-context";

export const designCritiqueInputSchema = z.object({
  apiVersion: z.literal("v1"),
  projectContext: projectContextSchema,
  prompt: z.string().min(1),
  screenContext: z
    .object({
      source: z.enum(["screen", "window", "figma", "browser", "unknown"]),
      title: z.string().optional(),
      imageDataUrl: z.string().optional(),
    })
    .optional(),
  createdAt: z.number().int().nonnegative(),
});

export type DesignCritiqueInput = z.infer<typeof designCritiqueInputSchema>;
