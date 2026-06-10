import Stripe from "stripe";
import { v } from "convex/values";
import { internal } from "../../../../_generated/api";
import {
  action,
  httpAction,
  internalMutation,
  internalQuery,
  query,
  type MutationCtx,
} from "../../../../_generated/server";
import type { Id } from "../../../../_generated/dataModel";
import { requireAuthUser } from "../../../../_helpers";
import { requireEnv, requireSiteUrl } from "../../../../helpers/env";
import { now } from "../../../../helpers/time";
import { getAccountConnectionStatus, getAccountDisplayName } from "../../../../helpers/integrations/stripe/account";
import {
  buildStripeMatchIndexes,
  centsToAmount,
  getConnectWebhookAccountId,
  mapInvoiceFinanceStatus,
  mapInvoiceStatus,
  mapPaymentFinanceStatus,
  mapPaymentStatus,
  resolveStripeCounterpartyMatch,
  secondsToMilliseconds,
} from "../../../../helpers/integrations/stripe/parsing";
import {
  invoiceSyncValidator,
  paymentSyncValidator,
  type StripeConnectionRecord,
  type ViewerContext,
} from "../../../../models/integrations/stripeConnect";

function createRedirect(url: string) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: url,
    },
  });
}

function getConnectRedirectUri() {
  return `${requireSiteUrl()}/stripe/connect/callback`;
}

async function clearStripeImportedData(
  ctx: MutationCtx,
  connectionId: Id<"paymentConnections">,
) {
  const financeEntries = await ctx.db
    .query("financeEntries")
    .withIndex("by_payment_connection", (q) => q.eq("paymentConnectionId", connectionId))
    .collect();
  for (const financeEntry of financeEntries) {
    await ctx.db.delete(financeEntry._id);
  }

  const payments = await ctx.db
    .query("payments")
    .withIndex("by_connection", (q) => q.eq("paymentConnectionId", connectionId))
    .collect();
  for (const payment of payments) {
    await ctx.db.delete(payment._id);
  }

  const invoices = await ctx.db
    .query("invoices")
    .withIndex("by_connection", (q) => q.eq("paymentConnectionId", connectionId))
    .collect();
  for (const invoice of invoices) {
    await ctx.db.delete(invoice._id);
  }
}

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

