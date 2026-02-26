/**
 * Mutations — Write operations
 *
 * { Replace: Convex useMutation() hooks }
 *
 * All write operations are centralized here.
 * Components only import from this file.
 */

import { mockProjects } from "@/data-ops/mock";
import {
  createProjectInputSchema,
  updateTaskInputSchema,
} from "@/data-ops/schema";
import type {
  Project,
  Task,
  Attachment,
  CreateProjectInput,
} from "@/types";

// Simulate network delay
const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

// --- Projects ---

export async function createProject(data: CreateProjectInput): Promise<Project> {
  // Validate input
  createProjectInputSchema.parse(data);

  // { Convex: useMutation(api.projects.create) }
  await delay(800);
  return mockProjects[0]!;
}

export async function updateProject(
  _id: string,
  _data: Partial<Project>,
): Promise<Project> {
  // { Convex: useMutation(api.projects.update) }
  await delay();
  return mockProjects[0]!;
}

export async function deleteProject(_id: string): Promise<void> {
  // { Convex: useMutation(api.projects.remove) }
  await delay();
}

// --- Tasks ---

export async function updateTask(
  _id: string,
  data: Partial<Task>,
): Promise<Task> {
  // Validate input where applicable
  if (Object.keys(data).length > 0) {
    updateTaskInputSchema.parse(data);
  }

  // { Convex: useMutation(api.tasks.update) }
  await delay();
  return mockProjects[0]!.phases[0]!.tasks[0]!;
}

export async function toggleTaskComplete(_id: string): Promise<Task> {
  // { Convex: useMutation(api.tasks.toggleComplete) }
  await delay(150);
  return mockProjects[0]!.phases[0]!.tasks[0]!;
}

// --- File uploads ---

export async function uploadFile(file: File): Promise<Attachment> {
  // { Convex: useMutation(api.files.generateUploadUrl) + fetch upload }
  await delay(1000);
  return {
    id: `att_${Date.now()}`,
    type: "image",
    url: URL.createObjectURL(file),
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
  };
}

// --- Subscription ---

export async function createCheckoutSession(
  _plan: "yearly",
): Promise<string> {
  // { Convex: useMutation(api.stripe.createCheckout) }
  await delay();
  return "https://checkout.stripe.com/mock";
}

export async function cancelSubscription(): Promise<void> {
  // { Convex: useMutation(api.stripe.cancel) }
  await delay();
}
