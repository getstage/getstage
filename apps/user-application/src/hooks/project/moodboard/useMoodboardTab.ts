import { useCallback, useEffect, useMemo, useState } from "react";
import type { RunEvent } from "@stage/data-ops/contracts";
import type { Id } from "@stage/data-ops/convex/data-model";
import { useMutation as useConvexMutation, useQuery } from "convex/react";
import { useDesktopAuth } from "@/lib/auth";
import {
  tabStateToMoodboardArtifact,
  type MoodboardBoardState,
  type MoodboardBoardItem,
} from "@/lib/project/moodboardBoardState";
import type { MoodboardStyleGuide, ProviderId } from "@stage/data-ops/contracts";
import { api } from "@/lib/convexApi";
import { MOODBOARD_IMAGE_ACCEPT, createImageThumbnail, uploadFileToR2 } from "@/lib/r2Uploads";
import { readFileAsDataUrl } from "@/lib/utils";
import { useProviderRun } from "@/hooks/engine/useProviderRun";
import { useProjectAiProvider } from "@/hooks/project";
import { formatRunFailedEvent, toRunFailureUserMessage } from "@/lib/engine/formatRunError";
import { resolveRunModelId } from "@/lib/engine/resolveRunModelId";
import { toUserFacingErrorMessage } from "@/lib/errors";
import type { Project } from "@/models/project/project";
import { useMoodboardArtifact } from "./useMoodboardArtifact";
import { useSaveMoodboardArtifact } from "./useSaveMoodboardArtifact";

const MOODBOARD_RUN_STALE_MS = 60 * 60 * 1000;

function latestTerminalRunEvent(events: RunEvent[]) {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (
      event.type === "run_completed" ||
      event.type === "run_failed" ||
      event.type === "run_cancelled"
    ) {
      return event;
    }
  }

  return null;
}

function moodboardImportErrorMessage(event: Extract<RunEvent, { type: "run_failed" }>) {
  console.error(formatRunFailedEvent(event));
  return toRunFailureUserMessage(
    event,
    "Moodboard import failed. Try again. If it keeps happening, restart Stage.",
  );
}

