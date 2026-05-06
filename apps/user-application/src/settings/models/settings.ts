import { z } from "zod";

export const settingsTabSchema = z.enum([
  "profile",
  "billing",
  "clients",
  "developer",
  "account",
  "integrations",
  "portal",
]);

export const roleOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  icon: z.string(),
});

export const profileSettingsSchema = z.object({
  fullName: z.string(),
  avatarUrl: z.string().optional(),
  avatarInitials: z.string(),
  selectedRole: z.string(),
  roles: z.array(roleOptionSchema),
});

export const billingSettingsSchema = z.object({
  planName: z.string(),
  billingCycle: z.string(),
  renewsOn: z.string(),
  paymentMethod: z.string(),
});

export const clientSettingsSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  avatarUrl: z.string().optional(),
  projectCount: z.number(),
});

export const developerSettingsSchema = z.object({
  apiKey: z.string(),
  generatedPrompt: z.string(),
});

export const integrationSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  connected: z.boolean(),
  accentColor: z.string().optional(),
});

export const settingsSnapshotSchema = z.object({
  profile: profileSettingsSchema,
  billing: billingSettingsSchema,
  clients: z.array(clientSettingsSchema),
  developer: developerSettingsSchema,
  integrations: z.object({
    connected: z.array(integrationSchema),
    available: z.array(integrationSchema),
  }),
});

export type SettingsTab = z.infer<typeof settingsTabSchema>;
export type RoleOption = z.infer<typeof roleOptionSchema>;
export type ProfileSettings = z.infer<typeof profileSettingsSchema>;
export type BillingSettings = z.infer<typeof billingSettingsSchema>;
export type ClientSettings = z.infer<typeof clientSettingsSchema>;
export type DeveloperSettings = z.infer<typeof developerSettingsSchema>;
export type Integration = z.infer<typeof integrationSchema>;
export type SettingsSnapshot = z.infer<typeof settingsSnapshotSchema>;
