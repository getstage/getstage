import { projectSchema } from "@/models/project/project";
import type { Project } from "@/models/project/project";
import type { ProjectDetail, ProjectSummary } from "@stage/data-ops";

const now = Date.now();
const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 24 * ONE_HOUR;

export const mockProject = projectSchema.parse({
  id: "mock-stellar-site",
  name: "Stellar Labs Website",
  clientName: "Stellar Labs",
  status: "active",
  phases: [
    {
      id: "research",
      name: "Research",
      status: "active",
      tasks: [
        {
          id: "task-1",
          title: "Complete kickoff questionnaire",
          content: "Here comes the project/task description, can contain 2-3 lines at max.",
          status: "backlog",
          isCompleted: true,
          updatedAt: now - 23 * ONE_HOUR,
          assignees: [{ name: "Stage" }],
        },
        {
          id: "task-2",
          title: "Complete kickoff questionnaire",
          content: "Here comes the project/task description, can contain 2-3 lines at max.",
          status: "in-progress",
          isCompleted: false,
          updatedAt: now - 23 * ONE_HOUR,
        },
        {
          id: "task-3",
          title: "Complete kickoff questionnaire",
          content: "Here comes the project/task description, can contain 2-3 lines at max.",
          status: "done",
          isCompleted: false,
          updatedAt: now - 23 * ONE_HOUR,
        },
        {
          id: "task-4",
          title: "Collect visual references",
          content: "Here comes the project/task description, can contain 2-3 lines at max.",
          status: "backlog",
          isCompleted: false,
          updatedAt: now - 23 * ONE_HOUR,
          assignees: [{ name: "Pratik Singh" }],
        },
      ],
    },
    {
      id: "strategy",
      name: "Strategy",
      status: "active",
      tasks: [
        {
          id: "task-5",
          title: "Complete kickoff questionnaire",
          content: "Here comes the project/task description, can contain 2-3 lines at max.",
          status: "todo",
          isCompleted: false,
          updatedAt: now - 23 * ONE_HOUR,
          assignees: [{ name: "Stage" }],
        },
        {
          id: "task-6",
          title: "Define success criteria",
          content: "Here comes the project/task description, can contain 2-3 lines at max.",
          status: "done",
          isCompleted: false,
          updatedAt: now - 23 * ONE_HOUR,
        },
      ],
    },
    {
      id: "identity",
      name: "Identity",
      status: "active",
      tasks: [
        {
          id: "task-7",
          title: "Complete kickoff questionnaire",
          content: "Here comes the project/task description, can contain 2-3 lines at max.",
          status: "backlog",
          isCompleted: false,
          updatedAt: now - 2 * ONE_DAY,
        },
        {
          id: "task-8",
          title: "Complete kickoff questionnaire",
          content: "Here comes the project/task description, can contain 2-3 lines at max.",
          status: "in-progress",
          isCompleted: false,
          updatedAt: now - 2 * ONE_DAY,
        },
      ],
    },
    {
      id: "guidelines",
      name: "Guidelines",
      status: "upcoming",
      tasks: [
        {
          id: "task-9",
          title: "Complete kickoff questionnaire",
          content: "Here comes the project/task description, can contain 2-3 lines at max.",
          status: "backlog",
          isCompleted: false,
          updatedAt: now - 3 * ONE_DAY,
          assignees: [{ name: "Sage" }],
        },
        {
          id: "task-10",
          title: "Complete kickoff questionnaire",
          content: "Here comes the project/task description, can contain 2-3 lines at max.",
          status: "todo",
          isCompleted: false,
          updatedAt: now - 3 * ONE_DAY,
        },
        {
          id: "task-11",
          title: "Write creative brief",
          content: "Here comes the project/task description, can contain 2-3 lines at max.",
          status: "in-progress",
          isCompleted: false,
          updatedAt: now - 23 * ONE_HOUR,
          assignees: [{ name: "Pratik Singh" }],
        },
      ],
    },
  ],
  research: {
    clientWebsite: "https://stellarlabs.example",
    competitors: ["linear.app", "vercel.com", "stripe.com", "attio.com"],
    references: [
      "https://mobbin.com/browse/web/apps/linear",
      "https://www.figma.com/community/file/1307143255737860810",
      "https://land-book.com",
    ],
    brief:
      "Design a conversion-focused marketing site for a developer tools startup launching an AI observability product.",
    notes:
      "Client wants a polished technical feel, compact proof points, clear security messaging, and a demo request path that works for enterprise buyers.",
  },
  moodboard: {
    references: [
      { id: "ref-1", title: "Homepage Wireframe", source: "Uploaded", date: "6th April, 2025" },
      { id: "ref-2", title: "Homepage Wireframe", source: "Figma", date: "6th April, 2025" },
      { id: "ref-3", title: "Homepage Wireframe", source: "Uploaded", date: "6th April, 2025" },
    ],
  },
  flows: [
    {
      id: "flow-1",
      title: "Evaluator Researches Acme",
      description: "Submit a demo request within 3 clicks",
      status: "Approved",
      screenCount: 5,
      category: "Onboarding",
      steps: [
        "Landing page → Click “Request Demo”",
        "Form screen → Fill details",
        "Confirmation → Schedule slot",
        "Confirmation → Select services",
        "Confirmation → Review details",
        "Confirmation → Complete payment",
      ],
    },
    {
      id: "flow-2",
      title: "Design Review for Beta Version",
      description: "Gather user feedback by next week",
      status: "Approved",
      screenCount: 2,
    },
    {
      id: "flow-3",
      title: "Usability Testing for New Features",
      description: "Conduct sessions with 15 users",
      status: "Approved",
      screenCount: 3,
    },
    {
      id: "flow-4",
      title: "Competitor Analysis Report",
      description: "Review findings and adjust strategy",
      status: "Approved",
      screenCount: 1,
    },
    {
      id: "flow-5",
      title: "User Interface Updates",
      description: "Complete before the next release",
      status: "Approved",
      screenCount: 1,
    },
    {
      id: "flow-6",
      title: "Accessibility Improvements",
      description: "Implement changes by the end of the month",
      status: "Approved",
      screenCount: 1,
    },
  ],
  screens: [
    {
      id: "screen-1",
      title: "Homepage",
      description: "Primary Landing - communicates value, drives demo conversion.",
      flowCount: 3,
      keyElements: [
        "Sticky header with Primary CTA",
        "Dropdown menu with secondary options",
        "Search bar with filter capabilities",
        "Interactive table with sorting features",
        "Pagination controls for large datasets",
        "Contextual help tooltip for user guidance",
        "Responsive design for mobile compatibility",
        "User avatar with dropdown profile settings",
      ],
    },
    {
      id: "screen-2",
      title: "Demo Request",
      description: "Lead capture form with qualification details and routing.",
      flowCount: 2,
      keyElements: [
        "Multi-step form with progress indicator",
        "Company size and role selectors",
        "Calendar handoff CTA",
        "Validation messages for required fields",
        "Privacy note below submit action",
        "Success state after submission",
      ],
    },
    {
      id: "screen-3",
      title: "Confirmation",
      description: "Post-submit screen that guides scheduling and next actions.",
      flowCount: 3,
      keyElements: [
        "Meeting summary with selected services",
        "Schedule slot selector",
        "Review details accordion",
        "Payment method confirmation",
        "Primary complete payment CTA",
        "Support contact footer",
      ],
    },
    {
      id: "screen-4",
      title: "Client Portal",
      description: "Shared workspace for approvals, feedback, and handoff.",
      flowCount: 2,
      keyElements: [
        "Project status overview",
        "Approval activity timeline",
        "Feedback composer",
        "Asset preview grid",
        "Download selected assets action",
        "Client notification settings",
      ],
    },
    {
      id: "screen-5",
      title: "Research Library",
      description: "Collected references and insights used during strategy.",
      flowCount: 1,
      keyElements: [
        "Reference cards with source metadata",
        "Competitor filter controls",
        "Pinned insights panel",
        "Evidence tags",
        "Export summary action",
      ],
    },
    {
      id: "screen-6",
      title: "Asset Handoff",
      description: "Delivery page for final files, usage notes, and versions.",
      flowCount: 2,
      keyElements: [
        "Versioned deliverables list",
        "File type badges",
        "Usage guideline snippets",
        "Download package CTA",
        "Approval timestamp",
      ],
    },
  ],
  assets: [
    { id: "asset-1", title: "Homepage Wireframe", type: "Wireframe" },
    { id: "asset-2", title: "Demo Request Wireframe", type: "Wireframe" },
    { id: "asset-3", title: "Confirmation Wireframe", type: "Wireframe" },
    { id: "asset-4", title: "Client Portal Wireframe", type: "Wireframe" },
    { id: "asset-5", title: "Research Library Wireframe", type: "Wireframe" },
    { id: "asset-6", title: "Asset Handoff Wireframe", type: "Wireframe" },
  ],
});

