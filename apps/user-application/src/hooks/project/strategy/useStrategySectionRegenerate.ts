import { useCallback } from "react";
import type { ProviderId } from "@stage/data-ops/contracts";
import { useProviderRun } from "@/hooks/engine/useProviderRun";
import { useProviderPreferences } from "@/hooks/engine/useProviderPreferences";
import { useProviderStatus } from "@/hooks/engine/useProviderStatus";
import { useChatDefaults } from "@/hooks/engine/useChatDefaults";
import { buildRunModelOptions } from "@/lib/engine/runModelOptions";
import { assertProviderPreflightReady } from "@/lib/engine/providerPreflight";
import { resolveRunModelId } from "@/lib/engine/resolveRunModelId";

export function useStrategySectionRegenerate(projectId: string) {
  const providerRun = useProviderRun({ projectId, mode: "strategy-section" });
  const providerPreferences = useProviderPreferences();
  const providers = useProviderStatus();
  const chatDefaults = useChatDefaults();

  return useCallback(
    async (sectionId: string, providerId: ProviderId) => {
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
      projectId,
      providerPreferences,
      providerRun.startRun,
      providers.snapshot,
    ],
  );
}
