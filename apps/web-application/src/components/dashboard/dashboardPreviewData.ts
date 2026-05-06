import type {
  DashboardPaymentSummary,
  DashboardTaskEntry,
} from "@/components/dashboard/dashboardTypes";
import type { Phase, Project, Task } from "@/types";

const PREVIEW_USER_NAME = "Sam";
export const DASHBOARD_PREVIEW_NOW = new Date(2026, 1, 20, 14, 0, 0, 0).getTime();

function createTask(
  id: string,
  phaseId: string,
  title: string,
  isCompleted: boolean,
  createdAt: number,
  updatedAt: number,
  order: number,
): Task {
  return {
    id,
    phaseId,
    title,
    isCompleted,
    content: "",
    attachments: [],
    order,
    createdAt,
    updatedAt,
  };
}

function createPhase(
  id: string,
  projectId: string,
  name: string,
  status: Phase["status"],
  order: number,
  progress: number,
  tasks: Task[],
): Phase {
  return {
    id,
    projectId,
    name,
    order,
    status,
    tasks,
    progress,
  };
}

function createProject(input: {
  id: string;
  name: string;
  clientName: string;
  clientAvatarUrl: string;
  startDate: number;
  endDate: number;
  status: Project["status"];
  progress: number;
  phases: Phase[];
}): Project {
  return {
    id: input.id,
    userId: "preview-user",
    name: input.name,
    clientName: input.clientName,
    clientAvatarUrl: input.clientAvatarUrl,
    type: "web-design",
    status: input.status,
    startDate: input.startDate,
    endDate: input.endDate,
    phases: input.phases,
    progress: input.progress,
    createdAt: input.startDate,
    shareToken: "preview-share-token",
    shareUrl: "https://example.com/preview",
    portalEnabled: true,
  };
}

function buildEntry(project: Project, phaseName: string, taskTitle: string): DashboardTaskEntry {
  const phase = project.phases.find((candidate) => candidate.name === phaseName);
  if (!phase) {
    throw new Error(`Missing phase "${phaseName}" for project "${project.name}".`);
  }

  const task = phase.tasks.find((candidate) => candidate.title === taskTitle);
  if (!task) {
    throw new Error(`Missing task "${taskTitle}" for project "${project.name}".`);
  }

  return { project, phase, task };
}

const packagingProjectId = "preview-project-packaging";
const websiteProjectId = "preview-project-website";
const brandProjectId = "preview-project-brand";
const appProjectId = "preview-project-app";
const socialProjectId = "preview-project-social";

const packagingCompletedPhaseId = "preview-phase-packaging-completed";
const websiteDesignPhaseId = "preview-phase-website-design";
const brandDiscoveryPhaseId = "preview-phase-brand-discovery";
const appKickoffPhaseId = "preview-phase-app-kickoff";
const socialDesignPhaseId = "preview-phase-social-design";

const packagingProject = createProject({
  id: packagingProjectId,
  name: "Packaging Design",
  clientName: "Bloom Botanics",
  clientAvatarUrl: "https://randomuser.me/api/portraits/women/44.jpg",
  startDate: new Date(2026, 0, 5).getTime(),
  endDate: new Date(2026, 1, 15).getTime(),
  status: "completed",
  progress: 100,
  phases: [
    createPhase(
      packagingCompletedPhaseId,
      packagingProjectId,
      "Completed",
      "completed",
      0,
      100,
      [
        createTask(
          "preview-task-packaging-1",
          packagingCompletedPhaseId,
          "Concept exploration",
          true,
          new Date(2026, 0, 7).getTime(),
          new Date(2026, 0, 12).getTime(),
          0,
        ),
        createTask(
          "preview-task-packaging-2",
          packagingCompletedPhaseId,
          "Final layout approved",
          true,
          new Date(2026, 0, 20).getTime(),
          new Date(2026, 1, 1).getTime(),
          1,
        ),
        createTask(
          "preview-task-packaging-3",
          packagingCompletedPhaseId,
          "Print files delivered",
          true,
          new Date(2026, 1, 10).getTime(),
          new Date(2026, 1, 15).getTime(),
          2,
        ),
      ],
    ),
  ],
});

