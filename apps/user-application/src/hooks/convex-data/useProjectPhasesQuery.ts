import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { phaseSummarySchema, type PhaseSummary } from "@stage/data-ops";
import { z } from "zod";
import { useDesktopAuth } from "@/lib/auth";
import { api } from "@/lib/convexApi";

const phaseListSchema = z.array(phaseSummarySchema);

export function useProjectPhasesQuery(projectId: string | undefined) {
  const { isAuthenticated, isLoading: isAuthLoading } = useDesktopAuth();
  const { data: phases, isPending } = useQuery(
    convexQuery(
      api.desktop.listProjectPhases,
      isAuthenticated && projectId ? { projectId } : "skip",
    ),
  );
  const data = useMemo<PhaseSummary[] | undefined>(
    () => phases === undefined ? undefined : phaseListSchema.parse(phases),
    [phases],
  );

  return {
    data,
    isLoading: isAuthLoading || (isAuthenticated && Boolean(projectId) && isPending),
    error: null,
  };
}