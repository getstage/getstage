import { useCallback } from "react";
import type { ProviderId } from "@stage/data-ops/contracts";
import { useProviderRun } from "@/hooks/engine/useProviderRun";
import { useProviderPreferences } from "@/hooks/engine/useProviderPreferences";
import { useProviderStatus } from "@/hooks/engine/useProviderStatus";
import { useChatDefaults } from "@/hooks/engine/useChatDefaults";
import { buildRunModelOptions } from "@/lib/engine/runModelOptions";
import { assertProviderPreflightReady } from "@/lib/engine/providerPreflight";
import { resolveRunModelId } from "@/lib/engine/resolveRunModelId";

function sectionIdFromSource(source: string | null) {
  return source?.startsWith("section:") ? source.slice("section:".length) : null;
}

export function useStrategySectionRegenerate(projectId: string) {
  const providerRun = useProviderRun({ projectId, mode: "strategy-section" });
  const providerPreferences = useProviderPreferences();
  const providers = useProviderStatus();
  const chatDefaults = useChatDefaults();

  const isRegenerating = providerRun.isStarting || providerRun.isRunActive;
  const visibleActiveSectionId = sectionIdFromSource(providerRun.activeRunSource);

  const regenerate = useCallback(
    async (sectionId: string, providerId: ProviderId) => {
      if (isRegenerating) {
        return;
      }

      assertProviderPreflightReady({
        providerId,
        snapshot: providers.snapshot,
        isEnabled: providerPreferences.isProviderEnabled(providerId),
        context: "run",
      });

      await providerRun.startRun.mutateAsync({
        providerId,
        modelId: resolveRunModelId(providerId, chatDefaults.defaults.modelId),
        prompt: `Regenerate strategy section: ${sectionId}`,
        mode: "strategy",
        context: {
          projectId,
          source: `section:${sectionId}`,
        },
        attachments: [],
        modelOptions: buildRunModelOptions(chatDefaults.defaults),
      });
    },
    [
      chatDefaults.defaults,
      isRegenerating,
      projectId,
      providerPreferences,
      providerRun.startRun,
      providers.snapshot,
    ],
  );

  return {
    regenerate,
    isRegenerating,
    activeSectionId: isRegenerating ? visibleActiveSectionId : null,
    error: providerRun.startRun.isError
      ? "Could not regenerate Strategy section."
      : null,
  };
}
