import { useEffect, useMemo, useRef, useState } from "react";
import {
  clientInfoSchema,
  dateRangeInputSchema,
  projectBasicsSchema,
} from "@/lib/validation";

export type WorkflowStep = 1 | 2 | 3 | 4;
export type ProjectCreationStep = WorkflowStep | "overview" | "success";

type ProjectCreationFlowInput = {
  projectName: string;
  hasProjectImage: boolean;
  clientName: string;
  clientEmail: string;
  hasClientAvatar: boolean;
  method: "ai" | "manual" | null;
  startDate: string;
  endDate: string;
  activePhasesLength: number;
  roadmapLength: number;
  isCreating: boolean;
  onError: (message: string | null) => void;
  onExit: () => void;
  onCreate: () => void;
};

export function useProjectCreationFlow({
  projectName,
  clientName,
  clientEmail,
  method,
  startDate,
  endDate,
  activePhasesLength,
  roadmapLength,
  isCreating,
  onError,
  onExit,
  onCreate,
}: ProjectCreationFlowInput) {
  const [step, setStep] = useState<ProjectCreationStep>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const generationTimeoutRef = useRef<number | undefined>(undefined);

  const steps = useMemo<WorkflowStep[]>(
    () => [1, 2, 3, 4],
    [],
  );
  const currentIndex =
    step === "overview" ? steps.length - 1 : step === "success" ? -1 : steps.indexOf(step);
  const canContinue = useMemo(() => {
    switch (step) {
      case 1:
        return projectName.trim().length > 0;
      case 2:
        return (
          clientName.trim().length > 0 &&
          clientEmail.trim().length > 0
        );
      case 3:
        return method === "manual" ? activePhasesLength >= 2 : method !== null;
      case 4:
        return Boolean(startDate && endDate);
      case "overview":
        return roadmapLength > 0 && !isCreating;
      default:
        return false;
    }
  }, [
    activePhasesLength,
    clientEmail,
    clientName,
    endDate,
    isCreating,
    method,
    projectName,
    roadmapLength,
    startDate,
    step,
  ]);

  useEffect(() => {
    return () => {
      if (generationTimeoutRef.current !== undefined) {
        window.clearTimeout(generationTimeoutRef.current);
      }
    };
  }, []);

  function clearError() {
    onError(null);
  }

  function goBack() {
    if (isGenerating || isCreating || step === "success") {
      return;
    }

    clearError();
    if (step === "overview") {
      setStep(4);
      return;
    }

    const index = typeof step === "number" ? steps.indexOf(step) : -1;
    if (index > 0) {
      const previous = steps[index - 1];
      if (previous) {
        setStep(previous);
      }
      return;
    }

    onExit();
  }

  function handleContinue() {
    if (!canContinue || isGenerating || isCreating) {
      return;
    }

    clearError();

    switch (step) {
      case 1: {
        const parsed = projectBasicsSchema.safeParse({ projectName });
        if (!parsed.success) {
          onError(parsed.error.issues[0]?.message ?? "Please enter a project name.");
          return;
        }
        setStep(2);
        return;
      }
      case 2: {
        const clientParsed = clientInfoSchema.safeParse({ clientName, clientEmail });
        if (!clientParsed.success) {
          onError(clientParsed.error.issues[0]?.message ?? "Please enter the client details.");
          return;
        }
        setStep(3);
        return;
      }
      case 3:
        if (method === "manual" && activePhasesLength < 2) {
          onError("Select at least two phases.");
          return;
        }
        setStep(4);
        return;
      case 4: {
        const parsed = dateRangeInputSchema.safeParse({ startDate, endDate });
        if (!parsed.success) {
          onError(parsed.error.issues[0]?.message ?? "Select a valid timeline.");
          return;
        }
        setIsGenerating(true);
        generationTimeoutRef.current = window.setTimeout(() => {
          setIsGenerating(false);
          setStep("overview");
        }, 1500);
        return;
      }
      case "overview":
        onCreate();
        return;
      default:
        return;
    }
  }

  return {
    step,
    steps,
    currentIndex,
    canContinue,
    isGenerating,
    setStep,
    clearError,
    goBack,
    handleContinue,
  };
}
