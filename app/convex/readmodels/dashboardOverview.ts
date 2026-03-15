import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { listProjectsForUser } from "../domain/projects/readModel";

type PaymentRow = {
  name: string;
  avatarUrl?: string;
  amount: number;
  status: "paid" | "pending";
};

function buildClientAvatarMap(
  projects: Array<{ clientName: string; clientAvatarUrl?: string }>,
) {
  return new Map(
    projects
      .filter((project) => project.clientAvatarUrl)
      .map((project) => [project.clientName, project.clientAvatarUrl as string]),
  );
}

function addPaymentRow(
  groups: Map<string, PaymentRow>,
  row: PaymentRow,
) {
  const existing = groups.get(row.name);
  groups.set(row.name, {
    name: row.name,
    avatarUrl: existing?.avatarUrl ?? row.avatarUrl,
    amount: (existing?.amount ?? 0) + row.amount,
    status: existing?.status === "pending" || row.status === "pending" ? "pending" : "paid",
  });
}

export async function buildDashboardOverview(ctx: QueryCtx, userId: Id<"users">) {
  const projects = await listProjectsForUser(ctx, userId);
  const clientAvatarMap = buildClientAvatarMap(projects);

  const paymentConnectionDocs = await ctx.db
    .query("paymentConnections")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  const dashboardConnection =
    paymentConnectionDocs.find((connection) => connection.status !== "disconnected") ?? null;

  const invoiceDocs = await ctx.db
    .query("invoices")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  const paymentDocs = await ctx.db
    .query("payments")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  const financeEntries = await ctx.db
    .query("financeEntries")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  const nonStripeFinanceEntries = financeEntries.filter(
    (entry) =>
      entry.source !== "stripe_connect" &&
      entry.direction === "incoming" &&
      entry.status !== "failed",
  );
  const financeOutstandingEntries = nonStripeFinanceEntries.filter(
    (entry) =>
      entry.status === "pending" || entry.status === "overdue" || entry.status === "draft",
  );
  const financeReceivedEntries = nonStripeFinanceEntries.filter((entry) => entry.status === "paid");

  const stripeInvoices = dashboardConnection
    ? invoiceDocs.filter((invoice) => invoice.paymentConnectionId === dashboardConnection._id)
    : [];
  const stripePayments = dashboardConnection
    ? paymentDocs.filter((payment) => payment.paymentConnectionId === dashboardConnection._id)
    : [];

  const outstandingStripeInvoices = stripeInvoices.filter(
    (invoice) => invoice.status === "open" || invoice.status === "overdue",
  );
  const successfulStripePayments = stripePayments.filter(
    (payment) => payment.status === "succeeded",
  );
  const stripeInvoiceById = new Map(
    stripeInvoices.map((invoice) => [invoice._id, invoice]),
  );
  const coveredPaidInvoiceIds = new Set(
    successfulStripePayments.flatMap((payment) => (payment.invoiceId ? [payment.invoiceId] : [])),
  );
  const uncoveredPaidStripeInvoices = stripeInvoices.filter(
    (invoice) => invoice.status === "paid" && !coveredPaidInvoiceIds.has(invoice._id),
  );

  const rowGroups = new Map<string, PaymentRow>();
  for (const entry of nonStripeFinanceEntries) {
    addPaymentRow(rowGroups, {
      name: entry.counterpartyName,
      avatarUrl: clientAvatarMap.get(entry.counterpartyName),
      amount: entry.amountCents / 100,
      status:
        entry.status === "pending" || entry.status === "overdue" || entry.status === "draft"
          ? "pending"
          : "paid",
    });
  }
  for (const invoice of outstandingStripeInvoices) {
    addPaymentRow(rowGroups, {
      name: invoice.clientName,
      avatarUrl: clientAvatarMap.get(invoice.clientName),
      amount: invoice.amountDue,
      status: "pending",
    });
  }
  for (const payment of successfulStripePayments) {
    const linkedInvoice = payment.invoiceId ? stripeInvoiceById.get(payment.invoiceId) : undefined;
    const counterpartyName = linkedInvoice?.clientName ?? "Stripe customer";
    addPaymentRow(rowGroups, {
      name: counterpartyName,
      avatarUrl: clientAvatarMap.get(counterpartyName),
      amount: payment.amount,
      status: "paid",
    });
  }
  for (const invoice of uncoveredPaidStripeInvoices) {
    addPaymentRow(rowGroups, {
      name: invoice.clientName,
      avatarUrl: clientAvatarMap.get(invoice.clientName),
      amount: invoice.totalAmount,
      status: "paid",
    });
  }

  const paymentRows = Array.from(rowGroups.values())
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  const outstandingTotal =
    financeOutstandingEntries.reduce((sum, entry) => sum + entry.amountCents / 100, 0) +
    outstandingStripeInvoices.reduce((sum, invoice) => sum + invoice.amountDue, 0);
  const receivedTotal =
    financeReceivedEntries.reduce((sum, entry) => sum + entry.amountCents / 100, 0) +
    successfulStripePayments.reduce((sum, payment) => sum + payment.amount, 0) +
    uncoveredPaidStripeInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
  const hasVisiblePaymentData =
    nonStripeFinanceEntries.length > 0 ||
    Boolean(dashboardConnection) ||
    stripeInvoices.length > 0 ||
    stripePayments.length > 0;
  const paymentSummary =
    hasVisiblePaymentData
      ? {
          provider: dashboardConnection?.provider ?? "unknown",
          accessMode: dashboardConnection?.accessMode ?? "restricted_key",
          status: dashboardConnection?.status ?? "pending",
          outstandingTotal,
          receivedTotal,
          pendingTotal: outstandingTotal,
          rows: paymentRows,
        }
      : null;

  return {
    projects,
    paymentSummary,
  };
}
