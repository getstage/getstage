/* ============================================================
   STAGE — Data Types
   Inferred from Zod schemas in src/data-ops/schema.ts.
   Convex schema will follow the same structure later.
   ============================================================ */

import { z } from "zod";
import {
  userSchema,
  userRoleSchema,
  planSchema,
  projectSchema,
  projectTypeSchema,
  projectStatusSchema,
  phaseSchema,
  phaseStatusSchema,
  taskSchema,
  attachmentSchema,
  attachmentTypeSchema,
  clientSchema,
  portalConfigSchema,
  subscriptionSchema,
  createProjectInputSchema,
  updateProjectInputSchema,
  updateTaskInputSchema,
} from "@/data-ops/schema";

// --- Inferred Types ---

export type User = z.infer<typeof userSchema>;
export type UserRole = z.infer<typeof userRoleSchema>;
export type Plan = z.infer<typeof planSchema>;

export type Project = z.infer<typeof projectSchema>;
export type ProjectType = z.infer<typeof projectTypeSchema>;
export type ProjectStatus = z.infer<typeof projectStatusSchema>;

export type Phase = z.infer<typeof phaseSchema>;
export type PhaseStatus = z.infer<typeof phaseStatusSchema>;

export type Task = z.infer<typeof taskSchema>;

export type Attachment = z.infer<typeof attachmentSchema>;
export type AttachmentType = z.infer<typeof attachmentTypeSchema>;

export type Client = z.infer<typeof clientSchema>;

export type PortalConfig = z.infer<typeof portalConfigSchema>;

export type Subscription = z.infer<typeof subscriptionSchema>;

export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectInputSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskInputSchema>;

// --- Constants ---

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  branding: "Branding",
  "web-design": "Web Design",
  "product-design": "Product Design",
  "app-design": "App Design",
  packaging: "Packaging",
  "motion-design": "Motion Design",
  illustration: "Illustration",
  other: "Other",
};

// --- Derived Types (not in DB, frontend only) ---

export type TimelineProject = {
  id: string;
  name: string;
  clientName: string;
  clientAvatarUrl?: string;
  startDate: number;
  endDate: number;
  progress: number;
  status: ProjectStatus;
  currentPhase: string;
};
