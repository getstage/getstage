import { summarizeProjectContext } from "@stage/data-ops";
import {
  buildProjectContextFromConvexSelection,
  type DesktopConvexProjectSelection,
} from "../convexProjectContext";

const now = Date.now();
const ONE_HOUR = 60 * 60 * 1000;

const selectedProjectSelection: DesktopConvexProjectSelection = {
  id: "baseframe",
  name: "BaseFrame",
  clientName: "Visa",
  brief:
    "Create a focused dashboard direction for a finance workflow that feels clear, premium, and calm under pressure.",
  strategy:
    "Prioritize trust, rapid scanning, and confident next actions for teams reviewing payment and project progress.",
  visualDirection:
    "Airy spacing, restrained contrast, soft neutral surfaces, and a single confident primary action color.",
  phases: [
    {
      id: "brief",
      name: "Brief",
      status: "active",
      tasks: [
        {
          id: "brief-1",
          title: "Write creative brief",
          isCompleted: false,
          content: "Clarify audience, constraints, success criteria, and the first critique lens.",
          updatedAt: now - 2 * ONE_HOUR,
        },
        {
          id: "brief-2",
          title: "Collect visual references",
          isCompleted: false,
          content: "Gather approved spacing, typography, and palette references.",
          updatedAt: now - 5 * ONE_HOUR,
        },
      ],
    },
    {
      id: "discovery",
      name: "Discovery",
      status: "upcoming",
      tasks: [
        {
          id: "discovery-1",
          title: "Define success criteria",
          isCompleted: false,
          content: "Translate project goals into critique checks for hierarchy and action clarity.",
          updatedAt: now - 8 * ONE_HOUR,
        },
      ],
    },
  ],
  assets: [
    {
      id: "palette-primary",
      name: "Approved primary palette",
      kind: "document",
      summary: "Primary action color #8782F5 with neutral supporting surfaces.",
    },
  ],
  updatedAt: now,
};

export const selectedProjectContext =
  buildProjectContextFromConvexSelection(selectedProjectSelection);

export const selectedProjectContextSummary =
  summarizeProjectContext(selectedProjectContext);
