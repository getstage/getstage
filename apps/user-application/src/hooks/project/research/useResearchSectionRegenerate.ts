import { useCallback } from "react";
import type { ProviderId, ResearchArtifactSection } from "@stage/data-ops/contracts";
import { useProviderRun } from "@/hooks/engine/useProviderRun";
import { useProviderPreferences } from "@/hooks/engine/useProviderPreferences";
import { useProviderStatus } from "@/hooks/engine/useProviderStatus";
import { useChatDefaults } from "@/hooks/engine/useChatDefaults";
import { buildRunModelOptions } from "@/lib/engine/runModelOptions";

const DEFAULT_RESEARCH_MODELS: Record<ProviderId, string> = {
  claude: "claude-sonnet-4-6",
  codex: "codex-default",
};

export function useResearchSectionRegenerate(projectId: string) {
  const providerRun = useProviderRun({ projectId, mode: "research-section" });
  const providerPreferences = useProviderPreferences();
  const providers = useProviderStatus();
  const chatDefaults = useChatDefaults();

  return useCallback(
    async (section: ResearchArtifactSection, providerId: ProviderId) => {
      if (!providerPreferences.isProviderEnabled(providerId)) {
        throw new Error(`Connect ${providerId === "claude" ? "Claude" : "Codex"} before regenerating.`);
      }

      const provider = providers.data?.providers.find((entry) => entry.id === providerId);
      if (!provider || provider.status !== "ready") {
        throw new Error(provider?.setupHint ?? "Selected provider is not ready.");
      }

      await providerRun.startRun.mutateAsync({
        providerId,
        modelId: DEFAULT_RESEARCH_MODELS[providerId],
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
      providerRun.startRun,
      providers.data?.providers,
    ],
  );
}