function normalizeExternalUrl(value: string) {
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function isFigmaUrl(value: string) {
  try {
    const url = new URL(normalizeExternalUrl(value));
    return url.hostname.toLowerCase().endsWith("figma.com");
  } catch {
    return false;
  }
}

export type MoodboardUploadResult = {
  items: MoodboardBoardItem[];
  uploadedFiles: Array<{
    id: string;
    name: string;
    sizeBytes: number;
    uploadedAssetId?: string;
  }>;
};

export function useMoodboardTab(project: Pick<Project, "id" | "name">) {
  const projectId = project.id;
  const moodboardArtifact = useMoodboardArtifact(projectId);
  const saveArtifact = useSaveMoodboardArtifact(projectId);
  const aiProvider = useProjectAiProvider(projectId);
  const providerRun = useProviderRun({ projectId, mode: "moodboard" });
  const styleguideRun = useProviderRun({ projectId, mode: "styleguide" });
  const r2GenerateUploadUrl = useConvexMutation(api.r2.generateUploadUrl);
  const r2SyncMetadata = useConvexMutation(api.r2.syncMetadata);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingStyleGuide, setIsGeneratingStyleGuide] = useState(false);
  const [error, setError] = useState<string>();
  const [importRunEnded, setImportRunEnded] = useState(false);
  const [styleGuideRunEnded, setStyleGuideRunEnded] = useState(false);
  const [styleGuideCompletedAt, setStyleGuideCompletedAt] = useState<number>();

  // The in-memory active run is lost when the Moodboard tab unmounts (leaving the tab).
  // Convex is the durable truth: the engine keeps a moodboard run at status "running"
  // until the import ends, so reading it restores the generating screen on return.
  const { isAuthenticated } = useDesktopAuth();
  const moodboardRuns = useQuery(
    api.projectAi.listRuns,
    isAuthenticated && projectId
      ? { projectId: projectId as Id<"projects">, module: "moodboard" }
      : "skip",
  );
  const hasPersistedRunningRun = useMemo(
    () =>
      (moodboardRuns ?? []).some(
        (run) =>
          run.status === "running" &&
          Date.now() - run.startedAt < MOODBOARD_RUN_STALE_MS,
      ),
    [moodboardRuns],
  );
  // `undefined` means the query is still loading (tri-state), NOT "no runs". Treat that
  // window as loading so the tab never flashes the setup screen before Convex answers.
  const isRunsLoading = isAuthenticated && Boolean(projectId) && moodboardRuns === undefined;

  // Same durable read for style-guide generation: the engine keeps a "styleguide" run at
  // status "running" (with directionId in inputSummary) until it ends, so the tab can
  // restore the generating screen for that direction after it unmounts.
  const styleguideRuns = useQuery(
    api.projectAi.listRuns,
    isAuthenticated && projectId
      ? { projectId: projectId as Id<"projects">, module: "styleguide" }
      : "skip",
  );
  const runningStyleGuideDirectionId = useMemo(() => {
    const run = (styleguideRuns ?? []).find(
      (entry) =>
        entry.status === "running" &&
        Date.now() - entry.startedAt < MOODBOARD_RUN_STALE_MS,
    );
    return run?.inputSummary;
  }, [styleguideRuns]);
  // Still loading the styleguide runs — hold the tab so it doesn't flash the setup
  // screen before we know a style guide is generating.
  const isStyleGuideRunsLoading =
    isAuthenticated && Boolean(projectId) && styleguideRuns === undefined;

  const data = moodboardArtifact.data;
  const terminalImportEvent = useMemo(
    () => latestTerminalRunEvent(providerRun.activeRunEvents),
    [providerRun.activeRunEvents],
  );
  const terminalStyleGuideEvent = useMemo(
    () => latestTerminalRunEvent(styleguideRun.activeRunEvents),
    [styleguideRun.activeRunEvents],
  );

  useEffect(() => {
    if (!terminalImportEvent) {
      return;
    }

    setImportRunEnded(true);

    if (terminalImportEvent.type === "run_completed") {
      setError(undefined);
      providerRun.resetActiveRun();
      return;
    }

    if (terminalImportEvent.type === "run_failed") {
      setError(moodboardImportErrorMessage(terminalImportEvent));
      providerRun.resetActiveRun();
      return;
    }

    providerRun.resetActiveRun();
  }, [providerRun, terminalImportEvent]);

  useEffect(() => {
    if (!terminalStyleGuideEvent) {
      return;
    }

    setStyleGuideRunEnded(true);
    setIsGeneratingStyleGuide(false);

    if (terminalStyleGuideEvent.type === "run_completed") {
      setError(undefined);
      setStyleGuideCompletedAt(Date.now());
      styleguideRun.resetActiveRun();
      return;
    }

    if (terminalStyleGuideEvent.type === "run_failed") {
      console.error(formatRunFailedEvent(terminalStyleGuideEvent));
      setError(
        toRunFailureUserMessage(
          terminalStyleGuideEvent,
          "Style guide generation failed. Check Stage Engine and your AI provider setup.",
        ),
      );
      styleguideRun.resetActiveRun();
      return;
    }

    styleguideRun.resetActiveRun();
  }, [styleguideRun, terminalStyleGuideEvent]);

  const saveBoard = useCallback(
    async (state: MoodboardBoardState) => {
      setIsSaving(true);
      setError(undefined);
      try {
        const artifact = tabStateToMoodboardArtifact(
          project,
          state,
          state.styleGuides ?? data?.tabData.styleGuides ?? [],
        );
        await saveArtifact(artifact);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not save moodboard.");
        throw caught;
      } finally {
        setIsSaving(false);
      }
    },
    [project, saveArtifact, data],
  );

  const saveStyleGuide = useCallback(
    async (
      directionId: string,
      editedGuide: MoodboardStyleGuide,
      boardState: MoodboardBoardState,
    ) => {
      setIsSaving(true);
      setError(undefined);
      try {
        const currentStyleGuides = data?.tabData.styleGuides ?? [];
        const mergedStyleGuides = [
          ...currentStyleGuides.filter((guide) => guide.directionId !== directionId),
          editedGuide,
        ];
        const artifact = tabStateToMoodboardArtifact(project, boardState, mergedStyleGuides);
        await saveArtifact(artifact);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not save style guide.");
        throw caught;
      } finally {
        setIsSaving(false);
      }
    },
    [project, saveArtifact, data],
  );

  const uploadFiles = useCallback(
    async (files: FileList | File[]): Promise<MoodboardUploadResult> => {
      const fileArray = Array.from(files).filter((file) => file.type.startsWith("image/"));
      if (fileArray.length === 0) {
        throw new Error("Upload at least one image file.");
      }

      setIsUploading(true);
      setError(undefined);
      try {
        const uploaded = await Promise.all(
          fileArray.map(async (file) => {
            const [key, previewUrl, thumbResult] = await Promise.all([
              uploadFileToR2({
                generateUploadUrl: r2GenerateUploadUrl,
                syncMetadata: r2SyncMetadata,
                purpose: "moodboard-upload",
                file,
                scopeId: projectId,
              }),
              readFileAsDataUrl(file),
              createImageThumbnail(file).catch(() => null),
            ]);

            const thumbKey = thumbResult
              ? await uploadFileToR2({
                  generateUploadUrl: r2GenerateUploadUrl,
                  syncMetadata: r2SyncMetadata,
                  purpose: "moodboard-upload",
                  file: thumbResult.file,
                  scopeId: projectId,
                }).catch(() => null)
              : null;

            const id = `upload-${key.replace(/[^a-zA-Z0-9]+/g, "-")}`;
            return {
              item: {
                id,
                title: file.name,
                image: previewUrl,
                imageUrl: previewUrl,
                imageAssetKey: key,
                thumbnailUrl: thumbResult?.dataUrl ?? previewUrl,
                thumbnailAssetKey: thumbKey ?? key,
                source: "upload" as const,
                uploadedAssetId: key,
                folder: null,
                directionId: null,
                isInMoodboard: false,
              },
              uploadedFile: {
                id,
                name: file.name,
                sizeBytes: file.size,
                uploadedAssetId: key,
              },
            };
          }),
        );

        return {
          items: uploaded.map((entry) => entry.item),
          uploadedFiles: uploaded.map((entry) => entry.uploadedFile),
        };
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not upload moodboard images.");
        throw caught;
      } finally {
        setIsUploading(false);
      }
    },
    [projectId, r2GenerateUploadUrl, r2SyncMetadata, createImageThumbnail],
  );

  const importFigmaLink = useCallback(
    async (url: string) => {
      const trimmed = url.trim();
      if (!trimmed) {
        throw new Error("Paste a Figma link or image URL.");
      }

      const providerId = aiProvider.resolvedProviderId;
      if (!providerId) {
        throw new Error("Choose a connected provider before importing. Enable one in Settings → Integrations.");
      }

      const normalizedUrl = normalizeExternalUrl(trimmed);
      const source = isFigmaUrl(trimmed) ? "figma" : "url";
      setError(undefined);
      setImportRunEnded(false);
      await providerRun.startRun.mutateAsync({
        providerId,
        modelId: resolveRunModelId(providerId, "codex-default"),
        prompt: trimmed,
        mode: "moodboard",
        context: { projectId, source },
        attachments: [{
          id: source === "figma" ? "figma-link" : "image-url",
          kind: source === "figma" ? "figma" : "url",
          url: normalizedUrl,
        }],
        modelOptions: [],
      });
    },
    [projectId, providerRun.startRun, aiProvider.resolvedProviderId],
  );

  const generateWithAi = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) {
        throw new Error("Enter a Refero search query.");
      }

      const providerId = aiProvider.resolvedProviderId;
      if (!providerId) {
        throw new Error("Choose a connected provider before generating. Enable one in Settings → Integrations.");
      }

      setError(undefined);
      setImportRunEnded(false);
      await providerRun.startRun.mutateAsync({
        providerId,
        modelId: resolveRunModelId(providerId, "codex-default"),
        prompt: trimmed,
        mode: "moodboard",
        context: { projectId, source: "refero" },
        attachments: [],
        modelOptions: [],
      });
    },
    [projectId, providerRun.startRun, aiProvider.resolvedProviderId],
  );

  // The provider is chosen up front (style-guide popup) and passed down as an owned
  // value, so there is no "maybe a provider" to resolve here.
  const generateStyleGuide = useCallback(
    async (directionId: string, providerId: ProviderId) => {
      if (!data) {
        throw new Error("Create a moodboard before generating a style guide.");
      }
      if (isGeneratingStyleGuide || styleguideRun.startRun.isPending || styleguideRun.isRunActive) {
        return;
      }

      setIsGeneratingStyleGuide(true);
      setStyleGuideRunEnded(false);
      setStyleGuideCompletedAt(undefined);
      setError(undefined);
      try {
        await styleguideRun.startRun.mutateAsync({
          providerId,
          modelId: resolveRunModelId(providerId, "codex-default"),
          prompt: "Generate style guide for this moodboard direction.",
          mode: "styleguide",
          context: { projectId, directionId },
          attachments: [],
          modelOptions: [],
        });
      } catch (caught) {
        setIsGeneratingStyleGuide(false);
        setStyleGuideRunEnded(true);
        setError(toUserFacingErrorMessage(caught, "Could not start style guide generation."));
        throw caught;
      }
    },
    [data, isGeneratingStyleGuide, projectId, styleguideRun.isRunActive, styleguideRun.startRun],
  );

  // Regenerate has no popup, so it resolves the active provider itself.
  const regenerateStyleGuide = useCallback(
    async (directionId: string) => {
      const providerId = aiProvider.resolvedProviderId;
      if (!providerId) {
        throw new Error("Choose a connected provider before generating a style guide. Enable one in Settings → Integrations.");
      }
      await generateStyleGuide(directionId, providerId);
    },
    [generateStyleGuide, aiProvider.resolvedProviderId],
  );

  const isStyleGuideRunActive =
    !styleGuideRunEnded &&
    (isGeneratingStyleGuide ||
      styleguideRun.startRun.isPending ||
      styleguideRun.isRunActive ||
      runningStyleGuideDirectionId !== undefined);

  return {
    data,
    isLoading: moodboardArtifact.isLoading || isRunsLoading || isStyleGuideRunsLoading,
    hasArtifact: data !== null,
    parseError: moodboardArtifact.parseError,
    saveBoard,
    saveStyleGuide,
    isSaving,
    uploadFiles,
    isUploading,
    importFigmaLink,
    generateWithAi,
    providerOptions: aiProvider.providerOptions,
    selectedProviderId: aiProvider.selectedProviderId,
    selectProvider: aiProvider.selectProvider,
    resolvedProviderId: aiProvider.resolvedProviderId,
    isImporting:
      !importRunEnded &&
      (providerRun.startRun.isPending ||
        providerRun.isRunActive ||
        hasPersistedRunningRun),
    // Figma vs Refero label for the generating screen. After a remount the in-memory
    // source may be gone (restored from Convex), so default to the Refero ("ai") label.
    generatingMode: (providerRun.activeRunSource === "figma" ? "figma" : "ai") as
      | "ai"
      | "figma",
    runEvents: providerRun.activeRunEvents,
    acceptUploads: MOODBOARD_IMAGE_ACCEPT,
    generateStyleGuide,
    regenerateStyleGuide,
    isGeneratingStyleGuide: isStyleGuideRunActive,
    runningStyleGuideDirectionId,
    styleGuideCompletedAt,
    error:
      error ??
      (moodboardArtifact.parseError
        ? "Saved moodboard could not be loaded. Try reloading the project."
        : null) ??
      (providerRun.startRun.error
        ? toUserFacingErrorMessage(
            providerRun.startRun.error,
            "Something went wrong while running Moodboard.",
          )
        : null) ??
      (styleguideRun.startRun.error
        ? toUserFacingErrorMessage(
            styleguideRun.startRun.error,
            "Something went wrong while generating the style guide.",
          )
        : null),
  };
}