const websiteProject = createProject({
  id: websiteProjectId,
  name: "Website Redesign",
  clientName: "Acme Studio",
  clientAvatarUrl: "https://randomuser.me/api/portraits/men/32.jpg",
  startDate: new Date(2026, 0, 12).getTime(),
  endDate: new Date(2026, 2, 10).getTime(),
  status: "active",
  progress: 48,
  phases: [
    createPhase(
      websiteDesignPhaseId,
      websiteProjectId,
      "Design",
      "active",
      0,
      48,
      [
        createTask(
          "preview-task-website-1",
          websiteDesignPhaseId,
          "Moodboard approved",
          true,
          new Date(2026, 0, 14).getTime(),
          new Date(2026, 0, 17).getTime(),
          0,
        ),
        createTask(
          "preview-task-website-2",
          websiteDesignPhaseId,
          "Wireframes v2 delivered",
          true,
          new Date(2026, 0, 28).getTime(),
          new Date(2026, 1, 18).getTime(),
          1,
        ),
        createTask(
          "preview-task-website-3",
          websiteDesignPhaseId,
          "Homepage high-fidelity mockup",
          false,
          new Date(2026, 1, 19).getTime(),
          new Date(2026, 1, 19).getTime(),
          2,
        ),
        createTask(
          "preview-task-website-4",
          websiteDesignPhaseId,
          "Inner page layouts",
          false,
          new Date(2026, 1, 20).getTime(),
          new Date(2026, 1, 20).getTime(),
          3,
        ),
      ],
    ),
  ],
});

const brandProject = createProject({
  id: brandProjectId,
  name: "Brand Identity",
  clientName: "Nomad Co",
  clientAvatarUrl: "https://randomuser.me/api/portraits/women/68.jpg",
  startDate: new Date(2026, 1, 2).getTime(),
  endDate: new Date(2026, 2, 20).getTime(),
  status: "active",
  progress: 28,
  phases: [
    createPhase(
      brandDiscoveryPhaseId,
      brandProjectId,
      "Discovery",
      "active",
      0,
      28,
      [
        createTask(
          "preview-task-brand-1",
          brandDiscoveryPhaseId,
          "Brand audit complete",
          true,
          new Date(2026, 1, 3).getTime(),
          new Date(2026, 1, 9).getTime(),
          0,
        ),
        createTask(
          "preview-task-brand-2",
          brandDiscoveryPhaseId,
          "Competitor analysis report",
          false,
          new Date(2026, 1, 19).getTime(),
          new Date(2026, 1, 19).getTime(),
          1,
        ),
        createTask(
          "preview-task-brand-3",
          brandDiscoveryPhaseId,
          "Mood direction options",
          false,
          new Date(2026, 1, 21).getTime(),
          new Date(2026, 1, 21).getTime(),
          2,
        ),
        createTask(
          "preview-task-brand-4",
          brandDiscoveryPhaseId,
          "Client workshop",
          false,
          new Date(2026, 1, 18).getTime(),
          new Date(2026, 1, 18).getTime(),
          3,
        ),
      ],
    ),
  ],
});

