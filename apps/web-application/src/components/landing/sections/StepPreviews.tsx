/**
 * Landing page step preview components.
 * Self-contained — no imports from page components.
 */
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Plus } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/Checkbox";
import type { Phase, Task } from "@/types";

/* ─── shared constants ─── */

type ProjectType = "web-design" | "branding" | "product-design" | "app-design" | "marketing" | "other";
type WorkflowStep = 1 | 2 | 3 | "4a" | "4m" | "4mb" | 5;
type RoadmapItem = { name: string; tasks: number };

const transition = { duration: 0.2, ease: "easeInOut" } as const;

const PROJECT_TYPES: Array<{ value: ProjectType; label: string }> = [
  { value: "web-design", label: "Web Design" },
  { value: "branding", label: "Branding" },
  { value: "product-design", label: "Product Design" },
  { value: "app-design", label: "App Design" },
  { value: "marketing", label: "Marketing" },
  { value: "other", label: "Other" },
];

const AI_ROADMAPS: Record<ProjectType, RoadmapItem[]> = {
  "web-design": [
    { name: "Discovery", tasks: 4 },
    { name: "Wireframes", tasks: 5 },
    { name: "Visual Design", tasks: 6 },
    { name: "Development", tasks: 8 },
    { name: "QA & Launch", tasks: 4 },
  ],
  branding: [
    { name: "Research", tasks: 3 },
    { name: "Strategy", tasks: 4 },
    { name: "Identity Design", tasks: 6 },
    { name: "Brand Guidelines", tasks: 5 },
    { name: "Rollout", tasks: 3 },
  ],
  "product-design": [
    { name: "User Research", tasks: 4 },
    { name: "Information Architecture", tasks: 3 },
    { name: "Interaction Design", tasks: 5 },
    { name: "Visual Design", tasks: 6 },
    { name: "Prototyping & Testing", tasks: 4 },
  ],
  "app-design": [
    { name: "Planning", tasks: 3 },
    { name: "UX Design", tasks: 5 },
    { name: "UI Design", tasks: 6 },
    { name: "Prototype", tasks: 4 },
    { name: "Handoff", tasks: 3 },
  ],
  marketing: [
    { name: "Strategy", tasks: 3 },
    { name: "Content Planning", tasks: 4 },
    { name: "Design", tasks: 5 },
    { name: "Production", tasks: 4 },
    { name: "Launch", tasks: 3 },
  ],
  other: [
    { name: "Phase 1", tasks: 4 },
    { name: "Phase 2", tasks: 5 },
    { name: "Phase 3", tasks: 4 },
    { name: "Phase 4", tasks: 3 },
  ],
};

const CREATION_PREVIEW_PROJECT_NAME = "Website redesign";
const CREATION_PREVIEW_CLIENT_NAME = "Acme Studio";

const DASHBOARD_PREVIEW_PAYMENT_ROWS = [
  { name: "Acme Studio", avatarUrl: "https://randomuser.me/api/portraits/women/44.jpg", amount: 4500 },
  { name: "Arc Health", avatarUrl: "https://randomuser.me/api/portraits/men/52.jpg", amount: 3200 },
  { name: "Pine Media", avatarUrl: "https://randomuser.me/api/portraits/women/24.jpg", amount: 1900 },
];

/* ─── ProjectCreationAnimatedPreview ─── */

