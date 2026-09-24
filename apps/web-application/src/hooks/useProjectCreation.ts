import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useMutation as useConvexMutation, useQuery as useConvexQuery } from "convex/react";
import { useNavigate } from "@tanstack/react-router";
import { AI_ROADMAPS } from "@/lib/constants";
import { api } from "@/lib/convex";
import { toUserFacingErrorMessage } from "@/lib/errors";
import { createProjectFromDraft } from "@/features/project-creation/createProjectFromDraft";
import { useProjectDraft } from "@/features/project-creation/useProjectDraft";
import { convexQueryKeys } from "@/lib/queryKeys";
import {
  useProjectCreationFlow,
  type ProjectCreationStep as Step,
  type WorkflowStep,
} from "@/features/project-creation/useProjectCreationFlow";

export type { WorkflowStep, Step };
export type { Method, PhaseItem } from "../../shared/project-creation";

export function useProjectCreation() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const createProject = useConvexMutation(api.projects.create);
  const r2GenerateUploadUrl = useConvexMutation(api.r2.generateUploadUrl);
  const r2SyncMetadata = useConvexMutation(api.r2.syncMetadata);
  const existingClientsResult = useConvexQuery(api.clients.listForCurrentUser, {});
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
  const existingClients = useMemo(() => existingClientsResult ?? [], [existingClientsResult]);

  async function handleCreate() {
    if (!draft.method) {
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
      void queryClient.invalidateQueries({ queryKey: convexQueryKeys.dockProjects });
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
    hasProjectImage: Boolean(draft.projectImage),
    clientName: draft.clientName,
    clientEmail: draft.clientEmail,
    hasClientAvatar: Boolean(draft.clientAvatar),
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
    projectImage: draft.projectImage,
    clientMode: draft.clientMode,
    selectedExistingClientName: draft.selectedExistingClientName,
    clientName: draft.clientName,
    clientEmail: draft.clientEmail,
    clientAvatar: draft.clientAvatar,
    existingClients,
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
    projectImageInputRef: draftState.projectImageInputRef,
    setProjectName: draftState.setProjectName,
    setProjectImage: draftState.setProjectImage,
    setClientMode: draftState.setClientMode,
    setSelectedExistingClientName: draftState.setSelectedExistingClientName,
    setClientName: draftState.setClientName,
    setClientEmail: draftState.setClientEmail,
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
    handleProjectImageFileChange: draftState.handleProjectImageFileChange,
    handleAvatarFileChange: draftState.handleAvatarFileChange,
    handleClientAvatarChange: draftState.setClientAvatar,
    selectExistingClient: draftState.selectExistingClient,
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
