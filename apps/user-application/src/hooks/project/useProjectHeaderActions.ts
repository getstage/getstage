import { useMutation as useConvexMutation } from "convex/react";
import type { ProjectDetail } from "@stage/data-ops";
import {
  useDeleteProjectMutation,
  useSyncProjectPhasesMutation,
  useUpdateProjectMutation,
} from "@/hooks/convex-data/useProjectMutations";
import { syncPhasesInputSchema } from "@/data-ops/schema";
import { toUserFacingErrorMessage } from "@/lib/errors";
import { parseInputDate } from "@/lib/format";
import { api } from "@/lib/convexApi";
import {
  prepareClientAvatarUpload,
  prepareProjectMarkerUpload,
  uploadFileToR2,
} from "@/lib/r2Uploads";
import type { Phase } from "@/models/project/project";

export type SaveProjectProfileInput = {
  name: string;
  previewImageUrl: string | null;
  pendingImageFile: File | null;
  imageRemoved: boolean;
  currentImageUrl: string | null | undefined;
};

export type SaveClientProfileInput = {
  clientName: string;
  previewAvatarUrl: string | null;
  pendingAvatarFile: File | null;
  avatarRemoved: boolean;
  currentAvatarUrl: string | null | undefined;
};

export type ProjectTimelineInput = {
  start: string;
  end: string;
};

type UseProjectHeaderActionsArgs = {
  projectId: string;
  detail: ProjectDetail | null;
  onDeleteSuccess: () => void;
  onLeavingAfterDelete: (leaving: boolean) => void;
};

function isLocalPhaseId(phaseId: string) {
  return phaseId.startsWith("phase-");
}

export function useProjectHeaderActions({
  projectId,
  detail,
  onDeleteSuccess,
  onLeavingAfterDelete,
}: UseProjectHeaderActionsArgs) {
  const updateProject = useUpdateProjectMutation();
  const syncPhases = useSyncProjectPhasesMutation();
  const deleteProjectMutation = useDeleteProjectMutation();
  const r2GenerateUploadUrl = useConvexMutation(api.r2.generateUploadUrl);
  const r2SyncMetadata = useConvexMutation(api.r2.syncMetadata);

  async function saveProjectProfile(input: SaveProjectProfileInput) {
    if (!detail) {
      throw new Error("Project is not loaded yet.");
    }

    const name = input.name.trim();
    const nameChanged = name !== detail.name;
    const hasPendingUpload = Boolean(input.pendingImageFile);
    const imageRemoved = input.imageRemoved && Boolean(input.currentImageUrl);

    if (!name || (!nameChanged && !hasPendingUpload && !imageRemoved)) {
      return;
    }

    const payload: {
      projectId: string;
      name?: string;
      projectImageUrl?: string | null;
    } = { projectId };

    if (nameChanged) {
      payload.name = name;
    }

    if (hasPendingUpload && input.pendingImageFile) {
      payload.projectImageUrl = await uploadFileToR2({
        generateUploadUrl: r2GenerateUploadUrl,
        syncMetadata: r2SyncMetadata,
        purpose: "project-marker",
        file: input.pendingImageFile,
      });
    } else if (imageRemoved) {
      payload.projectImageUrl = null;
    }

    await updateProject.mutateAsync(payload);
  }

  async function saveClientProfile(input: SaveClientProfileInput) {
    if (!detail) {
      throw new Error("Project is not loaded yet.");
    }

    const clientName = input.clientName.trim();
    const nameChanged = clientName !== detail.clientName;
    const hasPendingUpload = Boolean(input.pendingAvatarFile);
    const avatarRemoved = input.avatarRemoved && Boolean(input.currentAvatarUrl);

    if (!clientName || (!nameChanged && !hasPendingUpload && !avatarRemoved)) {
      return;
    }

    const payload: {
      projectId: string;
      clientName?: string;
      clientAvatarUrl?: string | null;
    } = { projectId };

    if (nameChanged) {
      payload.clientName = clientName;
    }

    if (hasPendingUpload && input.pendingAvatarFile) {
      payload.clientAvatarUrl = await uploadFileToR2({
        generateUploadUrl: r2GenerateUploadUrl,
        syncMetadata: r2SyncMetadata,
        purpose: "client-avatar",
        file: input.pendingAvatarFile,
      });
    } else if (avatarRemoved) {
      payload.clientAvatarUrl = null;
    }

    await updateProject.mutateAsync(payload);
  }

  async function saveTimeline(timeline: ProjectTimelineInput) {
    await updateProject.mutateAsync({
      projectId,
      startDate: parseInputDate(timeline.start),
      endDate: parseInputDate(timeline.end),
    });
  }

  async function savePhases(phases: Phase[]) {
    if (!detail) {
      throw new Error("Project is not loaded yet.");
    }

    const parsed = syncPhasesInputSchema.safeParse({
      phases: phases.map((phase) => ({
        id: isLocalPhaseId(phase.id) ? undefined : phase.id,
        name: phase.name,
      })),
    });

    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Invalid phase input.");
    }

    const usedExistingIds = new Set<string>();
    const syncPayload = parsed.data.phases.map((item, index) => {
      const exactMatch = phases.find(
        (phase) => phase.name === item.name && !isLocalPhaseId(phase.id) && !usedExistingIds.has(phase.id),
      );

      if (exactMatch) {
        usedExistingIds.add(exactMatch.id);
        return { id: exactMatch.id, name: item.name };
      }

      const sameIndexPhase = phases[index];
      if (sameIndexPhase && !isLocalPhaseId(sameIndexPhase.id) && !usedExistingIds.has(sameIndexPhase.id)) {
        usedExistingIds.add(sameIndexPhase.id);
        return { id: sameIndexPhase.id, name: item.name };
      }

      return { name: item.name };
    });

    await syncPhases.mutateAsync({ projectId, phases: syncPayload });
  }

  async function pauseProject() {
    if (!detail) {
      throw new Error("Project is not loaded yet.");
    }

    await updateProject.mutateAsync({
      projectId,
      status: detail.status === "paused" ? "active" : "paused",
    });
  }

  async function deleteProject() {
    onLeavingAfterDelete(true);
    try {
      await deleteProjectMutation.mutateAsync(projectId);
      onDeleteSuccess();
    } catch (error) {
      onLeavingAfterDelete(false);
      throw error;
    }
  }

  return {
    saveProjectProfile,
    saveClientProfile,
    saveTimeline,
    savePhases,
    pauseProject,
    deleteProject,
    isSaving:
      updateProject.isPending || syncPhases.isPending || deleteProjectMutation.isPending,
    toActionErrorMessage: (error: unknown) =>
      toUserFacingErrorMessage(error, "Could not save project changes."),
    prepareProjectMarkerUpload,
    prepareClientAvatarUpload,
  };
}
