import { useMemo, useState } from "react";
import { useMutation as useConvexMutation } from "convex/react";
import { projectDetailSchema } from "@stage/data-ops";
import { createProjectFromDraft } from "@/features/project-creation/createProjectFromDraft";
import { useProjectDraft } from "@/features/project-creation/useProjectDraft";
import { useClientsQuery } from "@/hooks/convex-data/useClientsQuery";
import { AI_ROADMAPS } from "@/lib/constants";
import { api } from "@/lib/convexApi";
import { isProjectUpgradeRequiredError, toUserFacingErrorMessage } from "@/lib/errors";
import {
  basicDetailsFormSchema,
  clientDetailsFormSchema,
  timelineFormSchema,
  type CreateProjectStep,
  type ExistingClientOption,
  type RoadmapMode,
} from "@/models/project/createProject";
import { getFirstZodError } from "@/lib/project/createProjectDates";

export function useCreateProjectFlow() {
  const [step, setStep] = useState<CreateProjectStep>("basic");
  const [basicDetailsError, setBasicDetailsError] = useState<string | null>(null);
  const [clientDetailsError, setClientDetailsError] = useState<string | null>(null);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [addingPhase, setAddingPhase] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState("");

  const draftState = useProjectDraft({
    onError: (message) => setCreateError(message),
  });
  const { draft, activePhases } = draftState;

  const { data: clientsQueryData } = useClientsQuery();
  const createProject = useConvexMutation(api.desktop.createProject);
  const r2GenerateUploadUrl = useConvexMutation(api.r2.generateUploadUrl);
  const r2SyncMetadata = useConvexMutation(api.r2.syncMetadata);

  const existingClients = useMemo<ExistingClientOption[]>(() => {
    if (!clientsQueryData) {
      return [];
    }

    return clientsQueryData.map((client) => ({
      id: String(client.id),
      name: client.name,
      email: client.email,
      avatarUrl: client.avatarUrl,
    }));
  }, [clientsQueryData]);

  const selectedExistingClientId = useMemo(() => {
    if (!draft.selectedExistingClientName) return "";
    return (
      existingClients.find((client) => client.name === draft.selectedExistingClientName)?.id ?? ""
    );
  }, [draft.selectedExistingClientName, existingClients]);

  const roadmapMode: RoadmapMode = draft.method === "manual" ? "manual" : "smart";
  const manualPhases = useMemo(() => draft.phases.map((phase) => phase.name), [draft.phases]);
  const enabledPhases = useMemo(
    () => new Set(draft.phases.filter((phase) => phase.on).map((phase) => phase.name)),
    [draft.phases],
  );

  function continueFromBasicDetails() {
    const result = basicDetailsFormSchema.safeParse({ projectName: draft.projectName });
    const error = getFirstZodError(result);
    setBasicDetailsError(error);
    if (error) return;
    setStep("client");
  }

  function continueFromClientDetails() {
    const result = clientDetailsFormSchema.safeParse({
      clientMode: draft.clientMode,
      clientName: draft.clientName,
      clientEmail: draft.clientEmail,
      hasClientPhoto: Boolean(draft.pendingAvatarFile || draft.clientAvatar?.trim()),
    });
    const error = getFirstZodError(result);
    setClientDetailsError(error);
    if (error) return;
    setStep("type");
  }

  function selectClientMode(mode: "new" | "existing") {
    draftState.setClientMode(mode);
    setClientDetailsError(null);

    if (mode === "new") {
      return;
    }

    const firstClient = existingClients[0];
    if (firstClient) {
      selectExistingClient(firstClient);
    }
  }

  function selectExistingClient(client: ExistingClientOption) {
    draftState.selectExistingClient({
      name: client.name,
      email: client.email,
      avatarUrl: client.avatarUrl,
    });
    setClientDetailsError(null);
  }

  function continueFromTimeline() {
    const result = timelineFormSchema.safeParse({
      startDate: draft.startDate,
      endDate: draft.endDate,
    });
    const error = getFirstZodError(result);
    setTimelineError(error);
    if (error) return;
    if (!draft.method) {
      draftState.setMethod("ai");
    }
    setStep("roadmap");
  }

  function setRoadmapMode(mode: RoadmapMode) {
    draftState.setMethod(mode === "smart" ? "ai" : "manual");
    setCreateError(null);
  }

  function togglePhaseByName(phaseName: string) {
    const phase = draft.phases.find((item) => item.name === phaseName);
    if (phase) {
      draftState.togglePhase(phase.id);
    }
  }

  function addManualPhase() {
    const trimmedName = newPhaseName.trim();
    if (!trimmedName) return;
    draftState.addPhase(trimmedName);
    setNewPhaseName("");
    setAddingPhase(false);
  }

  async function handleCreateProject() {
    if (!draft.method) {
      setCreateError("Choose how you want to structure this project.");
      return;
    }

    if (activePhases.length < 2) {
      setCreateError("Select at least two phases.");
      return;
    }

    const hasClientPhoto = Boolean(draft.pendingAvatarFile || draft.clientAvatar?.trim());
    if (!hasClientPhoto) {
      setCreateError("Upload a client photo to continue.");
      return;
    }

    setIsCreatingProject(true);
    setCreateError(null);

    try {
      const createdProject = projectDetailSchema.parse(
        await createProjectFromDraft({
          draft,
          activePhases,
          createProject,
          generateUploadUrl: r2GenerateUploadUrl,
          syncMetadata: r2SyncMetadata,
          aiRoadmaps: AI_ROADMAPS,
        }),
      );
      setCreatedProjectId(createdProject.id);
      setStep("success");
    } catch (error) {
      if (isProjectUpgradeRequiredError(error)) {
        setCreateError(null);
        return { upgradeRequired: true as const };
      }

      setCreateError(toUserFacingErrorMessage(error, "Could not create project."));
    } finally {
      setIsCreatingProject(false);
    }

    return { upgradeRequired: false as const };
  }

  const projectImageLabel =
    draft.pendingProjectImageFile?.name ??
    (draft.projectImage ? "Image selected" : "Upload image");

  return {
    step,
    createdProjectId,
    draftState,
    draft,
    existingClients,
    selectedExistingClientId,
    basicDetailsError,
    clientDetailsError,
    timelineError,
    createError,
    isCreatingProject,
    roadmapMode,
    manualPhases,
    enabledPhases,
    addingPhase,
    newPhaseName,
    projectImageLabel,
    continueFromBasicDetails,
    continueFromClientDetails,
    continueFromTimeline,
    selectClientMode,
    selectExistingClient,
    setRoadmapMode,
    togglePhaseByName,
    addManualPhase,
    setAddingPhase,
    setNewPhaseName,
    setStep,
    setBasicDetailsError,
    setClientDetailsError,
    setTimelineError,
    handleCreateProject,
  };
}
