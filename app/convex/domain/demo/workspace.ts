import { v } from "convex/values";
import { internalMutation, mutation } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { ensurePortalConfig, upsertClient } from "../../_helpers";
import { deleteWorkspaceDataForUser } from "../accountCleanup";

function now() {
  return Date.now();
}

function days(value: number) {
  return value * 24 * 60 * 60 * 1000;
}

type DemoPhase = {
  name: string;
  status: "completed" | "active" | "upcoming";
  progress: number;
  tasks: Array<{
    title: string;
    isCompleted: boolean;
  }>;
};

type DemoProject = {
  name: string;
  clientName: string;
  type:
    | "branding"
    | "web-design"
    | "product-design"
    | "app-design"
    | "packaging"
    | "motion-design"
    | "illustration"
    | "other";
  status: "active" | "paused" | "completed";
  startOffsetDays: number;
  endOffsetDays: number;
  progress: number;
  phases: DemoPhase[];
};

const DEMO_PROJECTS: DemoProject[] = [
  {
    name: "Website Redesign",
    clientName: "Acme Studio",
    type: "web-design",
    status: "active",
    startOffsetDays: -35,
    endOffsetDays: 18,
    progress: 62,
    phases: [
      {
        name: "Strategy",
        status: "completed",
        progress: 100,
        tasks: [
          { title: "Define project goals", isCompleted: true },
          { title: "Stakeholder interviews", isCompleted: true },
          { title: "Success metrics", isCompleted: true },
        ],
      },
      {
        name: "Design",
        status: "active",
        progress: 68,
        tasks: [
          { title: "Wireframes approved", isCompleted: true },
          { title: "Homepage high fidelity", isCompleted: true },
          { title: "Inner pages design", isCompleted: false },
          { title: "Responsive adaptations", isCompleted: false },
        ],
      },
      {
        name: "Launch",
        status: "upcoming",
        progress: 0,
        tasks: [
          { title: "Client review", isCompleted: false },
          { title: "Go live", isCompleted: false },
        ],
      },
    ],
  },
  {
    name: "Brand Identity",
    clientName: "Meridian Labs",
    type: "branding",
    status: "active",
    startOffsetDays: -16,
    endOffsetDays: 24,
    progress: 41,
    phases: [
      {
        name: "Discovery",
        status: "completed",
        progress: 100,
        tasks: [
          { title: "Brand audit", isCompleted: true },
          { title: "Competitor analysis", isCompleted: true },
        ],
      },
      {
        name: "Strategy",
        status: "active",
        progress: 55,
        tasks: [
          { title: "Positioning draft", isCompleted: true },
          { title: "Tone of voice guide", isCompleted: false },
          { title: "Messaging review", isCompleted: false },
        ],
      },
      {
        name: "Visual system",
        status: "upcoming",
        progress: 0,
        tasks: [
          { title: "Logo concepts", isCompleted: false },
          { title: "Color palette", isCompleted: false },
        ],
      },
    ],
  },
  {
    name: "Mobile App UI",
    clientName: "Flowstate",
    type: "app-design",
    status: "active",
    startOffsetDays: -9,
    endOffsetDays: 33,
    progress: 18,
    phases: [
      {
        name: "Research",
        status: "active",
        progress: 50,
        tasks: [
          { title: "User flow mapping", isCompleted: true },
          { title: "Competitive audit", isCompleted: false },
        ],
      },
      {
        name: "Wireframes",
        status: "upcoming",
        progress: 0,
        tasks: [
          { title: "Core screens", isCompleted: false },
          { title: "Navigation prototype", isCompleted: false },
        ],
      },
    ],
  },
];

