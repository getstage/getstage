import { z } from "zod";

export const desktopMeSchema = z.object({
  user: z.object({
    avatarUrl: z.string().optional(),
    email: z.string().optional(),
    id: z.string().min(1),
    name: z.string().optional(),
  }),
});

export type DesktopMe = z.infer<typeof desktopMeSchema>;
