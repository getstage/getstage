import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation as useConvexMutation, useQuery as useConvexQuery } from "convex/react";
import { useNavigate } from "@tanstack/react-router";
import { useActionError } from "@/hooks/useActionError";
import { api } from "@/lib/convex";
import { toUserFacingErrorMessage } from "@/lib/errors";
import { formatInputDate, parseInputDate } from "@/lib/format";
import { resolvePortalShareUrl } from "@/lib/portal";
import type { Phase } from "@/types";
import type { Id } from "../../convex/_generated/dataModel";

type ProjectDialogState = {
  share: boolean;
  editName: boolean;
  editClient: boolean;
  editTimeline: boolean;
  editPhases: boolean;
  deleteConfirm: boolean;
};

const DEFAULT_DIALOG_STATE: ProjectDialogState = {
  share: false,
  editName: false,
  editClient: false,
  editTimeline: false,
  editPhases: false,
  deleteConfirm: false,
};

export function useProjectDetail(projectId: Id<"projects">) {
  const navigate = useNavigate();
  const addTaskInputRef = useRef<HTMLInputElement>(null);
  const copyTimeoutRef = useRef<number | undefined>(undefined);
  const { actionError, showError } = useActionError();

  const [activePhaseId, setActivePhaseId] = useState<string | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [addTaskValue, setAddTaskValue] = useState("");
  const [copied, setCopied] = useState(false);
  const [dialogState, setDialogState] = useState<ProjectDialogState>(DEFAULT_DIALOG_STATE);
  const [editNameValue, setEditNameValue] = useState("");
  const [editClientValue, setEditClientValue] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editPhasesValue, setEditPhasesValue] = useState("");

  const project = useConvexQuery(api.projects.getById, { projectId });
  const isLoading = project === undefined;

  const createTask = useConvexMutation(api.tasks.create);
  const deleteTask = useConvexMutation(api.tasks.deleteById);
  const toggleTaskComplete = useConvexMutation(api.tasks.toggleComplete);
  const updateProject = useConvexMutation(api.projects.update);
  const syncPhases = useConvexMutation(api.projects.syncPhases);
  const deleteProject = useConvexMutation(api.projects.deleteById);
  const setPortalEnabled = useConvexMutation(api.portal.setEnabled);

  const currentPhase = useMemo(() => {
    if (!project) {
      return null;
    }

    return (
      project.phases.find((phase: Phase) => phase.id === activePhaseId) ??
      project.phases.find((phase: Phase) => phase.status === "active") ??
      project.phases[0] ??
      null
    );
  }, [activePhaseId, project]);

  const shareUrl = resolvePortalShareUrl({
    shareToken: project?.shareToken,
    shareUrl: project?.shareUrl,
  });
  const clientAccess = project?.portalEnabled ?? true;

  useEffect(() => {
    if (!showAddTask) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      addTaskInputRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [showAddTask]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current !== undefined) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  function setDialogOpen(dialog: keyof ProjectDialogState, open: boolean) {
    setDialogState((current) => ({ ...current, [dialog]: open }));
  }

  function openEditNameDialog() {
    if (!project) {
      return;
    }

    setEditNameValue(project.name);
    setDialogOpen("editName", true);
  }

  function openEditClientDialog() {
    if (!project) {
      return;
    }

    setEditClientValue(project.clientName);
    setDialogOpen("editClient", true);
  }

  function openTimelineDialog() {
    if (!project) {
      return;
    }

    setEditStartDate(formatInputDate(new Date(project.startDate)));
    setEditEndDate(formatInputDate(new Date(project.endDate)));
    setDialogOpen("editTimeline", true);
  }

  function openPhasesDialog() {
    if (!project) {
      return;
    }

    setEditPhasesValue(project.phases.map((phase: Phase) => phase.name).join(", "));
    setDialogOpen("editPhases", true);
  }

  async function handleAddTaskSubmit() {
    const phaseId = currentPhase?.id as Id<"phases"> | undefined;
    const title = addTaskValue.trim();

    if (!phaseId || !title) {
      return;
    }

    try {
      await createTask({ phaseId, title });
      setAddTaskValue("");
      setShowAddTask(false);
    } catch (error) {
      showError(toUserFacingErrorMessage(error, "Could not create the task."));
    }
  }

  async function handleSaveProjectName() {
    if (!project) {
      return;
    }

    const name = editNameValue.trim();
    if (!name || name === project.name) {
      setDialogOpen("editName", false);
      return;
    }

    try {
      await updateProject({ projectId, name });
      setDialogOpen("editName", false);
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
      setDialogOpen("editClient", false);
      return;
    }

    try {
      await updateProject({ projectId, clientName });
      setDialogOpen("editClient", false);
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
      setDialogOpen("editTimeline", false);
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
      setDialogOpen("editPhases", false);
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
      navigate({ to: "/dashboard" });
    } catch (error) {
      showError(toUserFacingErrorMessage(error, "Could not delete the project."));
    }
  }

  async function handleToggleTask(taskId: Id<"tasks">) {
    try {
      await toggleTaskComplete({ taskId });
    } catch (error) {
      showError(toUserFacingErrorMessage(error, "Could not update the task."));
    }
  }

  async function handleDeleteTask(taskId: Id<"tasks">) {
    try {
      await deleteTask({ taskId });
    } catch (error) {
      showError(toUserFacingErrorMessage(error, "Could not delete the task."));
    }
  }

  async function handleTogglePortalEnabled() {
    try {
      await setPortalEnabled({
        projectId,
        isEnabled: !clientAccess,
      });
    } catch (error) {
      showError(toUserFacingErrorMessage(error, "Could not update client access."));
    }
  }

  async function handleCopyShareUrl() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);

      if (copyTimeoutRef.current !== undefined) {
        window.clearTimeout(copyTimeoutRef.current);
      }

      copyTimeoutRef.current = window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      showError(toUserFacingErrorMessage(error, "Could not copy the share link."));
    }
  }

  return {
    project,
    isLoading,
    currentPhase,
    projectId,
    shareUrl,
    clientAccess,
    actionError,
    addTaskInputRef,
    showAddTask,
    addTaskValue,
    copied,
    dialogState,
    editNameValue,
    editClientValue,
    editStartDate,
    editEndDate,
    editPhasesValue,
    setActivePhaseId,
    setShowAddTask,
    setAddTaskValue,
    setEditNameValue,
    setEditClientValue,
    setEditStartDate,
    setEditEndDate,
    setEditPhasesValue,
    setDialogOpen,
    openEditNameDialog,
    openEditClientDialog,
    openTimelineDialog,
    openPhasesDialog,
    handleAddTaskSubmit,
    handleSaveProjectName,
    handleSaveClient,
    handleSaveTimeline,
    handleSavePhases,
    handleToggleProjectPaused,
    handleConfirmDeleteProject,
    handleToggleTask,
    handleDeleteTask,
    handleTogglePortalEnabled,
    handleCopyShareUrl,
  };
}
