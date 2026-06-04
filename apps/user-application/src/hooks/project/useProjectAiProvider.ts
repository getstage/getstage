import { useMemo } from "react";
import { useQuery } from "convex/react";
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
  const context = useQuery(
    api.projectAi.getContext,
    isAuthenticated && projectId ? { projectId: projectId as Id<"projects"> } : "skip",
  );
  const { selectedProviderId, selectProvider, providerOptions } = useResearchProviderSelection();

  const resolvedProviderId = useMemo(() => {
    const fromContext = pickSelectableProvider(context?.lastProviderId ?? null, providerOptions);
    if (fromContext) {
      return fromContext;
    }

    const fromSelection = pickSelectableProvider(selectedProviderId, providerOptions);
    if (fromSelection) {
      return fromSelection;
    }

    return providerOptions.find((option) => option.selectable)?.id ?? null;
  }, [context?.lastProviderId, providerOptions, selectedProviderId]);

  return {
    resolvedProviderId,
    providerOptions,
    selectedProviderId,
    selectProvider,
  };
}
