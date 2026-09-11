import { useCallback } from "react";
import type { ProviderId } from "@stage/data-ops/contracts";
import { useProviderRequired } from "@/components/app/ProviderRequiredDialog";
import { useProjectAiProvider } from "@/hooks/project/useProjectAiProvider";
import type { Project } from "@/models/project/project";
import type { ScreenItem } from "@/types/project/wireframesTab";
import { useWireframesArtifact } from "./useWireframesArtifact";
import { useWireframesRun } from "./useWireframesRun";

function runSource(screens: ScreenItem[]) {
  const selectedIds = screens.filter((screen) => screen.selected).map((screen) => screen.id);
  return `kind:lofi,selected:${selectedIds.join(";")}`;
}

export function useWireframesTab(project: Pick<Project, "id" | "name">) {
  const projectId = project.id;
  const wireframesArtifact = useWireframesArtifact(projectId);
  const wireframesRun = useWireframesRun(projectId);
  const {
    resolvedProviderId,
    providerOptions,
    selectedProviderId,
    selectProvider,
  } = useProjectAiProvider(projectId);
  const providerRequired = useProviderRequired();

  const generateWireframes = useCallback(
    async (input: {
      screens: ScreenItem[];
      providerId?: ProviderId;
      prompt?: string;
    }) => {
      const providerId = input.providerId ?? resolvedProviderId;
      if (!providerId) {
        const message =
          providerOptions.find((option) => option.statusMessage)?.statusMessage ??
          "Connect Claude or Codex in Settings before generating Wireframes.";
        providerRequired.show(message);
        throw new Error(message);
      }

      await wireframesRun.startWireframes(
        providerId,
        runSource(input.screens),
        [],
        input.prompt,
      );
    },
    [
      providerOptions,
      providerRequired,
      resolvedProviderId,
      wireframesRun,
    ],
  );

  return {
    data: wireframesArtifact.data,
    isLoading: wireframesArtifact.isLoading,
    hasArtifact: wireframesArtifact.data !== null,
    parseError: wireframesArtifact.parseError,
    generateWireframes,
    isGenerating: wireframesRun.isRunning || wireframesRun.isStarting,
    isRunsLoading: wireframesRun.isRunsLoading,
    isRunning: wireframesRun.isRunning,
    error: wireframesRun.error,
    cancelWireframes: wireframesRun.cancelWireframes,
    providerOptions,
    selectedProviderId: selectedProviderId ?? resolvedProviderId,
    selectProvider,
  };
}
