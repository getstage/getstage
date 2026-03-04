import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// Versioning approach:
// - Keep table names stable.
// - Prefer additive changes with optional fields.
// - Keep SaaS billing separate from user payment data.
// - Treat derived analytics as queries, not stored tables.

const userRole = v.union(
  v.literal("freelancer"),
  v.literal("studio"),
  v.literal("in-house"),
  v.literal("agency"),
);

const plan = v.union(v.literal("free"), v.literal("pro"));

const billingProvider = v.union(
  v.literal("stripe"),
  v.literal("polar"),
  v.literal("creem"),
  v.literal("unknown"),
);

const paymentProvider = v.union(v.literal("stripe"), v.literal("unknown"));

const paymentAccessMode = v.union(
  v.literal("restricted_key"),
  v.literal("connect"),
);

const paymentConnectionStatus = v.union(
  v.literal("pending"),
  v.literal("active"),
  v.literal("error"),
  v.literal("disconnected"),
);

const projectType = v.union(
  v.literal("branding"),
  v.literal("web-design"),
  v.literal("product-design"),
  v.literal("app-design"),
  v.literal("packaging"),
  v.literal("motion-design"),
  v.literal("illustration"),
  v.literal("other"),
);

const projectStatus = v.union(
  v.literal("active"),
  v.literal("paused"),
  v.literal("completed"),
);

const phaseStatus = v.union(
  v.literal("completed"),
  v.literal("active"),
  v.literal("upcoming"),
);

const attachmentType = v.union(
  v.literal("image"),
  v.literal("pdf"),
  v.literal("document"),
  v.literal("other"),
);

const subscriptionStatus = v.union(
  v.literal("active"),
  v.literal("cancelling"),
  v.literal("expired"),
);

const invoiceStatus = v.union(
  v.literal("draft"),
  v.literal("open"),
  v.literal("paid"),
  v.literal("overdue"),
  v.literal("void"),
);

const paymentStatus = v.union(
  v.literal("pending"),
  v.literal("succeeded"),
  v.literal("failed"),
);

export default defineSchema({
  ...authTables,

  // Override the auth users table with our custom fields merged in.
  // Auth fields (name, image, email, emailVerificationTime, phone, phoneVerificationTime, isAnonymous)
  // are included via authTables spread, but we redefine users to add our custom fields.
  users: defineTable({
    // Convex Auth standard fields
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    // Stage custom fields
    avatarUrl: v.optional(v.string()),
    defaultPortalLogoUrl: v.optional(v.string()),
    defaultPortalAccentColor: v.optional(v.string()),
    role: v.optional(userRole),
    plan: v.optional(plan),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"]),

  clients: defineTable({
    userId: v.id("users"),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_name", ["userId", "name"]),

  projects: defineTable({
    userId: v.id("users"),
    name: v.string(),
    clientName: v.string(),
    clientAvatarUrl: v.optional(v.string()),
    type: projectType,
    status: projectStatus,
    startDate: v.number(),
    endDate: v.number(),
    progress: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"]),

  phases: defineTable({
    projectId: v.id("projects"),
    name: v.string(),
    order: v.number(),
    status: phaseStatus,
    progress: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_order", ["projectId", "order"]),

  tasks: defineTable({
    phaseId: v.id("phases"),
    title: v.string(),
    isCompleted: v.boolean(),
    content: v.optional(v.string()),
    order: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_phase", ["phaseId"])
    .index("by_phase_order", ["phaseId", "order"]),

  attachments: defineTable({
    taskId: v.id("tasks"),
    storageId: v.optional(v.id("_storage")),
    type: attachmentType,
    url: v.string(),
    fileName: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
    createdAt: v.number(),
  }).index("by_task", ["taskId"]),

  portalConfigs: defineTable({
    projectId: v.id("projects"),
    isEnabled: v.boolean(),
    shareToken: v.string(),
    shareUrl: v.string(),
    logoUrl: v.optional(v.string()),
    accentColor: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_share_token", ["shareToken"]),

  subscriptions: defineTable({
    userId: v.id("users"),
    provider: billingProvider,
    plan,
    status: subscriptionStatus,
    billingCycle: v.literal("yearly"),
    currentPeriodEnd: v.number(),
    paymentMethodBrand: v.optional(v.string()),
    paymentMethodLast4: v.optional(v.string()),
    externalCustomerId: v.optional(v.string()),
    externalSubscriptionId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  paymentConnections: defineTable({
    userId: v.id("users"),
    provider: paymentProvider,
    accessMode: paymentAccessMode,
    status: paymentConnectionStatus,
    externalAccountId: v.optional(v.string()),
    credentialLabel: v.optional(v.string()),
    credentialLast4: v.optional(v.string()),
    lastSyncedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_provider", ["userId", "provider"]),

  invoices: defineTable({
    userId: v.id("users"),
    paymentConnectionId: v.id("paymentConnections"),
    externalInvoiceId: v.string(),
    number: v.optional(v.string()),
    clientName: v.string(),
    status: invoiceStatus,
    currency: v.string(),
    totalAmount: v.number(),
    amountDue: v.number(),
    issuedAt: v.number(),
    dueAt: v.optional(v.number()),
    paidAt: v.optional(v.number()),
    hostedInvoiceUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_connection", ["paymentConnectionId"])
    .index("by_connection_external", ["paymentConnectionId", "externalInvoiceId"]),

  payments: defineTable({
    userId: v.id("users"),
    paymentConnectionId: v.id("paymentConnections"),
    invoiceId: v.optional(v.id("invoices")),
    externalPaymentId: v.string(),
    currency: v.string(),
    amount: v.number(),
    status: paymentStatus,
    receivedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_invoice", ["invoiceId"])
    .index("by_connection", ["paymentConnectionId"])
    .index("by_connection_external", ["paymentConnectionId", "externalPaymentId"]),
});
