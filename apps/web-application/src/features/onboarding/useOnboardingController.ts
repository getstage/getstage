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
import {
  getDatafastCheckoutMetadata,
  trackDatafastGoal,
  trackDatafastGoalOnce,
} from "@/lib/datafast";
import { toUserFacingErrorMessage } from "@/lib/errors";
import { convexQueryKeys } from "@/lib/queryKeys";
import { googleSheetsUrlSchema } from "@/lib/validation";
import type { ClaudeConnectionSummary } from "@/types/settings";
import type { ProjectType } from "@/types";
import { CLAUDE_INSTALL_COMMAND } from "@/features/settings/useIntegrationsSettings";

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
  const resetDraftRef = useRef<(() => void) | null>(null);
  const stripeConnected = false;
  const draftState = useProjectDraft({
    onError: (message) => {
      setStepError(message);
    },
  });
  const { draft, activePhases } = draftState;
  const existingClientsResult = useConvexQuery(
    api.clients.listForCurrentUser,
    open ? {} : "skip",
  );
  const claudeState = useConvexQuery(api.agentConnections.getClaudeConnectionSummary, open ? {} : "skip") as
    | {
        connection: ClaudeConnectionSummary;
      }
    | undefined;
  const createPendingConnection = useConvexMutation(api.agentConnections.createPendingClaudeConnection);
  const existingClients = useMemo(() => existingClientsResult ?? [], [existingClientsResult]);
  const completeOnboarding = useConvexMutation(api.onboarding.completeOnboarding);
  const markProjectCreated = useConvexMutation(api.onboarding.markProjectCreated);
  const createProject = useConvexMutation(api.projects.create);
  const createCheckoutSession = useConvexAction(api.billing.createCheckoutSession);
  const connectSheet = useConvexMutation(api.integrations.googleSheets.connectSheet);
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

    trackDatafastGoalOnce("onboarding_started", "onboarding_started", {
      source: "onboarding_modal",
    });
  }, [open]);

  useEffect(() => {
    return () => {
      if (completionTimeoutRef.current !== null) {
        window.clearTimeout(completionTimeoutRef.current);
      }
    };
  }, []);

  // Create a pending Claude connection when the user reaches the claude step
  useEffect(() => {
    if (step !== "claude" || claudeState?.connection) {
      return;
    }

    void createPendingConnection({ source: "onboarding" });
  }, [step, claudeState?.connection, createPendingConnection]);

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
    if (!pendingSubmission || !pendingSubmission.createProject || creationReady) {
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
          trackDatafastGoalOnce("first_project_created", "first_project_created", {
            source: "onboarding_creation",
            project_type: draft.projectType ?? submission.fieldOfWork,
            method: draft.method,
          });
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
        setStep("preview");
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

  function buildPendingSubmission(createProject: boolean): OnboardingSubmission {
    const fallbackProjectType = draft.projectType ?? fieldOfWork[0] ?? "web-design";
    const fieldSelections = fieldOfWork.length > 0 ? fieldOfWork : [fallbackProjectType];
    const projectName = draft.projectName.trim();
    const clientName = draft.clientName.trim() || projectName || "Stage setup";

    return {
      fieldOfWork: fieldSelections[0]!,
      fieldOfWorkSelections: fieldSelections,
      createProject,
      projectName,
      projectImageUrl: draft.projectImage,
      clientName,
      clientEmail: draft.clientEmail.trim(),
      clientAvatarUrl: draft.clientAvatar,
      projectType: fallbackProjectType,
      csvConnected,
      csvImported,
      stripeConnected,
    };
  }

  function completeWithSubmission(submission: OnboardingSubmission | null) {
    if (isClosing || !submission) {
      return;
    }

    setIsClosing(true);
    completionTimeoutRef.current = window.setTimeout(() => {
      onComplete(submission);
    }, 720);
  }

  function handleContinue() {
    const validationError = getStepValidationError({
      step,
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
        setStep("details");
        return;
      case "personalise":
        setStep("details");
        return;
      case "claude":
        completeWithSubmission(pendingSubmission ?? buildPendingSubmission(false));
        return;
      case "details":
        if (setProjectLater) {
          const submission = buildPendingSubmission(false);
          setPendingSubmission(submission);
          setStep("paywall");
          return;
        }
        setStep("project-type");
        return;
      case "client":
        setStep("project-type");
        return;
      case "project-type":
        setStep("method");
        return;
      case "method":
        setStep("timeline");
        return;
      case "phase-select":
        setStep("timeline");
        return;
      case "timeline":
        setStep("preview");
        return;
      case "preview": {
        setStep("paywall");
        return;
      }
      case "celebrating":
        setStep("integrations");
        return;
      case "integrations": {
        setStep("claude");
        return;
      }
      default:
        return;
    }
  }

  function handleContinueFree() {
    const submission = pendingSubmission ?? buildPendingSubmission(!setProjectLater);
    if (!pendingSubmission) {
      setPendingSubmission(submission);
    }
    completeWithSubmission(submission);
  }

  async function handlePaywallUpgrade(billingCycle: "monthly" | "yearly") {
    const submission = pendingSubmission ?? buildPendingSubmission(!setProjectLater);
    if (!pendingSubmission) {
      setPendingSubmission(submission);
    }

    setIsCheckoutLoading(true);
    setCheckoutError(null);

    try {
      await completeOnboarding({ workCategory: submission.fieldOfWork });
      trackDatafastGoalOnce("onboarding_completed", "onboarding_completed", {
        source: "onboarding_paywall",
        work_category: submission.fieldOfWork,
      });
    } catch {
      // Best-effort persist; checkout redirect takes priority.
    }

    try {
      const result = await createCheckoutSession({
        billingCycle,
        source: "onboarding_paywall",
        ...getDatafastCheckoutMetadata(),
      });
      if (!result.url) {
        throw new Error("Checkout URL missing.");
      }
      trackDatafastGoal("checkout_started", {
        source: "onboarding_paywall",
        billing_cycle: billingCycle,
        plan: "pro",
      });
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
    const submission = buildPendingSubmission(false);
    setPendingSubmission(submission);
    setStep("paywall");
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
        trackDatafastGoal("google_sheets_connected", {
          source: "onboarding_integrations",
          import_type: "google_sheet",
        });
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
    claudeConnection: claudeState?.connection ?? null,
    claudeSetupHref: "/agents/claude?source=onboarding",
    claudeInstallCommand: CLAUDE_INSTALL_COMMAND,
    claudeConnectionId: claudeState?.connection?.id ?? null,
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