export const mockProjectTwo = projectSchema.parse({
  ...mockProject,
  id: "mock-nova-mobile",
  name: "Nova Banking App",
  clientName: "Nova Credit Union",
  status: "paused",
  research: {
    clientWebsite: "https://novacu.example",
    competitors: ["chime.com", "monzo.com", "revolut.com"],
    references: ["https://mobbin.com", "https://www.apple.com/apple-card"],
    brief: "Create product flows and mobile wireframes for a savings-first banking app.",
    notes: "Prioritize trust, plain-language financial decisions, and fast onboarding recovery states.",
  },
  flows: [
    {
      id: "flow-mobile-1",
      title: "New Member Opens Account",
      description: "Finish onboarding and fund the first savings goal",
      status: "Draft",
      screenCount: 6,
      category: "Mobile onboarding",
      steps: [
        "Welcome → Verify phone",
        "Identity check → Confirm details",
        "Choose savings goal",
        "Connect external account",
        "Review disclosures",
        "Fund account",
      ],
    },
    {
      id: "flow-mobile-2",
      title: "Member Reviews Spending",
      description: "Find monthly trends and move money into savings",
      status: "Approved",
      screenCount: 4,
    },
  ],
  screens: [
    {
      id: "screen-mobile-1",
      title: "Welcome",
      description: "Mobile entry screen with trust cues and account creation CTA.",
      flowCount: 1,
      keyElements: ["Logo lockup", "Primary signup CTA", "Sign-in link", "Security note"],
    },
    {
      id: "screen-mobile-2",
      title: "Identity Check",
      description: "KYC step with document capture and confidence messaging.",
      flowCount: 1,
      keyElements: ["Document scanner", "Progress indicator", "Privacy message", "Error recovery"],
    },
    {
      id: "screen-mobile-3",
      title: "Savings Goal",
      description: "Goal setup interface with amount, timeline, and recommended deposits.",
      flowCount: 2,
      keyElements: ["Goal templates", "Amount input", "Timeline slider", "Recommended weekly transfer"],
    },
  ],
  assets: [
    { id: "asset-mobile-1", title: "Welcome Wireframe", type: "Wireframe" },
    { id: "asset-mobile-2", title: "Identity Check Wireframe", type: "Wireframe" },
    { id: "asset-mobile-3", title: "Savings Goal Wireframe", type: "Wireframe" },
  ],
});

