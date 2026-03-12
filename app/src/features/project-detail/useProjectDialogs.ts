import { useState } from "react";
import { useMutation as useConvexMutation } from "convex/react";
import { api } from "@/lib/convex";
import { toUserFacingErrorMessage } from "@/lib/errors";
import { formatInputDate, parseInputDate } from "@/lib/format";
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
  const [state, setState] = useState<ProjectDialogState>(DEFAULT_DIALOG_STATE);
  const [editNameValue, setEditNameValue] = useState("");
  const [editClientValue, setEditClientValue] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editPhasesValue, setEditPhasesValue] = useState("");

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
    setOpen("editClient", true);
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
    if (!clientName || clientName === project.clientName) {
      setOpen("editClient", false);
      return;
    }

    try {
      await updateProject({ projectId, clientName });
      setOpen("editClient", false);
    } catch (error) {
      showError(toUserFacingErrorMessage(error, "Could not update the client."));
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

    if (nextNames.length === 0) {
      showError("At least one phase is required.");
      return;
    }

    const usedExistingIds = new Set<string>();
    const phases = nextNames.map((name, index) => {
      const exactMatch = project.phases.find(
        (phase: Phase) => phase.name === name && !usedExistingIds.has(phase.id),
      );

      if (exactMatch) {
        usedExistingIds.add(exactMatch.id);
        return { id: exactMatch.id as Id<"phases">, name };
      }

      const sameIndexPhase = project.phases[index];
      if (sameIndexPhase && !usedExistingIds.has(sameIndexPhase.id)) {
        usedExistingIds.add(sameIndexPhase.id);
        return { id: sameIndexPhase.id as Id<"phases">, name };
      }

      return { name };
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
    editStartDate,
    editEndDate,
    editPhasesValue,
    setOpen,
    openEditNameDialog,
    openEditClientDialog,
    openTimelineDialog,
    openPhasesDialog,
    setEditNameValue,
    setEditClientValue,
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
