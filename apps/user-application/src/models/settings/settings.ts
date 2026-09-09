import { z } from "zod";

export const settingsTabSchema = z.enum([
  "profile",
  "billing",
  "team",
  "clients",
  "developer",
  "shortcuts",
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
  creditsUsed: z.number(),
  creditsTotal: z.number().positive(),
  purchases: z.array(z.object({ id: z.string(), amount: z.string(), date: z.string() })),
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

export const userRoleSchema = z.enum(["freelancer", "studio", "in-house", "agency"]);

export const planSchema = z.enum(["free", "start", "pro", "team"]);

export const settingsOverviewSchema = z.object({
  profile: z.object({
    id: z.string().min(1),
    email: z.string(),
    name: z.string(),
    avatarUrl: z.string().nullable(),
    role: userRoleSchema,
    plan: planSchema,
  }),
  subscription: z
    .object({
      plan: planSchema,
      status: z.string(),
      provider: z.string(),
      billingCycle: z.string(),
      currentPeriodEnd: z.number().nullable().optional(),
      cancelAtPeriodEnd: z.boolean(),
      paymentMethodBrand: z.string().nullable(),
      paymentMethodLast4: z.string().nullable(),
      stripeCustomerId: z.string().nullable(),
      stripeSubscriptionId: z.string().nullable(),
      stripePriceId: z.string().nullable(),
    })
    .nullable(),
  paymentConnection: z
    .object({
      provider: z.string(),
      status: z.string(),
    })
    .nullable(),
  portalBranding: z.object({
    logoUrl: z.string().nullable(),
    accentColor: z.string(),
  }),
  previewPortalUrl: z.string().nullable(),
  skillHub: z
    .object({
      installedSkillIds: z.array(z.string()).nullable().optional(),
      enabledSkillIds: z.array(z.string()).nullable(),
      enabledComponentPackIds: z.array(z.string()).nullable(),
      importedSkillHubItems: z
        .array(
          z.object({
            id: z.string(),
            kind: z.enum(["skill", "component"]),
            name: z.string(),
            sourceUrl: z.string(),
          }),
        )
        .nullable()
        .optional(),
    })
    .optional(),
});

export const profileUpdateResultSchema = z.object({
  email: z.string(),
  name: z.string(),
  avatarUrl: z.string().nullable(),
  role: userRoleSchema,
});

export type UserRole = z.infer<typeof userRoleSchema>;
export type SettingsOverview = z.infer<typeof settingsOverviewSchema>;
export type ProfileUpdateResult = z.infer<typeof profileUpdateResultSchema>;
