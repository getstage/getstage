import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { Lightning, PencilSimple, ArrowLeft, CalendarBlank } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TogglePill } from "@/components/ui/TogglePill";
import { createProject } from "@/data-ops/mutations";
import type { ProjectType, CreateProjectInput } from "@/types";
import { PROJECT_TYPE_LABELS } from "@/types";

type Step = 1 | 2 | 3 | 4 | 5;

const PROJECT_TYPES: ProjectType[] = [
  "branding",
  "web-design",
  "product-design",
  "app-design",
  "packaging",
  "motion-design",
  "illustration",
  "other",
];

const AI_PHASES: Record<string, string[]> = {
  branding: ["Discovery", "Strategy", "Visual Identity", "Brand Assets", "Guidelines"],
  "web-design": ["Strategy", "Research", "Wireframes", "Visual Design", "Development"],
  "product-design": ["Research", "Ideation", "Prototyping", "Testing", "Handoff"],
  "app-design": ["Discovery", "UX Research", "Wireframes", "UI Design", "Prototype"],
  packaging: ["Brief", "Concept", "Design", "Production Art", "Print Ready"],
  "motion-design": ["Concept", "Storyboard", "Style Frames", "Animation", "Delivery"],
  illustration: ["Brief", "Sketches", "Refinement", "Color & Detail", "Delivery"],
  other: ["Planning", "Research", "Execution", "Review", "Delivery"],
};

