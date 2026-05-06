/**
 * Queries — Read operations
 *
 * Deprecated prototype-only module.
 * Runtime code uses Convex queries directly; keep this only for reference during cleanup.
 */

import {
  mockClients,
  mockConnectedAccount,
  mockInvoices,
  mockProjects,
  mockRevenueSummary,
  mockSubscription,
} from "@/data-ops/mock";
import type {
  ConnectedAccount,
  Invoice,
  Project,
  Client,
  PortalConfig,
  RevenueSummary,
  Subscription,
  Task,
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
  return mockSubscription;
}

// --- Connected account payments ---

export async function getConnectedAccount(): Promise<ConnectedAccount | null> {
  // { Convex: useQuery(api.payments.connectedAccount) }
  await delay();
  return mockConnectedAccount;
}

export async function getRevenueSummary(): Promise<RevenueSummary | null> {
  // { Convex: useQuery(api.payments.revenueSummary) }
  await delay();
  return mockRevenueSummary;
}

export async function getInvoices(): Promise<Invoice[]> {
  // { Convex: useQuery(api.payments.invoices) }
  await delay();
  return mockInvoices;
}
