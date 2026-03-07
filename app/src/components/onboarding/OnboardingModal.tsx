import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { Eye, LinkSimple, UserCircle } from "@phosphor-icons/react";
import {
  dateRangeInputSchema,
  googleSheetsUrlSchema,
  manualPhaseSelectionSchema,
  projectBasicsSchema,
  projectTypeSchema as projectTypeValidationSchema,
} from "@/lib/validation";
import { cn } from "@/lib/utils";
import type { ProjectType } from "@/types";

type Method = "ai" | "manual" | null;

type Step =
  | "personalise"
  | "details"
  | "method"
  | "phase-select"
  | "timeline"
  | "preview"
  | "integrations"
  | "creating";

type PhaseItem = {
  id: string;
  name: string;
  on: boolean;
};

type RoadmapItem = {
  name: string;
  tasks: number;
};

const PROJECT_TYPE_OPTIONS: Array<{ value: ProjectType; label: string }> = [
  { value: "branding", label: "Branding" },
  { value: "web-design", label: "Web Design" },
  { value: "product-design", label: "Product Design" },
  { value: "app-design", label: "App Design" },
  { value: "packaging", label: "Packaging" },
  { value: "motion-design", label: "Motion Design" },
  { value: "illustration", label: "Illustration" },
  { value: "other", label: "Other" },
];

const DEFAULT_PHASES = ["Discovery", "Strategy", "Design", "Development", "Launch"];

const AI_ROADMAPS: Record<ProjectType, RoadmapItem[]> = {
  branding: [
    { name: "Research", tasks: 4 },
    { name: "Strategy", tasks: 3 },
    { name: "Identity", tasks: 5 },
    { name: "Guidelines", tasks: 4 },
    { name: "Delivery", tasks: 3 },
  ],
  "web-design": [
    { name: "Strategy", tasks: 3 },
    { name: "Research", tasks: 4 },
    { name: "Design", tasks: 6 },
    { name: "Development", tasks: 5 },
    { name: "Launch", tasks: 3 },
  ],
  "product-design": [
    { name: "Discovery", tasks: 4 },
    { name: "Research", tasks: 5 },
    { name: "Design", tasks: 6 },
    { name: "Prototyping", tasks: 4 },
    { name: "Validation", tasks: 3 },
  ],
  "app-design": [
    { name: "Research", tasks: 3 },
    { name: "Architecture", tasks: 4 },
    { name: "Design", tasks: 6 },
    { name: "Development", tasks: 5 },
    { name: "Testing", tasks: 4 },
  ],
  packaging: [
    { name: "Brief", tasks: 3 },
    { name: "Research", tasks: 4 },
    { name: "Concept", tasks: 5 },
    { name: "Refinement", tasks: 4 },
    { name: "Production", tasks: 3 },
  ],
  "motion-design": [
    { name: "Brief", tasks: 3 },
    { name: "Storyboard", tasks: 4 },
    { name: "Design", tasks: 5 },
    { name: "Animation", tasks: 6 },
    { name: "Delivery", tasks: 3 },
  ],
  illustration: [
    { name: "Brief", tasks: 3 },
    { name: "Sketching", tasks: 4 },
    { name: "Refinement", tasks: 5 },
    { name: "Final Art", tasks: 4 },
    { name: "Delivery", tasks: 3 },
  ],
  other: [
    { name: "Planning", tasks: 3 },
    { name: "Research", tasks: 4 },
    { name: "Execution", tasks: 5 },
    { name: "Review", tasks: 3 },
    { name: "Delivery", tasks: 3 },
  ],
};

export type OnboardingSubmission = {
  fieldOfWork: ProjectType;
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
  onComplete: (submission: OnboardingSubmission) => void;
  googleSheetsGuideHref?: string | null;
  stripeGuideHref?: string | null;
};

