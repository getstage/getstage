import { useCallback, useEffect, useMemo, useState } from "react";
import type { ProviderId, WireframeBrandSource } from "@stage/data-ops/contracts";
import { useProviderRequired } from "@/components/app/ProviderRequiredDialog";
import { useProjectAiProvider } from "@/hooks/project/useProjectAiProvider";
import {
  buildWireframeRunSource,
  resolveRunScreenIds,
  screenIdsFromRunSource,
} from "@/lib/project/wireframeScreenList";
import type { Project } from "@/models/project/project";
import type { ScreenItem, WireframeKind } from "@/types/project/wireframesTab";
import type { WireframesArtifactRecord } from "@/types/project/wireframesArtifactRecord";
import { useWireframesArtifact } from "./useWireframesArtifact";
import { screenIdsFromRegeneratePrompt, useWireframesRun } from "./useWireframesRun";

// A brand-kit Hi-Fi run needs at least one uploaded R2 key, otherwise the
// engine is forced into a silent generic-token fallback with no error. The
// uploaded-key list rehydrates from Convex on every tab mount, so right after
// remount it is briefly empty even when files exist. Callers pass the current
// loading flag so we can tell the difference and refuse to submit in either
// case with a message the user can act on.
function assertBrandKitReady(
  brandSource: WireframeBrandSource | null,
  brandKitKeys: string[],
  brandKitLoading?: boolean,
): string | null {
  if (brandSource !== "brand-kit") {
    return null;
  }
  if (brandKitKeys.length > 0) {
    return null;
  }
  return brandKitLoading
    ? "Your brand kit files are still loading. Try again in a moment."
    : "Upload at least one brand kit file, or choose Style Guide instead.";
}

export function useWireframesTab(project: Pick<Project, "id" | "name">) {
  const projectId = project.id;
  const wireframesArtifact = useWireframesArtifact(projectId);
  const wireframesRun = useWireframesRun(projectId);
  const { resolvedProviderId, providerOptions, selectedProviderId, selectProvider } =
    useProjectAiProvider(projectId);
  const providerRequired = useProviderRequired();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
  }, [projectId]);

  const requireProviderId = useCallback(
    (providerId: ProviderId | null, action: "generating" | "regenerating"): ProviderId => {
      if (providerId) {
        return providerId;
      }

      const message =
        providerOptions.find((option) => option.statusMessage)?.statusMessage ??
        (action === "regenerating"
          ? "Connect Claude or Codex in Settings before regenerating Wireframes."
          : "Connect Claude or Codex in Settings before generating Wireframes.");
      providerRequired.show(message);
      throw new Error(message);
    },
    [providerOptions, providerRequired],
  );

  const generateWireframes = useCallback(
    async (input: {
      wireframeKind: WireframeKind;
      brandSource: WireframeBrandSource | null;
      screens: ScreenItem[];
      styleDirectionId?: string | null;
      brandKitKeys: string[];
      brandKitLoading?: boolean;
      providerId?: ProviderId;
      screenIds?: string[];
    }): Promise<WireframesArtifactRecord | null> => {
      setError(null);

      // The run must cover exactly the screens the user asked for. Without a
      // `screens:` token the engine generates the whole list in one provider
      // call, which is how two Hi-Fi screens used to cost 17 minutes.
      const screenIds = resolveRunScreenIds(input.screens, input.screenIds);
      if (screenIds.length === 0) {
        const message = "Select at least one screen to generate.";
        setError(message);
        throw new Error(message);
      }

      const brandKitGuardError = assertBrandKitReady(
        input.brandSource,
        input.brandKitKeys,
        input.brandKitLoading,
      );
      if (brandKitGuardError) {
        setError(brandKitGuardError);
        throw new Error(brandKitGuardError);
      }

      const runProviderId = requireProviderId(
        input.providerId ?? resolvedProviderId,
        "generating",
      );

      try {
        await wireframesRun.startWireframes(
          runProviderId,
          buildWireframeRunSource(
            input.wireframeKind,
            input.brandSource,
            input.styleDirectionId,
            screenIds,
          ),
          input.brandKitKeys,
        );
      } catch (runError) {
        const message =
          runError instanceof Error ? runError.message : "Could not start wireframes run.";
        setError(message);
        throw runError;
      }

      return wireframesArtifact.data;
    },
    [requireProviderId, resolvedProviderId, wireframesArtifact.data, wireframesRun],
  );

  const regenerateScreens = useCallback(
    async (input: {
      screenIds: string[];
      wireframeKind: WireframeKind;
      brandSource: WireframeBrandSource | null;
      styleDirectionId?: string | null;
      brandKitKeys: string[];
      brandKitLoading?: boolean;
      providerId?: ProviderId;
    }) => {
      if (input.screenIds.length === 0) {
        return;
      }

      setError(null);
      const brandKitGuardError = assertBrandKitReady(
        input.brandSource,
        input.brandKitKeys,
        input.brandKitLoading,
      );
      if (brandKitGuardError) {
        setError(brandKitGuardError);
        throw new Error(brandKitGuardError);
      }

      const runProviderId = requireProviderId(
        input.providerId ?? resolvedProviderId,
        "regenerating",
      );

      try {
        await wireframesRun.startWireframes(
          runProviderId,
          buildWireframeRunSource(
            input.wireframeKind,
            input.brandSource,
            input.styleDirectionId,
            input.screenIds,
          ),
          input.brandKitKeys,
          `Regenerate wireframe screens: ${input.screenIds.join(", ")}`,
        );
      } catch (runError) {
        const message =
          runError instanceof Error ? runError.message : "Could not regenerate wireframe screens.";
        setError(message);
        throw runError;
      }
    },
    [requireProviderId, resolvedProviderId, wireframesRun],
  );

  // Screens the live run is producing. Every run is scoped now, so this covers a
  // first generate as well as a regenerate; `isRegenerateRun` is what tells the
  // two apart.
  const runningScreenIds = useMemo(() => {
    if (!wireframesRun.isRunning && !wireframesRun.isStarting) {
      return null;
    }

    return (
      screenIdsFromRunSource(wireframesRun.activeRunSource) ??
      screenIdsFromRegeneratePrompt(wireframesRun.persistedRunningRun?.inputSummary)
    );
  }, [
    wireframesRun.activeRunSource,
    wireframesRun.isRunning,
    wireframesRun.isStarting,
    wireframesRun.persistedRunningRun?.inputSummary,
  ]);

  return {
    data: wireframesArtifact.data,
    isLoading: wireframesArtifact.isLoading,
    hasArtifact: wireframesArtifact.data !== null,
    parseError: wireframesArtifact.parseError,
    usingMockData: false,
    generateWireframes,
    regenerateScreens,
    runningScreenIds,
    isGenerating: wireframesRun.isRunning || wireframesRun.isStarting,
    isRunsLoading: wireframesRun.isRunsLoading,
    elapsedSeconds: wireframesRun.elapsedSeconds,
    providerOptions,
    selectedProviderId,
    selectProvider,
    isRegenerateRun: wireframesRun.isRegenerateRun,
    isRunning: wireframesRun.isRunning,
    error: error ?? wireframesRun.error,
    cancelWireframes: wireframesRun.cancelWireframes,
    activeRunId: wireframesRun.activeRunId,
  };
}
