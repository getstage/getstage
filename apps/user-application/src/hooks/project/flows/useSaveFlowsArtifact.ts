import { useCallback } from "react";
import { useMutation } from "convex/react";
import { flowsArtifactSchema, type FlowStatus, type FlowsArtifact } from "@stage/data-ops/contracts";
import type { Id } from "@stage/data-ops/convex/data-model";
import { api } from "@/lib/convexApi";
import type { ProjectFlow, ProjectScreen } from "@/models/project/project";
import type { FlowsArtifactRecord } from "./useFlowsArtifact";

function normalizeStatus(status: string): FlowStatus {
  if (status === "Approved" || status === "In Review" || status === "Draft") {
    return status;
  }
  return "Draft";
}

function buildFlowsArtifact(
  record: FlowsArtifactRecord,
  flows: ProjectFlow[],
  screens: ProjectScreen[],
): FlowsArtifact {
  const current = record.artifact;
  return flowsArtifactSchema.parse({
    ...current,
    flows: flows.map((flow, flowIndex) => ({
      id: flow.id,
      title: flow.title,
      description: flow.description,
      status: normalizeStatus(flow.status),
      category: flow.category ?? "Project flow",
      screenCount: flow.screenCount ?? Math.max((flow.steps ?? []).length - 1, 1),
      steps: (flow.steps ?? []).map((step, stepIndex) => ({
        id: `${flow.id}-step-${stepIndex + 1}`,
        order: stepIndex,
        label: step,
      })),
    })),
    screens: screens.map((screen) => ({
      id: screen.id,
      title: screen.title,
      description: screen.description,
      flowCount: screen.flowCount,
      keyElements: screen.keyElements,
    })),
    updatedAt: Date.now(),
    generatedAt: current.generatedAt || Date.now(),
    title: current.title || "Project Flows",
  });
}

export function useSaveFlowsArtifact(projectId: string) {
  const updateFlowsArtifact = useMutation(api.projectAi.updateFlowsArtifact);

  const saveFlowsArtifact = useCallback(
    async (record: FlowsArtifactRecord, flows: ProjectFlow[], screens: ProjectScreen[]) => {
      const artifact = buildFlowsArtifact(record, flows, screens);
      await updateFlowsArtifact({
        projectId: projectId as Id<"projects">,
        artifactId: record.id as Id<"projectAiArtifacts">,
        contentJson: JSON.stringify(artifact),
        summary: `${artifact.flows.length} flows · ${artifact.screens.length} screens`,
      });
      return artifact;
    },
    [projectId, updateFlowsArtifact],
  );

  return {
    saveFlowsArtifact,
  };
}