export const mockProjectThree = projectSchema.parse({
  ...mockProject,
  id: "mock-harbor-brand",
  name: "Harbor Coffee Rebrand",
  clientName: "Harbor Coffee Co.",
  status: "completed",
  research: {
    clientWebsite: "https://harborcoffee.example",
    competitors: ["bluebottlecoffee.com", "stumptowncoffee.com", "counterculturecoffee.com"],
    references: ["https://packagingoftheworld.com", "https://the-brandidentity.com"],
    brief: "Refresh the cafe brand system and prepare handoff assets for packaging and web.",
    notes: "Keep the brand warm but not rustic; focus on clarity, origin stories, and retail shelf impact.",
  },
  assets: [
    { id: "asset-brand-1", title: "Logo Exploration", type: "Brand" },
    { id: "asset-brand-2", title: "Menu Board Wireframe", type: "Wireframe" },
    { id: "asset-brand-3", title: "Packaging Label", type: "Print" },
    { id: "asset-brand-4", title: "Color System", type: "Brand" },
  ],
});

export const mockProjects: Project[] = [mockProject, mockProjectTwo, mockProjectThree];

export const mockProjectSummaries: ProjectSummary[] = mockProjects.map((project, index) => {
  const totalTasks = project.phases.reduce((sum, phase) => sum + phase.tasks.length, 0);
  const completedTasks = project.phases.reduce(
    (sum, phase) => sum + phase.tasks.filter((task) => task.isCompleted || task.status === "done").length,
    0,
  );
  return {
    id: project.id,
    name: project.name,
    clientName: project.clientName,
    type: index === 1 ? "app-design" : index === 2 ? "branding" : "web-design",
    status: project.status,
    startDate: now - (14 + index * 11) * ONE_DAY,
    endDate: now + (28 - index * 8) * ONE_DAY,
    progress: totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100),
  };
});

export const mockProjectDetails: ProjectDetail[] = mockProjectSummaries.map((summary) => {
  const project = mockProjects.find((candidate) => candidate.id === summary.id)!;
  const taskCount = project.phases.reduce((sum, phase) => sum + phase.tasks.length, 0);
  const completedTaskCount = project.phases.reduce(
    (sum, phase) => sum + phase.tasks.filter((task) => task.isCompleted || task.status === "done").length,
    0,
  );
  return {
    ...summary,
    accessRole: "owner",
    phaseCount: project.phases.length,
    taskCount,
    completedTaskCount,
    createdAt: summary.startDate,
    updatedAt: now - 2 * ONE_HOUR,
  };
});

export function findMockProject(projectId: string | undefined) {
  return mockProjects.find((project) => project.id === projectId) ?? null;
}

export function findMockProjectDetail(projectId: string | undefined) {
  return mockProjectDetails.find((project) => project.id === projectId) ?? null;
}
