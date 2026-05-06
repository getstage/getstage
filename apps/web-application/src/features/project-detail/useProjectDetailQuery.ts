import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery as useConvexQuery } from "convex/react";
import { api } from "@/lib/convex";
import type { Phase } from "@/types";
import type { Id } from "../../../convex/_generated/dataModel";

export function useProjectDetailQuery(projectId: Id<"projects">) {
  const [activePhaseId, setActivePhaseId] = useState<string | null>(null);
  const previousSelectedPhaseStatusRef = useRef<Phase["status"] | null>(null);
  const project = useConvexQuery(api.projects.getById, { projectId });
  const isLoading = project === undefined;

  useEffect(() => {
    if (!project || !activePhaseId) {
      previousSelectedPhaseStatusRef.current = null;
      return;
    }

    const selectedPhase = project.phases.find((phase: Phase) => phase.id === activePhaseId) ?? null;
    const currentActivePhase = project.phases.find((phase: Phase) => phase.status === "active") ?? null;

    if (
      previousSelectedPhaseStatusRef.current === "active" &&
      selectedPhase?.status === "completed" &&
      currentActivePhase &&
      currentActivePhase.id !== activePhaseId
    ) {
      previousSelectedPhaseStatusRef.current = currentActivePhase.status;
      setActivePhaseId(currentActivePhase.id);
      return;
    }

    previousSelectedPhaseStatusRef.current = selectedPhase?.status ?? null;
  }, [activePhaseId, project]);

  const currentPhase = useMemo(() => {
    if (!project) {
      return null;
    }

    return (
      project.phases.find((phase: Phase) => phase.id === activePhaseId) ??
      project.phases.find((phase: Phase) => phase.status === "active") ??
      project.phases[0] ??
      null
    );
  }, [activePhaseId, project]);

  return {
    project,
    isLoading,
    currentPhase,
    setActivePhaseId,
  };
}
