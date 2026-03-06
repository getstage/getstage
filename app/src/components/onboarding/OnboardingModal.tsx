import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { useGSAP } from "@gsap/react";
import { Eye, UserCircle } from "@phosphor-icons/react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import onboardingImage from "@/assets/onboarding/onboarding.webp";
import { cn } from "@/lib/utils";
import type { ProjectType } from "@/types";

gsap.registerPlugin(SplitText, useGSAP);

type Method = "ai" | "manual" | null;

type Step =
  | "welcome"
  | "personalise"
  | "details"
  | "method"
  | "phase-select"
  | "timeline"
  | "preview"
  | "integrations"
  | "creating";

type Option = {
  value: ProjectType;
  label: string;
};

type PhaseItem = {
  id: string;
  name: string;
  on: boolean;
};

type RoadmapItem = {
  name: string;
  tasks: number;
};

const PROJECT_TYPE_OPTIONS: Option[] = [
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
const GOOGLE_SHEETS_ICON_SRC = new URL("../../assets/icons/google-sheets.svg", import.meta.url)
  .href;
const STRIPE_ICON_SRC = new URL("../../assets/icons/stripe.svg", import.meta.url).href;

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
  userName?: string;
  onComplete: (submission: OnboardingSubmission) => void;
};

export function OnboardingModal({ open, userName, onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState<Step>("welcome");
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
  const [draggingPhaseId, setDraggingPhaseId] = useState<string | null>(null);

  const [sheetUrl, setSheetUrl] = useState("");
  const [csvConnected, setCsvConnected] = useState(false);
  const [csvImported, setCsvImported] = useState(false);
  const [csvImporting, setCsvImporting] = useState(false);

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
      return ["welcome", "personalise", "details", "integrations"];
    }
    if (method === "manual") {
      return [
        "welcome",
        "personalise",
        "details",
        "method",
        "phase-select",
        "timeline",
        "preview",
        "integrations",
      ];
    }
    return ["welcome", "personalise", "details", "method", "timeline", "preview", "integrations"];
  }, [method, setProjectLater]);

  const currentIndex = flowSteps.indexOf(step);

  useEffect(() => {
    if (!open) {
      return;
    }

    setStep("welcome");
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
  }, [open]);

  useEffect(() => {
    return () => {
      if (creationTimeoutRef.current !== null) {
        window.clearTimeout(creationTimeoutRef.current);
      }
    };
  }, []);

  function handleSelectField(value: ProjectType) {
    setFieldOfWork(value);
    setProjectType(value);
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

  function handleContinue() {
    if (!canContinue(step, fieldOfWork, setProjectLater, method, projectName, clientName, activePhases.length)) {
      return;
    }

    switch (step) {
      case "welcome":
        setStep("personalise");
        return;
      case "personalise":
        setStep("details");
        return;
      case "details":
        if (setProjectLater) {
          setStep("integrations");
          return;
        }
        setStep("method");
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
          const createProject = !setProjectLater && hasProjectSetup;

          onComplete({
            fieldOfWork: fieldOfWork!,
            createProject,
            projectName: projectName.trim(),
            clientName: clientName.trim(),
            clientAvatarUrl: clientAvatar,
            projectType: projectType!,
            csvConnected,
            csvImported,
            stripeConnected: false,
          });
        }, 1800);
        return;
      default:
        return;
    }
  }

  function handleDoLater() {
    if (step !== "details") {
      return;
    }
    setSetProjectLater(true);
    setStep("integrations");
  }

  function handleImportCsv() {
    if (!csvConnected || csvImporting) {
      return;
    }
    setCsvImporting(true);
    window.setTimeout(() => {
      setCsvImporting(false);
      setCsvImported(true);
    }, 900);
  }

  function handleAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

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
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgba(25,24,42,0.54)] backdrop-blur-[3px]" />
        <Dialog.Content
          className="project-creation-page onboarding-modal fixed left-1/2 top-1/2 z-50 w-[calc(100%-32px)] max-w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-[22px] border-0 bg-white p-6 shadow-[0_28px_90px_rgba(10,12,22,0.26)] outline-none ring-0 focus:outline-none focus-visible:outline-none focus:ring-0 sm:p-7"
          onEscapeKeyDown={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          {step !== "creating" && step !== "welcome" && (
            <div className="mb-8 flex items-center justify-between">
              <Dialog.Title className="font-heading text-[20px] leading-[1.2] font-medium tracking-[-0.2px] text-text-primary">
                Get started
              </Dialog.Title>
              <StepDots total={flowSteps.length} current={currentIndex} />
            </div>
          )}

          <AnimatePresence mode="wait">
            {step === "welcome" && (
              <motion.div
                key="s-welcome"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <WelcomeSlide userName={userName} />
              </motion.div>
            )}

            {step === "personalise" && (
              <motion.div key="s-personalise" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                <h3 className="font-heading text-[24px] leading-[1.15] font-semibold tracking-[-0.4px] text-text-primary">Personalise your workspace</h3>
                <p className="mt-2 text-[15px] leading-[1.5] text-text-secondary">Choose your field of work so Stage can tailor your first setup.</p>

                <div className="mt-7 grid grid-cols-2 gap-2">
                  {PROJECT_TYPE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelectField(option.value)}
                      className={cn(
                        "cursor-pointer rounded-[10px] border-[1.5px] px-4 py-3 text-[14px] font-medium transition-colors focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0",
                        fieldOfWork === option.value
                          ? "border-accent bg-[rgba(135,130,245,0.09)] text-accent"
                          : "border-transparent bg-input-bg text-text-primary hover:bg-[#EFEFF2]",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === "details" && (
              <motion.div key="s-details" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                <h3 className="font-heading text-[24px] leading-[1.15] font-semibold tracking-[-0.4px] text-text-primary">Set up your first project <span className="text-text-tertiary">(optional)</span></h3>
                <p className="mt-2 text-[15px] leading-[1.5] text-text-secondary">You can complete this now or continue and set it up later.</p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-[13px] font-medium text-text-primary">Project name</label>
                        <input
                          value={projectName}
                          onChange={(event) => setProjectName(event.target.value)}
                          placeholder="Website Redesign"
                          autoFocus
                          className="w-full rounded-[10px] border border-transparent bg-input-bg px-3.5 py-2.5 text-[14px] text-text-primary transition-all duration-200 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 placeholder:text-text-tertiary focus:border-border focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-[13px] font-medium text-text-primary">Client</label>
                        <input
                          value={clientName}
                          onChange={(event) => setClientName(event.target.value)}
                          placeholder="Acme Studio"
                          className="w-full rounded-[10px] border border-transparent bg-input-bg px-3.5 py-2.5 text-[14px] text-text-primary transition-all duration-200 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 placeholder:text-text-tertiary focus:border-border focus:bg-white"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="mb-1.5 block text-[13px] font-medium text-text-primary">Client photo <span className="font-normal text-text-tertiary">- optional</span></label>

                      <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-input-bg">
                          {clientAvatar ? <img src={clientAvatar} alt="Client avatar" className="h-full w-full object-cover" /> : <UserCircle size={20} className="text-text-tertiary" />}
                        </div>

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="cursor-pointer text-[13px] text-text-secondary transition-colors hover:text-accent focus:outline-none focus-visible:outline-none"
                        >
                          Upload photo
                        </button>
                        <button
                          type="button"
                          onClick={() => setAvatarUrlOpen((value) => !value)}
                          className="cursor-pointer text-[13px] text-text-secondary transition-colors hover:text-accent focus:outline-none focus-visible:outline-none"
                        >
                          Import from URL
                        </button>
                        {clientAvatar && (
                          <button
                            type="button"
                            onClick={() => setClientAvatar(null)}
                            className="cursor-pointer text-[13px] text-text-secondary transition-colors hover:text-text-primary focus:outline-none focus-visible:outline-none"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      {avatarUrlOpen && (
                        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                          <input
                            value={avatarUrlInput}
                            onChange={(event) => setAvatarUrlInput(event.target.value)}
                            placeholder="Paste image URL..."
                            className="h-9 flex-1 rounded-[8px] border border-transparent bg-input-bg px-3 text-[13px] text-text-primary transition-all duration-200 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 placeholder:text-text-tertiary focus:border-border focus:bg-white"
                          />
                          <button
                            type="button"
                            onClick={handleFetchAvatarFromUrl}
                            className="h-9 cursor-pointer rounded-[8px] border border-[rgba(135,130,245,0.2)] bg-[rgba(135,130,245,0.08)] px-3 text-[13px] font-medium text-accent transition-colors hover:bg-[rgba(135,130,245,0.15)] focus:outline-none focus-visible:outline-none"
                          >
                            Fetch
                          </button>
                        </div>
                      )}

                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFileChange} />
                    </div>
              </motion.div>
            )}

            {step === "method" && (
              <motion.div key="s-method" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                <h3 className="font-heading text-[24px] leading-[1.15] font-semibold tracking-[-0.4px] text-text-primary">Build your roadmap</h3>
                <p className="mt-2 text-[15px] leading-[1.5] text-text-secondary">How do you want to structure this project?</p>

                <div className="mt-7 flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={() => setMethod("ai")}
                    className={cn(
                      "cursor-pointer rounded-xl border-[1.5px] bg-input-bg px-5 py-[18px] text-left transition-colors focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0",
                      method === "ai" ? "border-accent bg-[rgba(135,130,245,0.08)]" : "border-transparent hover:bg-[#EFEFEF]",
                    )}
                  >
                    <div className={cn("mb-1 text-[15px] font-medium", method === "ai" ? "text-accent" : "text-text-primary")}>AI-Generated</div>
                    <div className="text-[13px] leading-[1.4] text-text-secondary">Tailored phases and tasks based on your project type.</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMethod("manual")}
                    className={cn(
                      "cursor-pointer rounded-xl border-[1.5px] bg-input-bg px-5 py-[18px] text-left transition-colors focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0",
                      method === "manual" ? "border-accent bg-[rgba(135,130,245,0.08)]" : "border-transparent hover:bg-[#EFEFEF]",
                    )}
                  >
                    <div className={cn("mb-1 text-[15px] font-medium", method === "manual" ? "text-accent" : "text-text-primary")}>Manual Setup</div>
                    <div className="text-[13px] leading-[1.4] text-text-secondary">Choose your own phases and add tasks as you go.</div>
                  </button>
                </div>
              </motion.div>
            )}

            {step === "phase-select" && (
              <motion.div key="s-phase-select" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                <h3 className="font-heading text-[24px] leading-[1.15] font-semibold tracking-[-0.4px] text-text-primary">Select phases</h3>
                <p className="mt-2 text-[15px] leading-[1.5] text-text-secondary">Toggle the phases you want. Reorder by dragging.</p>

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
                        index < phases.length - 1 && "border-b border-border-subtle",
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
                        className={cn("relative h-5 w-9 shrink-0 cursor-pointer rounded-[10px] transition-colors focus:outline-none", phase.on ? "bg-accent" : "bg-[#D9D9D9]")}
                        aria-label={`Toggle ${phase.name}`}
                      >
                        <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all", phase.on ? "left-[18px]" : "left-0.5")} />
                      </button>
                      <span className={cn("text-[14px]", phase.on ? "text-text-primary" : "text-text-tertiary")}>{phase.name}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {step === "timeline" && (
              <motion.div key="s-timeline" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                <h3 className="font-heading text-[24px] leading-[1.15] font-semibold tracking-[-0.4px] text-text-primary">Project timeline</h3>
                <p className="mt-2 text-[15px] leading-[1.5] text-text-secondary">When does this project start and end?</p>

                <div className="mt-7 flex gap-3">
                  <div className="flex-1">
                    <label className="mb-1.5 block text-[13px] font-medium text-text-primary">Start date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                      className="w-full rounded-[10px] border border-transparent bg-input-bg px-[14px] py-3 text-[14px] text-text-primary outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 transition-all duration-200 focus:border-border focus:bg-white"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="mb-1.5 block text-[13px] font-medium text-text-primary">End date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(event) => setEndDate(event.target.value)}
                      className="w-full rounded-[10px] border border-transparent bg-input-bg px-[14px] py-3 text-[14px] text-text-primary outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 transition-all duration-200 focus:border-border focus:bg-white"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {step === "preview" && (
              <motion.div key="s-preview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                <h3 className="font-heading text-[24px] leading-[1.15] font-semibold tracking-[-0.4px] text-text-primary">Your roadmap</h3>
                <p className="mt-2 text-[15px] leading-[1.5] text-text-secondary">Looking good. You can adjust everything later.</p>

                <div className="mt-7">
                  {previewRoadmap.map((phase, index) => (
                    <div key={`${phase.name}-${index}`} className="flex items-center gap-3.5">
                      <div className="flex w-[18px] shrink-0 flex-col items-center">
                        <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                        {index < previewRoadmap.length - 1 && <span className="h-7 w-px bg-border" />}
                      </div>
                      <div className="flex flex-1 items-center justify-between py-2">
                        <span className="text-[14px] font-medium text-text-primary">{phase.name}</span>
                        <span className="text-[13px] text-text-secondary">{phase.tasks > 0 ? `${phase.tasks} tasks` : "0 tasks"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {step === "integrations" && (
              <motion.div key="s-integrations" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                <div className="flex items-center gap-2.5">
                  <h3 className="font-heading text-[24px] leading-[1.15] font-semibold tracking-[-0.4px] text-text-primary">
                    Connect your data
                  </h3>
                  <img src={GOOGLE_SHEETS_ICON_SRC} alt="Google Sheets" className="h-4 w-4" />
                  <img src={STRIPE_ICON_SRC} alt="Stripe" className="h-4 w-4" />
                </div>
                <p className="mt-2 text-[15px] leading-[1.45] text-text-secondary">Import Google Sheets now. Stripe comes next.</p>

                <div className="mt-6 border-t border-border-subtle pt-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[15px] font-medium text-text-primary">Google Sheets import</p>
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
                          className="h-[44px] flex-1 rounded-[10px] border border-transparent bg-input-bg px-3.5 text-[14px] text-text-primary transition-all duration-200 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 placeholder:text-text-tertiary focus:border-border focus:bg-white"
                        />
                        <button
                          type="button"
                          onClick={handleImportCsv}
                          disabled={!sheetUrl.trim() || csvImporting}
                          className="h-[44px] min-w-[220px] cursor-pointer rounded-[10px] bg-text-primary px-4 text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-45 focus:outline-none"
                        >
                          {csvImporting ? "Importing..." : "Import Google Sheets"}
                        </button>
                      </div>
                      {csvImported && (
                        <div className="mt-2 text-[12px] text-accent">
                          Imported. We&apos;ll use this data in your dashboard.
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="mt-3 text-[13px] text-text-secondary">Optional for now.</p>
                  )}
                </div>

                <a
                  href="https://help.portfoliodividendtracker.com/article/126-article"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 text-[14px] text-accent transition-colors hover:text-accent-hover"
                >
                  <Eye size={16} />
                  View import guide
                </a>
              </motion.div>
            )}

            {step === "creating" && (
              <motion.div key="s-creating" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="flex min-h-[300px] flex-col items-center justify-center text-center">
                <CreatingDashboardText />
              </motion.div>
            )}
          </AnimatePresence>

          {step !== "creating" && (
            <div className="mt-8">
              <button
                type="button"
                className="h-[50px] w-full cursor-pointer rounded-[12px] bg-text-primary px-5 text-[15px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-45 focus:outline-none focus-visible:outline-none"
                disabled={!canContinue(step, fieldOfWork, setProjectLater, method, projectName, clientName, activePhases.length)}
                onClick={handleContinue}
              >
                {step === "welcome" ? "Start setup" : step === "integrations" ? "Create Dashboard" : "Continue"}
              </button>

              {step !== "welcome" && (
                <div className="mt-4 flex items-center justify-between">
                  <button type="button" onClick={goBack} className="inline-flex cursor-pointer items-center gap-1 text-[13px] text-text-secondary transition-colors hover:text-text-primary focus:outline-none focus-visible:outline-none">
                    Back
                  </button>

                  {step === "details" && (
                    <button
                      type="button"
                      onClick={handleDoLater}
                      className="inline-flex cursor-pointer items-center gap-1 text-[13px] text-text-secondary transition-colors hover:text-text-primary focus:outline-none focus-visible:outline-none"
                    >
                      I&apos;ll do this later
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
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
      gsap.set(titleSplit.lines, { y: 10, opacity: 0 });
      gsap.set(titleSplit.words, { y: 16, opacity: 0, color: "var(--color-text-secondary)" });
      gsap.set(subtitleSplit.lines, { y: 10, opacity: 0 });
      gsap.set("[data-welcome-preview]", { y: 20, opacity: 0 });

      const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
      timeline.to(titleSplit.lines, {
        y: 0,
        opacity: 1,
        duration: 0.45,
      });
      timeline.to(
        titleSplit.words,
        {
          y: 0,
          opacity: 1,
          color: "var(--color-text-primary)",
          stagger: 0.028,
          duration: 0.5,
        },
        "-=0.3",
      );
      timeline.to(
        subtitleSplit.lines,
        {
          y: 0,
          opacity: 1,
          duration: 0.42,
          stagger: 0.09,
          ease: "power2.out",
        },
        "-=0.16",
      );
      timeline.to(
        "[data-welcome-preview]",
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          ease: "power2.out",
        },
        "-=0.16",
      );
      timeline.to(
        titleSplit.words,
        {
          color: "var(--color-text-primary)",
          duration: 0.2,
        },
        "-=0.1",
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
        Welcome to Stage{userName ? `, ${userName}` : ""}. Thanks for signing up.
      </h3>
      <p ref={subtitleRef} className="mt-2 max-w-[620px] text-[15px] leading-[1.5] text-text-secondary">
        Let&apos;s tailor your workspace and get your dashboard ready in under a minute.
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
      if (!image) return;

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

      // Mirrors landing feature-tour pacing, tailored to onboarding.webp hotspots:
      // 1) top-left, 2) middle-right, 3) bottom-left.
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
      const zoomInEase = "power3.inOut";
      const tourEase = "power2.inOut";

      tl.to(image, {
        scale: stops.first.scale,
        xPercent: stops.first.xPercent,
        yPercent: stops.first.yPercent,
        duration: 1.0,
        ease: zoomInEase,
      })
        .to(image, {
          scale: stops.second.scale,
          xPercent: stops.second.xPercent,
          yPercent: stops.second.yPercent,
          duration: 1.85,
          ease: tourEase,
        })
        .to(image, {
          scale: stops.third.scale,
          xPercent: stops.third.xPercent,
          yPercent: stops.third.yPercent,
          duration: 1.82,
          ease: tourEase,
        })
        .to(image, {
          scale: 1,
          xPercent: 0,
          yPercent: 0,
          duration: 0.82,
          ease: tourEase,
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
    case "welcome":
      return true;
    case "personalise":
      return fieldOfWork !== null;
    case "details":
      return setProjectLater || (projectName.trim().length > 0 && clientName.trim().length > 0);
    case "method":
      return method !== null;
    case "phase-select":
      return activePhasesLength >= 2;
    case "timeline":
      return true;
    case "preview":
      return true;
    case "integrations":
      return true;
    case "creating":
      return false;
    default:
      return false;
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

function CreatingDashboardText() {
  const textRef = useRef<HTMLDivElement | null>(null);

  useGSAP(() => {
    if (!textRef.current) {
      return;
    }

    const split = new SplitText(textRef.current, { type: "chars" });
    const chars = split.chars;

    gsap.set(chars, { color: "var(--color-text-secondary)" });
    const timeline = gsap.timeline();
    timeline.to(chars, {
      color: "var(--color-accent)",
      duration: 0.45,
      stagger: 0.022,
      ease: "power2.out",
    });
    timeline.to(chars, {
      color: "var(--color-accent)",
      duration: 0.01,
    });

    return () => {
      timeline.kill();
      split.revert();
    };
  });

  return (
    <div className="flex min-h-[120px] items-center justify-center">
      <div
        ref={textRef}
        className="font-heading text-[24px] font-semibold tracking-[-0.35px] text-text-secondary"
      >
        Your account is set up now, preparing your dashboard...
      </div>
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
