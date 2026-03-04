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

    const paidInvoices = invoiceDocs.filter((invoice) => invoice.status === "paid");
    const outstandingInvoices = invoiceDocs.filter(
      (invoice) => invoice.status === "open" || invoice.status === "overdue",
    );
    const successfulPayments = paymentDocs.filter((payment) => payment.status === "succeeded");

    const rows = Array.from(
      paidInvoices.reduce((groups, invoice) => {
        const existing = groups.get(invoice.clientName);
        groups.set(invoice.clientName, {
          name: invoice.clientName,
          avatarUrl: clientAvatarMap.get(invoice.clientName),
          amount: (existing?.amount ?? 0) + invoice.totalAmount,
        });
        return groups;
      }, new Map<string, { name: string; avatarUrl?: string; amount: number }>()),
    )
      .map(([, value]) => value)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);

    const paymentSummary =
      activeConnection || invoiceDocs.length > 0 || paymentDocs.length > 0
        ? {
            provider: activeConnection?.provider ?? "unknown",
            accessMode: activeConnection?.accessMode ?? "restricted_key",
            status: activeConnection?.status ?? "pending",
            outstandingTotal: outstandingInvoices.reduce(
              (sum, invoice) => sum + invoice.amountDue,
              0,
            ),
            receivedTotal: successfulPayments.reduce((sum, payment) => sum + payment.amount, 0),
            pendingTotal: outstandingInvoices.reduce(
              (sum, invoice) => sum + invoice.amountDue,
              0,
            ),
            rows,
          }
        : null;

    return {
      projects,
      paymentSummary,
    };
  },
});
