import Stripe from "stripe";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, httpAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireAuthUser } from "./_helpers";

function getEnv(name: string) {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[
    name
  ];
}

function requireEnv(name: string) {
  const value = getEnv(name);
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}

function getConnectRedirectUri() {
  return `${requireEnv("CONVEX_SITE_URL")}/stripe/connect/callback`;
}

function now() {
  return Date.now();
}

function centsToAmount(value: number | null | undefined) {
  return Number(((value ?? 0) / 100).toFixed(2));
}

function secondsToMilliseconds(value: number | null | undefined) {
  return value ? value * 1000 : undefined;
}

function mapInvoiceStatus(status: string | null | undefined) {
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

function mapPaymentStatus(status: string | null | undefined, paid: boolean) {
  if (paid || status === "succeeded") {
    return "succeeded" as const;
  }
  if (status === "failed") {
    return "failed" as const;
  }
  return "pending" as const;
}

function mapInvoiceFinanceStatus(
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

function mapPaymentFinanceStatus(status: "pending" | "succeeded" | "failed") {
  switch (status) {
    case "succeeded":
      return "paid" as const;
    case "failed":
      return "failed" as const;
    default:
      return "pending" as const;
  }
}

function createRedirect(url: string) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: url,
    },
  });
}

type ViewerContext = {
  userId: Id<"users">;
  userIdString: string;
  email: string;
  name: string;
};

type StripeConnectionRecord = {
  _id: Id<"paymentConnections">;
  externalAccountId?: string;
};

const invoiceSyncValidator = v.object({
  externalInvoiceId: v.string(),
  number: v.optional(v.string()),
  clientName: v.string(),
  status: v.union(
    v.literal("draft"),
    v.literal("open"),
    v.literal("paid"),
    v.literal("overdue"),
    v.literal("void"),
  ),
  currency: v.string(),
  totalAmount: v.number(),
  amountDue: v.number(),
  issuedAt: v.number(),
  dueAt: v.optional(v.number()),
  paidAt: v.optional(v.number()),
  hostedInvoiceUrl: v.optional(v.string()),
});

const paymentSyncValidator = v.object({
  externalPaymentId: v.string(),
  externalInvoiceId: v.optional(v.string()),
  currency: v.string(),
  amount: v.number(),
  status: v.union(
    v.literal("pending"),
    v.literal("succeeded"),
    v.literal("failed"),
  ),
  receivedAt: v.number(),
});

export const getStripeConnectionStatus = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx);
    const connection = await ctx.db
      .query("paymentConnections")
      .withIndex("by_user_provider", (q) => q.eq("userId", user._id).eq("provider", "stripe"))
      .first();

    if (!connection) {
      return null;
    }

    return {
      id: connection._id,
      provider: connection.provider,
      accessMode: connection.accessMode,
      status: connection.status,
      externalAccountId: connection.externalAccountId ?? null,
      displayName: connection.displayName ?? connection.credentialLabel ?? null,
      accountEmail: connection.accountEmail ?? null,
      connectedAt: connection.connectedAt ?? null,
      lastSyncedAt: connection.lastSyncedAt ?? null,
      lastSyncError: connection.lastSyncError ?? null,
    };
  },
});

export const getConnectionForViewer = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("paymentConnections")
      .withIndex("by_user_provider", (q) => q.eq("userId", args.userId).eq("provider", "stripe"))
      .first();
  },
});

export const upsertPendingConnection = internalMutation({
  args: {
    userId: v.id("users"),
    oauthState: v.string(),
  },
  handler: async (ctx, args) => {
    const timestamp = now();
    const existing = await ctx.db
      .query("paymentConnections")
      .withIndex("by_user_provider", (q) => q.eq("userId", args.userId).eq("provider", "stripe"))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        accessMode: "connect",
        status: "pending",
        oauthState: args.oauthState,
        lastSyncError: undefined,
        updatedAt: timestamp,
      });
      return existing._id;
    }

    return ctx.db.insert("paymentConnections", {
      userId: args.userId,
      provider: "stripe",
      accessMode: "connect",
      status: "pending",
      oauthState: args.oauthState,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  },
});

