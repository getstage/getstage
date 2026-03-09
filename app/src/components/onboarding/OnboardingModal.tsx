import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { useGSAP } from "@gsap/react";
import { ArrowUpRight, Eye, UserCircle } from "@phosphor-icons/react";
import confetti from "canvas-confetti";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { useAction as useConvexAction, useMutation as useConvexMutation } from "convex/react";
import integrationsImage from "@/assets/onboarding/integrations.webp";
import onboardingImage from "@/assets/onboarding/onboarding.webp";
import { createProjectInputSchema } from "@/data-ops/schema";
import {
  dateRangeInputSchema,
  googleSheetsUrlSchema,
  manualPhaseSelectionSchema,
  projectBasicsSchema,
  projectTypeSchema as projectTypeValidationSchema,
} from "@/lib/validation";
import { api } from "@/lib/convex";
import { AI_ROADMAPS, DEFAULT_PHASES, PROJECT_TYPES } from "@/lib/constants";
import { toUserFacingErrorMessage } from "@/lib/errors";
import { parseInputDate } from "@/lib/format";
import { prepareAvatarUpload, uploadFileToR2 } from "@/lib/r2Uploads";
import { cn } from "@/lib/utils";
import type { ProjectType } from "@/types";
import { OnboardingPaywall } from "@/components/onboarding/OnboardingPaywall";

gsap.registerPlugin(SplitText, useGSAP);

type Method = "ai" | "manual" | null;

type Step =
  | "welcome"
  | "personalise"
  | "details"
  | "project-type"
  | "method"
  | "phase-select"
  | "timeline"
  | "generating-roadmap"
  | "preview"
  | "integrations"
  | "creating"
  | "paywall";

type PhaseItem = {
  id: string;
  name: string;
  on: boolean;
};

const GOOGLE_SHEETS_ICON_SRC = new URL("../../assets/icons/google-sheets.svg", import.meta.url)
  .href;
const STRIPE_ICON_SRC = new URL("../../assets/icons/stripe.svg", import.meta.url).href;

export type OnboardingSubmission = {
  fieldOfWork: ProjectType;
  fieldOfWorkSelections: ProjectType[];
  createProject: boolean;
  projectName: string;
  clientName: string;
  clientAvatarUrl: string | null;
  projectType: ProjectType;
  csvConnected: boolean;
  csvImported: boolean;
  stripeConnected: boolean;
};

type OnboardingModalProps = {
  open: boolean;
  userName?: string;
  onComplete: (submission: OnboardingSubmission) => void;
  googleSheetsGuideHref?: string | null;
};

