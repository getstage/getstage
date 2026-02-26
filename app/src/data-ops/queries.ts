/**
 * Queries — Read operations
 *
 * { Replace: Convex useQuery() hooks }
 *
 * All read operations are centralized here.
 * Components only import from this file.
 */

import { mockProjects, mockClients } from "@/data-ops/mock";
import type {
  Project,
  Task,
  Client,
  PortalConfig,
  Subscription,
} from "@/types";

// Simulate network delay
const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

// --- Projects ---

export async function getProjects(): Promise<Project[]> {
  // { Convex: useQuery(api.projects.list) }
  await delay();
  return mockProjects;
}

export async function getProject(id: string): Promise<Project | null> {
  // { Convex: useQuery(api.projects.get, { id }) }
  await delay();
  return mockProjects.find((p) => p.id === id) ?? null;
}

// --- Tasks ---

export async function getTask(
  projectId: string,
  taskId: string,
): Promise<Task | null> {
  // { Convex: useQuery(api.tasks.get, { projectId, taskId }) }
  await delay();
  for (const project of mockProjects) {
    if (project.id !== projectId) continue;
    for (const phase of project.phases) {
      const task = phase.tasks.find((t) => t.id === taskId);
      if (task) return task;
    }
  }
  return null;
}

// --- Clients ---

export async function getClients(): Promise<Client[]> {
  // { Convex: useQuery(api.clients.list) }
  await delay();
  return mockClients;
}

// --- Portal ---

export async function getPortalData(
  shareToken: string,
): Promise<{ project: Project; config: PortalConfig } | null> {
  // { Convex: useQuery(api.portal.get, { shareToken }) }
  await delay();
  const project = mockProjects[0];
  if (!project) return null;
  return {
    project,
    config: {
      projectId: project.id,
      isEnabled: true,
      shareToken,
      shareUrl: `https://app.usestage.com/portal/${shareToken}`,
      accentColor: "#E8734A",
    },
  };
}

// --- Subscription ---

export async function getSubscription(): Promise<Subscription | null> {
  // { Convex: useQuery(api.subscriptions.current) }
  await delay();
  return {
    plan: "pro",
    status: "active",
    billingCycle: "yearly",
    currentPeriodEnd: Date.now() + 300 * 24 * 60 * 60 * 1000,
    paymentMethod: { brand: "Visa", last4: "4242" },
  };
}
