import type { ChangeEvent, DragEvent } from "react";
import type { CreateProjectInput, ProjectType } from "../src/types";

export type Method = "ai" | "manual" | null;

export type PhaseItem = {
  id: string;
  name: string;
  on: boolean;
};

export type RoadmapTemplateItem = {
  name: string;
  tasks: string[];
};

export type ProjectDraft = {
  projectName: string;
  projectImage: string | null;
  pendingProjectImageFile: File | null;
  clientMode: "existing" | "new";
  selectedExistingClientName: string;
  clientName: string;
  clientAvatar: string | null;
  pendingAvatarFile: File | null;
  avatarUrlOpen: boolean;
  avatarUrlInput: string;
  avatarFetching: boolean;
  projectType: ProjectType | null;
  method: Method;
  startDate: string;
  endDate: string;
  phases: PhaseItem[];
};

export type ProjectDraftActions = {
  setProjectName: (value: string) => void;
  setProjectImage: (value: string | null) => void;
  setClientMode: (value: "existing" | "new") => void;
  setSelectedExistingClientName: (value: string) => void;
  setClientName: (value: string) => void;
  setClientAvatar: (value: string | null) => void;
  setProjectType: (value: ProjectType | null) => void;
  setMethod: (value: Method) => void;
  setAvatarUrlOpen: (open: boolean) => void;
  setAvatarUrlInput: (value: string) => void;
  setEditingPhaseId: (phaseId: string | null) => void;
  setStartDate: (value: string) => void;
  setEndDate: (value: string) => void;
  clearError?: () => void;
  reset: () => void;
  handleAvatarFileChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  fetchAvatarFromUrl: () => void;
  togglePhase: (phaseId: string) => void;
  addPhase: () => void;
  renamePhase: (phaseId: string, name: string) => void;
  removePhase: (phaseId: string) => void;
  handleDragStart: (event: DragEvent<HTMLDivElement>, phaseId: string) => void;
  handleDrop: (event: DragEvent<HTMLDivElement>, targetId: string) => void;
  handleDragEnd: () => void;
};

export type PreparedProjectPayload = CreateProjectInput;

export function createInitialPhaseItems(defaultPhases: readonly string[]) {
  return defaultPhases.map((name, index) => ({ id: `phase-${index}`, name, on: true }));
}

export function getActivePhaseItems(phases: PhaseItem[]) {
  return phases.filter((phase) => phase.on);
}

export function buildRoadmapPreview({
  activePhases,
  method,
  projectType,
  aiRoadmaps,
}: {
  activePhases: PhaseItem[];
  method: Method;
  projectType: ProjectType | null;
  aiRoadmaps: Record<ProjectType, RoadmapTemplateItem[]>;
}) {
  if (method === "manual") {
    return activePhases.map((phase) => ({ name: phase.name, tasks: [] }));
  }

  if (!projectType) {
    return [];
  }

  return aiRoadmaps[projectType];
}

export function buildPreparedProjectPayload({
  projectName,
  projectImageUrl,
  clientName,
  clientAvatarUrl,
  projectType,
  method,
  startDate,
  endDate,
  activePhases,
  aiRoadmaps,
}: {
  projectName: string;
  projectImageUrl?: string;
  clientName: string;
  clientAvatarUrl?: string;
  projectType: ProjectType;
  method: Exclude<Method, null>;
  startDate: number;
  endDate: number;
  activePhases: PhaseItem[];
  aiRoadmaps: Record<ProjectType, RoadmapTemplateItem[]>;
}): PreparedProjectPayload {
  const phases =
    method === "manual"
      ? activePhases
          .map((phase) => phase.name.trim())
          .filter((name) => name.length > 0)
          .map((name) => ({ name }))
      : aiRoadmaps[projectType].map((phase) => ({
          name: phase.name,
          tasks: phase.tasks,
        }));

  return {
    name: projectName.trim(),
    projectImageUrl,
    clientName: clientName.trim(),
    clientAvatarUrl,
    type: projectType,
    method,
    startDate,
    endDate,
    phases,
  };
}
