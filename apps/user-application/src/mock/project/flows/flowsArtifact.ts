import { flowsArtifactSchema, type FlowsArtifact } from "@stage/data-ops/contracts";
import { buildFlowSteps, MOCK_FLOWS_GENERATED_AT, MOCK_FLOWS_PROJECT_ID } from "./constants";

export { MOCK_FLOWS_PROJECT_ID } from "./constants";

const CANONICAL_FLOWS = [
  {
    id: "mock-flow-1",
    title: "Evaluator Requests a Demo",
    description: "Move from landing page interest to a scheduled sales conversation.",
    status: "Approved" as const,
    screenCount: 5,
    category: "Conversion",
    stepLabels: [
      "Homepage -> Review value proposition",
      "Homepage -> Open demo request",
      "Demo form -> Add company details",
      "Calendar -> Select available time",
      "Confirmation -> Review next steps",
    ],
  },
  {
    id: "mock-flow-2",
    title: "Buyer Compares Features",
    description: "Help a qualified visitor understand fit before contacting sales.",
    status: "Approved" as const,
    screenCount: 4,
    category: "Evaluation",
    stepLabels: [
      "Homepage -> Open features",
      "Features -> Compare use cases",
      "Security -> Validate requirements",
      "CTA panel -> Request technical walkthrough",
    ],
  },
  {
    id: "mock-flow-3",
    title: "Client Reviews Project Progress",
    description: "Give the client a clear path to review work and approve milestones.",
    status: "Draft" as const,
    screenCount: 4,
    category: "Client portal",
    stepLabels: [
      "Client portal -> View status",
      "Milestone detail -> Review deliverables",
      "Feedback modal -> Leave comments",
      "Approval screen -> Confirm milestone",
    ],
  },
  {
    id: "mock-flow-4",
    title: "User Downloads Final Assets",
    description: "Package final deliverables with usage guidance and version clarity.",
    status: "Approved" as const,
    screenCount: 3,
    category: "Handoff",
    stepLabels: [
      "Assets tab -> Select package",
      "Handoff detail -> Review usage notes",
      "Download modal -> Export files",
    ],
  },
] as const;

const CANONICAL_SCREENS = [
  {
    id: "mock-screen-1",
    title: "Homepage",
    description: "Primary entry screen that frames the offer and routes visitors to conversion paths.",
    flowCount: 2,
    keyElements: [
      "Navigation with primary CTA",
      "Hero value proposition",
      "Proof points and customer logos",
      "Feature summary cards",
      "Demo request CTA",
    ],
  },
  {
    id: "mock-screen-2",
    title: "Demo Request",
    description: "Lead capture screen that qualifies buyers and sets expectations.",
    flowCount: 1,
    keyElements: [
      "Company email field",
      "Role and company size selectors",
      "Project goal textarea",
      "Calendar handoff",
      "Privacy reassurance copy",
    ],
  },
  {
    id: "mock-screen-3",
    title: "Features",
    description: "Evaluation screen for comparing product capabilities and use cases.",
    flowCount: 1,
    keyElements: [
      "Use-case tabs",
      "Capability comparison rows",
      "Security callout",
      "Integration list",
      "Technical walkthrough CTA",
    ],
  },
  {
    id: "mock-screen-4",
    title: "Client Portal",
    description: "Workspace for progress review, milestone feedback, and approvals.",
    flowCount: 1,
    keyElements: [
      "Project status summary",
      "Milestone timeline",
      "Deliverable preview cards",
      "Comment composer",
      "Approval action",
    ],
  },
  {
    id: "mock-screen-5",
    title: "Asset Handoff",
    description: "Final delivery screen with files, usage rules, and version history.",
    flowCount: 1,
    keyElements: [
      "Download package CTA",
      "File type badges",
      "Usage guideline snippets",
      "Version history",
      "Approval timestamp",
    ],
  },
] as const;

function buildFlowsArtifact(projectId: string, generatedAt: number): FlowsArtifact {
  return {
    apiVersion: "v1",
    artifactKind: "flowsArtifact",
    projectId,
    title: "Project Flows",
    flows: CANONICAL_FLOWS.map((flow) => ({
      id: flow.id,
      title: flow.title,
      description: flow.description,
      status: flow.status,
      screenCount: flow.screenCount,
      category: flow.category,
      steps: buildFlowSteps(flow.stepLabels),
    })),
    screens: CANONICAL_SCREENS.map((screen) => ({
      id: screen.id,
      title: screen.title,
      description: screen.description,
      flowCount: screen.flowCount,
      keyElements: [...screen.keyElements],
    })),
    generatedAt,
  };
}

export const mockFlowsArtifact = flowsArtifactSchema.parse(
  buildFlowsArtifact(MOCK_FLOWS_PROJECT_ID, MOCK_FLOWS_GENERATED_AT),
);

export function createMockFlowsArtifact(projectId: string): FlowsArtifact {
  return flowsArtifactSchema.parse(buildFlowsArtifact(projectId, MOCK_FLOWS_GENERATED_AT));
}

export { CANONICAL_FLOWS, CANONICAL_SCREENS };
