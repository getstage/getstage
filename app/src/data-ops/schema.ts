/**
 * Zod Schemas — Single source of truth
 *
 * All data shapes for Stage are defined here as Zod schemas.
 * Types are inferred via z.infer<> in src/types/index.ts.
 * Convex schema will follow the same structure later.
 */

import { z } from "zod";

// --- Enums ---

export const userRoleSchema = z.enum([
  "freelancer",
  "studio",
  "in-house",
  "agency",
]);

export const planSchema = z.enum(["free", "pro"]);

export const projectTypeSchema = z.enum([
  "branding",
  "web-design",
  "product-design",
  "app-design",
  "packaging",
  "motion-design",
  "illustration",
  "other",
]);

export const projectStatusSchema = z.enum(["active", "paused", "completed"]);

export const phaseStatusSchema = z.enum(["completed", "active", "upcoming"]);

export const attachmentTypeSchema = z.enum(["image", "pdf", "document", "other"]);

export const subscriptionStatusSchema = z.enum([
  "active",
  "cancelling",
  "expired",
]);

// --- Core Schemas ---

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().min(1),
  avatarUrl: z.string().url().optional(),
  role: userRoleSchema,
  plan: planSchema,
  createdAt: z.number(),
});

export const attachmentSchema = z.object({
  id: z.string(),
  type: attachmentTypeSchema,
  url: z.string(),
  fileName: z.string(),
  fileSize: z.number(),
  mimeType: z.string(),
});

export const taskSchema = z.object({
  id: z.string(),
  phaseId: z.string(),
  title: z.string().min(1),
  isCompleted: z.boolean(),
  content: z.string().optional(),
  attachments: z.array(attachmentSchema),
  order: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const phaseSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string().min(1),
  order: z.number(),
  status: phaseStatusSchema,
  tasks: z.array(taskSchema),
  progress: z.number().min(0).max(100),
});

export const projectSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string().min(1),
  clientName: z.string().min(1),
  clientAvatarUrl: z.string().url().optional(),
  type: projectTypeSchema,
  status: projectStatusSchema,
  startDate: z.number(),
  endDate: z.number(),
  phases: z.array(phaseSchema),
  progress: z.number().min(0).max(100),
  createdAt: z.number(),
  shareToken: z.string().optional(),
});

export const clientSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string().min(1),
  avatarUrl: z.string().url().optional(),
  projectCount: z.number(),
});

export const portalConfigSchema = z.object({
  projectId: z.string(),
  isEnabled: z.boolean(),
  shareToken: z.string(),
  shareUrl: z.string().url(),
  logoUrl: z.string().url().optional(),
  accentColor: z.string(),
});

export const paymentMethodSchema = z.object({
  brand: z.string(),
  last4: z.string().length(4),
});

export const subscriptionSchema = z.object({
  plan: planSchema,
  status: subscriptionStatusSchema,
  billingCycle: z.literal("yearly"),
  currentPeriodEnd: z.number(),
  paymentMethod: paymentMethodSchema.optional(),
});

// --- Input Schemas (validation for mutations) ---

export const createProjectInputSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  clientName: z.string().min(1, "Client name is required"),
  type: projectTypeSchema,
  method: z.enum(["ai", "manual"]),
  startDate: z.number(),
  endDate: z.number(),
  phases: z.array(z.string()).optional(),
});

export const updateProjectInputSchema = projectSchema.partial().omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const updateTaskInputSchema = taskSchema.partial().omit({
  id: true,
  phaseId: true,
  createdAt: true,
});

export const signInInputSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const verifyCodeInputSchema = z.object({
  code: z.string().length(6, "Code must be 6 digits").regex(/^\d{6}$/, "Digits only"),
});
