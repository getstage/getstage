import { z } from "zod";

export const voiceProviderPreferencesSchema = z.object({
  claude: z.boolean(),
  codex: z.boolean(),
});

export type VoiceProviderPreferences = z.infer<typeof voiceProviderPreferencesSchema>;

export function parseVoiceProviderPreferences(
  raw: unknown,
): VoiceProviderPreferences | undefined {
  const parsed = voiceProviderPreferencesSchema.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}
