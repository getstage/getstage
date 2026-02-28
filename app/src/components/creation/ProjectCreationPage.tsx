import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft } from "@phosphor-icons/react";
import { createProject } from "@/data-ops/mutations";
import { useAuth } from "@/lib/auth";
import { cn, getInitials } from "@/lib/utils";
import stageLogo from "@/assets/logos/stage-logo-light.png";
import type { CreateProjectInput, ProjectType } from "@/types";

type WorkflowStep = 1 | 2 | 3 | "4a" | "4m" | "4mb" | 5;
type Step = WorkflowStep | "success";
type Method = "ai" | "manual" | null;

type PhaseItem = {
  id: string;
  name: string;
  on: boolean;
};

type RoadmapItem = {
  name: string;
  tasks: number;
};

const PROJECT_TYPES: Array<{ value: ProjectType; label: string }> = [
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

const transition = { duration: 0.2, ease: "easeInOut" } as const;

export function ProjectCreationPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

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

  const roadmap = useMemo<RoadmapItem[]>(() => {
    if (method === "manual") {
      return activePhases.map((phase) => ({ name: phase.name, tasks: 0 }));
    }
    if (!projectType) {
      return [];
    }
    return AI_ROADMAPS[projectType];
  }, [activePhases, method, projectType]);

  const currentIndex =
    typeof step === "number" || typeof step === "string"
      ? steps.indexOf(step as WorkflowStep)
      : -1;

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
  }, [activePhases.length, clientName, endDate, isCreating, method, projectName, projectType, roadmap.length, startDate, step]);

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

  function goBack() {
    if (isGenerating || isCreating || step === "success") {
      return;
    }
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

    switch (step) {
      case 1:
        setStep(2);
        return;
      case 2:
        setStep(3);
        return;
      case 3:
        setStep(method === "manual" ? "4m" : "4a");
        return;
      case "4m":
        setStep("4mb");
        return;
      case "4mb":
        setStep(5);
        return;
      case "4a":
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
    try {
      const phaseNames =
        method === "manual"
          ? activePhases.map((phase) => phase.name.trim()).filter((name) => name.length > 0)
          : AI_ROADMAPS[projectType].map((phase) => phase.name);

      const input: CreateProjectInput = {
        name: projectName.trim(),
        clientName: clientName.trim(),
        type: projectType,
        method,
        startDate: parseInputDate(startDate),
        endDate: parseInputDate(endDate),
        phases: phaseNames,
      };

      const project = await createProject(input);
      setCreatedProjectId(project.id);
      setStep("success");
    } finally {
      setIsCreating(false);
    }
  }

  function handleViewProject() {
    if (createdProjectId) {
      navigate({
        to: "/project/$id",
        params: { id: createdProjectId },
      });
      return;
    }
    navigate({ to: "/dashboard" });
  }

  function handleAvatarFileChange(event: React.ChangeEvent<HTMLInputElement>) {
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

  function fetchAvatarFromUrl() {
    if (!avatarUrlInput.trim() || avatarFetching) {
      return;
    }

    setAvatarFetching(true);
    avatarTimeoutRef.current = window.setTimeout(() => {
      setClientAvatar("https://randomuser.me/api/portraits/men/32.jpg");
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
        phase.id === phaseId
          ? {
              ...phase,
              name: trimmed || "New Phase",
            }
          : phase,
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

  return (
    <>
      <Helmet>
        <title>New Project - Stage</title>
      </Helmet>

      <div className="project-creation-page mx-auto flex min-h-screen w-full max-w-[1440px] flex-col bg-white">
        <nav className="flex items-center justify-between px-14 py-[18px]">
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="inline-flex items-center">
              <img src={stageLogo} alt="Stage" className="h-[22px] w-auto" />
            </Link>
            <button
              type="button"
              onClick={() => navigate({ to: "/dashboard" })}
              className="inline-flex cursor-pointer items-center gap-1.5 text-[13px] text-text-secondary transition-colors hover:text-text-primary"
            >
              <ArrowLeft size={14} weight="regular" />
              Dashboard
            </button>
          </div>

          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-border-subtle text-[13px] font-medium text-text-secondary">
            {getInitials(user?.name ?? "SN")}
          </div>
        </nav>

        <div className="flex flex-1 items-center justify-center px-10">
          <div className="w-full max-w-[420px]">
            <AnimatePresence mode="wait">
              {isGenerating ? (
                <StepCard key="generating">
                  <div className="flex flex-col items-center justify-center gap-5 py-20">
                    <div className="flex gap-1.5">
                      <span className="h-2 w-2 animate-[pulse_1.2s_ease-in-out_infinite] rounded-full bg-accent" />
                      <span className="h-2 w-2 animate-[pulse_1.2s_ease-in-out_0.2s_infinite] rounded-full bg-accent" />
                      <span className="h-2 w-2 animate-[pulse_1.2s_ease-in-out_0.4s_infinite] rounded-full bg-accent" />
                    </div>
                    <div className="text-[15px] text-text-secondary">Creating your roadmap...</div>
                  </div>
                </StepCard>
              ) : step === "success" ? (
                <StepCard key="success">
                  <div className="flex flex-col items-center justify-center gap-4 py-10">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(135,130,245,0.08)]">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-7 w-7 text-accent"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <div className="font-heading text-[22px] font-semibold tracking-[-0.3px] text-text-primary">
                      Project created!
                    </div>
                    <div className="mt-[-4px] text-[14px] text-text-secondary">
                      Your roadmap is ready to go.
                    </div>
                    <button
                      type="button"
                      onClick={handleViewProject}
                      className="mt-3 w-full cursor-pointer rounded-[10px] bg-text-primary px-4 py-[13px] text-[15px] font-medium text-white transition-opacity hover:opacity-85"
                    >
                      View Project
                    </button>
                  </div>
                </StepCard>
              ) : (
                <StepCard key={`step-${step}`}>
                  {step === 1 && (
                    <div>
                      <h2 className="mb-2 text-center font-heading text-[24px] font-semibold tracking-[-0.4px] text-text-primary">
                        New project
                      </h2>
                      <p className="mb-8 text-center text-[15px] leading-[1.5] text-text-secondary">
                        Let&apos;s set it up. This only takes a minute.
                      </p>

                      <div className="mb-4">
                        <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
                          Project name
                        </label>
                        <input
                          type="text"
                          value={projectName}
                          onChange={(event) => setProjectName(event.target.value)}
                          placeholder="Website Redesign"
                          autoFocus
                          className="w-full rounded-[10px] border border-transparent bg-input-bg px-4 py-3 text-[15px] text-text-primary outline-none focus-visible:outline-none transition-all duration-200 placeholder:text-text-tertiary focus:border-border focus:bg-white"
                        />
                      </div>

                      <div className="mb-5">
                        <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
                          Client
                        </label>
                        <input
                          type="text"
                          value={clientName}
                          onChange={(event) => setClientName(event.target.value)}
                          placeholder="Acme Studio"
                          className="w-full rounded-[10px] border border-transparent bg-input-bg px-4 py-3 text-[15px] text-text-primary outline-none focus-visible:outline-none transition-all duration-200 placeholder:text-text-tertiary focus:border-border focus:bg-white"
                        />
                      </div>

                      <div className="mb-0">
                        <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
                          Client photo <span className="font-normal text-text-tertiary">- optional</span>
                        </label>
                      </div>

                      <div className="mb-6 flex items-center gap-4">
                        <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-input-bg">
                          {clientAvatar ? (
                            <img
                              src={clientAvatar}
                              alt="Client"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <UserIcon />
                          )}
                          {clientAvatar && (
                            <button
                              type="button"
                              onClick={() => setClientAvatar(null)}
                              className="absolute right-[-4px] top-[-4px] flex h-[18px] w-[18px] cursor-pointer items-center justify-center rounded-full border-2 border-white bg-text-secondary text-[11px] leading-none text-white transition-colors hover:bg-text-primary"
                              aria-label="Remove avatar"
                            >
                              &times;
                            </button>
                          )}
                        </div>

                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="cursor-pointer bg-transparent p-0 text-left text-[13px] text-text-secondary transition-colors hover:text-accent"
                          >
                            Upload photo
                          </button>
                          <button
                            type="button"
                            onClick={() => setAvatarUrlOpen((open) => !open)}
                            className="cursor-pointer bg-transparent p-0 text-left text-[13px] text-text-secondary transition-colors hover:text-accent"
                          >
                            Import from URL
                          </button>

                          {avatarUrlOpen && (
                            <div className="mt-1 flex items-center gap-2">
                              <input
                                type="text"
                                value={avatarUrlInput}
                                onChange={(event) => setAvatarUrlInput(event.target.value)}
                                placeholder="Paste LinkedIn or website URL..."
                                className="rounded-md border border-transparent bg-input-bg px-2.5 py-1.5 text-[13px] text-text-primary outline-none focus-visible:outline-none transition-all duration-200 placeholder:text-text-tertiary focus:border-border focus:bg-white"
                              />
                              <button
                                type="button"
                                onClick={fetchAvatarFromUrl}
                                className="cursor-pointer whitespace-nowrap rounded-md border border-[rgba(135,130,245,0.2)] bg-[rgba(135,130,245,0.08)] px-3 py-1.5 text-[12px] font-medium text-accent transition-colors hover:bg-[rgba(135,130,245,0.15)]"
                              >
                                {avatarFetching ? "..." : "Fetch"}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarFileChange}
                      />

                      <PrimaryButton label="Continue" disabled={!canContinue} onClick={handleContinue} />
                      <StepDots steps={steps} currentIndex={currentIndex} />
                    </div>
                  )}

                  {step === 2 && (
                    <div>
                      <h2 className="mb-2 text-center font-heading text-[24px] font-semibold tracking-[-0.4px] text-text-primary">
                        What type of project?
                      </h2>
                      <p className="mb-8 text-center text-[15px] leading-[1.5] text-text-secondary">
                        Pick the closest match. You can always change it later.
                      </p>

                      <div className="mb-7 grid grid-cols-2 gap-2">
                        {PROJECT_TYPES.map((typeOption) => (
                          <button
                            key={typeOption.value}
                            type="button"
                            onClick={() => setProjectType(typeOption.value)}
                            className={cn(
                              "cursor-pointer rounded-[10px] border-[1.5px] px-4 py-3 text-center text-[14px] font-medium transition-all duration-150",
                              projectType === typeOption.value
                                ? "border-accent bg-[rgba(135,130,245,0.08)] text-accent"
                                : "border-transparent bg-input-bg text-text-primary hover:bg-[#EFEFEF]",
                            )}
                          >
                            {typeOption.label}
                          </button>
                        ))}
                      </div>

                      <PrimaryButton label="Continue" disabled={!canContinue} onClick={handleContinue} />
                      <BackButton onClick={goBack} />
                      <StepDots steps={steps} currentIndex={currentIndex} />
                    </div>
                  )}

                  {step === 3 && (
                    <div>
                      <h2 className="mb-2 text-center font-heading text-[24px] font-semibold tracking-[-0.4px] text-text-primary">
                        Build your roadmap
                      </h2>
                      <p className="mb-8 text-center text-[15px] leading-[1.5] text-text-secondary">
                        How do you want to structure this project?
                      </p>

                      <div className="mb-7 flex flex-col gap-2.5">
                        <button
                          type="button"
                          onClick={() => setMethod("ai")}
                          className={cn(
                            "cursor-pointer rounded-xl border-[1.5px] bg-input-bg px-5 py-[18px] text-left transition-all duration-200",
                            method === "ai"
                              ? "border-accent bg-[rgba(135,130,245,0.08)]"
                              : "border-transparent hover:bg-[#EFEFEF]",
                          )}
                        >
                          <div
                            className={cn(
                              "mb-1 text-[15px] font-medium",
                              method === "ai" ? "text-accent" : "text-text-primary",
                            )}
                          >
                            AI-Generated
                          </div>
                          <div className="text-[13px] leading-[1.4] text-text-secondary">
                            Tailored phases and tasks based on your project type.
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setMethod("manual")}
                          className={cn(
                            "cursor-pointer rounded-xl border-[1.5px] bg-input-bg px-5 py-[18px] text-left transition-all duration-200",
                            method === "manual"
                              ? "border-accent bg-[rgba(135,130,245,0.08)]"
                              : "border-transparent hover:bg-[#EFEFEF]",
                          )}
                        >
                          <div
                            className={cn(
                              "mb-1 text-[15px] font-medium",
                              method === "manual" ? "text-accent" : "text-text-primary",
                            )}
                          >
                            Manual Setup
                          </div>
                          <div className="text-[13px] leading-[1.4] text-text-secondary">
                            Choose your own phases and add tasks as you go.
                          </div>
                        </button>
                      </div>

                      <PrimaryButton label="Continue" disabled={!canContinue} onClick={handleContinue} />
                      <BackButton onClick={goBack} />
                      <StepDots steps={steps} currentIndex={currentIndex} />
                    </div>
                  )}

                  {step === "4a" && (
                    <div>
                      <h2 className="mb-2 text-center font-heading text-[24px] font-semibold tracking-[-0.4px] text-text-primary">
                        Project timeline
                      </h2>
                      <p className="mb-8 text-center text-[15px] leading-[1.5] text-text-secondary">
                        When does this project start and end?
                      </p>

                      <div className="mb-7 flex gap-3">
                        <div className="flex-1">
                          <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
                            Start date
                          </label>
                          <input
                            type="date"
                            value={startDate}
                            onChange={(event) => setStartDate(event.target.value)}
                            className="w-full rounded-[10px] border border-transparent bg-input-bg px-[14px] py-3 text-[14px] text-text-primary outline-none focus-visible:outline-none transition-all duration-200 focus:border-border focus:bg-white"
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
                            className="w-full rounded-[10px] border border-transparent bg-input-bg px-[14px] py-3 text-[14px] text-text-primary outline-none focus-visible:outline-none transition-all duration-200 focus:border-border focus:bg-white"
                          />
                        </div>
                      </div>

                      <PrimaryButton
                        label="Generate Roadmap"
                        disabled={!canContinue}
                        onClick={handleContinue}
                      />
                      <BackButton onClick={goBack} />
                      <StepDots steps={steps} currentIndex={currentIndex} />
                    </div>
                  )}

                  {step === "4m" && (
                    <div>
                      <h2 className="mb-2 text-center font-heading text-[24px] font-semibold tracking-[-0.4px] text-text-primary">
                        Select phases
                      </h2>
                      <p className="mb-8 text-center text-[15px] leading-[1.5] text-text-secondary">
                        Toggle the phases you want. Reorder by dragging.
                      </p>

                      <div className="mb-3">
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
                            <div className="flex w-4 flex-shrink-0 cursor-grab flex-col items-center gap-0.5 text-text-tertiary">
                              <span className="h-[1.5px] w-3 rounded bg-current" />
                              <span className="h-[1.5px] w-3 rounded bg-current" />
                              <span className="h-[1.5px] w-3 rounded bg-current" />
                            </div>

                            {editingPhaseId === phase.id ? (
                              <input
                                autoFocus
                                defaultValue={phase.name}
                                onBlur={(event) => {
                                  renamePhase(phase.id, event.target.value);
                                  setEditingPhaseId(null);
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    renamePhase(phase.id, event.currentTarget.value);
                                    setEditingPhaseId(null);
                                  }
                                  if (event.key === "Escape") {
                                    setEditingPhaseId(null);
                                  }
                                }}
                                className="h-7 flex-1 rounded-md border border-border bg-white px-2 text-[14px] text-text-primary outline-none focus-visible:outline-none"
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => setEditingPhaseId(phase.id)}
                                className={cn(
                                  "flex-1 cursor-pointer text-left text-[14px]",
                                  phase.on ? "text-text-primary" : "text-text-tertiary",
                                )}
                              >
                                {phase.name}
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => togglePhase(phase.id)}
                              className={cn(
                                "relative h-5 w-9 flex-shrink-0 cursor-pointer rounded-[10px] transition-colors",
                                phase.on ? "bg-accent" : "bg-[#D9D9D9]",
                              )}
                              aria-label={`Toggle ${phase.name}`}
                            >
                              <span
                                className={cn(
                                  "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all",
                                  phase.on ? "left-[18px]" : "left-0.5",
                                )}
                              />
                            </button>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={addPhase}
                        className="mb-7 inline-flex cursor-pointer items-center gap-1 text-[13px] font-medium text-accent transition-colors hover:text-accent-hover"
                      >
                        + Add phase
                      </button>

                      <PrimaryButton label="Continue" disabled={!canContinue} onClick={handleContinue} />
                      <BackButton onClick={goBack} />
                      <StepDots steps={steps} currentIndex={currentIndex} />
                    </div>
                  )}

                  {step === "4mb" && (
                    <div>
                      <h2 className="mb-2 text-center font-heading text-[24px] font-semibold tracking-[-0.4px] text-text-primary">
                        Project timeline
                      </h2>
                      <p className="mb-8 text-center text-[15px] leading-[1.5] text-text-secondary">
                        When does this project start and end?
                      </p>

                      <div className="mb-7 flex gap-3">
                        <div className="flex-1">
                          <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
                            Start date
                          </label>
                          <input
                            type="date"
                            value={startDate}
                            onChange={(event) => setStartDate(event.target.value)}
                            className="w-full rounded-[10px] border border-transparent bg-input-bg px-[14px] py-3 text-[14px] text-text-primary outline-none focus-visible:outline-none transition-all duration-200 focus:border-border focus:bg-white"
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
                            className="w-full rounded-[10px] border border-transparent bg-input-bg px-[14px] py-3 text-[14px] text-text-primary outline-none focus-visible:outline-none transition-all duration-200 focus:border-border focus:bg-white"
                          />
                        </div>
                      </div>

                      <PrimaryButton label="Continue" disabled={!canContinue} onClick={handleContinue} />
                      <BackButton onClick={goBack} />
                      <StepDots steps={steps} currentIndex={currentIndex} />
                    </div>
                  )}

                  {step === 5 && (
                    <div>
                      <h2 className="mb-2 text-center font-heading text-[24px] font-semibold tracking-[-0.4px] text-text-primary">
                        Your roadmap
                      </h2>
                      <p className="mb-8 text-center text-[15px] leading-[1.5] text-text-secondary">
                        Looking good. You can adjust everything later.
                      </p>

                      <div className="mb-7">
                        {roadmap.map((phase, index) => (
                          <div key={`${phase.name}-${index}`} className="flex items-center gap-3.5">
                            <div className="flex w-[18px] flex-shrink-0 flex-col items-center">
                              <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                              {index < roadmap.length - 1 && <span className="h-7 w-px bg-border" />}
                            </div>
                            <div className="flex flex-1 items-center justify-between py-2">
                              <span className="text-[14px] font-medium text-text-primary">
                                {phase.name}
                              </span>
                              <span className="text-[13px] text-text-secondary">
                                {phase.tasks > 0 ? `${phase.tasks} tasks` : "0 tasks"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <PrimaryButton
                        label={isCreating ? "Creating..." : "Create Project"}
                        disabled={!canContinue}
                        onClick={handleContinue}
                      />
                      <BackButton onClick={goBack} />
                      <StepDots steps={steps} currentIndex={currentIndex} />
                    </div>
                  )}
                </StepCard>
              )}
            </AnimatePresence>
          </div>
        </div>

        <footer className="flex justify-center gap-6 pb-6 pt-5">
          <a href="#" className="text-[12px] text-text-tertiary transition-colors hover:text-text-secondary">
            Terms
          </a>
          <a href="#" className="text-[12px] text-text-tertiary transition-colors hover:text-text-secondary">
            Privacy
          </a>
        </footer>
      </div>
    </>
  );
}

function StepCard({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={transition}
    >
      {children}
    </motion.div>
  );
}

function PrimaryButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full rounded-[10px] bg-text-primary px-4 py-[13px] text-[15px] font-medium text-white transition-opacity",
        disabled ? "cursor-default opacity-25" : "cursor-pointer hover:opacity-85",
      )}
    >
      {label}
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-4 inline-flex cursor-pointer items-center gap-1 text-[13px] text-text-secondary transition-colors hover:text-text-primary"
    >
      <ArrowLeft size={12} weight="bold" />
      Back
    </button>
  );
}

function StepDots({
  steps,
  currentIndex,
}: {
  steps: WorkflowStep[];
  currentIndex: number;
}) {
  if (currentIndex < 0) {
    return null;
  }

  return (
    <div className="mt-6 flex justify-center gap-1.5">
      {steps.map((step, index) => (
        <div
          key={`${step}-${index}`}
          className={cn(
            "h-1.5 rounded-full transition-all duration-200",
            index === currentIndex
              ? "w-5 bg-accent"
              : index < currentIndex
                ? "w-1.5 bg-accent"
                : "w-1.5 bg-[#D9D9D9]",
          )}
        />
      ))}
    </div>
  );
}

function UserIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-text-tertiary"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
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

function parseInputDate(value: string): number {
  return new Date(`${value}T00:00:00`).getTime();
}