export function ProjectCreationAnimatedPreview({ className }: { className?: string }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((v) => (v + 1) % 56), 150);
    return () => window.clearInterval(id);
  }, []);

  const previewStep: 1 | 2 | 5 = tick < 18 ? 1 : tick < 36 ? 2 : 5;
  const previewProjectLength = Math.min(CREATION_PREVIEW_PROJECT_NAME.length, Math.max(0, (tick - 2) * 2));
  const previewClientLength = Math.min(CREATION_PREVIEW_CLIENT_NAME.length, Math.max(0, (tick - 9) * 2));
  const selectedTypeIndex = tick < 22 ? -1 : Math.min(PROJECT_TYPES.length - 1, tick - 22);
  const isCreating = tick >= 48;
  const previewRoadmap = AI_ROADMAPS["web-design"].slice(0, 4);
  const previewSteps: WorkflowStep[] = [1, 2, 5];
  const previewCurrentIndex = previewStep === 1 ? 0 : previewStep === 2 ? 1 : 2;

  return (
    <div className={cn("pointer-events-none w-full", className)} aria-hidden>
      <div className="mx-auto w-full max-w-[312px]">
        <AnimatePresence mode="wait">
          {previewStep === 1 ? (
            <PreviewMotionCard key="step-1">
              <div className="flex h-[250px] flex-col">
                <div className="mb-3">
                  <label className="mb-1.5 block text-[13px] font-medium text-text-primary">Project name</label>
                  <input
                    value={previewProjectLength > 0 ? CREATION_PREVIEW_PROJECT_NAME.slice(0, previewProjectLength) : ""}
                    readOnly
                    placeholder={CREATION_PREVIEW_PROJECT_NAME}
                    className="w-full rounded-[10px] border border-transparent bg-input-bg px-4 py-3 text-[15px] text-text-primary outline-none placeholder:text-text-tertiary"
                  />
                </div>
                <div className="mb-5">
                  <label className="mb-1.5 block text-[13px] font-medium text-text-primary">Client</label>
                  <input
                    value={previewClientLength > 0 ? CREATION_PREVIEW_CLIENT_NAME.slice(0, previewClientLength) : ""}
                    readOnly
                    placeholder={CREATION_PREVIEW_CLIENT_NAME}
                    className="w-full rounded-[10px] border border-transparent bg-input-bg px-4 py-3 text-[15px] text-text-primary outline-none placeholder:text-text-tertiary"
                  />
                </div>
                <div className="mt-auto">
                  <PreviewButton label="Continue" />
                </div>
              </div>
            </PreviewMotionCard>
          ) : null}

          {previewStep === 2 ? (
            <PreviewMotionCard key="step-2">
              <div className="flex h-[250px] flex-col">
                <div className="mb-4 grid grid-cols-2 gap-2">
                  {PROJECT_TYPES.map((t, i) => (
                    <button
                      key={t.value}
                      type="button"
                      tabIndex={-1}
                      className={cn(
                        "rounded-[10px] border-[1.5px] px-3 py-2.5 text-center text-[12px] font-medium transition-all duration-150",
                        selectedTypeIndex === i
                          ? "border-accent bg-[rgba(135,130,245,0.08)] text-accent"
                          : "border-transparent bg-input-bg text-text-primary",
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <div className="mt-auto">
                  <PreviewButton label="Continue" />
                </div>
              </div>
            </PreviewMotionCard>
          ) : null}

          {previewStep === 5 ? (
            <PreviewMotionCard key="step-5">
              <div className="flex h-[250px] flex-col">
                <div className="mb-6">
                  {previewRoadmap.map((phase, i) => (
                    <div key={`${phase.name}-${i}`} className="flex items-center gap-3.5">
                      <div className="flex w-[18px] flex-shrink-0 flex-col items-center">
                        <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                        {i < previewRoadmap.length - 1 ? <span className="h-5 w-px bg-border" /> : null}
                      </div>
                      <div className="flex flex-1 items-center justify-between py-1">
                        <span className="text-[14px] font-medium text-text-primary">{phase.name}</span>
                        <span className="text-[13px] text-text-secondary">{phase.tasks} tasks</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-auto">
                  <PreviewButton label={isCreating ? "Creating..." : "Create Project"} />
                </div>
              </div>
            </PreviewMotionCard>
          ) : null}
        </AnimatePresence>

        <StepDots steps={previewSteps} currentIndex={previewCurrentIndex} />
      </div>
    </div>
  );
}

function PreviewMotionCard({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition}>
      {children}
    </motion.div>
  );
}

function PreviewButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      tabIndex={-1}
      className="w-full cursor-default rounded-[10px] bg-text-primary px-4 py-[13px] text-[15px] font-medium text-white"
    >
      {label}
    </button>
  );
}

function StepDots({ steps, currentIndex }: { steps: WorkflowStep[]; currentIndex: number }) {
  if (currentIndex < 0) return null;
  return (
    <div className="mt-6 flex justify-center gap-1.5">
      {steps.map((step, i) => (
        <div
          key={`${step}-${i}`}
          className={cn(
            "h-1.5 rounded-full transition-all duration-200",
            i === currentIndex ? "w-5 bg-accent" : i < currentIndex ? "w-1.5 bg-accent" : "w-1.5 bg-[#D9D9D9]",
          )}
        />
      ))}
    </div>
  );
}

/* ─── ProjectDetailPhaseRailPreview ─── */

export function ProjectDetailPhaseRailPreview({ phaseAdded }: { phaseAdded: boolean }) {
  const phases = useMemo(() => {
    const baseTasks = (phaseId: string, defs: Array<{ id: string; done: boolean }>): Task[] =>
      defs.map((t, i) => ({
        id: `${phaseId}-${t.id}`, phaseId, title: t.id, isCompleted: t.done,
        attachments: [], order: i, createdAt: Date.now() - 10_000, updatedAt: Date.now() - 5_000,
      }));

    const result: Phase[] = [
      { id: "landing-discovery", projectId: "lp", name: "Discovery", order: 0, status: "completed", progress: 100,
        tasks: baseTasks("landing-discovery", [{ id: "kickoff", done: true }, { id: "scope", done: true }]) },
      { id: "landing-design", projectId: "lp", name: "Design", order: 1,
        status: phaseAdded ? "completed" : "active", progress: phaseAdded ? 100 : 50,
        tasks: baseTasks("landing-design", [{ id: "wireframes", done: true }, { id: "layouts", done: !phaseAdded }]) },
    ];
    if (phaseAdded) {
      result.push({ id: "landing-qa", projectId: "lp", name: "QA", order: 2, status: "active", progress: 35,
        tasks: baseTasks("landing-qa", [{ id: "review", done: false }, { id: "handoff", done: false }]) });
    }
    return result;
  }, [phaseAdded]);

  const selectedId = phaseAdded ? "landing-qa" : "landing-design";
  const isTwoPhase = phases.length === 2;

  return (
    <div className="w-full" aria-hidden>
      <div className={isTwoPhase ? "mx-auto flex w-fit items-center justify-center" : "mx-auto flex w-full max-w-[280px] items-center"}>
        {phases.map((phase, i) => (
          <div key={phase.id} className={isTwoPhase ? "flex items-center" : "flex flex-1 items-center"}>
            <PhaseNode phase={phase} selected={selectedId === phase.id} compact />
            {i < phases.length - 1 && (
              <div className={`${isTwoPhase ? "mx-2 h-px w-10" : "h-px flex-1"} ${phase.status === "completed" ? "bg-accent/45" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-center">
        <button type="button" tabIndex={-1}
          className={`inline-flex items-center gap-2 text-[13px] transition-colors ${phaseAdded ? "text-accent" : "text-text-tertiary"}`}>
          <Plus size={14} weight="bold" />
          {phaseAdded ? "QA phase added" : "Add phase"}
        </button>
      </div>
    </div>
  );
}

function PhaseNode({ phase, selected, compact = false }: { phase: Phase; selected: boolean; compact?: boolean }) {
  const done = phase.tasks.filter((t) => t.isCompleted).length;
  const total = phase.tasks.length;
  const dotClass = phase.status === "completed" ? "bg-text-tertiary" : phase.status === "active" ? "bg-accent" : "border border-[#D9D9D9] bg-transparent";
  const textClass = phase.status === "upcoming" ? "text-text-tertiary" : phase.status === "completed" ? "text-text-secondary" : "text-text-primary";

  return (
    <button tabIndex={-1}
      className={`relative flex cursor-default flex-col items-center rounded-[8px] transition-colors ${
        compact ? "min-w-[74px] gap-1.5 px-1.5 py-1.5" : "min-w-[112px] gap-2 px-3 py-2"
      } ${selected && phase.status === "active" ? "bg-accent text-white" : ""}`}>
      <span className={`${compact ? "h-2 w-2" : "h-2.5 w-2.5"} rounded-full ${selected && phase.status === "active" ? "bg-white" : dotClass}`} />
      <span className={`${compact ? "text-[11px]" : "text-[12px]"} ${selected && phase.status === "active" ? "text-white" : textClass}`}>{phase.name}</span>
      <span className={`${compact ? "text-[10px]" : "text-[11px]"} ${selected && phase.status === "active" ? "text-white/80" : "text-text-tertiary"}`}>{done} of {total}</span>
    </button>
  );
}

/* ─── TaskDetailChecklistPreview ─── */

export function TaskDetailChecklistPreview({ firstChecked, secondChecked }: { firstChecked: boolean; secondChecked: boolean }) {
  return (
    <div className="mx-auto w-full max-w-[280px] rounded-[10px] border border-border-subtle bg-white px-3 py-2.5" aria-hidden>
      <div className="space-y-1.5">
        <div className="group flex items-center gap-2.5 py-1.5 text-[13px]">
          <Checkbox checked={firstChecked} onCheckedChange={() => undefined} disabled />
          <span className={`block truncate transition-colors ${firstChecked ? "text-text-tertiary line-through" : "text-text-primary"}`}>Homepage wireframes</span>
        </div>
        <div className="group flex items-center gap-2.5 border-t border-border-subtle py-1.5 text-[13px]">
          <Checkbox checked={secondChecked} onCheckedChange={() => undefined} disabled />
          <span className={`block truncate transition-colors ${secondChecked ? "text-text-tertiary line-through" : "text-text-primary"}`}>Payment flow revision</span>
        </div>
      </div>
    </div>
  );
}

/* ─── DashboardPaymentsPreview ─── */

function formatCurrency(v: number) {
  if (!Number.isFinite(v)) return "—";
  return `${v < 0 ? "-" : ""}$${Math.abs(v).toLocaleString("en-US")}`;
}

export function DashboardPaymentsPreview({ className, zoomed = false, variant = "desktop" }: { className?: string; zoomed?: boolean; variant?: "desktop" | "mobile" }) {
  const receivedTotal = DASHBOARD_PREVIEW_PAYMENT_ROWS.reduce((s, r) => s + r.amount, 0);
  const outstandingTotal = Math.round(receivedTotal * 0.5);

  if (variant === "mobile") {
    return (
      <div className={["landing-step-dashboard-payments-preview", "is-mobile", zoomed ? "is-zoomed" : "", className ?? ""].filter(Boolean).join(" ")} aria-hidden>
        <div className="rounded-[12px] border border-border bg-white px-[22px] py-5">
          <h2 className="mb-3 font-heading text-[15px] font-medium text-text-primary">Payments</h2>
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[8px] bg-bg-subtle px-2.5 py-2">
                <p className="text-[10px] text-text-secondary">Outstanding</p>
                <p className="mt-1 font-heading text-[14px] font-semibold leading-none tabular-nums text-text-primary">{formatCurrency(outstandingTotal)}</p>
              </div>
              <div className="rounded-[8px] bg-bg-subtle px-2.5 py-2">
                <p className="text-[10px] text-text-secondary">Received</p>
                <p className="mt-1 font-heading text-[14px] font-semibold leading-none tabular-nums text-accent">{formatCurrency(receivedTotal)}</p>
              </div>
            </div>
            <div className="space-y-1.5 border-t border-border-subtle pt-2.5">
              {DASHBOARD_PREVIEW_PAYMENT_ROWS.map((row) => (
                <div key={row.name} className="flex items-center justify-between gap-2 text-[12px]">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="h-[18px] w-[18px] overflow-hidden rounded-full bg-input-bg">
                      <img src={row.avatarUrl} alt={row.name} className="h-full w-full object-cover" />
                    </div>
                    <span className="truncate text-text-primary">{row.name}</span>
                  </div>
                  <span className="whitespace-nowrap font-medium tabular-nums text-accent">{formatCurrency(row.amount)}</span>
                </div>
              ))}
            </div>
            <p className="text-[12px] text-text-secondary">Pending <span className="whitespace-nowrap tabular-nums">{formatCurrency(outstandingTotal)}</span></p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={["landing-step-dashboard-payments-preview", zoomed ? "is-zoomed" : "", className ?? ""].filter(Boolean).join(" ")} aria-hidden>
      <div className="rounded-[12px] border border-border bg-white px-[22px] py-5">
        <h2 className="mb-3 font-heading text-[15px] font-medium text-text-primary">Payments</h2>
        <div className="grid gap-5 md:grid-cols-[minmax(240px,0.95fr)_minmax(0,1.35fr)_minmax(128px,auto)] md:items-start">
          <div className="grid min-w-0 grid-cols-2 gap-5 md:pr-3">
            <div className="min-w-0">
              <p className="text-[12px] text-text-secondary">Outstanding</p>
              <p className="mt-1 font-heading text-[18px] font-semibold leading-none tabular-nums text-text-primary">{formatCurrency(outstandingTotal)}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[12px] text-text-secondary">Received</p>
              <p className="mt-1 font-heading text-[18px] font-semibold leading-none tabular-nums text-accent">{formatCurrency(receivedTotal)}</p>
            </div>
          </div>
          <div className="min-w-0 space-y-2 border-t border-border-subtle pt-3 md:border-t-0 md:border-l md:pl-5 md:pt-0">
            {DASHBOARD_PREVIEW_PAYMENT_ROWS.map((row) => (
              <div key={row.name} className="flex items-center gap-2 text-[13px]">
                <div className="h-5 w-5 overflow-hidden rounded-full bg-input-bg">
                  <img src={row.avatarUrl} alt={row.name} className="h-full w-full object-cover" />
                </div>
                <span className="truncate text-text-primary">{row.name}</span>
              </div>
            ))}
          </div>
          <div className="min-w-0 space-y-2 text-left md:text-right">
            {DASHBOARD_PREVIEW_PAYMENT_ROWS.map((row) => (
              <div key={`${row.name}-${row.amount}`} className="flex items-center gap-1.5 text-[13px] md:justify-end">
                <Check size={11} weight="bold" aria-hidden="true" className="text-accent" />
                <span className="whitespace-nowrap font-medium tabular-nums text-accent">{formatCurrency(row.amount)}</span>
              </div>
            ))}
            <p className="pt-0.5 text-[13px] text-text-secondary">Pending <span className="whitespace-nowrap tabular-nums">{formatCurrency(outstandingTotal)}</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