async function seedProject(
  ctx: MutationCtx,
  userId: Id<"users">,
  timestamp: number,
  project: DemoProject,
) {
  await upsertClient(ctx, {
    userId,
    name: project.clientName,
  });

  const projectId = await ctx.db.insert("projects", {
    userId,
    name: project.name,
    clientName: project.clientName,
    clientAvatarUrl: undefined,
    type: project.type,
    status: project.status,
    startDate: timestamp + days(project.startOffsetDays),
    endDate: timestamp + days(project.endOffsetDays),
    progress: project.progress,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  for (const [phaseIndex, phase] of project.phases.entries()) {
    const phaseId = await ctx.db.insert("phases", {
      projectId,
      name: phase.name,
      order: phaseIndex,
      status: phase.status,
      progress: phase.progress,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    for (const [taskIndex, task] of phase.tasks.entries()) {
      await ctx.db.insert("tasks", {
        phaseId,
        title: task.title,
        isCompleted: task.isCompleted,
        content: "",
        order: taskIndex,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
  }

  await ensurePortalConfig(ctx, projectId);
}

async function seedWorkspaceForUser(
  ctx: MutationCtx,
  userId: Id<"users">,
  args: {
    currency: string;
    timestamp: number;
    name?: string;
    email?: string;
  },
) {
  const patch: Record<string, string | number> = {
    role: "freelancer",
    plan: "pro",
    workCategory: "web-design",
    onboardingProjectCreatedAt: args.timestamp,
    onboardingCompletedAt: args.timestamp,
    onboardingPaywallSeenAt: args.timestamp,
    updatedAt: args.timestamp,
  };

  if (args.name) {
    patch.name = args.name.trim();
  }

  if (args.email) {
    patch.email = args.email.trim().toLowerCase();
  }

  await ctx.db.patch(userId, patch);

  for (const project of DEMO_PROJECTS) {
    await seedProject(ctx, userId, args.timestamp, project);
  }

  const financeEntries = [
    {
      sourceRecordId: "demo_invoice_acme",
      entryType: "invoice" as const,
      status: "pending" as const,
      counterpartyName: "Acme Studio",
      amountCents: 240000,
      occurredAt: args.timestamp - days(12),
      dueAt: args.timestamp + days(2),
      paidAt: undefined,
    },
    {
      sourceRecordId: "demo_payment_meridian",
      entryType: "payment" as const,
      status: "paid" as const,
      counterpartyName: "Meridian Labs",
      amountCents: 180000,
      occurredAt: args.timestamp - days(6),
      dueAt: undefined,
      paidAt: args.timestamp - days(6),
    },
    {
      sourceRecordId: "demo_payment_flowstate",
      entryType: "payment" as const,
      status: "paid" as const,
      counterpartyName: "Flowstate",
      amountCents: 95000,
      occurredAt: args.timestamp - days(3),
      dueAt: undefined,
      paidAt: args.timestamp - days(3),
    },
  ];

  for (const entry of financeEntries) {
    await ctx.db.insert("financeEntries", {
      userId,
      source: "csv_upload",
      paymentConnectionId: undefined,
      sheetConnectionId: undefined,
      sourceRecordId: entry.sourceRecordId,
      entryType: entry.entryType,
      direction: "incoming",
      status: entry.status,
      counterpartyName: entry.counterpartyName,
      amountCents: entry.amountCents,
      currency: args.currency,
      occurredAt: entry.occurredAt,
      dueAt: entry.dueAt,
      paidAt: entry.paidAt,
      projectId: undefined,
      notes: "Demo data",
      rawLabel: entry.counterpartyName,
      createdAt: args.timestamp,
      updatedAt: args.timestamp,
    });
  }

  return {
    seeded: true,
    userId,
    projectsCreated: DEMO_PROJECTS.length,
    financeEntriesCreated: financeEntries.length,
    currency: args.currency,
  };
}

export const resetAndSeedDemoWorkspace = internalMutation({
  args: {
    userId: v.id("users"),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    currency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currency = (args.currency ?? "USD").trim().toUpperCase();
    const timestamp = now();

    await deleteWorkspaceDataForUser(ctx, args.userId);

    return seedWorkspaceForUser(ctx, args.userId, {
      currency,
      timestamp,
      email: args.email,
      name: args.name,
    });
  },
});

export const seedDemoWorkspace = mutation({
  args: {
    email: v.string(),
    currency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.trim().toLowerCase();
    const currency = (args.currency ?? "USD").trim().toUpperCase();

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", normalizedEmail))
      .unique();

    if (!user) {
      throw new Error(
        "User not found. Sign in once first with the demo email so Convex Auth creates the account.",
      );
    }

    const [existingProjects, existingFinanceEntries, existingConnections, existingSheetConnections] =
      await Promise.all([
        ctx.db.query("projects").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
        ctx.db
          .query("financeEntries")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect(),
        ctx.db
          .query("paymentConnections")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect(),
        ctx.db
          .query("sheetConnections")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect(),
      ]);

    if (
      existingProjects.length > 0 ||
      existingFinanceEntries.length > 0 ||
      existingConnections.length > 0 ||
      existingSheetConnections.length > 0
    ) {
      throw new Error(
        "This demo seed only runs on a fresh account. Use a new email or clear the existing workspace first.",
      );
    }

    const timestamp = now();
    const result = await seedWorkspaceForUser(ctx, user._id, {
      currency,
      timestamp,
      email: normalizedEmail,
      name: user.name ?? "Stage Demo",
    });

    return {
      ...result,
      email: normalizedEmail,
    };
  },
});
