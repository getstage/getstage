import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { DEFAULT_PHASES, AI_ROADMAPS } from "@/lib/constants";
import { addDays, formatInputDate } from "@/lib/format";
import { prepareClientAvatarUpload, prepareProjectMarkerUpload } from "@/lib/r2Uploads";
import { toUserFacingErrorMessage } from "@/lib/errors";
import type { ProjectType } from "@/types";
import {
  buildRoadmapPreview,
  createInitialPhaseItems,
  getActivePhaseItems,
  type Method,
  type PhaseItem,
  type ProjectDraft,
  type RoadmapTemplateItem,
} from "../../../shared/project-creation";

type UseProjectDraftOptions = {
  avatarFetchDelayMs?: number;
  onError?: (message: string) => void;
};

export type UseProjectDraftResult = {
  draft: ProjectDraft;
  activePhases: PhaseItem[];
  roadmap: RoadmapTemplateItem[];
  editingPhaseId: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  projectImageInputRef: React.RefObject<HTMLInputElement | null>;
  setProjectName: (value: string) => void;
  setProjectImage: (value: string | null) => void;
  setClientMode: (value: "existing" | "new") => void;
  setSelectedExistingClientName: (value: string) => void;
  setClientName: (value: string) => void;
  setClientEmail: (value: string) => void;
  setClientAvatar: (value: string | null) => void;
  setProjectType: (value: ProjectType | null) => void;
  setTypeOtherLabel: (value: string) => void;
  setMethod: (value: Method) => void;
  setAvatarUrlOpen: (open: boolean) => void;
  setAvatarUrlInput: (value: string) => void;
  setEditingPhaseId: (phaseId: string | null) => void;
  setStartDate: (value: string) => void;
  setEndDate: (value: string) => void;
  reset: () => void;
  handleProjectImageFileChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleAvatarFileChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  selectExistingClient: (client: { name: string; email?: string; avatarUrl?: string }) => void;
  fetchAvatarFromUrl: () => void;
  togglePhase: (phaseId: string) => void;
  addPhase: (name?: string) => void;
  renamePhase: (phaseId: string, name: string) => void;
  removePhase: (phaseId: string) => void;
  handleDragStart: (event: DragEvent<HTMLDivElement>, phaseId: string) => void;
  handleDrop: (event: DragEvent<HTMLDivElement>, targetId: string) => void;
  handleDragEnd: () => void;
};

function createInitialDraft(): ProjectDraft {
  const today = new Date();

  return {
    projectName: "",
    projectImage: null,
    pendingProjectImageFile: null,
    clientMode: "new",
    selectedExistingClientName: "",
    clientName: "",
    clientEmail: "",
    clientAvatar: null,
    pendingAvatarFile: null,
    avatarUrlOpen: false,
    avatarUrlInput: "",
    avatarFetching: false,
    projectType: null,
    typeOtherLabel: "",
    method: null,
    startDate: formatInputDate(today),
    endDate: formatInputDate(addDays(today, 30)),
    phases: createInitialPhaseItems(DEFAULT_PHASES),
  };
}