export const markConnectionErrorByState = internalMutation({
  args: {
    oauthState: v.string(),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db
      .query("paymentConnections")
      .withIndex("by_oauth_state", (q) => q.eq("oauthState", args.oauthState))
      .unique();

    if (!connection) {
      return null;
    }

    await ctx.db.patch(connection._id, {
      status: "error",
      lastSyncError: args.error,
      updatedAt: now(),
    });

    return connection._id;
  },
});

export const completeConnectionByState = internalMutation({
  args: {
    oauthState: v.string(),
    externalAccountId: v.string(),
    displayName: v.optional(v.string()),
    accountEmail: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("active")),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db
      .query("paymentConnections")
      .withIndex("by_oauth_state", (q) => q.eq("oauthState", args.oauthState))
      .unique();

    if (!connection) {
      return null;
    }

    const timestamp = now();
    await ctx.db.patch(connection._id, {
      externalAccountId: args.externalAccountId,
      displayName: args.displayName,
      accountEmail: args.accountEmail,
      status: args.status,
      connectedAt: timestamp,
      lastSyncError: undefined,
      oauthState: undefined,
      updatedAt: timestamp,
    });

    return connection._id;
  },
});

export const updateConnectionSnapshot = internalMutation({
  args: {
    connectionId: v.id("paymentConnections"),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("error"),
      v.literal("disconnected"),
    ),
    displayName: v.optional(v.string()),
    accountEmail: v.optional(v.string()),
    lastSyncError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.connectionId, {
      status: args.status,
      displayName: args.displayName,
      accountEmail: args.accountEmail,
      lastSyncError: args.lastSyncError,
      updatedAt: now(),
    });
  },
});

