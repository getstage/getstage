import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import type { ProviderId } from "@stage/data-ops/contracts";
import type { Id } from "@stage/data-ops/convex/data-model";
import { useDesktopAuth } from "@/lib/auth";
import { api } from "@/lib/convexApi";
import {
  useResearchProviderSelection,
  type ResearchProviderOption,
} from "./research/useResearchProviderSelection";

function pickSelectableProvider(
  providerId: ProviderId | null | undefined,
  providerOptions: ResearchProviderOption[],
): ProviderId | null {
  if (!providerId) {
    return null;
  }

  const option = providerOptions.find((entry) => entry.id === providerId);
  return option?.selectable ? providerId : null;
}

export function useProjectAiProvider(projectId: string | undefined) {
  const { isAuthenticated } = useDesktopAuth();
  const { data: context } = useQuery(
    convexQuery(
      api.projectAi.getContext,
      isAuthenticated && projectId ? { projectId: projectId as Id<"projects"> } : "skip",
    ),
  );
  const { selectedProviderId, selectProvider, providerOptions } = useResearchProviderSelection();

  // Prefer the UI selection. Project `lastProviderId` is only a fallback when
  // nothing is selected yet — never an override of a visible choice.
  const resolvedProviderId = useMemo(() => {
    const fromSelection = pickSelectableProvider(selectedProviderId, providerOptions);
    if (fromSelection) {
      return fromSelection;
    }

    return pickSelectableProvider(context?.lastProviderId ?? null, providerOptions);
  }, [context?.lastProviderId, providerOptions, selectedProviderId]);

  return {
    resolvedProviderId,
    providerOptions,
    selectedProviderId,
    selectProvider,
  };
}