export function useProjectDraft({
  avatarFetchDelayMs = 0,
  onError,
}: UseProjectDraftOptions = {}): UseProjectDraftResult {
  const [draft, setDraft] = useState<ProjectDraft>(() => createInitialDraft());
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  const [draggingPhaseId, setDraggingPhaseId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectImageInputRef = useRef<HTMLInputElement>(null);
  const avatarTimeoutRef = useRef<number | undefined>(undefined);
  const phaseCounterRef = useRef(DEFAULT_PHASES.length);

  const activePhases = useMemo(() => getActivePhaseItems(draft.phases), [draft.phases]);
  const roadmap = useMemo(
    () =>
      buildRoadmapPreview({
        activePhases,
        method: draft.method,
        projectType: draft.projectType,
        aiRoadmaps: AI_ROADMAPS,
      }),
    [activePhases, draft.method, draft.projectType],
  );

  useEffect(() => {
    return () => {
      if (avatarTimeoutRef.current !== undefined) {
        window.clearTimeout(avatarTimeoutRef.current);
      }
    };
  }, []);

  function reset() {
    if (avatarTimeoutRef.current !== undefined) {
      window.clearTimeout(avatarTimeoutRef.current);
    }

    phaseCounterRef.current = DEFAULT_PHASES.length;
    setEditingPhaseId(null);
    setDraggingPhaseId(null);
    setDraft(createInitialDraft());
  }

  function setProjectName(value: string) {
    setDraft((current) => ({ ...current, projectName: value }));
  }

  function setProjectImage(value: string | null) {
    setDraft((current) => ({
      ...current,
      projectImage: value,
      pendingProjectImageFile:
        value === null || !value.startsWith("data:") ? null : current.pendingProjectImageFile,
    }));
  }

  function setClientMode(value: "existing" | "new") {
    setDraft((current) => ({
      ...current,
      clientMode: value,
      selectedExistingClientName: value === "new" ? "" : current.selectedExistingClientName,
      clientName:
        value === "new"
          ? current.clientMode === "existing"
            ? ""
            : current.clientName
          : current.selectedExistingClientName,
      clientEmail: value === "new" ? "" : current.clientEmail,
      clientAvatar: value === "new" ? null : current.clientAvatar,
      pendingAvatarFile: value === "new" ? null : current.pendingAvatarFile,
    }));
  }

  function setSelectedExistingClientName(value: string) {
    setDraft((current) => ({
      ...current,
      selectedExistingClientName: value,
    }));
  }

  function setClientName(value: string) {
    setDraft((current) => ({
      ...current,
      clientMode: "new",
      selectedExistingClientName: "",
      clientName: value,
      clientEmail: current.clientMode === "existing" ? "" : current.clientEmail,
      clientAvatar: current.clientMode === "existing" ? null : current.clientAvatar,
      pendingAvatarFile: current.clientMode === "existing" ? null : current.pendingAvatarFile,
    }));
  }

  function setClientEmail(value: string) {
    setDraft((current) => ({ ...current, clientEmail: value }));
  }

  function setClientAvatar(value: string | null) {
    setDraft((current) => ({
      ...current,
      clientAvatar: value,
      pendingAvatarFile: value === null || !value.startsWith("data:") ? null : current.pendingAvatarFile,
    }));
  }

  function setProjectType(value: ProjectType | null) {
    setDraft((current) => ({
      ...current,
      projectType: value,
      typeOtherLabel: value === "other" ? current.typeOtherLabel : "",
    }));
  }

  function setTypeOtherLabel(value: string) {
    setDraft((current) => ({ ...current, typeOtherLabel: value }));
  }

  function setMethod(value: Method) {
    setDraft((current) => ({ ...current, method: value }));
  }

  function setAvatarUrlOpen(open: boolean) {
    setDraft((current) => ({ ...current, avatarUrlOpen: open }));
  }

  function setAvatarUrlInput(value: string) {
    setDraft((current) => ({ ...current, avatarUrlInput: value }));
  }

  function setStartDate(value: string) {
    setDraft((current) => ({ ...current, startDate: value }));
  }

  function setEndDate(value: string) {
    setDraft((current) => ({ ...current, endDate: value }));
  }

  async function handleProjectImageFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const prepared = await prepareProjectMarkerUpload(file);
      setDraft((current) => ({
        ...current,
        pendingProjectImageFile: prepared.file,
        projectImage: prepared.previewUrl,
      }));
    } catch (error) {
      onError?.(toUserFacingErrorMessage(error, "Could not prepare this image."));
    } finally {
      event.target.value = "";
    }
  }

  async function handleAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const prepared = await prepareClientAvatarUpload(file);
      setDraft((current) => ({
        ...current,
        pendingAvatarFile: prepared.file,
        clientAvatar: prepared.previewUrl,
      }));
    } catch (error) {
      onError?.(toUserFacingErrorMessage(error, "Could not prepare this image."));
    }
  }

  function fetchAvatarFromUrl() {
    const url = draft.avatarUrlInput.trim();
    if (!url || draft.avatarFetching) {
      return;
    }

    if (avatarFetchDelayMs <= 0) {
      setDraft((current) => ({
        ...current,
        pendingAvatarFile: null,
        clientAvatar: url,
      }));
      return;
    }

    setDraft((current) => ({ ...current, avatarFetching: true }));
    avatarTimeoutRef.current = window.setTimeout(() => {
      setDraft((current) => ({
        ...current,
        pendingAvatarFile: null,
        clientAvatar: url,
        avatarFetching: false,
      }));
    }, avatarFetchDelayMs);
  }

  function selectExistingClient(client: { name: string; email?: string; avatarUrl?: string }) {
    setDraft((current) => ({
      ...current,
      clientMode: "existing",
      selectedExistingClientName: client.name,
      clientName: client.name,
      clientEmail: client.email ?? "",
      clientAvatar: client.avatarUrl ?? null,
      pendingAvatarFile: null,
    }));
  }

  function togglePhase(phaseId: string) {
    setDraft((current) => ({
      ...current,
      phases: current.phases.map((phase) =>
        phase.id === phaseId ? { ...phase, on: !phase.on } : phase,
      ),
    }));
  }

  function addPhase(name?: string) {
    const id = `phase-${phaseCounterRef.current++}`;
    const trimmedName = name?.trim() ?? "";
    const nextName = trimmedName || "New Phase";
    setDraft((current) => ({
      ...current,
      phases: [...current.phases, { id, name: nextName, on: true }],
    }));
    setEditingPhaseId(trimmedName ? null : id);
  }

  function renamePhase(phaseId: string, name: string) {
    const trimmed = name.trim();
    setDraft((current) => ({
      ...current,
      phases: current.phases.map((phase) =>
        phase.id === phaseId ? { ...phase, name: trimmed || "New Phase" } : phase,
      ),
    }));
  }

  function removePhase(phaseId: string) {
    setDraft((current) => {
      if (current.phases.length <= 1) {
        return current;
      }

      return {
        ...current,
        phases: current.phases.filter((phase) => phase.id !== phaseId),
      };
    });

    if (editingPhaseId === phaseId) {
      setEditingPhaseId(null);
    }
    if (draggingPhaseId === phaseId) {
      setDraggingPhaseId(null);
    }
  }

  function reorderPhases(sourceId: string, targetId: string) {
    if (sourceId === targetId) {
      return;
    }

    setDraft((current) => {
      const sourceIndex = current.phases.findIndex((phase) => phase.id === sourceId);
      const targetIndex = current.phases.findIndex((phase) => phase.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) {
        return current;
      }

      const next = [...current.phases];
      const [moved] = next.splice(sourceIndex, 1);
      if (!moved) {
        return current;
      }

      next.splice(targetIndex, 0, moved);
      return {
        ...current,
        phases: next,
      };
    });
  }

  function handleDragStart(event: DragEvent<HTMLDivElement>, phaseId: string) {
    setDraggingPhaseId(phaseId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", phaseId);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>, targetId: string) {
    event.preventDefault();
    const sourceId = draggingPhaseId ?? event.dataTransfer.getData("text/plain");
    if (sourceId) {
      reorderPhases(sourceId, targetId);
    }
    setDraggingPhaseId(null);
  }

  function handleDragEnd() {
    setDraggingPhaseId(null);
  }

  return {
    draft,
    activePhases,
    roadmap,
    editingPhaseId,
    fileInputRef,
    projectImageInputRef,
    setProjectName,
    setProjectImage,
    setClientMode,
    setSelectedExistingClientName,
    setClientName,
    setClientEmail,
    setClientAvatar,
    setProjectType,
    setTypeOtherLabel,
    setMethod,
    setAvatarUrlOpen,
    setAvatarUrlInput,
    setEditingPhaseId,
    setStartDate,
    setEndDate,
    reset,
    handleProjectImageFileChange,
    handleAvatarFileChange,
    selectExistingClient,
    fetchAvatarFromUrl,
    togglePhase,
    addPhase,
    renamePhase,
    removePhase,
    handleDragStart,
    handleDrop,
    handleDragEnd,
  };
}
