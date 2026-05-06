import { z } from "zod";

export const companionMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "stage"]),
  label: z.string(),
  content: z.string(),
  source: z.string().optional(),
});

export const companionThreadSchema = z.object({
  id: z.string(),
  title: z.string(),
  prompt: z.string(),
  messages: z.array(companionMessageSchema),
});

export type CompanionMessage = z.infer<typeof companionMessageSchema>;
export type CompanionThread = z.infer<typeof companionThreadSchema>;