export const applyStripeSync = internalMutation({
  args: {
    userId: v.id("users"),
    paymentConnectionId: v.id("paymentConnections"),
    displayName: v.optional(v.string()),
    accountEmail: v.optional(v.string()),
    invoices: v.array(invoiceSyncValidator),
    payments: v.array(paymentSyncValidator),
  },
  handler: async (ctx, args) => {
    const timestamp = now();

    await ctx.db.patch(args.paymentConnectionId, {
      status: "active",
      displayName: args.displayName,
      accountEmail: args.accountEmail,
      lastSyncedAt: timestamp,
      lastSyncError: undefined,
      updatedAt: timestamp,
    });

    let importedInvoices = 0;
    let importedPayments = 0;

    for (const invoice of args.invoices) {
      const existing = await ctx.db
        .query("invoices")
        .withIndex("by_connection_external", (q) =>
          q
            .eq("paymentConnectionId", args.paymentConnectionId)
            .eq("externalInvoiceId", invoice.externalInvoiceId),
        )
        .unique();

      const patch = {
        userId: args.userId,
        paymentConnectionId: args.paymentConnectionId,
        externalInvoiceId: invoice.externalInvoiceId,
        number: invoice.number,
        clientName: invoice.clientName,
        status: invoice.status,
        currency: invoice.currency,
        totalAmount: invoice.totalAmount,
        amountDue: invoice.amountDue,
        issuedAt: invoice.issuedAt,
        dueAt: invoice.dueAt,
        paidAt: invoice.paidAt,
        hostedInvoiceUrl: invoice.hostedInvoiceUrl,
        updatedAt: timestamp,
      };

      if (existing) {
        await ctx.db.patch(existing._id, patch);
      } else {
        await ctx.db.insert("invoices", {
          ...patch,
          createdAt: timestamp,
        });
      }

      const financeEntryPatch = {
        userId: args.userId,
        source: "stripe_connect" as const,
        paymentConnectionId: args.paymentConnectionId,
        sheetConnectionId: undefined,
        sourceRecordId: `invoice:${invoice.externalInvoiceId}`,
        entryType: "invoice" as const,
        direction: "incoming" as const,
        status: mapInvoiceFinanceStatus(invoice.status),
        counterpartyName: invoice.clientName,
        amountCents: Math.round(invoice.totalAmount * 100),
        currency: invoice.currency,
        occurredAt: invoice.issuedAt,
        dueAt: invoice.dueAt,
        paidAt: invoice.paidAt,
        projectId: undefined,
        notes: undefined,
        rawLabel: invoice.number,
        updatedAt: timestamp,
      };
      const existingFinanceEntry = await ctx.db
        .query("financeEntries")
        .withIndex("by_user_source_record", (q) =>
          q
            .eq("userId", args.userId)
            .eq("source", "stripe_connect")
            .eq("sourceRecordId", financeEntryPatch.sourceRecordId),
        )
        .unique();

      if (existingFinanceEntry) {
        await ctx.db.patch(existingFinanceEntry._id, financeEntryPatch);
      } else {
        await ctx.db.insert("financeEntries", {
          ...financeEntryPatch,
          createdAt: timestamp,
        });
      }

      importedInvoices += 1;
    }

    for (const payment of args.payments) {
      let linkedInvoiceId;
      if (payment.externalInvoiceId) {
        const linkedInvoice = await ctx.db
          .query("invoices")
          .withIndex("by_connection_external", (q) =>
            q
              .eq("paymentConnectionId", args.paymentConnectionId)
              .eq("externalInvoiceId", payment.externalInvoiceId as string),
          )
          .unique();
        linkedInvoiceId = linkedInvoice?._id;
      }

      const existing = await ctx.db
        .query("payments")
        .withIndex("by_connection_external", (q) =>
          q
            .eq("paymentConnectionId", args.paymentConnectionId)
            .eq("externalPaymentId", payment.externalPaymentId),
        )
        .unique();

      const patch = {
        userId: args.userId,
        paymentConnectionId: args.paymentConnectionId,
        invoiceId: linkedInvoiceId,
        externalPaymentId: payment.externalPaymentId,
        currency: payment.currency,
        amount: payment.amount,
        status: payment.status,
        receivedAt: payment.receivedAt,
        updatedAt: timestamp,
      };

      if (existing) {
        await ctx.db.patch(existing._id, patch);
      } else {
        await ctx.db.insert("payments", {
          ...patch,
          createdAt: timestamp,
        });
      }

      const financeEntryPatch = {
        userId: args.userId,
        source: "stripe_connect" as const,
        paymentConnectionId: args.paymentConnectionId,
        sheetConnectionId: undefined,
        sourceRecordId: `payment:${payment.externalPaymentId}`,
        entryType: "payment" as const,
        direction: "incoming" as const,
        status: mapPaymentFinanceStatus(payment.status),
        counterpartyName:
          linkedInvoiceId !== undefined
            ? args.invoices.find((invoice) => invoice.externalInvoiceId === payment.externalInvoiceId)
                ?.clientName ?? "Stripe customer"
            : "Stripe customer",
        amountCents: Math.round(payment.amount * 100),
        currency: payment.currency,
        occurredAt: payment.receivedAt,
        dueAt: undefined,
        paidAt: payment.status === "succeeded" ? payment.receivedAt : undefined,
        projectId: undefined,
        notes: undefined,
        rawLabel: payment.externalInvoiceId,
        updatedAt: timestamp,
      };
      const existingFinanceEntry = await ctx.db
        .query("financeEntries")
        .withIndex("by_user_source_record", (q) =>
          q
            .eq("userId", args.userId)
            .eq("source", "stripe_connect")
            .eq("sourceRecordId", financeEntryPatch.sourceRecordId),
        )
        .unique();

      if (existingFinanceEntry) {
        await ctx.db.patch(existingFinanceEntry._id, financeEntryPatch);
      } else {
        await ctx.db.insert("financeEntries", {
          ...financeEntryPatch,
          createdAt: timestamp,
        });
      }

      importedPayments += 1;
    }

    return {
      importedInvoices,
      importedPayments,
    };
  },
});

