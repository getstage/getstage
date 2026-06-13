import Stripe from "stripe";
import type { Id } from "../../../_generated/dataModel";
import type { StripeMatchIndexes } from "../../../models/integrations/stripeConnect";

export function centsToAmount(value: number | null | undefined) {
  return Number(((value ?? 0) / 100).toFixed(2));
}

export function secondsToMilliseconds(value: number | null | undefined) {
  return value ? value * 1000 : undefined;
}

export function normalizeStripeEmail(value: string) {
  return value.trim().toLowerCase();
}

function addToMatchIndex<T>(map: Map<string, T[]>, key: string, value: T) {
  const existing = map.get(key);
  if (existing) {
    existing.push(value);
    return;
  }
  map.set(key, [value]);
}

export function buildStripeMatchIndexes(args: {
  clients: Array<{ name: string; email?: string }>;
  projects: Array<{ _id: Id<"projects">; clientName: string; clientEmail?: string }>;
}): StripeMatchIndexes {
  const clientNamesByEmail = new Map<string, string[]>();
  for (const client of args.clients) {
    if (!client.email) continue;
    const email = normalizeStripeEmail(client.email);
    if (!email) continue;
    addToMatchIndex(clientNamesByEmail, email, client.name);
  }

  const projectsByClientEmail = new Map<
    string,
    Array<{ _id: Id<"projects">; clientName: string }>
  >();
  for (const project of args.projects) {
    if (!project.clientEmail) continue;
    const email = normalizeStripeEmail(project.clientEmail);
    if (!email) continue;
    addToMatchIndex(projectsByClientEmail, email, {
      _id: project._id,
      clientName: project.clientName,
    });
  }

  return {
    clientNamesByEmail,
    projectsByClientEmail,
  };
}

export function resolveStripeCounterpartyMatch(
  rawName: string,
  rawEmail: string | undefined,
  indexes: StripeMatchIndexes,
): { clientName: string; projectId?: Id<"projects"> } {
  if (!rawEmail) {
    return { clientName: rawName };
  }

  const normalizedEmail = normalizeStripeEmail(rawEmail);
  if (!normalizedEmail) {
    return { clientName: rawName };
  }

  const clientNameCandidates = indexes.clientNamesByEmail.get(normalizedEmail) ?? [];
  const projectCandidates = indexes.projectsByClientEmail.get(normalizedEmail) ?? [];
  const uniqueProjectClientNames = Array.from(
    new Set(projectCandidates.map((project) => project.clientName)),
  );
  const singleClientName =
    clientNameCandidates.length === 1 ? clientNameCandidates[0] : undefined;
  const singleProjectClientName =
    uniqueProjectClientNames.length === 1 ? uniqueProjectClientNames[0] : undefined;
  const singleProjectId =
    projectCandidates.length === 1 ? projectCandidates[0]?._id : undefined;

  const canonicalClientName =
    singleClientName ?? singleProjectClientName ?? rawName;

  return {
    clientName: canonicalClientName,
    projectId: singleProjectId,
  };
}

export function mapInvoiceStatus(status: string | null | undefined) {
  switch (status) {
    case "draft":
      return "draft" as const;
    case "paid":
      return "paid" as const;
    case "void":
      return "void" as const;
    case "uncollectible":
      return "overdue" as const;
    default:
      return "open" as const;
  }
}

export function mapPaymentStatus(status: string | null | undefined, paid: boolean) {
  if (paid || status === "succeeded") {
    return "succeeded" as const;
  }
  if (status === "failed") {
    return "failed" as const;
  }
  return "pending" as const;
}

export function mapInvoiceFinanceStatus(
  status: "draft" | "open" | "paid" | "overdue" | "void",
) {
  switch (status) {
    case "draft":
      return "draft" as const;
    case "paid":
      return "paid" as const;
    case "overdue":
      return "overdue" as const;
    case "void":
      return "failed" as const;
    default:
      return "pending" as const;
  }
}

export function mapPaymentFinanceStatus(status: "pending" | "succeeded" | "failed") {
  switch (status) {
    case "succeeded":
      return "paid" as const;
    case "failed":
      return "failed" as const;
    default:
      return "pending" as const;
  }
}

export function getConnectWebhookAccountId(event: Stripe.Event) {
  if (event.account) {
    return event.account;
  }

  const object = event.data.object as {
    id?: string;
    account?: string | { id?: string };
    stripe_user_id?: string;
  };

  if (typeof object.id === "string" && object.id.startsWith("acct_")) {
    return object.id;
  }
  if (typeof object.account === "string") {
    return object.account;
  }
  if (typeof object.stripe_user_id === "string") {
    return object.stripe_user_id;
  }
  if (object.account && typeof object.account === "object" && typeof object.account.id === "string") {
    return object.account.id;
  }

  return null;
}