export function OnboardingModal({
  open,
  userName,
  onComplete,
  googleSheetsGuideHref,
}: OnboardingModalProps) {
  const [step, setStep] = useState<Step>("welcome");
  const [isClosing, setIsClosing] = useState(false);
  const [pendingSubmission, setPendingSubmission] = useState<OnboardingSubmission | null>(null);
  const [fieldOfWork, setFieldOfWork] = useState<ProjectType[]>([]);
  const [setProjectLater, setSetProjectLater] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientAvatar, setClientAvatar] = useState<string | null>(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [avatarUrlOpen, setAvatarUrlOpen] = useState(false);
  const [avatarUrlInput, setAvatarUrlInput] = useState("");
  const [projectType, setProjectType] = useState<ProjectType | null>(null);
  const [method, setMethod] = useState<Method>(null);
  const [startDate, setStartDate] = useState(() => formatInputDate(new Date()));
  const [endDate, setEndDate] = useState(() => formatInputDate(addDays(new Date(), 30)));
  const [phases, setPhases] = useState<PhaseItem[]>(() =>
    DEFAULT_PHASES.map((name, index) => ({ id: `phase-${index}`, name, on: true })),
  );
  const [draggingPhaseId, setDraggingPhaseId] = useState<string | null>(null);
  const [sheetUrl, setSheetUrl] = useState("");
  const [csvConnected, setCsvConnected] = useState(false);
  const [csvImported, setCsvImported] = useState(false);
  const [csvImporting, setCsvImporting] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const completionTimeoutRef = useRef<number | null>(null);
  const roadmapTimeoutRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const completeOnboarding = useConvexMutation(api.onboarding.completeOnboarding);
  const markProjectCreated = useConvexMutation(api.onboarding.markProjectCreated);
  const createProject = useConvexMutation(api.projects.create);
  const createCheckoutSession = useConvexAction(api.billing.createCheckoutSession);
  const connectSheet = useConvexMutation(api.googleSheets.connectSheet);
  const r2GenerateUploadUrl = useConvexMutation(api.r2.generateUploadUrl);
  const r2SyncMetadata = useConvexMutation(api.r2.syncMetadata);

  const activePhases = useMemo(() => phases.filter((phase) => phase.on), [phases]);
  const previewRoadmap = useMemo(() => {
    if (!projectType) {
      return [];
    }

    if (method === "manual") {
      return activePhases.map((phase) => ({ name: phase.name, tasks: [] as string[] }));
    }

    return AI_ROADMAPS[projectType];
  }, [activePhases, method, projectType]);

  const flowSteps = useMemo<Step[]>(() => {
    if (setProjectLater) {
      return ["welcome", "personalise", "details", "integrations"];
    }

    if (method === "manual") {
      return [
        "welcome",
        "personalise",
        "details",
        "project-type",
        "method",
        "phase-select",
        "timeline",
        "preview",
        "integrations",
      ];
    }

    return [
      "welcome",
      "personalise",
      "details",
      "project-type",
      "method",
      "timeline",
      "preview",
      "integrations",
    ];
  }, [method, setProjectLater]);

  const currentStepForProgress =
    step === "generating-roadmap"
      ? "preview"
      : step === "creating" || step === "paywall"
        ? "integrations"
        : step;
  const currentIndex = flowSteps.indexOf(currentStepForProgress);

  useEffect(() => {
    if (!open) {
      return;
    }

    setStep("welcome");
    setIsClosing(false);
    setPendingSubmission(null);
    setFieldOfWork([]);
    setSetProjectLater(false);
    setProjectName("");
    setClientName("");
    setClientAvatar(null);
    setPendingAvatarFile(null);
    setAvatarUrlOpen(false);
    setAvatarUrlInput("");
    setProjectType(null);
    setMethod(null);
    setStartDate(formatInputDate(new Date()));
    setEndDate(formatInputDate(addDays(new Date(), 30)));
    setPhases(DEFAULT_PHASES.map((name, index) => ({ id: `phase-${index}`, name, on: true })));
    setDraggingPhaseId(null);
    setSheetUrl("");
    setCsvConnected(false);
    setCsvImported(false);
    setCsvImporting(false);
    setStripeConnected(false);
    setStepError(null);
    setIsCheckoutLoading(false);
    setCheckoutError(null);
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
    fieldOfWork,
    setProjectLater,
    method,
    projectName,
    clientName,
    activePhases.length,
    startDate,
    endDate,
    sheetUrl,
    csvConnected,
  ]);

  function handleSelectField(value: ProjectType) {
    setFieldOfWork((current) => {
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];

      setProjectType((currentProjectType) => currentProjectType ?? next[0] ?? null);
      return next;
    });
  }

  function handleContinue() {
    const validationError = getStepValidationError(
      step,
      fieldOfWork,
      setProjectLater,
      method,
      projectName,
      clientName,
      projectType,
      activePhases.length,
      startDate,
      endDate,
    );

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
        setStep(setProjectLater ? "integrations" : "project-type");
        return;
      case "project-type":
        setStep("method");
        return;
      case "method":
        setStep(method === "manual" ? "phase-select" : "timeline");
        return;
      case "phase-select":
        setStep("timeline");
        return;
      case "timeline":
        setStep(method === "ai" ? "generating-roadmap" : "preview");
        return;
      case "preview":
        setStep("integrations");
        return;
      case "integrations": {
        const hasProjectSetup = projectName.trim().length > 0 && clientName.trim().length > 0;
        const submission: OnboardingSubmission = {
          fieldOfWork: fieldOfWork[0]!,
          fieldOfWorkSelections: fieldOfWork,
          createProject: !setProjectLater && hasProjectSetup,
          projectName: projectName.trim(),
          clientName: clientName.trim(),
          clientAvatarUrl: clientAvatar,
          projectType: projectType ?? fieldOfWork[0]!,
          csvConnected,
          csvImported,
          stripeConnected,
        };

        setPendingSubmission(submission);
        setStep("creating");
        return;
      }
      default:
        return;
    }
  }

  useEffect(() => {
    if (step !== "creating" || !pendingSubmission) {
      return;
    }

    const submission = pendingSubmission;
    let cancelled = false;

    async function runCreation() {
      try {
        if (submission.createProject) {
          const clientAvatarUrl = pendingAvatarFile
            ? await uploadFileToR2({
                generateUploadUrl: r2GenerateUploadUrl,
                syncMetadata: r2SyncMetadata,
                purpose: "profile-avatar",
                file: pendingAvatarFile,
              })
            : submission.clientAvatarUrl?.trim() || undefined;

          const phases =
            method === "manual"
              ? activePhases
                  .map((phase) => phase.name.trim())
                  .filter((name) => name.length > 0)
                  .map((name) => ({ name }))
              : AI_ROADMAPS[submission.projectType].map((phase) => ({
                  name: phase.name,
                  tasks: phase.tasks,
                }));

          const parsedInput = createProjectInputSchema.safeParse({
            name: submission.projectName,
            clientName: submission.clientName,
            clientAvatarUrl,
            type: submission.projectType,
            method: method ?? "ai",
            startDate: parseInputDate(startDate),
            endDate: parseInputDate(endDate),
            phases,
          });

          if (!parsedInput.success) {
            throw new Error(
              parsedInput.error.issues[0]?.message ?? "Could not create the project.",
            );
          }

          await createProject(parsedInput.data);
          await markProjectCreated({});
        } else {
          await new Promise((resolve) => window.setTimeout(resolve, 500));
        }

        if (cancelled) {
          return;
        }

        if (submission.createProject && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          try {
            fireOnboardingConfetti();
          } catch {
            // Keep onboarding resilient if confetti is blocked by the browser or an extension.
          }
        }

        setPendingAvatarFile(null);
        setStep("paywall");
      } catch (error) {
        if (cancelled) {
          return;
        }

        setStepError(
          toUserFacingErrorMessage(error, "Could not create the project."),
        );
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
    markProjectCreated,
    method,
    pendingAvatarFile,
    pendingSubmission,
    r2GenerateUploadUrl,
    r2SyncMetadata,
    startDate,
    endDate,
    step,
  ]);

  function handleContinueFree() {
    if (isClosing || !pendingSubmission) {
      return;
    }

    setIsClosing(true);
    completionTimeoutRef.current = window.setTimeout(() => {
      onComplete(pendingSubmission);
    }, 720);
  }

  async function handlePaywallUpgrade() {
    if (!pendingSubmission) {
      return;
    }

    setIsCheckoutLoading(true);
    setCheckoutError(null);

    try {
      await completeOnboarding({ workCategory: pendingSubmission.fieldOfWork });
    } catch {
      // Best-effort persist — checkout redirect takes priority.
    }

    try {
      const result = await createCheckoutSession({});
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

  function handleAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    void prepareAvatarUpload(file)
      .then((prepared) => {
        setPendingAvatarFile(prepared.file);
        setClientAvatar(prepared.previewUrl);
      })
      .catch((error) => {
        setStepError(toUserFacingErrorMessage(error, "Could not prepare this image."));
      });
  }

  function handleFetchAvatarFromUrl() {
    if (!avatarUrlInput.trim()) {
      return;
    }

    setPendingAvatarFile(null);
    setClientAvatar(avatarUrlInput.trim());
  }

  function togglePhase(phaseId: string) {
    setPhases((current) =>
      current.map((phase) => (phase.id === phaseId ? { ...phase, on: !phase.on } : phase)),
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

  return (
    <Dialog.Root open={open} onOpenChange={() => undefined}>
      <Dialog.Portal>
        <Dialog.Overlay asChild>
          <motion.div
            className="fixed inset-0 z-50 bg-[rgba(25,24,42,0.54)] backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={isClosing ? { opacity: 0 } : { opacity: 1 }}
            transition={{ duration: isClosing ? 0.52 : 0.26, ease: [0.22, 1, 0.36, 1] }}
          />
        </Dialog.Overlay>

        <Dialog.Content
          asChild
          onEscapeKeyDown={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          <motion.div
            className="project-creation-page onboarding-modal fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-20px)] w-[calc(100%-16px)] max-w-[760px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-[22px] bg-white p-4 shadow-[0_28px_90px_rgba(10,12,22,0.26)] outline-none ring-0 focus:outline-none focus-visible:outline-none focus:ring-0 sm:w-[calc(100%-32px)] sm:p-6 md:p-7"
            initial={{ opacity: 0, y: 18, scale: 0.985, filter: "blur(10px)" }}
            animate={
              isClosing
                ? { opacity: 0, y: 28, scale: 0.94, filter: "blur(12px)" }
                : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }
            }
            transition={{ duration: isClosing ? 0.58 : 0.44, ease: [0.16, 1, 0.3, 1] }}
          >
            {step === "welcome" ? (
              <div className="mb-5 flex justify-end">
                <StepDots total={flowSteps.length} current={currentIndex} />
              </div>
            ) : null}

            {step !== "creating" && step !== "welcome" ? (
              <div className="mb-8 flex items-center justify-between">
                <Dialog.Title className="font-heading text-[20px] leading-[1.2] font-medium tracking-[-0.2px] text-text-primary">
                  Get started
                </Dialog.Title>
                <StepDots total={flowSteps.length} current={currentIndex} />
              </div>
            ) : null}

            <AnimatePresence mode="wait" initial={false}>
              {step === "welcome" ? (
                <OnboardingStepMotion motionKey="welcome">
                  <WelcomeSlide userName={userName} />
                </OnboardingStepMotion>
              ) : null}

              {step === "personalise" ? (
                <OnboardingStepMotion motionKey="personalise">
                  <h3 className="font-heading text-[24px] leading-[1.15] font-semibold tracking-[-0.4px] text-text-primary">
                    Personalise your workspace
                  </h3>
                  <p className="mt-2 text-[15px] leading-normal text-text-secondary">
                    Choose one or more fields so Stage can tailor your workspace.
                  </p>

                  <div className="mt-7 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {PROJECT_TYPES.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleSelectField(option.value)}
                        className={cn(
                          "cursor-pointer rounded-[10px] border-[1.5px] px-4 py-3 text-[14px] font-medium transition-colors focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0",
                          fieldOfWork.includes(option.value)
                            ? "border-accent bg-[rgba(135,130,245,0.09)] text-accent"
                            : "border-transparent bg-input-bg text-text-primary hover:bg-[#EFEFF2]",
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </OnboardingStepMotion>
              ) : null}

              {step === "details" ? (
                <OnboardingStepMotion motionKey="details">
                  <h3 className="font-heading text-[24px] leading-[1.15] font-semibold tracking-[-0.4px] text-text-primary">
                    Set up your first project <span className="text-text-tertiary">(optional)</span>
                  </h3>
                  <p className="mt-2 text-[15px] leading-normal text-text-secondary">
                    You can complete this now or continue and set it up later.
                  </p>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
                        Project name
                      </label>
                      <input
                        value={projectName}
                        onChange={(event) => setProjectName(event.target.value)}
                        placeholder="Website Redesign"
                        autoFocus
                        className="w-full rounded-[10px] border border-transparent bg-input-bg px-3.5 py-2.5 text-[14px] text-text-primary transition-all duration-200 outline-none placeholder:text-text-tertiary focus:border-border focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
                        Client
                      </label>
                      <input
                        value={clientName}
                        onChange={(event) => setClientName(event.target.value)}
                        placeholder="Acme Studio"
                        className="w-full rounded-[10px] border border-transparent bg-input-bg px-3.5 py-2.5 text-[14px] text-text-primary transition-all duration-200 outline-none placeholder:text-text-tertiary focus:border-border focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
                      Client photo <span className="font-normal text-text-tertiary">- optional</span>
                    </label>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-input-bg">
                        {clientAvatar ? (
                          <img
                            src={clientAvatar}
                            alt="Client avatar"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <UserCircle size={20} className="text-text-tertiary" />
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="cursor-pointer text-[13px] text-text-secondary transition-colors hover:text-accent focus:outline-none"
                      >
                        Upload photo
                      </button>
                      <button
                        type="button"
                        onClick={() => setAvatarUrlOpen((value) => !value)}
                        className="cursor-pointer text-[13px] text-text-secondary transition-colors hover:text-accent focus:outline-none"
                      >
                        Import from URL
                      </button>
                      {clientAvatar ? (
                        <button
                          type="button"
                          onClick={() => setClientAvatar(null)}
                          className="cursor-pointer text-[13px] text-text-secondary transition-colors hover:text-text-primary focus:outline-none"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>

                    {avatarUrlOpen ? (
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                        <input
                          value={avatarUrlInput}
                          onChange={(event) => setAvatarUrlInput(event.target.value)}
                          placeholder="Paste image URL..."
                          className="h-9 flex-1 rounded-[8px] border border-transparent bg-input-bg px-3 text-[13px] text-text-primary transition-all duration-200 outline-none placeholder:text-text-tertiary focus:border-border focus:bg-white"
                        />
                        <button
                          type="button"
                          onClick={handleFetchAvatarFromUrl}
                          className="h-9 cursor-pointer rounded-[8px] border border-[rgba(135,130,245,0.2)] bg-[rgba(135,130,245,0.08)] px-3 text-[13px] font-medium text-accent transition-colors hover:bg-[rgba(135,130,245,0.15)] focus:outline-none"
                        >
                          Fetch
                        </button>
                      </div>
                    ) : null}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarFileChange}
                    />
                  </div>
                </OnboardingStepMotion>
              ) : null}

              {step === "project-type" ? (
                <OnboardingStepMotion motionKey="project-type">
                  <h3 className="font-heading text-[24px] leading-[1.15] font-semibold tracking-[-0.4px] text-text-primary">
                    What type of project?
                  </h3>
                  <p className="mt-2 text-[15px] leading-normal text-text-secondary">
                    Pick the closest match. You can always change it later.
                  </p>

                  <div className="mt-7 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {PROJECT_TYPES.map((typeOption) => (
                      <button
                        key={typeOption.value}
                        type="button"
                        onClick={() => setProjectType(typeOption.value)}
                        className={cn(
                          "cursor-pointer rounded-[10px] border-[1.5px] px-4 py-3 text-center text-[14px] font-medium transition-all duration-150 focus:outline-none",
                          projectType === typeOption.value
                            ? "border-accent bg-[rgba(135,130,245,0.08)] text-accent"
                            : "border-transparent bg-input-bg text-text-primary hover:bg-[#EFEFEF]",
                        )}
                      >
                        {typeOption.label}
                      </button>
                    ))}
                  </div>
                </OnboardingStepMotion>
              ) : null}

              {step === "method" ? (
                <OnboardingStepMotion motionKey="method">
                  <h3 className="font-heading text-[24px] leading-[1.15] font-semibold tracking-[-0.4px] text-text-primary">
                    Build your roadmap
                  </h3>
                  <p className="mt-2 text-[15px] leading-normal text-text-secondary">
                    How do you want to structure this project?
                  </p>

                  <div className="mt-7 flex flex-col gap-2.5">
                    <OptionCard
                      active={method === "ai"}
                      title="AI-Generated"
                      description="Tailored phases and tasks based on your project type."
                      onClick={() => setMethod("ai")}
                    />
                    <OptionCard
                      active={method === "manual"}
                      title="Manual Setup"
                      description="Choose your own phases and add tasks as you go."
                      onClick={() => setMethod("manual")}
                    />
                  </div>
                </OnboardingStepMotion>
              ) : null}

              {step === "phase-select" ? (
                <OnboardingStepMotion motionKey="phase-select">
                  <h3 className="font-heading text-[24px] leading-[1.15] font-semibold tracking-[-0.4px] text-text-primary">
                    Select phases
                  </h3>
                  <p className="mt-2 text-[15px] leading-normal text-text-secondary">
                    Toggle the phases you want. Reorder by dragging.
                  </p>

                  <div className="mt-6">
                    {phases.map((phase, index) => (
                      <div
                        key={phase.id}
                        draggable
                        onDragStart={(event) => handleDragStart(event, phase.id)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => handleDrop(event, phase.id)}
                        onDragEnd={() => setDraggingPhaseId(null)}
                        className={cn(
                          "flex items-center gap-3 py-2.5",
                          index < phases.length - 1 ? "border-b border-border-subtle" : "",
                        )}
                      >
                        <div className="flex w-4 shrink-0 cursor-grab flex-col items-center gap-0.5 text-text-tertiary">
                          <span className="h-[1.5px] w-3 rounded bg-current" />
                          <span className="h-[1.5px] w-3 rounded bg-current" />
                          <span className="h-[1.5px] w-3 rounded bg-current" />
                        </div>
                        <button
                          type="button"
                          onClick={() => togglePhase(phase.id)}
                          className={cn(
                            "relative h-5 w-9 shrink-0 cursor-pointer rounded-[10px] transition-colors focus:outline-none",
                            phase.on ? "bg-accent" : "bg-[#D9D9D9]",
                          )}
                        >
                          <span
                            className={cn(
                              "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all",
                              phase.on ? "left-[18px]" : "left-0.5",
                            )}
                          />
                        </button>
                        <span
                          className={cn(
                            "text-[14px]",
                            phase.on ? "text-text-primary" : "text-text-tertiary",
                          )}
                        >
                          {phase.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </OnboardingStepMotion>
              ) : null}

              {step === "timeline" ? (
                <OnboardingStepMotion motionKey="timeline">
                  <h3 className="font-heading text-[24px] leading-[1.15] font-semibold tracking-[-0.4px] text-text-primary">
                    Project timeline
                  </h3>
                  <p className="mt-2 text-[15px] leading-normal text-text-secondary">
                    When does this project start and end?
                  </p>

                  <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                    <div className="flex-1">
                      <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
                        Start date
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(event) => setStartDate(event.target.value)}
                        className="w-full rounded-[10px] border border-transparent bg-input-bg px-[14px] py-3 text-[14px] text-text-primary outline-none transition-all duration-200 focus:border-border focus:bg-white"
                      />
                    </div>

                    <div className="flex-1">
                      <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
                        End date
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(event) => setEndDate(event.target.value)}
                        className="w-full rounded-[10px] border border-transparent bg-input-bg px-[14px] py-3 text-[14px] text-text-primary outline-none transition-all duration-200 focus:border-border focus:bg-white"
                      />
                    </div>
                  </div>
                </OnboardingStepMotion>
              ) : null}

              {step === "preview" ? (
                <OnboardingStepMotion motionKey="preview">
                  <h3 className="font-heading text-[24px] leading-[1.15] font-semibold tracking-[-0.4px] text-text-primary">
                    Your roadmap
                  </h3>
                  <p className="mt-2 text-[15px] leading-normal text-text-secondary">
                    Looking good. You can adjust everything later.
                  </p>

                  <div className="mt-7">
                    {previewRoadmap.map((phase, index) => (
                      <div key={`${phase.name}-${index}`} className="flex items-center gap-3.5">
                        <div className="flex w-[18px] shrink-0 flex-col items-center">
                          <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                          {index < previewRoadmap.length - 1 ? (
                            <span className="h-7 w-px bg-border" />
                          ) : null}
                        </div>
                        <div className="flex flex-1 items-center justify-between py-2">
                          <span className="text-[14px] font-medium text-text-primary">
                            {phase.name}
                          </span>
                          <span className="text-[13px] text-text-secondary">
                            {phase.tasks.length > 0 ? `${phase.tasks.length} tasks` : "0 tasks"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </OnboardingStepMotion>
              ) : null}

              {step === "generating-roadmap" ? (
                <OnboardingStepMotion
                  motionKey="generating-roadmap"
                  className="flex min-h-[220px] flex-col items-center justify-center text-center sm:min-h-[300px]"
                >
                  <LoadingStage
                    title="AI is generating your roadmap..."
                    subtitle="We are shaping the phases and tasks for your project."
                  />
                </OnboardingStepMotion>
              ) : null}

              {step === "integrations" ? (
                <OnboardingStepMotion motionKey="integrations">
                  <StaticOnboardingImage src={integrationsImage} alt="Integrations preview" />

                  <div className="mt-6 border-t border-border-subtle pt-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={GOOGLE_SHEETS_ICON_SRC}
                            alt="Google Sheets"
                            className="h-4 w-4"
                          />
                          <p className="text-[15px] font-medium text-text-primary">
                            Google Sheets import
                          </p>
                        </div>
                        <GuideLink
                          href={googleSheetsGuideHref}
                          openInNewTab
                          className="mt-1 text-[13px] font-medium text-accent underline decoration-[rgba(135,130,245,0.35)] underline-offset-4 hover:text-accent-hover hover:decoration-[rgba(118,112,224,0.55)]"
                        >
                          View import guide
                        </GuideLink>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const next = !csvConnected;
                          setCsvConnected(next);
                          if (!next) {
                            setCsvImported(false);
                            setSheetUrl("");
                          }
                        }}
                        className="cursor-pointer text-[14px] font-medium text-accent transition-colors hover:text-accent-hover focus:outline-none"
                      >
                        {csvConnected ? "Unlink" : "Link Google Sheets"}
                      </button>
                    </div>

                    {csvConnected ? (
                      <>
                        <div className="mt-3 flex flex-col gap-2 md:flex-row">
                          <input
                            value={sheetUrl}
                            onChange={(event) => setSheetUrl(event.target.value)}
                            placeholder="Paste your Google Sheets link"
                            className="h-[44px] flex-1 rounded-[10px] border border-transparent bg-input-bg px-3.5 text-[14px] text-text-primary transition-all duration-200 outline-none placeholder:text-text-tertiary focus:border-border focus:bg-white"
                          />
                          <button
                            type="button"
                            onClick={handleLinkSheetUrl}
                            disabled={!sheetUrl.trim() || csvImporting}
                            className="h-[44px] w-full cursor-pointer rounded-[10px] bg-text-primary px-4 text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-45 focus:outline-none md:min-w-[220px] md:w-auto"
                          >
                            {csvImporting ? "Linking..." : "Link Google Sheets"}
                          </button>
                        </div>
                        {csvImported ? (
                          <div className="mt-2 text-[12px] text-accent">
                            Imported. We&apos;ll use this data in your dashboard.
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <p className="mt-3 text-[13px] text-text-secondary">Optional for now.</p>
                    )}
                  </div>

                  <div className="mt-4 border-t border-border-subtle pt-5">
                    <div className="flex items-start gap-2.5">
                      <img src={STRIPE_ICON_SRC} alt="Stripe" className="mt-0.5 h-4 w-4 shrink-0" />
                      <div>
                        <p className="text-[15px] font-medium text-text-primary">Stripe</p>
                        <p className="mt-1 text-[13px] leading-[1.45] text-text-secondary">
                          Stripe will be ready right after onboarding, so you can connect payouts and payment tracking next.
                        </p>
                      </div>
                    </div>
                  </div>
                </OnboardingStepMotion>
              ) : null}

              {step === "creating" ? (
                <OnboardingStepMotion
                  motionKey="creating"
                  className="flex min-h-[220px] flex-col items-center justify-center text-center sm:min-h-[300px]"
                >
                  <LoadingStage
                    title={
                      pendingSubmission?.createProject
                        ? "Creating your project..."
                        : `Setting up your workspace${userName ? `, ${userName}` : ""}...`
                    }
                    subtitle={
                      pendingSubmission?.createProject
                        ? "Saving the roadmap, phases, and tasks to your workspace."
                        : "Finalizing your onboarding flow."
                    }
                  />
                </OnboardingStepMotion>
              ) : null}

              {step === "paywall" ? (
                <OnboardingStepMotion motionKey="paywall">
                  <OnboardingPaywall
                    onContinueFree={handleContinueFree}
                    onUpgrade={() => void handlePaywallUpgrade()}
                    isUpgradeLoading={isCheckoutLoading}
                    upgradeError={checkoutError}
                  />
                </OnboardingStepMotion>
              ) : null}
            </AnimatePresence>

            {step !== "creating" && step !== "generating-roadmap" && step !== "paywall" ? (
              <div className="mt-8">
                {stepError ? (
                  <p className="mb-3 text-[13px] leading-normal text-destructive">{stepError}</p>
                ) : null}

                <button
                  type="button"
                  className="h-[50px] w-full cursor-pointer rounded-[12px] bg-text-primary px-5 text-[15px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-45 focus:outline-none"
                  disabled={
                    !canContinue(
                      step,
                      fieldOfWork,
                      setProjectLater,
                      method,
                      projectName,
                      clientName,
                      projectType,
                      activePhases.length,
                    )
                  }
                  onClick={handleContinue}
                >
                  {step === "welcome"
                    ? "Start setup"
                    : step === "integrations"
                      ? "Create Dashboard"
                      : "Continue"}
                </button>

                {step !== "welcome" && step !== "personalise" ? (
                  <div className="mt-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={goBack}
                      className="inline-flex cursor-pointer items-center gap-1 text-[13px] text-text-secondary transition-colors hover:text-text-primary focus:outline-none"
                    >
                      Back
                    </button>

                    {step === "details" ? (
                      <button
                        type="button"
                        onClick={handleDoLater}
                        className="inline-flex cursor-pointer items-center gap-1 text-[13px] text-text-secondary transition-colors hover:text-text-primary focus:outline-none"
                      >
                        I&apos;ll do this later
                      </button>
                    ) : null}

                  </div>
                ) : null}
              </div>
            ) : null}
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function OptionCard({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-xl border-[1.5px] bg-input-bg px-5 py-[18px] text-left transition-colors focus:outline-none",
        active ? "border-accent bg-[rgba(135,130,245,0.08)]" : "border-transparent hover:bg-[#EFEFEF]",
      )}
    >
      <div
        className={cn(
          "mb-1 text-[15px] font-medium",
          active ? "text-accent" : "text-text-primary",
        )}
      >
        {title}
      </div>
      <div className="text-[13px] leading-[1.4] text-text-secondary">{description}</div>
    </button>
  );
}

function GuideLink({
  href,
  children,
  className,
  openInNewTab = false,
}: {
  href?: string | null;
  children: ReactNode;
  className?: string;
  openInNewTab?: boolean;
}) {
  if (!href) {
    return (
      <span className={cn("mt-4 inline-flex items-center gap-1.5 text-[15px] text-accent/60", className)}>
        <Eye size={16} />
        {children}
      </span>
    );
  }

  return (
    <a
      href={href}
      target={openInNewTab || href.startsWith("http") ? "_blank" : undefined}
      rel={openInNewTab || href.startsWith("http") ? "noreferrer noopener" : undefined}
      className={cn(
        "mt-4 inline-flex items-center gap-1 text-[15px] text-accent transition-colors hover:text-accent-hover",
        className,
      )}
    >
      {children}
      {openInNewTab ? <ArrowUpRight size={13} weight="bold" /> : <Eye size={16} />}
    </a>
  );
}

function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "h-1.5 rounded-full transition-all duration-200",
            index === current
              ? "w-5 bg-accent"
              : index < current
                ? "w-1.5 bg-accent"
                : "w-1.5 bg-[#D9D9D9]",
          )}
        />
      ))}
    </div>
  );
}

function OnboardingStepMotion({
  motionKey,
  children,
  className,
}: {
  motionKey: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      key={motionKey}
      initial={{ opacity: 0, y: 14, scale: 0.995, filter: "blur(3px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -12, scale: 0.996, filter: "blur(2px)" }}
      transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function WelcomeSlide({ userName }: { userName?: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const subtitleRef = useRef<HTMLParagraphElement | null>(null);

  useGSAP(
    () => {
      if (!containerRef.current || !titleRef.current || !subtitleRef.current) {
        return;
      }

      const titleSplit = new SplitText(titleRef.current, { type: "lines,words" });
      const subtitleSplit = new SplitText(subtitleRef.current, { type: "lines" });

      gsap.set(titleSplit.lines, { y: 12, opacity: 0 });
      gsap.set(titleSplit.words, {
        y: 18,
        opacity: 0,
        color: "var(--color-text-secondary)",
        filter: "blur(5px)",
      });
      gsap.set(subtitleSplit.lines, { y: 12, opacity: 0 });
      gsap.set("[data-welcome-preview]", { y: 18, opacity: 0, scale: 0.992 });

      const timeline = gsap.timeline({
        defaults: { ease: "power3.out" },
        delay: 0.05,
      });

      timeline.to(titleSplit.lines, { y: 0, opacity: 1, duration: 0.46 });
      timeline.to(
        titleSplit.words,
        {
          y: 0,
          opacity: 1,
          color: "var(--color-text-primary)",
          filter: "blur(0px)",
          stagger: 0.032,
          duration: 0.56,
        },
        "-=0.32",
      );
      timeline.to(
        subtitleSplit.lines,
        {
          y: 0,
          opacity: 1,
          duration: 0.46,
          stagger: 0.09,
          ease: "power2.out",
        },
        "-=0.28",
      );
      timeline.to(
        "[data-welcome-preview]",
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.6,
          ease: "power2.out",
        },
        "-=0.24",
      );

      return () => {
        timeline.kill();
        titleSplit.revert();
        subtitleSplit.revert();
      };
    },
    { scope: containerRef },
  );

  return (
    <div ref={containerRef} className="pb-1">
      <h3
        ref={titleRef}
        className="mt-2 font-heading text-[24px] leading-[1.15] font-semibold tracking-[-0.4px] text-text-primary"
      >
        Welcome to Stage{userName ? `, ${userName}` : ""}. You&apos;re in.
      </h3>
      <p ref={subtitleRef} className="mt-2 max-w-[620px] text-[15px] leading-normal text-text-secondary">
        We&apos;ll personalize your setup and launch a dashboard that feels useful from day one.
      </p>

      <div data-welcome-preview className="mt-6">
        <WelcomeOnboardingImageTour />
      </div>
    </div>
  );
}

function WelcomeOnboardingImageTour() {
  const scopeRef = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      const image = scopeRef.current?.querySelector<HTMLElement>("[data-tour-image]");
      if (!image) {
        return;
      }

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      gsap.set(image, {
        transformOrigin: "center center",
        scale: 1,
        xPercent: 0,
        yPercent: 0,
      });

      if (reducedMotion) {
        return;
      }

      const stops = {
        first: { scale: 1.74, xPercent: 34, yPercent: 33 },
        second: { scale: 1.8, xPercent: -35, yPercent: 0 },
        third: { scale: 1.73, xPercent: 33, yPercent: -32 },
      } as const;

      const tl = gsap.timeline({
        repeat: -1,
        repeatDelay: 0.2,
        delay: 1.2,
      });

      tl.to(image, {
        scale: stops.first.scale,
        xPercent: stops.first.xPercent,
        yPercent: stops.first.yPercent,
        duration: 1,
        ease: "power3.inOut",
      })
        .to(image, {
          scale: stops.second.scale,
          xPercent: stops.second.xPercent,
          yPercent: stops.second.yPercent,
          duration: 1.85,
          ease: "power2.inOut",
        })
        .to(image, {
          scale: stops.third.scale,
          xPercent: stops.third.xPercent,
          yPercent: stops.third.yPercent,
          duration: 1.82,
          ease: "power2.inOut",
        })
        .to(image, {
          scale: 1,
          xPercent: 0,
          yPercent: 0,
          duration: 0.82,
          ease: "power2.inOut",
        });

      return () => {
        tl.kill();
        gsap.killTweensOf(image);
      };
    },
    { scope: scopeRef },
  );

  return (
    <div ref={scopeRef} className="relative overflow-hidden rounded-[12px]">
      <img
        data-tour-image
        src={onboardingImage}
        alt="Onboarding walkthrough"
        className="block h-auto w-full"
        loading="lazy"
      />
    </div>
  );
}

function StaticOnboardingImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative overflow-hidden rounded-[12px]">
      <img src={src} alt={alt} className="block h-auto w-full" loading="lazy" />
    </div>
  );
}

function LoadingStage({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex max-w-[420px] flex-col items-center gap-4 text-center">
      <div className="flex gap-1.5">
        <span className="h-2 w-2 animate-[pulse_1.2s_ease-in-out_infinite] rounded-full bg-accent" />
        <span className="h-2 w-2 animate-[pulse_1.2s_ease-in-out_0.2s_infinite] rounded-full bg-accent" />
        <span className="h-2 w-2 animate-[pulse_1.2s_ease-in-out_0.4s_infinite] rounded-full bg-accent" />
      </div>
      <div className="font-heading text-[clamp(1.625rem,5vw,1.875rem)] leading-[1.12] font-semibold tracking-[-0.45px] text-text-primary">
        {title}
      </div>
      <div className="text-[15px] leading-[1.5] text-text-secondary">{subtitle}</div>
    </div>
  );
}

function fireOnboardingConfetti() {
  const colors = ["#8782F5", "#7670E0", "#EEEDFE", "#1A1A2E"];

  confetti({
    particleCount: 110,
    spread: 72,
    startVelocity: 42,
    origin: { y: 0.68 },
    scalar: 0.9,
    colors,
  });

  confetti({
    particleCount: 70,
    angle: 60,
    spread: 58,
    startVelocity: 36,
    origin: { x: 0.2, y: 0.72 },
    scalar: 0.88,
    colors,
  });

  confetti({
    particleCount: 70,
    angle: 120,
    spread: 58,
    startVelocity: 36,
    origin: { x: 0.8, y: 0.72 },
    scalar: 0.88,
    colors,
  });
}

function canContinue(
  step: Step,
  fieldOfWork: ProjectType[],
  setProjectLater: boolean,
  method: Method,
  projectName: string,
  clientName: string,
  projectType: ProjectType | null,
  activePhasesLength: number,
) {
  switch (step) {
    case "welcome":
      return true;
    case "personalise":
      return fieldOfWork.length > 0;
    case "details":
      return setProjectLater || (projectName.trim().length > 0 && clientName.trim().length > 0);
    case "project-type":
      return projectType !== null;
    case "method":
      return method !== null;
    case "phase-select":
      return activePhasesLength >= 2;
    case "timeline":
    case "preview":
    case "integrations":
      return true;
    case "generating-roadmap":
    case "creating":
      return false;
    default:
      return false;
  }
}

function getStepValidationError(
  step: Step,
  fieldOfWork: ProjectType[],
  setProjectLater: boolean,
  method: Method,
  projectName: string,
  clientName: string,
  projectType: ProjectType | null,
  activePhasesLength: number,
  startDate: string,
  endDate: string,
) {
  switch (step) {
    case "welcome":
      return null;
    case "personalise": {
      if (fieldOfWork.length === 0) {
        return "Choose at least one field of work to continue.";
      }

      const hasInvalidSelection = fieldOfWork.some(
        (selectedField) => !projectTypeValidationSchema.safeParse(selectedField).success,
      );
      return hasInvalidSelection ? "Choose a valid field of work." : null;
    }
    case "details": {
      if (setProjectLater) {
        return null;
      }

      const basicsParsed = projectBasicsSchema.safeParse({ projectName, clientName });
      return basicsParsed.success
        ? null
        : (basicsParsed.error.issues[0]?.message ?? "Please complete the project details.");
    }
    case "project-type": {
      if (!projectType) {
        return "Choose the project type to continue.";
      }

      const projectTypeParsed = projectTypeValidationSchema.safeParse(projectType);
      return projectTypeParsed.success
        ? null
        : (projectTypeParsed.error.issues[0]?.message ?? "Choose the project type.");
    }
    case "method":
      return method ? null : "Choose how you want to build your roadmap.";
    case "phase-select": {
      const parsed = manualPhaseSelectionSchema.safeParse(activePhasesLength);
      return parsed.success
        ? null
        : (parsed.error.issues[0]?.message ?? "Select at least two phases.");
    }
    case "timeline": {
      const parsed = dateRangeInputSchema.safeParse({ startDate, endDate });
      return parsed.success
        ? null
        : (parsed.error.issues[0]?.message ?? "Select a valid timeline.");
    }
    case "preview":
    case "integrations":
    case "generating-roadmap":
    case "creating":
    default:
      return null;
  }
}

function formatInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
