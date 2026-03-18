import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAction as useConvexAction,
  useMutation as useConvexMutation,
  useQuery as useConvexQuery,
} from "convex/react";
import { createProjectFromDraft } from "@/features/project-creation/createProjectFromDraft";
import { useProjectDraft } from "@/features/project-creation/useProjectDraft";
import {
  canContinue,
  getCurrentStepForProgress,
  getFlowSteps,
  getStepValidationError,
} from "@/features/onboarding/flow";
import type { OnboardingStepId, OnboardingSubmission } from "@/features/onboarding/model";
import { AI_ROADMAPS } from "@/lib/constants";
import { api } from "@/lib/convex";
import { toUserFacingErrorMessage } from "@/lib/errors";
import { convexQueryKeys } from "@/lib/queryKeys";
import { googleSheetsUrlSchema } from "@/lib/validation";
import type { ProjectType } from "@/types";

type UseOnboardingControllerInput = {
  open: boolean;
  onComplete: (submission: OnboardingSubmission) => void;
};

export function useOnboardingController({
  open,
  onComplete,
}: UseOnboardingControllerInput) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<OnboardingStepId>("welcome");
  const [isClosing, setIsClosing] = useState(false);
  const [pendingSubmission, setPendingSubmission] = useState<OnboardingSubmission | null>(null);
  const [fieldOfWork, setFieldOfWork] = useState<ProjectType[]>([]);
  const [setProjectLater, setSetProjectLater] = useState(false);
  const [sheetUrl, setSheetUrl] = useState("");
  const [csvConnected, setCsvConnected] = useState(false);
  const [csvImported, setCsvImported] = useState(false);
  const [csvImporting, setCsvImporting] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [creationReady, setCreationReady] = useState(false);
  const completionTimeoutRef = useRef<number | null>(null);
  const roadmapTimeoutRef = useRef<number | null>(null);
  const resetDraftRef = useRef<(() => void) | null>(null);
  const stripeConnected = false;
  const draftState = useProjectDraft({
    onError: (message) => {
      setStepError(message);
    },
  });
  const { draft, activePhases } = draftState;
  const existingClientsResult = useConvexQuery(api.clients.listForCurrentUser, {});
  const existingClients = useMemo(() => existingClientsResult ?? [], [existingClientsResult]);
  const completeOnboarding = useConvexMutation(api.onboarding.completeOnboarding);
  const markProjectCreated = useConvexMutation(api.onboarding.markProjectCreated);
  const createProject = useConvexMutation(api.projects.create);
  const createCheckoutSession = useConvexAction(api.billing.createCheckoutSession);
  const connectSheet = useConvexMutation(api.googleSheets.connectSheet);
  const r2GenerateUploadUrl = useConvexMutation(api.r2.generateUploadUrl);
  const r2SyncMetadata = useConvexMutation(api.r2.syncMetadata);

  const flowSteps = useMemo(
    () =>
      getFlowSteps({
        method: draft.method,
        setProjectLater,
      }),
    [draft.method, setProjectLater],
  );
  const currentIndex = flowSteps.indexOf(getCurrentStepForProgress(step));
  const continueEnabled = canContinue({
    step,
    fieldOfWork,
    setProjectLater,
    method: draft.method,
    projectName: draft.projectName,
    hasProjectImage: Boolean(draft.projectImage),
    clientName: draft.clientName,
    clientEmail: draft.clientEmail,
    hasClientAvatar: Boolean(draft.clientAvatar),
    projectType: draft.projectType,
    activePhasesLength: activePhases.length,
  });

  useEffect(() => {
    resetDraftRef.current = draftState.reset;
  }, [draftState.reset]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setStep("welcome");
    setIsClosing(false);
    setPendingSubmission(null);
    setFieldOfWork([]);
    setSetProjectLater(false);
    setSheetUrl("");
    setCsvConnected(false);
    setCsvImported(false);
    setCsvImporting(false);
    setStepError(null);
    setIsCheckoutLoading(false);
    setCheckoutError(null);
    setCreationReady(false);
    resetDraftRef.current?.();
  }, [open]);

  useEffect(() => {
    return () => {
      if (completionTimeoutRef.current !== null) {
        window.clearTimeout(completionTimeoutRef.current);
      }
      if (roadmapTimeoutRef.current !== null) {
        window.clearTimeout(roadmapTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (step !== "generating-roadmap") {
      return;
    }

    roadmapTimeoutRef.current = window.setTimeout(() => {
      setStep("preview");
    }, 1400);

    return () => {
      if (roadmapTimeoutRef.current !== null) {
        window.clearTimeout(roadmapTimeoutRef.current);
      }
    };
  }, [step]);

  useEffect(() => {
    setStepError(null);
  }, [
    activePhases.length,
    csvConnected,
    draft.clientAvatar,
    draft.clientEmail,
    draft.clientName,
    draft.clientMode,
    draft.endDate,
    draft.method,
    draft.projectImage,
    draft.projectName,
    draft.projectType,
    draft.selectedExistingClientName,
    draft.startDate,
    fieldOfWork,
    setProjectLater,
    sheetUrl,
  ]);

  useEffect(() => {
    if (step !== "creating" || !pendingSubmission) {
      return;
    }

    const submission = pendingSubmission;
    let cancelled = false;

    async function runCreation() {
      try {
        if (submission.createProject) {
          await createProjectFromDraft({
            draft,
            activePhases,
            createProject,
            generateUploadUrl: r2GenerateUploadUrl,
            syncMetadata: r2SyncMetadata,
            aiRoadmaps: AI_ROADMAPS,
          });
          void queryClient.invalidateQueries({ queryKey: convexQueryKeys.dockProjects });
          await markProjectCreated({});
        } else {
          await new Promise((resolve) => window.setTimeout(resolve, 500));
        }

        if (cancelled) {
          return;
        }

        setCreationReady(true);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setStepError(toUserFacingErrorMessage(error, "Could not create the project."));
        setStep("integrations");
      }
    }

    void runCreation();

    return () => {
      cancelled = true;
    };
  }, [
    activePhases,
    createProject,
    draft,
    markProjectCreated,
    pendingSubmission,
    r2GenerateUploadUrl,
    r2SyncMetadata,
    step,
  ]);

  function handleSelectField(value: ProjectType) {
    setFieldOfWork((current) => {
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];

      draftState.setProjectType(draft.projectType ?? next[0] ?? null);
      return next;
    });
  }

  function handleContinue() {
    const validationError = getStepValidationError({
      step,
      fieldOfWork,
      setProjectLater,
      method: draft.method,
      projectName: draft.projectName,
      hasProjectImage: Boolean(draft.projectImage),
      clientName: draft.clientName,
      clientEmail: draft.clientEmail,
      hasClientAvatar: Boolean(draft.clientAvatar),
      projectType: draft.projectType,
      activePhasesLength: activePhases.length,
      startDate: draft.startDate,
      endDate: draft.endDate,
    });

    if (validationError) {
      setStepError(validationError);
      return;
    }

    setStepError(null);

    switch (step) {
      case "welcome":
        setStep("personalise");
        return;
      case "personalise":
        setStep("details");
        return;
      case "details":
        setStep(setProjectLater ? "integrations" : "client");
        return;
      case "client":
        setStep("project-type");
        return;
      case "project-type":
        setStep("method");
        return;
      case "method":
        setStep(draft.method === "manual" ? "phase-select" : "timeline");
        return;
      case "phase-select":
        setStep("timeline");
        return;
      case "timeline":
        setStep(draft.method === "ai" ? "generating-roadmap" : "preview");
        return;
      case "preview":
        setStep("integrations");
        return;
      case "integrations": {
        const fallbackProjectType = draft.projectType ?? fieldOfWork[0];
        const hasProjectSetup =
          draft.projectName.trim().length > 0 && draft.clientName.trim().length > 0;

        if (!fallbackProjectType || fieldOfWork.length === 0) {
          setStepError("Choose at least one field of work to continue.");
          return;
        }

        setPendingSubmission({
          fieldOfWork: fieldOfWork[0]!,
          fieldOfWorkSelections: fieldOfWork,
          createProject: !setProjectLater && hasProjectSetup,
          projectName: draft.projectName.trim(),
          projectImageUrl: draft.projectImage,
          clientName: draft.clientName.trim(),
          clientEmail: draft.clientEmail.trim(),
          clientAvatarUrl: draft.clientAvatar,
          projectType: fallbackProjectType,
          csvConnected,
          csvImported,
          stripeConnected,
        });
        setCreationReady(false);
        setStep("creating");
        return;
      }
      default:
        return;
    }
  }

  function handleContinueFree() {
    if (isClosing || !pendingSubmission) {
      return;
    }

    setIsClosing(true);
    completionTimeoutRef.current = window.setTimeout(() => {
      onComplete(pendingSubmission);
    }, 720);
  }

  async function handlePaywallUpgrade(billingCycle: "monthly" | "yearly") {
    if (!pendingSubmission) {
      return;
    }

    setIsCheckoutLoading(true);
    setCheckoutError(null);

    try {
      await completeOnboarding({ workCategory: pendingSubmission.fieldOfWork });
    } catch {
      // Best-effort persist; checkout redirect takes priority.
    }

    try {
      const result = await createCheckoutSession({ billingCycle });
      if (!result.url) {
        throw new Error("Checkout URL missing.");
      }
      window.location.assign(result.url);
    } catch {
      setCheckoutError("Could not start checkout. Please try again.");
      setIsCheckoutLoading(false);
    }
  }

  function goBack() {
    if (step === "welcome" || step === "creating") {
      return;
    }

    const index = flowSteps.indexOf(step);
    const previous = index > 0 ? flowSteps[index - 1] : null;
    if (previous) {
      setStep(previous);
    }
  }

  function handleDoLater() {
    if (step !== "details") {
      return;
    }

    setStepError(null);
    setSetProjectLater(true);
    setStep("integrations");
  }

  function handleToggleCsvConnection() {
    const next = !csvConnected;
    setCsvConnected(next);
    if (!next) {
      setCsvImported(false);
      setSheetUrl("");
    }
  }

  function handleLinkSheetUrl() {
    if (!csvConnected || csvImporting) {
      return;
    }

    const parsed = googleSheetsUrlSchema.safeParse(sheetUrl);
    if (!parsed.success) {
      setStepError(
        parsed.error.issues[0]?.message ?? "Please paste a valid Google Sheets document URL.",
      );
      return;
    }

    const normalizedUrl = parsed.data;
    setCsvImporting(true);
    setStepError(null);
    void connectSheet({
      sheetUrl: normalizedUrl,
      templateVersion: "v1",
    })
      .then(() => {
        setSheetUrl(normalizedUrl);
        setCsvImported(true);
        setCsvConnected(true);
      })
      .catch(() => {
        setStepError("Could not connect that Google Sheets URL.");
      })
      .finally(() => {
        setCsvImporting(false);
      });
  }

  return {
    step,
    isClosing,
    flowSteps,
    currentIndex,
    continueEnabled,
    stepError,
    fieldOfWork,
    sheetUrl,
    csvConnected,
    csvImported,
    csvImporting,
    creationReady,
    isCheckoutLoading,
    checkoutError,
    existingClients,
    draftState,
    handleSelectField,
    handleContinue,
    handleContinueFree,
    handlePaywallUpgrade,
    goBack,
    handleDoLater,
    handleToggleCsvConnection,
    handleLinkSheetUrl,
    setSheetUrl,
    setStep,
  };
}