export const getConnectionByExternalAccountId = internalQuery({
  args: {
    externalAccountId: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("paymentConnections")
      .filter((q) => q.eq(q.field("externalAccountId"), args.externalAccountId))
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

    const switchedAccounts =
      connection.externalAccountId &&
      connection.externalAccountId !== args.externalAccountId;

    if (switchedAccounts) {
      await clearStripeImportedData(ctx, connection._id);
    }

    const timestamp = now();
    const patch: {
      externalAccountId: string;
      displayName?: string;
      accountEmail?: string;
      status: "pending" | "active";
      connectedAt: number;
      lastSyncError: undefined;
      oauthState: undefined;
      updatedAt: number;
      lastSyncedAt?: undefined;
      lastSyncCursor?: undefined;
    } = {
      externalAccountId: args.externalAccountId,
      displayName: args.displayName,
      accountEmail: args.accountEmail,
      status: args.status,
      connectedAt: timestamp,
      lastSyncError: undefined,
      oauthState: undefined,
      updatedAt: timestamp,
    };
    if (switchedAccounts) {
      patch.lastSyncedAt = undefined;
      patch.lastSyncCursor = undefined;
    }

    await ctx.db.patch(connection._id, patch);

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

export const updateConnectionSnapshotByExternalAccountId = internalMutation({
  args: {
    externalAccountId: v.string(),
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
    const connection = await ctx.db
      .query("paymentConnections")
      .filter((q) => q.eq(q.field("externalAccountId"), args.externalAccountId))
      .first();

    if (!connection) {
      return null;
    }

    await ctx.db.patch(connection._id, {
      status: args.status,
      displayName: args.displayName,
      accountEmail: args.accountEmail,
      lastSyncError: args.lastSyncError,
      updatedAt: now(),
    });

    return connection._id;
  },
});

export const markConnectionDisconnected = internalMutation({
  args: {
    connectionId: v.id("paymentConnections"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.connectionId, {
      status: "disconnected",
      externalAccountId: undefined,
      displayName: undefined,
      accountEmail: undefined,
      connectedAt: undefined,
      lastSyncedAt: undefined,
      lastSyncCursor: undefined,
      lastSyncError: undefined,
      oauthState: undefined,
      updatedAt: now(),
    });
  },
});

export const clearStripeConnectionData = internalMutation({
  args: {
    connectionId: v.id("paymentConnections"),
  },
  handler: async (ctx, args) => {
    await clearStripeImportedData(ctx, args.connectionId);
    return { cleared: true };
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
    const clients = await ctx.db
      .query("clients")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    const matchIndexes = buildStripeMatchIndexes({
      clients,
      projects: projects.map((project) => ({
        _id: project._id,
        clientName: project.clientName,
        clientEmail: project.clientEmail,
      })),
    });
    const matchedInvoiceClientNames = new Map<string, string>();
    const matchedInvoiceProjectIds = new Map<string, Id<"projects"> | undefined>();

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
      const matchedInvoice = resolveStripeCounterpartyMatch(
        invoice.clientName,
        invoice.clientEmail,
        matchIndexes,
      );
      matchedInvoiceClientNames.set(invoice.externalInvoiceId, matchedInvoice.clientName);
      matchedInvoiceProjectIds.set(invoice.externalInvoiceId, matchedInvoice.projectId);

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
        clientName: matchedInvoice.clientName,
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
        counterpartyName: matchedInvoice.clientName,
        amountCents: Math.round(invoice.totalAmount * 100),
        currency: invoice.currency,
        occurredAt: invoice.issuedAt,
        dueAt: invoice.dueAt,
        paidAt: invoice.paidAt,
        projectId: matchedInvoice.projectId,
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
      const matchedPayment =
        !payment.externalInvoiceId && payment.counterpartyName
          ? resolveStripeCounterpartyMatch(
              payment.counterpartyName,
              payment.counterpartyEmail,
              matchIndexes,
            )
          : undefined;
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
          (payment.externalInvoiceId
            ? matchedInvoiceClientNames.get(payment.externalInvoiceId)
            : undefined) ??
          matchedPayment?.clientName ??
          "Stripe customer",
        amountCents: Math.round(payment.amount * 100),
        currency: payment.currency,
        occurredAt: payment.receivedAt,
        dueAt: undefined,
        paidAt: payment.status === "succeeded" ? payment.receivedAt : undefined,
        projectId:
          payment.externalInvoiceId !== undefined
            ? matchedInvoiceProjectIds.get(payment.externalInvoiceId)
            : matchedPayment?.projectId,
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

export const disconnectStripe = action({
  args: {},
  handler: async (ctx) => {
    const viewer = (await ctx.runQuery(internal.onboarding.getViewerContext, {})) as ViewerContext;
    const connection = (await ctx.runQuery(internal.integrations.stripeConnect.getConnectionForViewer, {
      userId: viewer.userId,
    })) as StripeConnectionRecord | null;

    if (!connection) {
      return null;
    }

    if (connection.externalAccountId) {
      const response = await fetch("https://connect.stripe.com/oauth/deauthorize", {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${requireEnv("STRIPE_SECRET_KEY")}:`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: requireEnv("STRIPE_CONNECT_CLIENT_ID"),
          stripe_user_id: connection.externalAccountId,
        }),
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as
          | {
              error?: string;
              error_description?: string;
            }
          | null;
        throw new Error(
          errorPayload?.error_description ||
            `Stripe deauthorize failed with ${response.status}.`,
        );
      }
    }

    await ctx.runMutation(internal.integrations.stripeConnect.clearStripeConnectionData, {
      connectionId: connection._id,
    });
    await ctx.runMutation(internal.integrations.stripeConnect.markConnectionDisconnected, {
      connectionId: connection._id,
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

    await ctx.runMutation(internal.integrations.stripeConnect.upsertPendingConnection, {
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
    const connection = (await ctx.runQuery(internal.integrations.stripeConnect.getConnectionForViewer, {
      userId: viewer.userId,
    })) as StripeConnectionRecord | null;

    if (!connection?.externalAccountId) {
      throw new Error("No Stripe account is connected yet.");
    }

    const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
    const account: Stripe.Account = await stripe.accounts.retrieve(connection.externalAccountId);
    const displayName = getAccountDisplayName(account);
    const accountEmail = account.email ?? undefined;

    await ctx.runMutation(internal.integrations.stripeConnect.updateConnectionSnapshot, {
      connectionId: connection._id,
      status: getAccountConnectionStatus(account),
      displayName,
      accountEmail,
      lastSyncError: undefined,
    });

    return {
      status: getAccountConnectionStatus(account),
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
    const connection = (await ctx.runQuery(internal.integrations.stripeConnect.getConnectionForViewer, {
      userId: viewer.userId,
    })) as StripeConnectionRecord | null;

    if (!connection?.externalAccountId) {
      throw new Error("Connect a Stripe account before syncing.");
    }

    const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
    const account = await stripe.accounts.retrieve(connection.externalAccountId);
    const invoices = await stripe.invoices.list(
      { limit: 100 },
      { stripeAccount: connection.externalAccountId },
    );
    const charges = await stripe.charges.list(
      { limit: 100 },
      { stripeAccount: connection.externalAccountId },
    );

    const displayName = getAccountDisplayName(account);
    const accountEmail = account.email ?? undefined;

    const invoiceRows = invoices.data.map((invoice) => ({
      externalInvoiceId: invoice.id,
      number: invoice.number ?? undefined,
      clientName:
        invoice.customer_name ||
        invoice.customer_email ||
        invoice.account_name ||
        "Stripe customer",
      clientEmail: invoice.customer_email || undefined,
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
        counterpartyName: charge.billing_details?.name || undefined,
        counterpartyEmail:
          charge.billing_details?.email || charge.receipt_email || undefined,
        currency: charge.currency.toUpperCase(),
        amount: centsToAmount(charge.amount),
        status: mapPaymentStatus(charge.status, charge.paid),
        receivedAt: secondsToMilliseconds(charge.created) ?? now(),
      };
    });

    return ctx.runMutation(internal.integrations.stripeConnect.applyStripeSync, {
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
  const redirectUrl = new URL(`${requireSiteUrl()}/settings`);
  redirectUrl.searchParams.set("tab", "integrations");

  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    if (state) {
      await ctx.runMutation(internal.integrations.stripeConnect.markConnectionErrorByState, {
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

    await ctx.runMutation(internal.integrations.stripeConnect.completeConnectionByState, {
      oauthState: state,
      externalAccountId: payload.stripe_user_id,
      displayName: getAccountDisplayName(account),
      accountEmail: account.email ?? undefined,
      status: getAccountConnectionStatus(account),
    });

    redirectUrl.searchParams.set("stripe", "connected");
    return createRedirect(redirectUrl.toString());
  } catch (error) {
    await ctx.runMutation(internal.integrations.stripeConnect.markConnectionErrorByState, {
      oauthState: state,
      error: error instanceof Error ? error.message : "Stripe connect failed.",
    });
    redirectUrl.searchParams.set("stripe", "error");
    return createRedirect(redirectUrl.toString());
  }
});

export const connectWebhook = httpAction(async (ctx, request) => {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header.", { status: 400 });
  }

  const payload = await request.text();
  const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"));

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      requireEnv("STRIPE_CONNECT_WEBHOOK_SECRET"),
    );
  } catch (error) {
    return new Response(
      error instanceof Error ? error.message : "Invalid webhook signature.",
      { status: 400 },
    );
  }

  const accountId = getConnectWebhookAccountId(event);
  if (!accountId) {
    return new Response("No connected account id on event.", { status: 200 });
  }

  switch (event.type) {
    case "account.application.deauthorized": {
      const connection = (await ctx.runQuery(internal.integrations.stripeConnect.getConnectionByExternalAccountId, {
        externalAccountId: accountId,
      })) as StripeConnectionRecord | null;
      if (connection?._id) {
        await ctx.runMutation(internal.integrations.stripeConnect.clearStripeConnectionData, {
          connectionId: connection._id,
        });
        await ctx.runMutation(internal.integrations.stripeConnect.markConnectionDisconnected, {
          connectionId: connection._id,
        });
      }
      break;
    }

    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      await ctx.runMutation(internal.integrations.stripeConnect.updateConnectionSnapshotByExternalAccountId, {
        externalAccountId: accountId,
        status: getAccountConnectionStatus(account),
        displayName: getAccountDisplayName(account),
        accountEmail: account.email ?? undefined,
        lastSyncError: undefined,
      });
      break;
    }

    default:
      break;
  }

  return new Response("ok", { status: 200 });
});
