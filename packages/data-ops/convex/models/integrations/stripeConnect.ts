import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";

export type ViewerContext = {
  userId: Id<"users">;
  userIdString: string;
  email: string;
  name: string;
};

export type StripeConnectionRecord = {
  _id: Id<"paymentConnections">;
  externalAccountId?: string;
};

export type StripeMatchIndexes = {
  clientNamesByEmail: Map<string, string[]>;
  projectsByClientEmail: Map<
    string,
    Array<{ _id: Id<"projects">; clientName: string }>
  >;
};

export const invoiceSyncValidator = v.object({
  externalInvoiceId: v.string(),
  number: v.optional(v.string()),
  clientName: v.string(),
  clientEmail: v.optional(v.string()),
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

export const paymentSyncValidator = v.object({
  externalPaymentId: v.string(),
  externalInvoiceId: v.optional(v.string()),
  counterpartyName: v.optional(v.string()),
  counterpartyEmail: v.optional(v.string()),
  currency: v.string(),
  amount: v.number(),
  status: v.union(
    v.literal("pending"),
    v.literal("succeeded"),
    v.literal("failed"),
  ),
  receivedAt: v.number(),
});
