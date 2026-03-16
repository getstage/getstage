import { useRef, useState, type ChangeEvent } from "react";
import { useMutation as useConvexMutation } from "convex/react";
import { api } from "@/lib/convex";
import { toUserFacingErrorMessage } from "@/lib/errors";
import { formatInputDate, parseInputDate } from "@/lib/format";
import {
  prepareClientAvatarUpload,
  uploadFileToR2,
} from "@/lib/r2Uploads";
import { syncPhasesInputSchema } from "@/data-ops/schema";
import type {
  ProjectDialogController,
  ProjectDialogKey,
  ProjectDialogState,
} from "@/features/project-detail/controllers";
import type { Phase, Project } from "@/types";
import type { Id } from "../../../convex/_generated/dataModel";

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
  const updateProject = useConvexMutation(api.projects.update);
  const syncPhases = useConvexMutation(api.projects.syncPhases);
  const deleteProject = useConvexMutation(api.projects.deleteById);
  const r2GenerateUploadUrl = useConvexMutation(api.r2.generateUploadUrl);
  const r2SyncMetadata = useConvexMutation(api.r2.syncMetadata);
  const [state, setState] = useState<ProjectDialogState>(DEFAULT_DIALOG_STATE);
  const [editNameValue, setEditNameValue] = useState("");
  const [editClientValue, setEditClientValue] = useState("");
  const [editClientAvatarDataUrl, setEditClientAvatarDataUrl] = useState<string | null>(null);
  const [pendingClientAvatarFile, setPendingClientAvatarFile] = useState<File | null>(null);
  const [isSavingClient, setIsSavingClient] = useState(false);
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editPhasesValue, setEditPhasesValue] = useState("");
  const clientAvatarInputRef = useRef<HTMLInputElement>(null);

  function setOpen(dialog: ProjectDialogKey, open: boolean) {
    setState((current) => ({ ...current, [dialog]: open }));
  }

  function openEditNameDialog() {
    if (!project) {
      return;
    }

    setEditNameValue(project.name);
    setOpen("editName", true);
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

  async function handleSaveProjectName() {
    if (!project) {
      return;
    }

    const name = editNameValue.trim();
    if (!name || name === project.name) {
      setOpen("editName", false);
      return;
    }

    try {
      await updateProject({ projectId, name });
      setOpen("editName", false);
    } catch (error) {
      showError(toUserFacingErrorMessage(error, "Could not update the project name."));
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

    try {
      await syncPhases({ projectId, phases });
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
    } catch (error) {
      showError(toUserFacingErrorMessage(error, "Could not update the project status."));
    }
  }

  async function handleConfirmDeleteProject() {
    try {
      await deleteProject({ projectId });
      onDeleteSuccess();
    } catch (error) {
      showError(toUserFacingErrorMessage(error, "Could not delete the project."));
    }
  }

  return {
    state,
    editNameValue,
    editClientValue,
    editClientAvatarDataUrl,
    editStartDate,
    editEndDate,
    editPhasesValue,
    isSavingClient,
    clientAvatarInputRef,
    setOpen,
    openEditNameDialog,
    openEditClientDialog,
    openTimelineDialog,
    openPhasesDialog,
    setEditNameValue,
    setEditClientValue,
    handleClientAvatarInputChange,
    handleRemoveClientAvatar,
    setEditStartDate,
    setEditEndDate,
    setEditPhasesValue,
    handleSaveProjectName,
    handleSaveClient,
    handleSaveTimeline,
    handleSavePhases,
    handleToggleProjectPaused,
    handleConfirmDeleteProject,
  };
}
