import { useState } from "react";
import { useMutation as useConvexMutation } from "convex/react";
import { useNavigate } from "@tanstack/react-router";
import { AI_ROADMAPS } from "@/lib/constants";
import { api } from "@/lib/convex";
import { toUserFacingErrorMessage } from "@/lib/errors";
import { createProjectFromDraft } from "@/features/project-creation/createProjectFromDraft";
import { useProjectDraft } from "@/features/project-creation/useProjectDraft";
import {
  useProjectCreationFlow,
  type ProjectCreationStep as Step,
  type WorkflowStep,
} from "@/features/project-creation/useProjectCreationFlow";

export type { WorkflowStep, Step };
export type { Method, PhaseItem } from "../../shared/project-creation";

export function useProjectCreation() {
  const navigate = useNavigate();
  const createProject = useConvexMutation(api.projects.create);
  const r2GenerateUploadUrl = useConvexMutation(api.r2.generateUploadUrl);
  const r2SyncMetadata = useConvexMutation(api.r2.syncMetadata);
  const [isCreating, setIsCreating] = useState(false);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const draftState = useProjectDraft({
    avatarFetchDelayMs: 800,
    onError: (message) => {
      setErrorMessage(message);
    },
  });
  const { draft, activePhases, roadmap } = draftState;

  async function handleCreate() {
    if (!draft.projectType || !draft.method) {
      return;
    }

    setIsCreating(true);
    setErrorMessage(null);

    try {
      const project = await createProjectFromDraft({
        draft,
        activePhases,
      createProject,
      generateUploadUrl: r2GenerateUploadUrl,
      syncMetadata: r2SyncMetadata,
      aiRoadmaps: AI_ROADMAPS,
    });
      setCreatedProjectId(project.id);
      flow.setStep("success");
    } catch (error) {
      setErrorMessage(toUserFacingErrorMessage(error, "Could not create the project."));
    } finally {
      setIsCreating(false);
    }
  }

  function handleViewProject() {
    if (createdProjectId) {
      navigate({ to: "/project/$id", params: { id: createdProjectId } });
      return;
    }
    navigate({ to: "/dashboard" });
  }

  const flow = useProjectCreationFlow({
    projectName: draft.projectName,
    clientName: draft.clientName,
    projectType: draft.projectType,
    method: draft.method,
    startDate: draft.startDate,
    endDate: draft.endDate,
    activePhasesLength: activePhases.length,
    roadmapLength: roadmap.length,
    isCreating,
    onError: setErrorMessage,
    onExit: () => {
      navigate({ to: "/dashboard" });
    },
    onCreate: () => {
      void handleCreate();
    },
  });

  return {
    step: flow.step,
    projectName: draft.projectName,
    clientName: draft.clientName,
    clientAvatar: draft.clientAvatar,
    projectType: draft.projectType,
    method: draft.method,
    isGenerating: flow.isGenerating,
    isCreating,
    createdProjectId,
    avatarUrlOpen: draft.avatarUrlOpen,
    avatarUrlInput: draft.avatarUrlInput,
    avatarFetching: draft.avatarFetching,
    editingPhaseId: draftState.editingPhaseId,
    startDate: draft.startDate,
    endDate: draft.endDate,
    phases: draft.phases,
    steps: flow.steps,
    roadmap,
    currentIndex: flow.currentIndex,
    canContinue: flow.canContinue,
    errorMessage,
    fileInputRef: draftState.fileInputRef,
    setProjectName: draftState.setProjectName,
    setClientName: draftState.setClientName,
    setClientAvatar: draftState.setClientAvatar,
    setProjectType: draftState.setProjectType,
    setMethod: draftState.setMethod,
    setAvatarUrlOpen: draftState.setAvatarUrlOpen,
    setAvatarUrlInput: draftState.setAvatarUrlInput,
    setEditingPhaseId: draftState.setEditingPhaseId,
    setStartDate: draftState.setStartDate,
    setEndDate: draftState.setEndDate,
    clearError: flow.clearError,
    goBack: flow.goBack,
    handleContinue: flow.handleContinue,
    handleViewProject,
    handleAvatarFileChange: draftState.handleAvatarFileChange,
    handleClientAvatarChange: draftState.setClientAvatar,
    fetchAvatarFromUrl: draftState.fetchAvatarFromUrl,
    togglePhase: draftState.togglePhase,
    addPhase: draftState.addPhase,
    renamePhase: draftState.renamePhase,
    removePhase: draftState.removePhase,
    handleDragStart: draftState.handleDragStart,
    handleDrop: draftState.handleDrop,
    handleDragEnd: draftState.handleDragEnd,
  };
}
