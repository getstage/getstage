import { useCallback } from "react";
import type { ProviderId } from "@stage/data-ops/contracts";
import { useProviderRun } from "@/hooks/engine/useProviderRun";
import { useProviderPreferences } from "@/hooks/engine/useProviderPreferences";
import { useProviderStatus } from "@/hooks/engine/useProviderStatus";
import { useChatDefaults } from "@/hooks/engine/useChatDefaults";
import { buildRunModelOptions } from "@/lib/engine/runModelOptions";

const DEFAULT_STRATEGY_MODELS: Record<ProviderId, string> = {
  claude: "claude-sonnet-4-6",
  codex: "codex-default",
};

export function useStrategySectionRegenerate(projectId: string) {
  const providerRun = useProviderRun({ projectId, mode: "strategy-section" });
  const providerPreferences = useProviderPreferences();
  const providers = useProviderStatus();
  const chatDefaults = useChatDefaults();

  return useCallback(
    async (sectionId: string, providerId: ProviderId) => {
      if (!providerPreferences.isProviderEnabled(providerId)) {
        throw new Error(
          `Connect ${providerId === "claude" ? "Claude" : "Codex"} before regenerating.`,
        );
      }

      const provider = providers.data?.providers.find((entry) => entry.id === providerId);
      if (!provider || provider.status !== "ready") {
        throw new Error(provider?.setupHint ?? "Selected provider is not ready.");
      }

      await providerRun.startRun.mutateAsync({
        providerId,
        modelId: DEFAULT_STRATEGY_MODELS[providerId],
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
      providers.data?.providers,
    ],
  );
}
