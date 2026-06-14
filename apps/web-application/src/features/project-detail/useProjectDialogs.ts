import { useRef, useState, type ChangeEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { api } from "@/lib/convex";
import { toUserFacingErrorMessage } from "@/lib/errors";
import { formatInputDate, parseInputDate } from "@/lib/format";
import { convexQueryKeys } from "@/lib/queryKeys";
import {
  prepareClientAvatarUpload,
  prepareProjectMarkerUpload,
  uploadFileToR2,
} from "@/lib/r2Uploads";
import { syncPhasesInputSchema } from "@/data-ops/schema";
import type {
  ProjectDialogController,
  ProjectDialogKey,
  ProjectDialogState,
} from "@/features/project-detail/controllers";
import type { Phase, Project } from "@/types";
import type { Id } from "@stage/data-ops/convex/data-model";

const DEFAULT_DIALOG_STATE: ProjectDialogState = {
  editName: false,
  editClient: false,
  editTimeline: false,
  editPhases: false,
  deleteConfirm: false,
};

type ProjectDialogsInput = {
  project: Project | null | undefined;
  projectId: Id<"projects">;
  showError: (message: string) => void;
  onDeleteSuccess: () => void;
};

export function useProjectDialogs({
  project,
  projectId,
  showError,
  onDeleteSuccess,
}: ProjectDialogsInput): ProjectDialogController {
  const queryClient = useQueryClient();
  const updateProject = useConvexMutation(api.projects.update);
  const syncPhases = useConvexMutation(api.projects.syncPhases);
  const deleteProject = useConvexMutation(api.projects.deleteById);
  const r2GenerateUploadUrl = useConvexMutation(api.r2.generateUploadUrl);
  const r2SyncMetadata = useConvexMutation(api.r2.syncMetadata);
  const [state, setState] = useState<ProjectDialogState>(DEFAULT_DIALOG_STATE);
  const [editNameValue, setEditNameValue] = useState("");
  const [editProjectImageDataUrl, setEditProjectImageDataUrl] = useState<string | null>(null);
  const [pendingProjectImageFile, setPendingProjectImageFile] = useState<File | null>(null);
  const [editClientValue, setEditClientValue] = useState("");
  const [editClientAvatarDataUrl, setEditClientAvatarDataUrl] = useState<string | null>(null);
  const [pendingClientAvatarFile, setPendingClientAvatarFile] = useState<File | null>(null);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [isSavingClient, setIsSavingClient] = useState(false);
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editPhasesValue, setEditPhasesValue] = useState("");
  const projectImageInputRef = useRef<HTMLInputElement>(null);
  const clientAvatarInputRef = useRef<HTMLInputElement>(null);

  function setOpen(dialog: ProjectDialogKey, open: boolean) {
    setState((current) => ({ ...current, [dialog]: open }));
  }

  function openEditNameDialog() {
    if (!project) {
      return;
    }

    setEditNameValue(project.name);
    setEditProjectImageDataUrl(
      project.projectImageUrl ?? project.endMarkerImageUrl ?? project.startMarkerImageUrl ?? null,
    );
    setPendingProjectImageFile(null);
    setOpen("editName", true);
  }

  function handleProjectImageInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    void prepareProjectMarkerUpload(file)
      .then((prepared) => {
        setPendingProjectImageFile(prepared.file);
        setEditProjectImageDataUrl(prepared.previewUrl);
      })
      .catch((error) => {
        showError(toUserFacingErrorMessage(error, "Could not prepare this image."));
      })
      .finally(() => {
        event.target.value = "";
      });
  }

  function handleRemoveProjectImage() {
    setPendingProjectImageFile(null);
    setEditProjectImageDataUrl(null);
  }

  function openEditClientDialog() {
    if (!project) {
      return;
    }

    setEditClientValue(project.clientName);
    setEditClientAvatarDataUrl(project.clientAvatarUrl ?? null);
    setPendingClientAvatarFile(null);
    setOpen("editClient", true);
  }

  function handleClientAvatarInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    void prepareClientAvatarUpload(file)
      .then((prepared) => {
        setPendingClientAvatarFile(prepared.file);
        setEditClientAvatarDataUrl(prepared.previewUrl);
      })
      .catch((error) => {
        showError(toUserFacingErrorMessage(error, "Could not prepare this image."));
      })
      .finally(() => {
        event.target.value = "";
      });
  }

  function handleRemoveClientAvatar() {
    setPendingClientAvatarFile(null);
    setEditClientAvatarDataUrl(null);
  }

  function openTimelineDialog() {
    if (!project) {
      return;
    }

    setEditStartDate(formatInputDate(new Date(project.startDate)));
    setEditEndDate(formatInputDate(new Date(project.endDate)));
    setOpen("editTimeline", true);
  }

  function openPhasesDialog() {
    if (!project) {
      return;
    }

    setEditPhasesValue(project.phases.map((phase: Phase) => phase.name).join(", "));
    setOpen("editPhases", true);
  }

  async function handleSaveProject() {
    if (!project) {
      return;
    }

    const name = editNameValue.trim();
    const currentImageUrl =
      project.projectImageUrl ?? project.endMarkerImageUrl ?? project.startMarkerImageUrl;
    const imageRemoved = !editProjectImageDataUrl && Boolean(currentImageUrl);
    const hasPendingImageUpload = Boolean(pendingProjectImageFile);
    const nameChanged = name !== project.name;

    if (!name || (!nameChanged && !imageRemoved && !hasPendingImageUpload)) {
      setOpen("editName", false);
      return;
    }

    setIsSavingProject(true);
    try {
      const payload: {
        projectId: Id<"projects">;
        name?: string;
        projectImageUrl?: string | null;
      } = { projectId };

      if (nameChanged) {
        payload.name = name;
      }

      if (hasPendingImageUpload && pendingProjectImageFile) {
        payload.projectImageUrl = await uploadFileToR2({
          generateUploadUrl: r2GenerateUploadUrl,
          syncMetadata: r2SyncMetadata,
          purpose: "project-marker",
          file: pendingProjectImageFile,
        });
      } else if (imageRemoved) {
        payload.projectImageUrl = null;
      }

      await updateProject(payload);
      void queryClient.invalidateQueries({ queryKey: convexQueryKeys.dockProjects });
      setPendingProjectImageFile(null);
      setOpen("editName", false);
    } catch (error) {
      showError(toUserFacingErrorMessage(error, "Could not update the project."));
    } finally {
      setIsSavingProject(false);
    }
  }

  async function handleSaveClient() {
    if (!project) {
      return;
    }

    const clientName = editClientValue.trim();
    const nameChanged = clientName !== project.clientName;
    const avatarRemoved = !editClientAvatarDataUrl && Boolean(project.clientAvatarUrl);
    const hasPendingAvatarUpload = Boolean(pendingClientAvatarFile);

    if (!clientName || (!nameChanged && !avatarRemoved && !hasPendingAvatarUpload)) {
      setOpen("editClient", false);
      return;
    }

    setIsSavingClient(true);
    try {
      const payload: {
        projectId: Id<"projects">;
        clientName?: string;
        clientAvatarUrl?: string | null;
      } = { projectId };

      if (nameChanged) {
        payload.clientName = clientName;
      }

      if (hasPendingAvatarUpload && pendingClientAvatarFile) {
        const key = await uploadFileToR2({
          generateUploadUrl: r2GenerateUploadUrl,
          syncMetadata: r2SyncMetadata,
          purpose: "client-avatar",
          file: pendingClientAvatarFile,
        });
        payload.clientAvatarUrl = key;
      } else if (avatarRemoved) {
        payload.clientAvatarUrl = null;
      }

      await updateProject(payload);
      void queryClient.invalidateQueries({ queryKey: convexQueryKeys.dockProjects });
      setPendingClientAvatarFile(null);
      setOpen("editClient", false);
    } catch (error) {
      showError(toUserFacingErrorMessage(error, "Could not update the client."));
    } finally {
      setIsSavingClient(false);
    }
  }

  async function handleSaveTimeline() {
    try {
      await updateProject({
        projectId,
        startDate: parseInputDate(editStartDate),
        endDate: parseInputDate(editEndDate),
      });
      void queryClient.invalidateQueries({ queryKey: convexQueryKeys.dockProjects });
      setOpen("editTimeline", false);
    } catch (error) {
      showError(toUserFacingErrorMessage(error, "Could not update the timeline."));
    }
  }

  async function handleSavePhases() {
    if (!project) {
      return;
    }

    const nextNames = editPhasesValue
      .split(",")
      .map((name) => name.trim())
      .filter((name) => name.length > 0);

    const parsed = syncPhasesInputSchema.safeParse({
      phases: nextNames.map((name) => ({ name })),
    });

    if (!parsed.success) {
      showError(parsed.error.issues[0]?.message ?? "Invalid phase input.");
      return;
    }

    const usedExistingIds = new Set<string>();
    const phases = parsed.data.phases.map((item, index) => {
      const exactMatch = project.phases.find(
        (phase: Phase) => phase.name === item.name && !usedExistingIds.has(phase.id),
      );

      if (exactMatch) {
        usedExistingIds.add(exactMatch.id);
        return { id: exactMatch.id as Id<"phases">, name: item.name };
      }

      const sameIndexPhase = project.phases[index];
      if (sameIndexPhase && !usedExistingIds.has(sameIndexPhase.id)) {
        usedExistingIds.add(sameIndexPhase.id);
        return { id: sameIndexPhase.id as Id<"phases">, name: item.name };
      }

      return { name: item.name };
    });
    const nextPhaseIds = new Set<string>(
      phases
        .map((phase) => ("id" in phase ? phase.id : undefined))
        .filter((phaseId): phaseId is Id<"phases"> => phaseId !== undefined),
    );
    const removedPhases = project.phases.filter((phase: Phase) => !nextPhaseIds.has(phase.id));
    const removedTaskCount = removedPhases.reduce(
      (total: number, phase: Phase) => total + phase.tasks.length,
      0,
    );
    const deleteTasksInRemovedPhases =
      removedTaskCount > 0 &&
      window.confirm(
        `Delete ${removedPhases.length} phase${removedPhases.length === 1 ? "" : "s"} and permanently delete ${removedTaskCount} task${removedTaskCount === 1 ? "" : "s"} plus their attachments?`,
      );

    if (removedTaskCount > 0 && !deleteTasksInRemovedPhases) {
      return;
    }

    try {
      await syncPhases({ projectId, phases, deleteTasksInRemovedPhases });
      setOpen("editPhases", false);
    } catch (error) {
      showError(toUserFacingErrorMessage(error, "Could not update the phases."));
    }
  }

  async function handleToggleProjectPaused() {
    if (!project) {
      return;
    }

    try {
      await updateProject({
        projectId,
        status: project.status === "paused" ? "active" : "paused",
      });
      void queryClient.invalidateQueries({ queryKey: convexQueryKeys.dockProjects });
    } catch (error) {
      showError(toUserFacingErrorMessage(error, "Could not update the project status."));
    }
  }

  async function handleConfirmDeleteProject() {
    try {
      await deleteProject({ projectId });
      void queryClient.invalidateQueries({ queryKey: convexQueryKeys.dockProjects });
      onDeleteSuccess();
    } catch (error) {
      showError(toUserFacingErrorMessage(error, "Could not delete the project."));
    }
  }

  return {
    state,
    editNameValue,
    editProjectImageDataUrl,
    editClientValue,
    editClientAvatarDataUrl,
    editStartDate,
    editEndDate,
    editPhasesValue,
    isSavingProject,
    isSavingClient,
    projectImageInputRef,
    clientAvatarInputRef,
    setOpen,
    openEditNameDialog,
    openEditClientDialog,
    openTimelineDialog,
    openPhasesDialog,
    setEditNameValue,
    handleProjectImageInputChange,
    handleRemoveProjectImage,
    setEditClientValue,
    handleClientAvatarInputChange,
    handleRemoveClientAvatar,
    setEditStartDate,
    setEditEndDate,
    setEditPhasesValue,
    handleSaveProject,
    handleSaveClient,
    handleSaveTimeline,
    handleSavePhases,
    handleToggleProjectPaused,
    handleConfirmDeleteProject,
  };
}