export function ProjectCreationPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [type, setType] = useState<ProjectType>("web-design");
  const [method, setMethod] = useState<"ai" | "manual">("ai");
  const [startDate, setStartDate] = useState(formatInputDate(new Date()));
  const [endDate, setEndDate] = useState(
    formatInputDate(new Date(Date.now() + 56 * 24 * 60 * 60 * 1000)),
  );
  const [phases, setPhases] = useState<string[]>([]);

  function formatInputDate(d: Date) {
    return d.toISOString().split("T")[0]!;
  }

  function canAdvance(): boolean {
    switch (step) {
      case 1:
        return name.trim().length > 0 && clientName.trim().length > 0;
      case 2:
        return true; // type always has default
      case 3:
        return true; // method always has default
      case 4:
        return !!startDate && !!endDate;
      case 5:
        return phases.length > 0;
      default:
        return false;
    }
  }

  async function handleNext() {
    if (step === 3 && method === "ai") {
      // Generate phases with AI
      setGenerating(true);
      await new Promise((r) => setTimeout(r, 1200));
      setPhases(AI_PHASES[type] ?? AI_PHASES.other!);
      setGenerating(false);
      setStep(5);
      return;
    }

    if (step === 3 && method === "manual") {
      setPhases(["Phase 1"]);
      setStep(5);
      return;
    }

    if (step < 5) {
      setStep((step + 1) as Step);
      return;
    }

    // Final step — create project
    setLoading(true);
    try {
      const input: CreateProjectInput = {
        name,
        clientName,
        type,
        method,
        startDate: new Date(startDate).getTime(),
        endDate: new Date(endDate).getTime(),
        phases,
      };
      await createProject(input);
      navigate({ to: "/dashboard" });
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    if (step === 5 && method === "ai") {
      setStep(3);
      return;
    }
    if (step > 1) {
      setStep((step - 1) as Step);
    } else {
      navigate({ to: "/dashboard" });
    }
  }

  return (
    <>
      <Helmet>
        <title>New Project — Stage</title>
      </Helmet>

      <div className="flex min-h-[calc(100vh-60px)] items-center justify-center px-4">
        <div className="w-full max-w-[520px]">
          {/* Step indicator */}
          <div className="mb-8 flex justify-center gap-1.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`h-1 rounded-full transition-all duration-300 ${
                  s <= step ? "w-8 bg-accent" : "w-4 bg-border"
                }`}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <StepContainer key="step1">
                <h2 className="mb-2 font-heading text-[22px] font-semibold text-text-primary">
                  What's this project called?
                </h2>
                <p className="mb-8 text-[14px] text-text-secondary">
                  Give your project a name and link it to a client.
                </p>
                <div className="space-y-4">
                  <Input
                    label="Project name"
                    placeholder="e.g., Website Redesign"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                  />
                  <Input
                    label="Client name"
                    placeholder="e.g., Acme Studio"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                  />
                </div>
              </StepContainer>
            )}

            {step === 2 && (
              <StepContainer key="step2">
                <h2 className="mb-2 font-heading text-[22px] font-semibold text-text-primary">
                  What type of project?
                </h2>
                <p className="mb-8 text-[14px] text-text-secondary">
                  This helps generate relevant phases and tasks.
                </p>
                <div className="flex flex-wrap gap-2">
                  {PROJECT_TYPES.map((t) => (
                    <TogglePill
                      key={t}
                      label={PROJECT_TYPE_LABELS[t]}
                      selected={type === t}
                      onSelect={() => setType(t)}
                    />
                  ))}
                </div>
              </StepContainer>
            )}

            {step === 3 && (
              <StepContainer key="step3">
                <h2 className="mb-2 font-heading text-[22px] font-semibold text-text-primary">
                  How should we build the roadmap?
                </h2>
                <p className="mb-8 text-[14px] text-text-secondary">
                  Let AI create phases for you, or set them up yourself.
                </p>
                <div className="flex gap-4">
                  <MethodCard
                    icon={<Lightning size={24} weight="regular" className="text-accent" />}
                    title="AI Generated"
                    desc="Get a smart roadmap based on your project type"
                    selected={method === "ai"}
                    onClick={() => setMethod("ai")}
                  />
                  <MethodCard
                    icon={<PencilSimple size={24} weight="regular" className="text-text-secondary" />}
                    title="Manual"
                    desc="Create your own phases and tasks from scratch"
                    selected={method === "manual"}
                    onClick={() => setMethod("manual")}
                  />
                </div>

                {generating && (
                  <div className="mt-8 flex flex-col items-center">
                    <span className="mb-2 inline-block h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                    <span className="text-[14px] text-text-secondary">
                      Generating your roadmap...
                    </span>
                  </div>
                )}
              </StepContainer>
            )}

            {step === 4 && (
              <StepContainer key="step4">
                <h2 className="mb-2 font-heading text-[22px] font-semibold text-text-primary">
                  When does this project run?
                </h2>
                <p className="mb-8 text-[14px] text-text-secondary">
                  Set the timeline for your project.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium text-text-secondary">Start date</label>
                    <div className="relative">
                      <CalendarBlank
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
                      />
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="h-11 w-full rounded-lg border border-border bg-white pl-9 pr-3 text-[15px] text-text-primary transition-colors focus:border-accent focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium text-text-secondary">End date</label>
                    <div className="relative">
                      <CalendarBlank
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
                      />
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="h-11 w-full rounded-lg border border-border bg-white pl-9 pr-3 text-[15px] text-text-primary transition-colors focus:border-accent focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </StepContainer>
            )}

            {step === 5 && (
              <StepContainer key="step5">
                <h2 className="mb-2 font-heading text-[22px] font-semibold text-text-primary">
                  Your project roadmap
                </h2>
                <p className="mb-8 text-[14px] text-text-secondary">
                  Review your phases. You can always adjust later.
                </p>
                <div className="space-y-2">
                  {phases.map((phase, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-lg border border-border-subtle bg-white px-4 py-3"
                    >
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent-light font-heading text-[12px] font-semibold text-accent">
                        {i + 1}
                      </div>
                      <input
                        value={phase}
                        onChange={(e) => {
                          const newPhases = [...phases];
                          newPhases[i] = e.target.value;
                          setPhases(newPhases);
                        }}
                        className="flex-1 bg-transparent text-[15px] text-text-primary outline-none"
                      />
                      {phases.length > 1 && (
                        <button
                          onClick={() => setPhases(phases.filter((_, j) => j !== i))}
                          className="cursor-pointer text-[12px] text-text-tertiary transition-colors hover:text-destructive"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setPhases([...phases, `Phase ${phases.length + 1}`])}
                  className="mt-3 cursor-pointer text-[13px] font-medium text-accent transition-colors hover:text-accent-hover"
                >
                  + Add phase
                </button>
              </StepContainer>
            )}
          </AnimatePresence>

          {/* Navigation buttons */}
          <div className="mt-10 flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex cursor-pointer items-center gap-1 text-[14px] text-text-secondary transition-colors hover:text-text-primary"
            >
              <ArrowLeft size={14} />
              {step === 1 ? "Cancel" : "Back"}
            </button>
            <Button
              onClick={handleNext}
              disabled={!canAdvance()}
              isLoading={loading || generating}
            >
              {step === 5 ? "Create project" : step === 3 && method === "ai" ? "Generate roadmap" : "Continue"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

function StepContainer({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

function MethodCard({
  icon,
  title,
  desc,
  selected,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 cursor-pointer flex-col items-center gap-3 rounded-xl border-2 p-6 text-center transition-all duration-150 ${
        selected
          ? "border-accent bg-accent-light"
          : "border-border-subtle bg-white hover:border-border"
      }`}
    >
      {icon}
      <div>
        <div className="mb-1 text-[15px] font-medium text-text-primary">{title}</div>
        <div className="text-[13px] text-text-secondary">{desc}</div>
      </div>
    </button>
  );
}
