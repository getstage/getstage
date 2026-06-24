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
import { api } from "@/lib/convexApi";
import { MOODBOARD_IMAGE_ACCEPT, uploadFileToR2 } from "@/lib/r2Uploads";
import { readFileAsDataUrl } from "@/lib/utils";
import { useProviderRun } from "@/hooks/engine/useProviderRun";
import { formatRunFailedEvent } from "@/lib/engine/formatRunError";
import { toUserFacingErrorMessage } from "@/lib/errors";
import type { Project } from "@/models/project/project";
import { useMoodboardArtifact } from "./useMoodboardArtifact";
import { useSaveMoodboardArtifact } from "./useSaveMoodboardArtifact";

const MOODBOARD_IMPORT_PROVIDER = "codex";
const MOODBOARD_IMPORT_MODEL = "codex-default";
const STYLEGUIDE_PROVIDER = "codex";
const STYLEGUIDE_MODEL = "codex-default";
// Mirror the server's STALE_RUNNING_RUN_MS so a crashed engine can't pin the
// generating screen on a run that will never reach a terminal status.
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
  const message = event.error.message?.trim();
  if (message) {
    return message;
  }

  return "Moodboard import failed. Check that Stage Engine is running and Refero/Figma are configured.";
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
  const providerRun = useProviderRun({ projectId, mode: "moodboard" });
  const styleguideRun = useProviderRun({ projectId, mode: "styleguide" });
  const r2GenerateUploadUrl = useConvexMutation(api.r2.generateUploadUrl);
  const r2SyncMetadata = useConvexMutation(api.r2.syncMetadata);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingStyleGuide, setIsGeneratingStyleGuide] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importRunEnded, setImportRunEnded] = useState(false);
  const [styleGuideRunEnded, setStyleGuideRunEnded] = useState(false);
  const [styleGuideCompletedAt, setStyleGuideCompletedAt] = useState<number | null>(null);

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
      setError(null);
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
      setError(null);
      setStyleGuideCompletedAt(Date.now());
      styleguideRun.resetActiveRun();
      return;
    }

    if (terminalStyleGuideEvent.type === "run_failed") {
      console.error(formatRunFailedEvent(terminalStyleGuideEvent));
      setError(
        terminalStyleGuideEvent.error.message?.trim() ||
          "Style guide generation failed. Check Stage Engine and your AI provider setup.",
      );
      styleguideRun.resetActiveRun();
      return;
    }

    styleguideRun.resetActiveRun();
  }, [styleguideRun, terminalStyleGuideEvent]);

  const saveBoard = useCallback(
    async (state: MoodboardBoardState) => {
      setIsSaving(true);
      setError(null);
      try {
        const artifact = tabStateToMoodboardArtifact(
          project,
          state,
          data?.tabData.styleGuides ?? [],
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

  const uploadFiles = useCallback(
    async (files: FileList | File[]): Promise<MoodboardUploadResult> => {
      const fileArray = Array.from(files).filter((file) => file.type.startsWith("image/"));
      if (fileArray.length === 0) {
        throw new Error("Upload at least one image file.");
      }

      setIsUploading(true);
      setError(null);
      try {
        const uploaded = await Promise.all(
          fileArray.map(async (file) => {
            const [key, previewUrl] = await Promise.all([
              uploadFileToR2({
                generateUploadUrl: r2GenerateUploadUrl,
                syncMetadata: r2SyncMetadata,
                purpose: "moodboard-upload",
                file,
                scopeId: projectId,
              }),
              readFileAsDataUrl(file),
            ]);
            const id = `upload-${key.replace(/[^a-zA-Z0-9]+/g, "-")}`;
            return {
              item: {
                id,
                title: file.name,
                image: previewUrl,
                imageUrl: previewUrl,
                imageAssetKey: key,
                thumbnailUrl: previewUrl,
                thumbnailAssetKey: key,
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
    [projectId, r2GenerateUploadUrl, r2SyncMetadata],
  );

  const importFigmaLink = useCallback(
    async (url: string) => {
      const trimmed = url.trim();
      if (!trimmed) {
        throw new Error("Paste a Figma link or image URL.");
      }

      const normalizedUrl = normalizeExternalUrl(trimmed);
      const source = isFigmaUrl(trimmed) ? "figma" : "url";
      setError(null);
      setImportRunEnded(false);
      await providerRun.startRun.mutateAsync({
        providerId: MOODBOARD_IMPORT_PROVIDER,
        modelId: MOODBOARD_IMPORT_MODEL,
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
    [projectId, providerRun.startRun],
  );

  const generateWithAi = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) {
        throw new Error("Enter a Refero search query.");
      }

      setError(null);
      setImportRunEnded(false);
      await providerRun.startRun.mutateAsync({
        providerId: MOODBOARD_IMPORT_PROVIDER,
        modelId: MOODBOARD_IMPORT_MODEL,
        prompt: trimmed,
        mode: "moodboard",
        context: { projectId, source: "refero" },
        attachments: [],
        modelOptions: [],
      });
    },
    [projectId, providerRun.startRun],
  );

  const generateStyleGuide = useCallback(
    async (directionId: string) => {
      if (!data) {
        throw new Error("Create a moodboard before generating a style guide.");
      }
      if (isGeneratingStyleGuide || styleguideRun.startRun.isPending || styleguideRun.isRunActive) {
        return;
      }

      setIsGeneratingStyleGuide(true);
      setStyleGuideRunEnded(false);
      setStyleGuideCompletedAt(null);
      setError(null);
      try {
        await styleguideRun.startRun.mutateAsync({
          providerId: STYLEGUIDE_PROVIDER,
          modelId: STYLEGUIDE_MODEL,
          prompt: "Generate style guide for this moodboard direction.",
          mode: "styleguide",
          context: { projectId, directionId },
          attachments: [],
          modelOptions: [],
        });
      } catch (caught) {
        setIsGeneratingStyleGuide(false);
        setStyleGuideRunEnded(true);
        setError(caught instanceof Error ? caught.message : "Could not start style guide generation.");
        throw caught;
      }
    },
    [
      data,
      isGeneratingStyleGuide,
      projectId,
      styleguideRun.isRunActive,
      styleguideRun.startRun,
    ],
  );

  const regenerateStyleGuide = useCallback(
    async (directionId: string) => {
      await generateStyleGuide(directionId);
    },
    [generateStyleGuide],
  );

  const isStyleGuideRunActive =
    !styleGuideRunEnded &&
    (isGeneratingStyleGuide || styleguideRun.startRun.isPending || styleguideRun.isRunActive);

  return {
    data,
    isLoading: moodboardArtifact.isLoading || isRunsLoading,
    hasArtifact: data !== null,
    parseError: moodboardArtifact.parseError,
    saveBoard,
    isSaving,
    uploadFiles,
    isUploading,
    importFigmaLink,
    generateWithAi,
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