export function OnboardingModal({
  open,
  onComplete,
  googleSheetsGuideHref,
  stripeGuideHref,
}: OnboardingModalProps) {
  const [step, setStep] = useState<Step>("personalise");
  const [fieldOfWork, setFieldOfWork] = useState<ProjectType | null>(null);
  const [setProjectLater, setSetProjectLater] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientAvatar, setClientAvatar] = useState<string | null>(null);
  const [avatarUrlOpen, setAvatarUrlOpen] = useState(false);
  const [avatarUrlInput, setAvatarUrlInput] = useState("");
  const [projectType, setProjectType] = useState<ProjectType | null>(null);
  const [method, setMethod] = useState<Method>(null);
  const [startDate, setStartDate] = useState(() => formatInputDate(new Date()));
  const [endDate, setEndDate] = useState(() => formatInputDate(addDays(new Date(), 30)));
  const [phases, setPhases] = useState<PhaseItem[]>(() =>
    DEFAULT_PHASES.map((name, index) => ({ id: `phase-${index}`, name, on: true })),
  );
  const [sheetUrl, setSheetUrl] = useState("");
  const [csvConnected, setCsvConnected] = useState(false);
  const [csvImported, setCsvImported] = useState(false);
  const [csvImporting, setCsvImporting] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const creationTimeoutRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activePhases = useMemo(() => phases.filter((phase) => phase.on), [phases]);
  const previewRoadmap = useMemo(() => {
    if (!projectType) {
      return [];
    }

    if (method === "manual") {
      return activePhases.map((phase) => ({ name: phase.name, tasks: 0 }));
    }

    return AI_ROADMAPS[projectType];
  }, [activePhases, method, projectType]);

  const flowSteps = useMemo<Step[]>(() => {
    if (setProjectLater) {
      return ["personalise", "details", "integrations"];
    }

    if (method === "manual") {
      return [
        "personalise",
        "details",
        "method",
        "phase-select",
        "timeline",
        "preview",
        "integrations",
      ];
    }

    return ["personalise", "details", "method", "timeline", "preview", "integrations"];
  }, [method, setProjectLater]);

  const currentIndex = flowSteps.indexOf(step);

  useEffect(() => {
    if (!open) {
      return;
    }

    setStep("personalise");
    setFieldOfWork(null);
    setSetProjectLater(false);
    setProjectName("");
    setClientName("");
    setClientAvatar(null);
    setAvatarUrlOpen(false);
    setAvatarUrlInput("");
    setProjectType(null);
    setMethod(null);
    setStartDate(formatInputDate(new Date()));
    setEndDate(formatInputDate(addDays(new Date(), 30)));
    setPhases(DEFAULT_PHASES.map((name, index) => ({ id: `phase-${index}`, name, on: true })));
    setSheetUrl("");
    setCsvConnected(false);
    setCsvImported(false);
    setCsvImporting(false);
    setStripeConnected(false);
    setStepError(null);
  }, [open]);

  useEffect(() => {
    return () => {
      if (creationTimeoutRef.current !== null) {
        window.clearTimeout(creationTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setStepError(null);
  }, [
    step,
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

  function handleContinue() {
    const validationError = getStepValidationError(
      step,
      fieldOfWork,
      setProjectLater,
      method,
      projectName,
      clientName,
      activePhases.length,
      startDate,
      endDate,
    );

    if (validationError) {
      setStepError(validationError);
      return;
    }

    switch (step) {
      case "personalise":
        setStep("details");
        return;
      case "details":
        setStep(setProjectLater ? "integrations" : "method");
        return;
      case "method":
        setStep(method === "manual" ? "phase-select" : "timeline");
        return;
      case "phase-select":
        setStep("timeline");
        return;
      case "timeline":
        setStep("preview");
        return;
      case "preview":
        setStep("integrations");
        return;
      case "integrations":
        setStep("creating");
        creationTimeoutRef.current = window.setTimeout(() => {
          const hasProjectSetup = projectName.trim().length > 0 && clientName.trim().length > 0;
          onComplete({
            fieldOfWork: fieldOfWork!,
            createProject: !setProjectLater && hasProjectSetup,
            projectName: projectName.trim(),
            clientName: clientName.trim(),
            clientAvatarUrl: clientAvatar,
            projectType: projectType ?? fieldOfWork!,
            csvConnected,
            csvImported,
            stripeConnected,
          });
        }, 1100);
        return;
      default:
        return;
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

  function handleImportCsv() {
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

    setSheetUrl(parsed.data);
    setCsvImporting(true);
    window.setTimeout(() => {
      setCsvImporting(false);
      setCsvImported(true);
    }, 900);
  }

  function handleAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const result = loadEvent.target?.result;
      if (typeof result === "string") {
        setClientAvatar(result);
      }
    };
    reader.readAsDataURL(file);
  }

  function handleFetchAvatarFromUrl() {
    if (!avatarUrlInput.trim()) {
      return;
    }

    setClientAvatar(avatarUrlInput.trim());
  }

  function togglePhase(phaseId: string) {
    setPhases((current) =>
      current.map((phase) => (phase.id === phaseId ? { ...phase, on: !phase.on } : phase)),
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={() => undefined}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgba(25,24,42,0.54)] backdrop-blur-[3px]" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-32px)] max-w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-[22px] bg-white p-6 sm:p-7"
          onEscapeKeyDown={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          {step !== "creating" ? (
            <div className="mb-8 flex items-center justify-between">
              <Dialog.Title className="font-heading text-[20px] leading-[1.2] font-medium tracking-[-0.2px] text-text-primary">
                Get started
              </Dialog.Title>
              <StepDots total={flowSteps.length} current={currentIndex} />
            </div>
          ) : null}

          <AnimatePresence mode="wait">
            <StepShell active={step === "personalise"} stepKey="personalise">
              <h3 className="font-heading text-[24px] leading-[1.15] font-semibold tracking-[-0.4px] text-text-primary">
                Personalise your workspace
              </h3>
              <p className="mt-2 text-[15px] leading-[1.5] text-text-secondary">
                Choose your field of work so Stage can tailor your first setup.
              </p>

              <div className="mt-7 grid grid-cols-2 gap-2">
                {PROJECT_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setFieldOfWork(option.value);
                      setProjectType(option.value);
                    }}
                    className={cn(
                      "cursor-pointer rounded-[10px] border-[1.5px] px-4 py-3 text-[14px] font-medium transition-colors focus:outline-none",
                      fieldOfWork === option.value
                        ? "border-accent bg-[rgba(135,130,245,0.09)] text-accent"
                        : "border-transparent bg-input-bg text-text-primary hover:bg-[#EFEFF2]",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </StepShell>

            <StepShell active={step === "details"} stepKey="details">
              <h3 className="font-heading text-[24px] leading-[1.15] font-semibold tracking-[-0.4px] text-text-primary">
                Set up your first project <span className="text-text-tertiary">(optional)</span>
              </h3>
              <p className="mt-2 text-[15px] leading-[1.5] text-text-secondary">
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
                  <label className="mb-1.5 block text-[13px] font-medium text-text-primary">Client</label>
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
                      <img src={clientAvatar} alt="Client avatar" className="h-full w-full object-cover" />
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
            </StepShell>

            <StepShell active={step === "method"} stepKey="method">
              <h3 className="font-heading text-[24px] leading-[1.15] font-semibold tracking-[-0.4px] text-text-primary">
                Build your roadmap
              </h3>
              <p className="mt-2 text-[15px] leading-[1.5] text-text-secondary">
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
            </StepShell>

            <StepShell active={step === "phase-select"} stepKey="phase-select">
              <h3 className="font-heading text-[24px] leading-[1.15] font-semibold tracking-[-0.4px] text-text-primary">
                Select phases
              </h3>
              <p className="mt-2 text-[15px] leading-[1.5] text-text-secondary">
                Toggle the phases you want in your starter roadmap.
              </p>

              <div className="mt-6">
                {phases.map((phase, index) => (
                  <div
                    key={phase.id}
                    className={cn(
                      "flex items-center gap-3 py-2.5",
                      index < phases.length - 1 ? "border-b border-border-subtle" : "",
                    )}
                  >
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
                    <span className={phase.on ? "text-[14px] text-text-primary" : "text-[14px] text-text-tertiary"}>
                      {phase.name}
                    </span>
                  </div>
                ))}
              </div>
            </StepShell>

            <StepShell active={step === "timeline"} stepKey="timeline">
              <h3 className="font-heading text-[24px] leading-[1.15] font-semibold tracking-[-0.4px] text-text-primary">
                Project timeline
              </h3>
              <p className="mt-2 text-[15px] leading-[1.5] text-text-secondary">
                When does this project start and end?
              </p>

              <div className="mt-7 flex gap-3">
                <div className="flex-1">
                  <label className="mb-1.5 block text-[13px] font-medium text-text-primary">Start date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="w-full rounded-[10px] border border-transparent bg-input-bg px-[14px] py-3 text-[14px] text-text-primary outline-none transition-all duration-200 focus:border-border focus:bg-white"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1.5 block text-[13px] font-medium text-text-primary">End date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    className="w-full rounded-[10px] border border-transparent bg-input-bg px-[14px] py-3 text-[14px] text-text-primary outline-none transition-all duration-200 focus:border-border focus:bg-white"
                  />
                </div>
              </div>
            </StepShell>

            <StepShell active={step === "preview"} stepKey="preview">
              <h3 className="font-heading text-[24px] leading-[1.15] font-semibold tracking-[-0.4px] text-text-primary">
                Your roadmap
              </h3>
              <p className="mt-2 text-[15px] leading-[1.5] text-text-secondary">
                Looking good. You can adjust everything later.
              </p>

              <div className="mt-7">
                {previewRoadmap.map((phase, index) => (
                  <div key={`${phase.name}-${index}`} className="flex items-center gap-3.5">
                    <div className="flex w-[18px] shrink-0 flex-col items-center">
                      <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                      {index < previewRoadmap.length - 1 ? <span className="h-7 w-px bg-border" /> : null}
                    </div>
                    <div className="flex flex-1 items-center justify-between py-2">
                      <span className="text-[14px] font-medium text-text-primary">{phase.name}</span>
                      <span className="text-[13px] text-text-secondary">
                        {phase.tasks > 0 ? `${phase.tasks} tasks` : "0 tasks"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </StepShell>

            <StepShell active={step === "integrations"} stepKey="integrations">
              <h3 className="font-heading text-[24px] leading-[1.15] font-semibold tracking-[-0.4px] text-text-primary">
                Connect your data
              </h3>
              <p className="mt-2 text-[15px] leading-[1.5] text-text-secondary">
                Connect now or skip for later. You can adjust integrations anytime in Settings.
              </p>

              <div className="mt-7 rounded-[16px] border border-border-subtle bg-bg-subtle px-4 py-4 sm:px-6 sm:py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[17px] font-medium text-text-primary">Google Sheets (CSV)</p>
                    <p className="text-[13px] text-text-secondary">Standard connection + import flow</p>
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
                    className="cursor-pointer text-[15px] font-medium text-accent transition-colors hover:text-accent-hover focus:outline-none"
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
                        className="h-[46px] flex-1 rounded-[12px] border border-transparent bg-white px-4 text-[15px] text-text-primary transition-all duration-200 outline-none placeholder:text-text-tertiary focus:border-border"
                      />
                      <button
                        type="button"
                        onClick={handleImportCsv}
                        disabled={!sheetUrl.trim() || csvImporting}
                        className="h-[46px] min-w-[220px] cursor-pointer rounded-[12px] bg-text-primary px-5 text-[15px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-45 focus:outline-none"
                      >
                        {csvImporting ? "Importing..." : "Import Google Sheets"}
                      </button>
                    </div>
                    {csvImported ? (
                      <div className="mt-2 text-[12px] text-accent">Import completed successfully.</div>
                    ) : null}
                  </>
                ) : (
                  <p className="mt-4 text-[14px] text-text-secondary">
                    Link your sheet and import whenever you are ready.
                  </p>
                )}

                <GuideLink href={googleSheetsGuideHref}>View our guide</GuideLink>

                <div className="my-5 h-px bg-border-subtle" />

                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[17px] font-medium text-text-primary">Stripe</p>
                    <p className="text-[13px] text-text-secondary">Optional now, can be connected later</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStripeConnected((value) => !value)}
                    className={cn(
                      "cursor-pointer text-[15px] font-medium transition-colors focus:outline-none",
                      stripeConnected ? "text-text-secondary hover:text-text-primary" : "text-accent hover:text-accent-hover",
                    )}
                  >
                    {stripeConnected ? "Disconnect" : "Connect Stripe"}
                  </button>
                </div>

                <div className="mt-3 inline-flex items-center gap-1.5 text-[13px] text-text-secondary">
                  <LinkSimple size={14} />
                  {stripeConnected ? "Stripe connected." : "No Stripe connection yet."}
                </div>

                <GuideLink href={stripeGuideHref}>View our guide</GuideLink>
              </div>
            </StepShell>

            <StepShell
              active={step === "creating"}
              stepKey="creating"
              className="flex min-h-[300px] flex-col items-center justify-center text-center"
            >
              <div className="flex min-h-[120px] items-center justify-center">
                <div className="font-heading text-[24px] font-semibold tracking-[-0.35px] text-accent">
                  Creating your dashboard...
                </div>
              </div>
            </StepShell>
          </AnimatePresence>

          {step !== "creating" ? (
            <div className="mt-8">
              {stepError ? (
                <p className="mb-3 text-[13px] leading-[1.5] text-[#E07070]">{stepError}</p>
              ) : null}
              <button
                type="button"
                className="h-[50px] w-full cursor-pointer rounded-[12px] bg-text-primary px-5 text-[15px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-45 focus:outline-none"
                disabled={!canContinue(step, fieldOfWork, setProjectLater, method, projectName, clientName, activePhases.length)}
                onClick={handleContinue}
              >
                {step === "integrations" ? "Create Dashboard" : "Continue"}
              </button>

              {step !== "personalise" ? (
                <div className="mt-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      const index = flowSteps.indexOf(step);
                      const previous = index > 0 ? flowSteps[index - 1] : null;
                      if (previous) {
                        setStep(previous);
                      }
                    }}
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function StepShell({
  active,
  stepKey,
  children,
  className,
}: {
  active: boolean;
  stepKey: string;
  children: ReactNode;
  className?: string;
}) {
  if (!active) {
    return null;
  }

  return (
    <motion.div
      key={stepKey}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      {children}
    </motion.div>
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
      <div className={cn("mb-1 text-[15px] font-medium", active ? "text-accent" : "text-text-primary")}>
        {title}
      </div>
      <div className="text-[13px] leading-[1.4] text-text-secondary">{description}</div>
    </button>
  );
}

function GuideLink({ href, children }: { href?: string | null; children: ReactNode }) {
  if (!href) {
    return (
      <span className="mt-4 inline-flex items-center gap-1.5 text-[15px] text-accent/60">
        <Eye size={16} />
        {children}
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="mt-4 inline-flex items-center gap-1.5 text-[15px] text-accent transition-colors hover:text-accent-hover"
    >
      <Eye size={16} />
      {children}
    </a>
  );
}

function canContinue(
  step: Step,
  fieldOfWork: ProjectType | null,
  setProjectLater: boolean,
  method: Method,
  projectName: string,
  clientName: string,
  activePhasesLength: number,
) {
  switch (step) {
    case "personalise":
      return fieldOfWork !== null;
    case "details":
      return setProjectLater || (projectName.trim().length > 0 && clientName.trim().length > 0);
    case "method":
      return method !== null;
    case "phase-select":
      return activePhasesLength >= 2;
    case "timeline":
    case "preview":
    case "integrations":
      return true;
    case "creating":
      return false;
    default:
      return false;
  }
}

function getStepValidationError(
  step: Step,
  fieldOfWork: ProjectType | null,
  setProjectLater: boolean,
  method: Method,
  projectName: string,
  clientName: string,
  activePhasesLength: number,
  startDate: string,
  endDate: string,
) {
  switch (step) {
    case "personalise": {
      if (!fieldOfWork) {
        return "Choose your field of work to continue.";
      }

      const parsed = projectTypeValidationSchema.safeParse(fieldOfWork);
      return parsed.success ? null : parsed.error.issues[0]?.message ?? "Choose your field of work.";
    }
    case "details": {
      if (setProjectLater) {
        return null;
      }

      const parsed = projectBasicsSchema.safeParse({ projectName, clientName });
      return parsed.success ? null : parsed.error.issues[0]?.message ?? "Please complete the project details.";
    }
    case "method":
      return method ? null : "Choose how you want to build your roadmap.";
    case "phase-select": {
      const parsed = manualPhaseSelectionSchema.safeParse(activePhasesLength);
      return parsed.success ? null : parsed.error.issues[0]?.message ?? "Select at least two phases.";
    }
    case "timeline": {
      const parsed = dateRangeInputSchema.safeParse({ startDate, endDate });
      return parsed.success ? null : parsed.error.issues[0]?.message ?? "Select a valid timeline.";
    }
    case "preview":
    case "integrations":
    case "creating":
    default:
      return null;
  }
}

function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "h-1.5 rounded-full transition-all duration-200",
            index === current ? "w-5 bg-accent" : index < current ? "w-1.5 bg-accent" : "w-1.5 bg-[#D9D9D9]",
          )}
        />
      ))}
    </div>
  );
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
