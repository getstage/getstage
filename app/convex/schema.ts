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

const sheetSourceType = v.union(
  v.literal("google_sheet"),
  v.literal("csv_upload"),
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

const generatedDesignProvider = v.literal("stitch");

const designConnectionStatus = v.union(
  v.literal("active"),
  v.literal("error"),
  v.literal("archived"),
);

const generatedDesignSource = v.union(
  v.literal("stage_proxy"),
  v.literal("user_sync"),
);

const generatedDesignStatus = v.union(
  v.literal("ready"),
  v.literal("error"),
);

const stitchDeviceType = v.union(
  v.literal("DEVICE_TYPE_UNSPECIFIED"),
  v.literal("MOBILE"),
  v.literal("DESKTOP"),
  v.literal("TABLET"),
  v.literal("AGNOSTIC"),
);

const stitchModelId = v.union(
  v.literal("MODEL_ID_UNSPECIFIED"),
  v.literal("GEMINI_3_PRO"),
  v.literal("GEMINI_3_FLASH"),
);

const uploadPurpose = v.union(
  v.literal("task-attachment"),
  v.literal("csv-upload"),
  v.literal("profile-avatar"),
  v.literal("client-avatar"),
  v.literal("project-marker"),
  v.literal("portal-logo"),
  v.literal("generated-design"),
);

const subscriptionStatus = v.union(
  v.literal("active"),
  v.literal("trialing"),
  v.literal("cancelling"),
  v.literal("past_due"),
  v.literal("unpaid"),
  v.literal("incomplete"),
  v.literal("canceled"),
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

const importRunStatus = v.union(
  v.literal("running"),
  v.literal("success"),
  v.literal("error"),
);

const financeSource = v.union(
  v.literal("stripe_connect"),
  v.literal("google_sheet"),
  v.literal("csv_upload"),
);

const financeEntryType = v.union(
  v.literal("invoice"),
  v.literal("payment"),
  v.literal("expense"),
  v.literal("refund"),
  v.literal("adjustment"),
);

const financeDirection = v.union(
  v.literal("incoming"),
  v.literal("outgoing"),
);

const financeStatus = v.union(
  v.literal("draft"),
  v.literal("pending"),
  v.literal("paid"),
  v.literal("overdue"),
  v.literal("failed"),
);

const agentProvider = v.literal("claude");

const agentClient = v.literal("claude_code");

const agentConnectionMode = v.literal("skill");

const agentConnectionStatus = v.union(
  v.literal("pending"),
  v.literal("connected"),
  v.literal("error"),
  v.literal("disconnected"),
);

const agentConnectionSource = v.union(
  v.literal("onboarding"),
  v.literal("settings"),
);

const claudeToolAvailability = v.union(
  v.literal("unknown"),
  v.literal("claimed"),
);

const aiProvider = v.literal("anthropic");

const aiProviderCredentialLabel = v.literal("claude");

const aiProviderCredentialStatus = v.union(
  v.literal("untested"),
  v.literal("valid"),
  v.literal("invalid"),
);

const aiRunModule = v.union(
  v.literal("research"),
  v.literal("strategy"),
  v.literal("generate"),
  v.literal("delivery"),
);

const aiRunStatus = v.union(
  v.literal("draft"),
  v.literal("running"),
  v.literal("completed"),
  v.literal("failed"),
  v.literal("needs_input"),
);

const aiRunTrigger = v.union(
  v.literal("user"),
  v.literal("agent"),
);

const aiArtifactStatus = v.union(
  v.literal("draft"),
  v.literal("ready"),
  v.literal("approved"),
  v.literal("superseded"),
  v.literal("failed"),
);

const aiArtifactContentFormat = v.union(
  v.literal("markdown"),
  v.literal("json"),
  v.literal("link_set"),
);

const artifactDestinationProvider = v.union(
  v.literal("notion"),
  v.literal("figma"),
);

const artifactDestinationStatus = v.union(
  v.literal("requested"),
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("failed"),
);

const artifactDestinationRequestedVia = v.union(
  v.literal("claude"),
  v.literal("native"),
);

const nativeIntegrationProvider = v.union(
  v.literal("notion"),
  v.literal("figma"),
);

const nativeIntegrationStatus = v.union(
  v.literal("pending"),
  v.literal("active"),
  v.literal("error"),
  v.literal("disconnected"),
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
    workCategory: v.optional(projectType),
    onboardingCompletedAt: v.optional(v.number()),
    onboardingProjectCreatedAt: v.optional(v.number()),
    onboardingPaywallSeenAt: v.optional(v.number()),
    firstPaymentEmailSentAt: v.optional(v.number()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"]),

  clients: defineTable({
    userId: v.id("users"),
    name: v.string(),
    email: v.optional(v.string()),
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
    clientEmail: v.optional(v.string()),
    clientAvatarUrl: v.optional(v.string()),
    startMarkerImageUrl: v.optional(v.string()),
    endMarkerImageUrl: v.optional(v.string()),
    projectImageUrl: v.optional(v.string()),
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
    dueDate: v.optional(v.number()),
    assigneeIds: v.optional(v.array(v.string())),
    order: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_phase", ["phaseId"])
    .index("by_phase_order", ["phaseId", "order"]),

  attachments: defineTable({
    taskId: v.id("tasks"),
    storageId: v.optional(v.id("_storage")),
    r2ObjectKey: v.optional(v.string()),
    type: attachmentType,
    url: v.string(),
    fileName: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
    createdAt: v.number(),
  }).index("by_task", ["taskId"]),

  projectDesignConnections: defineTable({
    projectId: v.id("projects"),
    provider: generatedDesignProvider,
    externalProjectId: v.optional(v.string()),
    externalProjectUrl: v.string(),
    title: v.optional(v.string()),
    status: designConnectionStatus,
    lastSyncedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_provider", ["projectId", "provider"]),

  projectGeneratedDesigns: defineTable({
    userId: v.id("users"),
    projectId: v.id("projects"),
    phaseId: v.optional(v.id("phases")),
    provider: generatedDesignProvider,
    source: generatedDesignSource,
    title: v.optional(v.string()),
    prompt: v.optional(v.string()),
    deviceType: v.optional(stitchDeviceType),
    modelId: v.optional(stitchModelId),
    stitchProjectId: v.optional(v.string()),
    stitchScreenId: v.optional(v.string()),
    stitchScreenUrl: v.optional(v.string()),
    r2ObjectKey: v.string(),
    sortOrder: v.optional(v.number()),
    status: generatedDesignStatus,
    errorMessage: v.optional(v.string()),
    lastSyncedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_createdAt", ["projectId", "createdAt"])
    .index("by_user", ["userId"])
    .index("by_project_screen", ["projectId", "stitchScreenId"]),

  projectCollaborators: defineTable({
    projectId: v.id("projects"),
    userId: v.id("users"),
    role: v.literal("editor"),
    addedBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_user", ["userId"])
    .index("by_project_user", ["projectId", "userId"]),

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
    billingCycle: v.union(v.literal("monthly"), v.literal("yearly")),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    paymentMethodBrand: v.optional(v.string()),
    paymentMethodLast4: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    stripePriceId: v.optional(v.string()),
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
    displayName: v.optional(v.string()),
    accountEmail: v.optional(v.string()),
    connectedAt: v.optional(v.number()),
    lastSyncedAt: v.optional(v.number()),
    lastSyncCursor: v.optional(v.string()),
    lastSyncError: v.optional(v.string()),
    oauthState: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_provider", ["userId", "provider"])
    .index("by_oauth_state", ["oauthState"]),

  agentConnections: defineTable({
    userId: v.id("users"),
    provider: agentProvider,
    client: agentClient,
    mode: agentConnectionMode,
    status: agentConnectionStatus,
    displayName: v.optional(v.string()),
    apiKeyId: v.optional(v.id("apiKeys")),
    source: agentConnectionSource,
    stageApiVerified: v.boolean(),
    notionInClaude: claudeToolAvailability,
    figmaInClaude: claudeToolAvailability,
    connectedAt: v.optional(v.number()),
    lastSeenAt: v.optional(v.number()),
    lastHandshakeAt: v.optional(v.number()),
    lastError: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_provider_client", ["userId", "provider", "client"]),

  nativeIntegrationConnections: defineTable({
    userId: v.id("users"),
    provider: nativeIntegrationProvider,
    status: nativeIntegrationStatus,
    displayName: v.optional(v.string()),
    workspaceId: v.optional(v.string()),
    workspaceName: v.optional(v.string()),
    workspaceIcon: v.optional(v.string()),
    accountId: v.optional(v.string()),
    accountEmail: v.optional(v.string()),
    accountName: v.optional(v.string()),
    accountAvatarUrl: v.optional(v.string()),
    encryptedTokenPayload: v.optional(v.string()),
    encryptionIv: v.optional(v.string()),
    accessTokenExpiresAt: v.optional(v.number()),
    scopes: v.optional(v.array(v.string())),
    oauthState: v.optional(v.string()),
    pkceVerifier: v.optional(v.string()),
    connectedAt: v.optional(v.number()),
    lastSyncedAt: v.optional(v.number()),
    lastError: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_provider", ["userId", "provider"])
    .index("by_oauth_state", ["oauthState"]),

  aiProviderCredentials: defineTable({
    userId: v.id("users"),
    provider: aiProvider,
    label: aiProviderCredentialLabel,
    encryptedApiKey: v.string(),
    encryptionIv: v.string(),
    keyLast4: v.string(),
    modelPreference: v.optional(v.string()),
    status: aiProviderCredentialStatus,
    testedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_provider", ["userId", "provider"]),

  projectAiContexts: defineTable({
    userId: v.id("users"),
    projectId: v.id("projects"),
    clientWebsite: v.optional(v.string()),
    competitorUrls: v.array(v.string()),
    referenceUrls: v.array(v.string()),
    brief: v.optional(v.string()),
    briefAttachmentName: v.optional(v.string()),
    briefAttachmentR2ObjectKey: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_project", ["projectId"])
    .index("by_user_project", ["userId", "projectId"]),

  projectAiRuns: defineTable({
    userId: v.id("users"),
    projectId: v.id("projects"),
    connectionId: v.optional(v.id("agentConnections")),
    module: aiRunModule,
    title: v.string(),
    status: aiRunStatus,
    trigger: aiRunTrigger,
    externalRunId: v.optional(v.string()),
    inputSummary: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_module", ["projectId", "module"])
    .index("by_project_startedAt", ["projectId", "startedAt"])
    .index("by_user", ["userId"]),

  projectAiArtifacts: defineTable({
    userId: v.id("users"),
    projectId: v.id("projects"),
    runId: v.optional(v.id("projectAiRuns")),
    module: aiRunModule,
    kind: v.string(),
    title: v.string(),
    summary: v.optional(v.string()),
    status: aiArtifactStatus,
    contentFormat: aiArtifactContentFormat,
    contentMarkdown: v.optional(v.string()),
    contentJson: v.optional(v.string()),
    externalUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    approvedAt: v.optional(v.number()),
  })
    .index("by_project", ["projectId"])
    .index("by_project_module", ["projectId", "module"])
    .index("by_run", ["runId"])
    .index("by_user", ["userId"]),

  artifactDestinations: defineTable({
    userId: v.id("users"),
    artifactId: v.id("projectAiArtifacts"),
    projectId: v.id("projects"),
    provider: artifactDestinationProvider,
    action: v.string(),
    status: artifactDestinationStatus,
    destinationLabel: v.optional(v.string()),
    destinationUrl: v.optional(v.string()),
    requestedVia: artifactDestinationRequestedVia,
    errorMessage: v.optional(v.string()),
    lastSyncedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_artifact", ["artifactId"])
    .index("by_user", ["userId"])
    .index("by_user_provider", ["userId", "provider"])
    .index("by_project", ["projectId"])
    .index("by_project_provider", ["projectId", "provider"]),

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

  sheetConnections: defineTable({
    userId: v.id("users"),
    sourceType: sheetSourceType,
    status: paymentConnectionStatus,
    sheetId: v.optional(v.string()),
    sheetUrl: v.optional(v.string()),
    sheetTitle: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    r2ObjectKey: v.optional(v.string()),
    fileName: v.optional(v.string()),
    templateVersion: v.optional(v.string()),
    lastImportedAt: v.optional(v.number()),
    lastImportStatus: v.optional(importRunStatus),
    lastImportError: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
  .index("by_user", ["userId"])
  .index("by_user_source_type", ["userId", "sourceType"])
  .index("by_sheet_id", ["sheetId"]),

  sheetImportRuns: defineTable({
    userId: v.id("users"),
    sheetConnectionId: v.id("sheetConnections"),
    status: importRunStatus,
    startedAt: v.number(),
    finishedAt: v.optional(v.number()),
    importedCount: v.number(),
    updatedCount: v.number(),
    skippedCount: v.number(),
    errorSummary: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_connection", ["sheetConnectionId"]),

  financeEntries: defineTable({
    userId: v.id("users"),
    source: financeSource,
    paymentConnectionId: v.optional(v.id("paymentConnections")),
    sheetConnectionId: v.optional(v.id("sheetConnections")),
    sourceRecordId: v.string(),
    entryType: financeEntryType,
    direction: financeDirection,
    status: financeStatus,
    counterpartyName: v.string(),
    amountCents: v.number(),
    currency: v.string(),
    occurredAt: v.number(),
    dueAt: v.optional(v.number()),
    paidAt: v.optional(v.number()),
    projectId: v.optional(v.id("projects")),
    notes: v.optional(v.string()),
    rawLabel: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_source_record", ["userId", "source", "sourceRecordId"])
    .index("by_payment_connection", ["paymentConnectionId"])
    .index("by_sheet_connection", ["sheetConnectionId"]),

  apiKeys: defineTable({
    userId: v.id("users"),
    hashedKey: v.string(),
    name: v.string(),
    createdAt: v.number(),
    lastUsedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
  })
    .index("by_hashed_key", ["hashedKey"])
    .index("by_user", ["userId"]),

  uploadedAssets: defineTable({
    userId: v.id("users"),
    key: v.string(),
    purpose: uploadPurpose,
    fileName: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
    createdAt: v.number(),
    // Legacy fields kept optional so older rows don't block deploys.
    status: v.optional(v.string()),
    source: v.optional(v.string()),
    entityType: v.optional(v.string()),
    entityId: v.optional(v.string()),
    attachedAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_key", ["key"])
    .index("by_createdAt", ["createdAt"])
    .index("by_user_createdAt", ["userId", "createdAt"]),
});
