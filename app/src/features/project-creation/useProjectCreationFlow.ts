import { useEffect, useMemo, useRef, useState } from "react";
import {
  dateRangeInputSchema,
  manualPhaseSelectionSchema,
  projectBasicsSchema,
} from "@/lib/validation";

export type WorkflowStep = 1 | 2 | 3 | "4a" | "4m" | "4mb" | 5;
export type ProjectCreationStep = WorkflowStep | "success";

type ProjectCreationFlowInput = {
  projectName: string;
  clientName: string;
  hasStartMarkerImage: boolean;
  hasEndMarkerImage: boolean;
  projectType: string | null;
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
  hasStartMarkerImage,
  hasEndMarkerImage,
  projectType,
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
    () => (method === "manual" ? [1, 2, 3, "4m", "4mb", 5] : [1, 2, 3, "4a", 5]),
    [method],
  );
  const currentIndex = step === "success" ? steps.length - 1 : steps.indexOf(step);
  const canContinue = useMemo(() => {
    switch (step) {
      case 1:
        return (
          projectName.trim().length > 0 &&
          clientName.trim().length > 0 &&
          hasStartMarkerImage &&
          hasEndMarkerImage
        );
      case 2:
        return projectType !== null;
      case 3:
        return method !== null;
      case "4a":
      case "4mb":
        return Boolean(startDate && endDate);
      case "4m":
        return activePhasesLength >= 2;
      case 5:
        return roadmapLength > 0 && !isCreating;
      default:
        return false;
    }
  }, [
    activePhasesLength,
    clientName,
    endDate,
    hasEndMarkerImage,
    hasStartMarkerImage,
    isCreating,
    method,
    projectName,
    projectType,
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
    const index = steps.indexOf(step as WorkflowStep);
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
        const parsed = projectBasicsSchema.safeParse({ projectName, clientName });
        if (!parsed.success) {
          onError(parsed.error.issues[0]?.message ?? "Please complete the project details.");
          return;
        }
        if (!hasStartMarkerImage || !hasEndMarkerImage) {
          onError("Please upload both project marker images.");
          return;
        }
        setStep(2);
        return;
      }
      case 2:
        setStep(3);
        return;
      case 3:
        setStep(method === "manual" ? "4m" : "4a");
        return;
      case "4m": {
        const parsed = manualPhaseSelectionSchema.safeParse(activePhasesLength);
        if (!parsed.success) {
          onError(parsed.error.issues[0]?.message ?? "Select at least two phases.");
          return;
        }
        setStep("4mb");
        return;
      }
      case "4mb": {
        const parsed = dateRangeInputSchema.safeParse({ startDate, endDate });
        if (!parsed.success) {
          onError(parsed.error.issues[0]?.message ?? "Select a valid timeline.");
          return;
        }
        setStep(5);
        return;
      }
      case "4a": {
        const parsed = dateRangeInputSchema.safeParse({ startDate, endDate });
        if (!parsed.success) {
          onError(parsed.error.issues[0]?.message ?? "Select a valid timeline.");
          return;
        }
        setIsGenerating(true);
        generationTimeoutRef.current = window.setTimeout(() => {
          setIsGenerating(false);
          setStep(5);
        }, 1500);
        return;
      }
      case 5:
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