export const disconnectStripe = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx);
    const connection = await ctx.db
      .query("paymentConnections")
      .withIndex("by_user_provider", (q) => q.eq("userId", user._id).eq("provider", "stripe"))
      .first();

    if (!connection) {
      return null;
    }

    await ctx.db.patch(connection._id, {
      status: "disconnected",
      lastSyncError: undefined,
      oauthState: undefined,
      updatedAt: now(),
    });

    return {
      disconnected: true,
    };
  },
});

export const startConnect = action({
  args: {},
  handler: async (ctx) => {
    const viewer = (await ctx.runQuery(internal.onboarding.getViewerContext, {})) as ViewerContext;
    const clientId = requireEnv("STRIPE_CONNECT_CLIENT_ID");
    const state = crypto.randomUUID();

    await ctx.runMutation(internal.stripeConnect.upsertPendingConnection, {
      userId: viewer.userId,
      oauthState: state,
    });

    const url = new URL("https://connect.stripe.com/oauth/authorize");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("scope", "read_write");
    url.searchParams.set("state", state);
    url.searchParams.set("redirect_uri", getConnectRedirectUri());
    url.searchParams.set("stripe_user[email]", viewer.email);

    return {
      url: url.toString(),
    };
  },
});

export const completeConnect = action({
  args: {},
  handler: async (ctx): Promise<{
    status: "pending" | "active";
    displayName: string | null;
    accountEmail: string | null;
  }> => {
    const viewer = (await ctx.runQuery(internal.onboarding.getViewerContext, {})) as ViewerContext;
    const connection = (await ctx.runQuery(internal.stripeConnect.getConnectionForViewer, {
      userId: viewer.userId,
    })) as StripeConnectionRecord | null;

    if (!connection?.externalAccountId) {
      throw new Error("No Stripe account is connected yet.");
    }

    const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
    const account: Stripe.Account = await stripe.accounts.retrieve(connection.externalAccountId);
    const dashboardSettings = account.settings?.dashboard as { display_name?: string } | undefined;
    const displayName =
      account.business_profile?.name ||
      account.business_type ||
      dashboardSettings?.display_name ||
      undefined;
    const accountEmail = account.email ?? undefined;
    const isActive: boolean = Boolean(account.details_submitted && account.charges_enabled);

    await ctx.runMutation(internal.stripeConnect.updateConnectionSnapshot, {
      connectionId: connection._id,
      status: isActive ? "active" : "pending",
      displayName,
      accountEmail,
      lastSyncError: undefined,
    });

    return {
      status: isActive ? "active" : "pending",
      displayName: displayName ?? null,
      accountEmail: accountEmail ?? null,
    };
  },
});

