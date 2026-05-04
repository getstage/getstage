import { projectSchema } from "../models/project";
import type { Project } from "../models/project";

const now = Date.now();
const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 24 * ONE_HOUR;

export const mockProject = projectSchema.parse({
  id: "test",
  name: "Project Name",
  clientName: "Example",
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
          assignees: [{ name: "Pratik" }],
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
          assignees: [{ name: "Stage" }],
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
          assignees: [{ name: "Pratik" }],
        },
      ],
    },
  ],
  research: {
    clientWebsite: "https://example.com",
    competitors: ["reddit.com"],
    references: ["https://reference.com"],
    brief: "Test branding project for agent endpoint testing",
    notes: "Testing Claude Code integration",
  },
  moodboard: {
    references: [
      { id: "ref-1", title: "Homepage Wireframe", source: "Uploaded", date: "6th April, 2025" },
      { id: "ref-2", title: "Homepage Wireframe", source: "Figma", date: "6th April, 2025" },
      { id: "ref-3", title: "Homepage Wireframe", source: "Uploaded", date: "6th April, 2025" },
    ],
  },
  flows: [
    { id: "flow-1", title: "Homepage to enquiry", description: "Primary visitor flow from hero CTA into project request.", status: "Draft" },
    { id: "flow-2", title: "Client approval", description: "Review flow for collecting feedback and approvals.", status: "Ready" },
    { id: "flow-3", title: "Asset handoff", description: "Export and delivery path for approved brand assets.", status: "Planned" },
  ],
  assets: [
    { id: "asset-1", title: "Logo mark", type: "Brand" },
    { id: "asset-2", title: "Primary palette", type: "Color" },
    { id: "asset-3", title: "Hero reference", type: "Image" },
  ],
});

export const mockProjects: Project[] = [mockProject];
