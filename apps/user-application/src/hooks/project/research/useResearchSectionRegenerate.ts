import { useCallback } from "react";
import type { ProviderId, ResearchArtifactSection } from "@stage/data-ops/contracts";
import { useProviderRun } from "@/hooks/engine/useProviderRun";
import { useProviderPreferences } from "@/hooks/engine/useProviderPreferences";
import { useProviderStatus } from "@/hooks/engine/useProviderStatus";
import { useChatDefaults } from "@/hooks/engine/useChatDefaults";
import { buildRunModelOptions } from "@/lib/engine/runModelOptions";
import {
  assertProviderPreflightReady,
  getProviderPreflightError,
} from "@/lib/engine/providerPreflight";
import { resolveRunModelId } from "@/lib/engine/resolveRunModelId";
import { useProviderRequired } from "@/components/app/ProviderRequiredDialog";

export function useResearchSectionRegenerate(projectId: string) {
  const providerRun = useProviderRun({ projectId, mode: "research-section" });
  const providerPreferences = useProviderPreferences();
  const providers = useProviderStatus();
  const providerRequired = useProviderRequired();
  const chatDefaults = useChatDefaults();

  return useCallback(
    async (section: ResearchArtifactSection, providerId: ProviderId) => {
      const preflightArgs = {
        providerId,
        snapshot: providers.snapshot,
        isEnabled: providerPreferences.isProviderEnabled(providerId),
        context: "run" as const,
      };
      const blockedMessage = getProviderPreflightError(preflightArgs);
      if (blockedMessage) providerRequired.show(blockedMessage);
      assertProviderPreflightReady(preflightArgs);

      await providerRun.startRun.mutateAsync({
        providerId,
        modelId: resolveRunModelId(providerId, chatDefaults.defaults.modelId),
        prompt: `Regenerate research section: ${section}`,
        mode: "research",
        context: {
          projectId,
          source: `section:${section}`,
        },
        attachments: [],
        modelOptions: buildRunModelOptions(chatDefaults.defaults),
      });
    },
    [
      chatDefaults.defaults,
      projectId,
      providerPreferences,
      providerRequired,
      providerRun.startRun,
      providers.snapshot,
    ],
  );
}
