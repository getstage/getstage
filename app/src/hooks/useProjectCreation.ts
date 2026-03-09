import { useEffect, useMemo, useRef, useState, type DragEvent, type ChangeEvent } from "react";
import { useMutation as useConvexMutation } from "convex/react";
import { useNavigate } from "@tanstack/react-router";
import { createProjectInputSchema } from "@/data-ops/schema";
import { AI_ROADMAPS, DEFAULT_PHASES, type RoadmapTemplateItem } from "@/lib/constants";
import { addDays, formatInputDate, parseInputDate } from "@/lib/format";
import { api } from "@/lib/convex";
import { toUserFacingErrorMessage } from "@/lib/errors";
import { dateRangeInputSchema, manualPhaseSelectionSchema, projectBasicsSchema } from "@/lib/validation";
import { readFileAsDataUrl } from "@/lib/utils";
import type { CreateProjectInput, ProjectType } from "@/types";

export type WorkflowStep = 1 | 2 | 3 | "4a" | "4m" | "4mb" | 5;
export type Step = WorkflowStep | "success";
export type Method = "ai" | "manual" | null;

export type PhaseItem = {
  id: string;
  name: string;
  on: boolean;
};

export function useProjectCreation() {
  const navigate = useNavigate();
  const createProject = useConvexMutation(api.projects.create);

  const [step, setStep] = useState<Step>(1);
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientAvatar, setClientAvatar] = useState<string | null>(null);
  const [projectType, setProjectType] = useState<ProjectType | null>(null);
  const [method, setMethod] = useState<Method>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [avatarUrlOpen, setAvatarUrlOpen] = useState(false);
  const [avatarUrlInput, setAvatarUrlInput] = useState("");
  const [avatarFetching, setAvatarFetching] = useState(false);
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  const [draggingPhaseId, setDraggingPhaseId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const generationTimeoutRef = useRef<number | undefined>(undefined);
  const avatarTimeoutRef = useRef<number | undefined>(undefined);
  const phaseCounterRef = useRef(DEFAULT_PHASES.length);

  const { startDefault, endDefault } = useMemo(() => {
    const today = new Date();
    return {
      startDefault: formatInputDate(today),
      endDefault: formatInputDate(addDays(today, 30)),
    };
  }, []);

  const [startDate, setStartDate] = useState(startDefault);
  const [endDate, setEndDate] = useState(endDefault);
  const [phases, setPhases] = useState<PhaseItem[]>(() =>
    DEFAULT_PHASES.map((name, index) => ({ id: `phase-${index}`, name, on: true })),
  );

  const steps = useMemo<WorkflowStep[]>(
    () => (method === "manual" ? [1, 2, 3, "4m", "4mb", 5] : [1, 2, 3, "4a", 5]),
    [method],
  );

  const activePhases = useMemo(() => phases.filter((phase) => phase.on), [phases]);

  const roadmap = useMemo<RoadmapTemplateItem[]>(() => {
    if (method === "manual") {
      return activePhases.map((phase) => ({ name: phase.name, tasks: [] }));
    }
    if (!projectType) {
      return [];
    }
    return AI_ROADMAPS[projectType];
  }, [activePhases, method, projectType]);

  const currentIndex =
    step === "success" ? steps.length - 1 : steps.indexOf(step);

  const canContinue = useMemo(() => {
    switch (step) {
      case 1:
        return projectName.trim().length > 0 && clientName.trim().length > 0;
      case 2:
        return projectType !== null;
      case 3:
        return method !== null;
      case "4a":
      case "4mb":
        return Boolean(startDate && endDate);
      case "4m":
        return activePhases.length >= 2;
      case 5:
        return roadmap.length > 0 && !isCreating;
      default:
        return false;
    }
  }, [
    activePhases.length,
    clientName,
    endDate,
    isCreating,
    method,
    projectName,
    projectType,
    roadmap.length,
    startDate,
    step,
  ]);

  useEffect(() => {
    return () => {
      if (generationTimeoutRef.current !== undefined) {
        window.clearTimeout(generationTimeoutRef.current);
      }
      if (avatarTimeoutRef.current !== undefined) {
        window.clearTimeout(avatarTimeoutRef.current);
      }
    };
  }, []);

  function clearError() {
    setErrorMessage(null);
  }

  function goBack() {
    if (isGenerating || isCreating || step === "success") {
      return;
    }

    clearError();
    const index = steps.indexOf(step as WorkflowStep);
    if (index > 0) {
      const previous = steps[index - 1];
      if (previous) {
        setStep(previous);
      }
      return;
    }

    navigate({ to: "/dashboard" });
  }

  function handleContinue() {
    if (!canContinue || isGenerating || isCreating) {
      return;
    }

    clearError();

    switch (step) {
      case 1:
        {
          const parsed = projectBasicsSchema.safeParse({
            projectName,
            clientName,
          });
          if (!parsed.success) {
            setErrorMessage(parsed.error.issues[0]?.message ?? "Please complete the project details.");
            return;
          }
        }
        setStep(2);
        return;
      case 2:
        setStep(3);
        return;
      case 3:
        setStep(method === "manual" ? "4m" : "4a");
        return;
      case "4m":
        {
          const parsed = manualPhaseSelectionSchema.safeParse(activePhases.length);
          if (!parsed.success) {
            setErrorMessage(parsed.error.issues[0]?.message ?? "Select at least two phases.");
            return;
          }
        }
        setStep("4mb");
        return;
      case "4mb":
        {
          const parsed = dateRangeInputSchema.safeParse({ startDate, endDate });
          if (!parsed.success) {
            setErrorMessage(parsed.error.issues[0]?.message ?? "Select a valid timeline.");
            return;
          }
        }
        setStep(5);
        return;
      case "4a":
        {
          const parsed = dateRangeInputSchema.safeParse({ startDate, endDate });
          if (!parsed.success) {
            setErrorMessage(parsed.error.issues[0]?.message ?? "Select a valid timeline.");
            return;
          }
        }
        setIsGenerating(true);
        generationTimeoutRef.current = window.setTimeout(() => {
          setIsGenerating(false);
          setStep(5);
        }, 1500);
        return;
      case 5:
        void handleCreate();
        return;
      default:
        return;
    }
  }

  async function handleCreate() {
    if (!projectType || !method || !canContinue) {
      return;
    }

    setIsCreating(true);
    setErrorMessage(null);

    try {
      const phases =
        method === "manual"
          ? activePhases
              .map((phase) => phase.name.trim())
              .filter((name) => name.length > 0)
              .map((name) => ({ name }))
          : AI_ROADMAPS[projectType].map((phase) => ({
              name: phase.name,
              tasks: phase.tasks,
            }));

      const input: CreateProjectInput = {
        name: projectName.trim(),
        clientName: clientName.trim(),
        clientAvatarUrl: clientAvatar ?? undefined,
        type: projectType,
        method,
        startDate: parseInputDate(startDate),
        endDate: parseInputDate(endDate),
        phases,
      };

      const parsedInput = createProjectInputSchema.safeParse(input);
      if (!parsedInput.success) {
        setErrorMessage(parsedInput.error.issues[0]?.message ?? "Please complete the project details.");
        return;
      }

      const project = await createProject(parsedInput.data);
      setCreatedProjectId(project.id);
      setStep("success");
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

  async function handleAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setClientAvatar(await readFileAsDataUrl(file));
  }

  function fetchAvatarFromUrl() {
    const url = avatarUrlInput.trim();
    if (!url || avatarFetching) {
      return;
    }

    setAvatarFetching(true);
    avatarTimeoutRef.current = window.setTimeout(() => {
      setClientAvatar(url);
      setAvatarFetching(false);
    }, 800);
  }

  function togglePhase(phaseId: string) {
    setPhases((current) =>
      current.map((phase) => (phase.id === phaseId ? { ...phase, on: !phase.on } : phase)),
    );
  }

  function addPhase() {
    const id = `phase-${phaseCounterRef.current++}`;
    setPhases((current) => [...current, { id, name: "New Phase", on: true }]);
    setEditingPhaseId(id);
  }

  function renamePhase(phaseId: string, name: string) {
    const trimmed = name.trim();
    setPhases((current) =>
      current.map((phase) =>
        phase.id === phaseId ? { ...phase, name: trimmed || "New Phase" } : phase,
      ),
    );
  }

  function reorderPhases(sourceId: string, targetId: string) {
    if (sourceId === targetId) {
      return;
    }

    setPhases((current) => {
      const sourceIndex = current.findIndex((phase) => phase.id === sourceId);
      const targetIndex = current.findIndex((phase) => phase.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) {
        return current;
      }

      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      if (!moved) {
        return current;
      }
      next.splice(targetIndex, 0, moved);
      return next;
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
    step,
    projectName,
    clientName,
    clientAvatar,
    projectType,
    method,
    isGenerating,
    isCreating,
    createdProjectId,
    avatarUrlOpen,
    avatarUrlInput,
    avatarFetching,
    editingPhaseId,
    startDate,
    endDate,
    phases,
    steps,
    roadmap,
    currentIndex,
    canContinue,
    errorMessage,
    fileInputRef,
    setProjectName,
    setClientName,
    setClientAvatar,
    setProjectType,
    setMethod,
    setAvatarUrlOpen,
    setAvatarUrlInput,
    setEditingPhaseId,
    setStartDate,
    setEndDate,
    clearError,
    goBack,
    handleContinue,
    handleViewProject,
    handleAvatarFileChange,
    fetchAvatarFromUrl,
    togglePhase,
    addPhase,
    renamePhase,
    handleDragStart,
    handleDrop,
    handleDragEnd,
  };
}
