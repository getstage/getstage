import { useMemo, useState } from "react";
import { useQuery as useConvexQuery } from "convex/react";
import { api } from "@/lib/convex";
import type { Phase } from "@/types";
import type { Id } from "../../../convex/_generated/dataModel";

export function useProjectDetailQuery(projectId: Id<"projects">) {
  const [activePhaseId, setActivePhaseId] = useState<string | null>(null);
  const project = useConvexQuery(api.projects.getById, { projectId });
  const isLoading = project === undefined;

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
