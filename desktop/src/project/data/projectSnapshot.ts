import { projectSchema } from "../models/project";
import type { Project } from "../models/project";

const now = Date.now();
const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 24 * ONE_HOUR;

export const mockProject = projectSchema.parse({
  id: "test",
  name: "Test project",
  clientName: "Test Project",
  status: "active",
  phases: [
    {
      id: "discovery",
      name: "Discovery",
      status: "completed",
      tasks: [
        {
          id: "task-1",
          title: "[Agent test] Test task",
          content: "Here comes the project/task description, can contain 2-3 lines at max.",
          isCompleted: true,
          updatedAt: now - 17 * ONE_DAY,
          assignees: [{ name: "Stage" }],
        },
      ],
    },
    {
      id: "research",
      name: "Research",
      status: "active",
      tasks: [
        {
          id: "task-2",
          title: "Research competitors",
          content: "Analyze competitor positioning and feature sets.",
          isCompleted: false,
          updatedAt: now - 2 * ONE_DAY,
          assignees: [{ name: "Pratik" }],
        },
        {
          id: "task-3",
          title: "Client interview",
          content: "Schedule and conduct initial discovery call.",
          isCompleted: false,
          updatedAt: now - 3 * ONE_DAY,
          assignees: [{ name: "Pratik" }],
        },
      ],
    },
    {
      id: "strategy",
      name: "Strategy",
      status: "upcoming",
      tasks: [
        {
          id: "task-4",
          title: "Define success criteria",
          isCompleted: false,
          updatedAt: now - 5 * ONE_DAY,
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
