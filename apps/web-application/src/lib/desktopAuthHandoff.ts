import { z } from "zod";

export const desktopAuthWebHandoffSchema = z.object({
  redirectUri: z.instanceof(URL),
  state: z.string().min(1),
  token: z.string().min(1),
});

export type DesktopAuthWebHandoff = z.infer<typeof desktopAuthWebHandoffSchema>;
