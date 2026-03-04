import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation as useConvexMutation, useQuery as useConvexQuery } from "convex/react";
import { useNavigate } from "@tanstack/react-router";
import { useActionError } from "@/hooks/useActionError";
import { api } from "@/lib/convex";
import { formatDateInput, parseDateInput } from "@/lib/format";
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
      project.phases.find((phase) => phase.id === activePhaseId) ??
      project.phases.find((phase) => phase.status === "active") ??
      project.phases[0] ??
      null
    );
  }, [activePhaseId, project]);

  const shareUrl = project?.shareUrl ?? `https://app.usestage.com/portal/${project?.shareToken ?? "demo"}`;
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

    setEditStartDate(formatDateInput(project.startDate));
    setEditEndDate(formatDateInput(project.endDate));
    setDialogOpen("editTimeline", true);
  }

  function openPhasesDialog() {
    if (!project) {
      return;
    }

    setEditPhasesValue(project.phases.map((phase) => phase.name).join(", "));
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
      showError(error instanceof Error ? error.message : "Could not create task.");
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
      showError(error instanceof Error ? error.message : "Could not update project name.");
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
      showError(error instanceof Error ? error.message : "Could not update client.");
    }
  }

  async function handleSaveTimeline() {
    try {
      await updateProject({
        projectId,
        startDate: parseDateInput(editStartDate),
        endDate: parseDateInput(editEndDate),
      });
      setDialogOpen("editTimeline", false);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not update timeline.");
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
        (phase) => phase.name === name && !usedExistingIds.has(phase.id),
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
      showError(error instanceof Error ? error.message : "Could not update phases.");
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
      showError(error instanceof Error ? error.message : "Could not update project status.");
    }
  }

  async function handleConfirmDeleteProject() {
    try {
      await deleteProject({ projectId });
      navigate({ to: "/dashboard" });
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not delete project.");
    }
  }

  async function handleToggleTask(taskId: Id<"tasks">) {
    try {
      await toggleTaskComplete({ taskId });
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not update task.");
    }
  }

  async function handleTogglePortalEnabled() {
    try {
      await setPortalEnabled({
        projectId,
        isEnabled: !clientAccess,
      });
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not update client access.");
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
      showError(error instanceof Error ? error.message : "Could not copy share link.");
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
    handleTogglePortalEnabled,
    handleCopyShareUrl,
  };
}