export const syncStripeData = action({
  args: {},
  handler: async (ctx): Promise<{
    importedInvoices: number;
    importedPayments: number;
  }> => {
    const viewer = (await ctx.runQuery(internal.onboarding.getViewerContext, {})) as ViewerContext;
    const connection = (await ctx.runQuery(internal.stripeConnect.getConnectionForViewer, {
      userId: viewer.userId,
    })) as StripeConnectionRecord | null;

    if (!connection?.externalAccountId) {
      throw new Error("Connect a Stripe account before syncing.");
    }

    const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
    const account = await stripe.accounts.retrieve(connection.externalAccountId);
    const dashboardSettings = account.settings?.dashboard as { display_name?: string } | undefined;
    const invoices = await stripe.invoices.list(
      { limit: 100 },
      { stripeAccount: connection.externalAccountId },
    );
    const charges = await stripe.charges.list(
      { limit: 100 },
      { stripeAccount: connection.externalAccountId },
    );

    const displayName =
      account.business_profile?.name ||
      account.business_type ||
      dashboardSettings?.display_name ||
      undefined;
    const accountEmail = account.email ?? undefined;

    const invoiceRows = invoices.data.map((invoice) => ({
      externalInvoiceId: invoice.id,
      number: invoice.number ?? undefined,
      clientName:
        invoice.customer_name ||
        invoice.customer_email ||
        invoice.account_name ||
        "Stripe customer",
      status: mapInvoiceStatus(invoice.status),
      currency: invoice.currency.toUpperCase(),
      totalAmount: centsToAmount(invoice.total),
      amountDue: centsToAmount(invoice.amount_remaining),
      issuedAt: secondsToMilliseconds(invoice.created) ?? now(),
      dueAt: secondsToMilliseconds(invoice.due_date),
      paidAt: secondsToMilliseconds(invoice.status_transitions.paid_at),
      hostedInvoiceUrl: invoice.hosted_invoice_url ?? undefined,
    }));

    const paymentRows = charges.data.map((charge) => {
      const invoiceReference = (charge as Stripe.Charge & {
        invoice?: string | Stripe.Invoice | null;
      }).invoice;

      return {
        externalPaymentId: charge.id,
        externalInvoiceId: typeof invoiceReference === "string" ? invoiceReference : undefined,
        currency: charge.currency.toUpperCase(),
        amount: centsToAmount(charge.amount),
        status: mapPaymentStatus(charge.status, charge.paid),
        receivedAt: secondsToMilliseconds(charge.created) ?? now(),
      };
    });

    return ctx.runMutation(internal.stripeConnect.applyStripeSync, {
      userId: viewer.userId,
      paymentConnectionId: connection._id,
      displayName,
      accountEmail,
      invoices: invoiceRows,
      payments: paymentRows,
    });
  },
});

export const connectCallback = httpAction(async (ctx, request) => {
  const siteUrl = requireEnv("SITE_URL");
  const redirectUrl = new URL(`${siteUrl}/settings`);
  redirectUrl.searchParams.set("tab", "integrations");

  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    if (state) {
      await ctx.runMutation(internal.stripeConnect.markConnectionErrorByState, {
        oauthState: state,
        error,
      });
    }
    redirectUrl.searchParams.set("stripe", "error");
    return createRedirect(redirectUrl.toString());
  }

  if (!state || !code) {
    redirectUrl.searchParams.set("stripe", "error");
    redirectUrl.searchParams.set("reason", "missing_code");
    return createRedirect(redirectUrl.toString());
  }

  try {
    const response = await fetch("https://connect.stripe.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_secret: requireEnv("STRIPE_SECRET_KEY"),
        redirect_uri: getConnectRedirectUri(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Stripe OAuth exchange failed with ${response.status}.`);
    }

    const payload = (await response.json()) as {
      stripe_user_id?: string;
    };

    if (!payload.stripe_user_id) {
      throw new Error("Stripe did not return a connected account id.");
    }

    const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
    const account = await stripe.accounts.retrieve(payload.stripe_user_id);
    const dashboardSettings = account.settings?.dashboard as { display_name?: string } | undefined;
    const isActive = Boolean(account.details_submitted && account.charges_enabled);

    await ctx.runMutation(internal.stripeConnect.completeConnectionByState, {
      oauthState: state,
      externalAccountId: payload.stripe_user_id,
      displayName:
        account.business_profile?.name ||
        account.business_type ||
        dashboardSettings?.display_name ||
        undefined,
      accountEmail: account.email ?? undefined,
      status: isActive ? "active" : "pending",
    });

    redirectUrl.searchParams.set("stripe", "connected");
    return createRedirect(redirectUrl.toString());
  } catch (error) {
    await ctx.runMutation(internal.stripeConnect.markConnectionErrorByState, {
      oauthState: state,
      error: error instanceof Error ? error.message : "Stripe connect failed.",
    });
    redirectUrl.searchParams.set("stripe", "error");
    return createRedirect(redirectUrl.toString());
  }
});
