import { z } from "zod";
import { createProjectInputSchema } from "@/data-ops/schema";
import { parseDateInput } from "@/lib/project/createProjectDates";
import type { ProjectType } from "@/types";

export const CREATE_PROJECT_PROGRESS_STEPS = [0, 1, 2, 3, 4] as const;

export const CREATE_PROJECT_TYPE_VALUES = [
  "websites",
  "web-apps",
  "ios-apps",
] as const satisfies readonly ProjectType[];

export const SMART_ROADMAP_PHASES = ["Research", "Architecture", "Design", "Development", "Testing"];
export const DEFAULT_MANUAL_PHASES = ["Discovery", "Strategy", "Design", "Development", "Launch"];

export type CreateProjectStep = "basic" | "client" | "type" | "timeline" | "roadmap" | "success";
export type RoadmapMode = "smart" | "manual";

export type ExistingClientOption = {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
};

export const basicDetailsFormSchema = z.object({
  projectName: z.string().trim().min(1, "Project name is required."),
});

export const clientDetailsFormSchema = z.object({
  clientMode: z.enum(["new", "existing"]),
  clientName: z.string().trim().min(1, "Client name is required."),
  clientEmail: z.string().trim().min(1, "Client email is required.").email("Enter a valid client email."),
  existingClients: z.array(z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().optional(),
  })),
  selectedExistingClientId: z.string().optional(),
}).superRefine((value, context) => {
  const email = value.clientEmail.toLowerCase();
  const name = value.clientName.toLowerCase();
  if (value.existingClients.some((client) =>
    client.email?.trim().toLowerCase() === email &&
    client.name.trim().toLowerCase() !== name &&
    client.id !== value.selectedExistingClientId
  )) {
    context.addIssue({
      code: "custom",
      path: ["clientEmail"],
      message: "A client with this email already exists. Pick that client instead.",
    });
  }
});

export const timelineFormSchema = z
  .object({
    startDate: z.string().trim().min(1, "Choose a start date."),
    endDate: z.string().trim().min(1, "Choose an end date."),
  })
  .superRefine((value, context) => {
    const startDate = parseDateInput(value.startDate);
    const endDate = parseDateInput(value.endDate);

    if (!startDate) {
      context.addIssue({
        code: "custom",
        path: ["startDate"],
        message: "Choose a valid start date.",
      });
    }

    if (!endDate) {
      context.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "Choose a valid end date.",
      });
    }

    if (startDate && endDate && endDate < startDate) {
      context.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "End date must be the same as or later than the start date.",
      });
    }
  });

export const createProjectPayloadSchema = createProjectInputSchema.refine(
  (project) => project.endDate >= project.startDate,
  {
    path: ["endDate"],
    message: "End date must be the same as or later than the start date.",
  },
);