const appProject = createProject({
  id: appProjectId,
  name: "App Design",
  clientName: "Pulse Labs",
  clientAvatarUrl: "https://randomuser.me/api/portraits/men/75.jpg",
  startDate: new Date(2026, 1, 10).getTime(),
  endDate: new Date(2026, 1, 28).getTime(),
  status: "active",
  progress: 18,
  phases: [
    createPhase(
      appKickoffPhaseId,
      appProjectId,
      "Kickoff",
      "active",
      0,
      18,
      [
        createTask(
          "preview-task-app-1",
          appKickoffPhaseId,
          "Kickoff meeting",
          true,
          new Date(2026, 1, 11).getTime(),
          new Date(2026, 1, 16).getTime(),
          0,
        ),
        createTask(
          "preview-task-app-2",
          appKickoffPhaseId,
          "User research plan",
          false,
          new Date(2026, 1, 18).getTime(),
          new Date(2026, 1, 18).getTime(),
          1,
        ),
        createTask(
          "preview-task-app-3",
          appKickoffPhaseId,
          "Define feature scope",
          false,
          new Date(2026, 1, 22).getTime(),
          new Date(2026, 1, 22).getTime(),
          2,
        ),
      ],
    ),
  ],
});

const socialProject = createProject({
  id: socialProjectId,
  name: "Social Campaign",
  clientName: "Vibe Co",
  clientAvatarUrl: "https://randomuser.me/api/portraits/women/22.jpg",
  startDate: new Date(2026, 2, 5).getTime(),
  endDate: new Date(2026, 3, 6).getTime(),
  status: "active",
  progress: 22,
  phases: [
    createPhase(
      socialDesignPhaseId,
      socialProjectId,
      "Design",
      "active",
      0,
      22,
      [
        createTask(
          "preview-task-social-1",
          socialDesignPhaseId,
          "Campaign brief",
          true,
          new Date(2026, 2, 6).getTime(),
          new Date(2026, 2, 7).getTime(),
          0,
        ),
        createTask(
          "preview-task-social-2",
          socialDesignPhaseId,
          "Visual concepts",
          false,
          new Date(2026, 2, 8).getTime(),
          new Date(2026, 2, 8).getTime(),
          1,
        ),
        createTask(
          "preview-task-social-3",
          socialDesignPhaseId,
          "Content calendar",
          false,
          new Date(2026, 2, 10).getTime(),
          new Date(2026, 2, 10).getTime(),
          2,
        ),
      ],
    ),
  ],
});

const previewProjects = [
  packagingProject,
  websiteProject,
  brandProject,
  appProject,
  socialProject,
];

const previewUpcomingTasks: DashboardTaskEntry[] = [
  buildEntry(websiteProject, "Design", "Homepage high-fidelity mockup"),
  buildEntry(brandProject, "Discovery", "Competitor analysis report"),
  buildEntry(appProject, "Kickoff", "User research plan"),
];

const previewRecentActivity: DashboardTaskEntry[] = [
  buildEntry(websiteProject, "Design", "Wireframes v2 delivered"),
  buildEntry(brandProject, "Discovery", "Client workshop"),
  buildEntry(appProject, "Kickoff", "Kickoff meeting"),
];

const previewPaymentSummary: DashboardPaymentSummary = {
  rows: [
    {
      name: "Acme Studio",
      avatarUrl: "https://randomuser.me/api/portraits/men/32.jpg",
      amount: 4500,
      status: "paid",
    },
    {
      name: "Nomad Co",
      avatarUrl: "https://randomuser.me/api/portraits/women/68.jpg",
      amount: 3200,
      status: "paid",
    },
    {
      name: "Pulse Labs",
      avatarUrl: "https://randomuser.me/api/portraits/men/75.jpg",
      amount: 6200,
      status: "pending",
    },
  ],
  outstandingTotal: 6200,
  receivedTotal: 12400,
  pendingTotal: 6200,
};

export const dashboardPreviewData = {
  greetingName: PREVIEW_USER_NAME,
  defaultHorizon: "thisMonth" as const,
  nowTimestamp: DASHBOARD_PREVIEW_NOW,
  stats: {
    activeProjects: 9,
    tasksDue: 14,
    completed: 12,
    avgProgress: 38,
  },
  projects: previewProjects,
  upcomingTasks: previewUpcomingTasks,
  recentActivity: previewRecentActivity,
  paymentSummary: previewPaymentSummary,
};
