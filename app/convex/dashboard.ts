import { query } from "./_generated/server";
import { listProjectsForUser, requireAuthUser } from "./_helpers";

function buildClientAvatarMap(
  projects: Array<{ clientName: string; clientAvatarUrl?: string }>,
) {
  return new Map(
    projects
      .filter((project) => project.clientAvatarUrl)
      .map((project) => [project.clientName, project.clientAvatarUrl as string]),
  );
}

export const getOverview = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx);

    const projects = await listProjectsForUser(ctx, user._id);
    const clientAvatarMap = buildClientAvatarMap(projects);

    const paymentConnectionDocs = await ctx.db
      .query("paymentConnections")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const activeConnection =
      paymentConnectionDocs.find((connection) => connection.status === "active") ?? null;

    const invoiceDocs = await ctx.db
      .query("invoices")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const paymentDocs = await ctx.db
      .query("payments")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const financeEntries = await ctx.db
      .query("financeEntries")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const paidInvoices = invoiceDocs.filter((invoice) => invoice.status === "paid");
    const outstandingInvoices = invoiceDocs.filter(
      (invoice) => invoice.status === "open" || invoice.status === "overdue",
    );
    const successfulPayments = paymentDocs.filter((payment) => payment.status === "succeeded");

    const incomingFinanceEntries = financeEntries.filter(
      (entry) => entry.direction === "incoming" && entry.status !== "failed",
    );
    const financeOutstandingEntries = incomingFinanceEntries.filter(
      (entry) => entry.status === "pending" || entry.status === "overdue" || entry.status === "draft",
    );
    const financeReceivedEntries = incomingFinanceEntries.filter((entry) => entry.status === "paid");

    const financeRows = Array.from(
      incomingFinanceEntries.reduce((groups, entry) => {
        const existing = groups.get(entry.counterpartyName);
        const normalizedAmount = entry.amountCents / 100;
        const isPendingLike = entry.status === "pending" || entry.status === "overdue" || entry.status === "draft";

        groups.set(entry.counterpartyName, {
          name: entry.counterpartyName,
          avatarUrl: clientAvatarMap.get(entry.counterpartyName),
          amount: (existing?.amount ?? 0) + normalizedAmount,
          status: existing?.status === "pending" || isPendingLike ? "pending" : "paid",
        });

        return groups;
      }, new Map<string, { name: string; avatarUrl?: string; amount: number; status: "paid" | "pending" }>()),
    )
      .map(([, value]) => value)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);

    const legacyRows = Array.from(
      paidInvoices.reduce((groups, invoice) => {
        const existing = groups.get(invoice.clientName);
        groups.set(invoice.clientName, {
          name: invoice.clientName,
          avatarUrl: clientAvatarMap.get(invoice.clientName),
          amount: (existing?.amount ?? 0) + invoice.totalAmount,
          status: "paid" as const,
        });
        return groups;
      }, new Map<string, { name: string; avatarUrl?: string; amount: number; status: "paid" | "pending" }>()),
    )
      .map(([, value]) => value)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);

    const hasFinanceEntries = financeEntries.length > 0;

    const paymentSummary =
      activeConnection || invoiceDocs.length > 0 || paymentDocs.length > 0 || hasFinanceEntries
        ? {
            provider: activeConnection?.provider ?? "unknown",
            accessMode: activeConnection?.accessMode ?? "restricted_key",
            status: activeConnection?.status ?? "pending",
            outstandingTotal: hasFinanceEntries
              ? financeOutstandingEntries.reduce((sum, entry) => sum + entry.amountCents / 100, 0)
              : outstandingInvoices.reduce((sum, invoice) => sum + invoice.amountDue, 0),
            receivedTotal: hasFinanceEntries
              ? financeReceivedEntries.reduce((sum, entry) => sum + entry.amountCents / 100, 0)
              : successfulPayments.reduce((sum, payment) => sum + payment.amount, 0),
            pendingTotal: hasFinanceEntries
              ? financeOutstandingEntries.reduce((sum, entry) => sum + entry.amountCents / 100, 0)
              : outstandingInvoices.reduce((sum, invoice) => sum + invoice.amountDue, 0),
            rows: hasFinanceEntries ? financeRows : legacyRows,
          }
        : null;

    return {
      projects,
      paymentSummary,
    };
  },
});
