import { useEffect, useRef, useState, type ReactNode } from "react";
import { Timeline, type TimelineHorizon } from "@/components/dashboard/Timeline";
import type { Phase, Project, Task } from "@/types";

const DAY_MS = 24 * 60 * 60 * 1000;
const PREVIEW_AVATARS = {
  acme: "https://randomuser.me/api/portraits/women/44.jpg",
  nova: "https://randomuser.me/api/portraits/men/31.jpg",
  morrow: "https://randomuser.me/api/portraits/women/65.jpg",
  arc: "https://randomuser.me/api/portraits/men/52.jpg",
  pine: "https://randomuser.me/api/portraits/women/24.jpg",
} as const;
const PROJECT_TYPE_PREVIEW_OPTIONS = [
  "Branding",
  "Web Design",
  "Product Design",
  "App Design",
  "Packaging",
  "Motion Design",
  "Illustration",
  "Other",
] as const;
const PROJECT_CREATION_PREVIEW_NAME = "Website redesign";
const PROJECT_CREATION_PREVIEW_CLIENT = "Acme Studio";
const DASHBOARD_PREVIEW_PAYMENT_ROWS = [
  { name: "Acme Studio", avatarUrl: PREVIEW_AVATARS.acme, amount: 4500 },
  { name: "Arc Health", avatarUrl: PREVIEW_AVATARS.arc, amount: 3200 },
  { name: "Pine Media", avatarUrl: PREVIEW_AVATARS.pine, amount: 1900 },
] as const;
const TIMELINE_INTERACTIVE_PREVIEW_PROJECTS = createTimelineInteractivePreviewProjects();

const STEPS: Array<{
  number: string;
  title: string;
  description: string;
  showcase: ReactNode;
}> = [
  {
    number: "1",
    title: "Create a project",
    description: "Name your client, pick a project type, and you're in.",
    showcase: <ProjectCreationAnimatedPreview className="landing-step-project-preview" />,
  },
  {
    number: "2",
    title: "Track progress",
    description: "Add phases, check off tasks, connect Stripe for payments.",
    showcase: <ProjectWorkflowPreview />,
  },
  {
    number: "3",
    title: "Stay informed",
    description: "See your timeline, workload curve, and revenue at a glance.",
    showcase: <TimelineInteractivePreview />,
  },
];

export function StepsSection() {
  return (
    <section className="landing-steps-grid-section" id="how-it-works">
      <div className="landing-steps-lattice">
        <div className="landing-steps-lattice-row landing-steps-lattice-row-top" aria-hidden="true">
          {Array.from({ length: 9 }).map((_, index) => (
            <div key={index} className="landing-steps-lattice-cell" />
          ))}
        </div>

        <div className="landing-steps-lattice-row landing-steps-lattice-row-heading">
          <div className="landing-steps-lattice-cell" aria-hidden="true" />
          <div className="landing-steps-heading">
            <h2 className="landing-section-title">
              Get started <span>in minutes</span>
            </h2>
            <p className="landing-section-subtitle">
              From setup to daily workflow, Stage gives you a clear process without the clutter.
            </p>
          </div>
          <div className="landing-steps-lattice-cell" aria-hidden="true" />
        </div>

        <div className="landing-steps-lattice-row landing-steps-lattice-row-steps">
          <div className="landing-steps-lattice-cell" aria-hidden="true" />
          {STEPS.map((step) => (
            <StepCard
              key={step.number}
              number={step.number}
              title={step.title}
              description={step.description}
            >
              {step.showcase}
            </StepCard>
          ))}
          <div className="landing-steps-lattice-cell" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}

function StepCard({
  number,
  title,
  description,
  children,
}: {
  number: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <article className="landing-step-grid-card">
      <span className="landing-step-grid-number" aria-label={`Step ${number}`}>
        {number}
      </span>
      <h3 className="landing-feature-cell-title landing-step-grid-title">{title}</h3>
      <p className="landing-feature-cell-desc landing-step-grid-desc">{description}</p>
      <div className="landing-step-grid-showcase">{children}</div>
    </article>
  );
}

function ProjectWorkflowPreview() {
  const cycle = useLoopTick(30, 210);
  const phaseAdded = cycle >= 8;
  const firstTaskChecked = cycle >= 15;
  const secondTaskChecked = cycle >= 22;

  return (
    <div className="landing-step-progress-preview" aria-hidden="true">
      <ProjectDetailPhaseRailPreview phaseAdded={phaseAdded} />
      <div className="landing-step-progress-task-preview">
        <TaskDetailChecklistPreview
          firstChecked={firstTaskChecked}
          secondChecked={secondTaskChecked}
        />
      </div>
    </div>
  );
}

function TimelineInteractivePreview() {
  return (
    <AutoHoverTimelinePreview
      projects={TIMELINE_INTERACTIVE_PREVIEW_PROJECTS}
      horizon="12m"
      className="is-interactive-demo"
      cycleMs={2800}
      showRevenue
    />
  );
}

function ProjectCreationAnimatedPreview({ className }: { className?: string }) {
  const tick = useLoopTick(56, 150);
  const previewStep: 1 | 2 | 5 = tick < 18 ? 1 : tick < 36 ? 2 : 5;
  const previewProjectLength = Math.min(
    PROJECT_CREATION_PREVIEW_NAME.length,
    Math.max(0, (tick - 2) * 2),
  );
  const previewClientLength = Math.min(
    PROJECT_CREATION_PREVIEW_CLIENT.length,
    Math.max(0, (tick - 9) * 2),
  );
  const selectedTypeIndex = tick < 22 ? -1 : Math.min(PROJECT_TYPE_PREVIEW_OPTIONS.length - 1, tick - 22);
  const previewRoadmap = ["Strategy", "Research", "Design", "Development"];
  const isCreating = tick >= 48;

  return (
    <div className={["pointer-events-none w-full", className ?? ""].filter(Boolean).join(" ")} aria-hidden>
      <div className="mx-auto w-full max-w-[312px] rounded-[22px] border border-border bg-white px-5 py-5 shadow-[0_8px_26px_rgba(26,26,46,0.06)]">
        {previewStep === 1 ? (
          <div className="flex h-[250px] flex-col">
            <div className="mb-3">
              <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
                Project name
              </label>
              <input
                value={
                  previewProjectLength > 0
                    ? PROJECT_CREATION_PREVIEW_NAME.slice(0, previewProjectLength)
                    : ""
                }
                readOnly
                placeholder={PROJECT_CREATION_PREVIEW_NAME}
                className="w-full rounded-[10px] border border-transparent bg-input-bg px-4 py-3 text-[15px] text-text-primary outline-none placeholder:text-text-tertiary"
              />
            </div>

            <div className="mb-5">
              <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
                Client
              </label>
              <input
                value={
                  previewClientLength > 0
                    ? PROJECT_CREATION_PREVIEW_CLIENT.slice(0, previewClientLength)
                    : ""
                }
                readOnly
                placeholder={PROJECT_CREATION_PREVIEW_CLIENT}
                className="w-full rounded-[10px] border border-transparent bg-input-bg px-4 py-3 text-[15px] text-text-primary outline-none placeholder:text-text-tertiary"
              />
            </div>

            <button className="mt-auto inline-flex h-12 items-center justify-center rounded-[12px] bg-accent px-5 text-[15px] font-medium text-white">
              Continue
            </button>
          </div>
        ) : null}

        {previewStep === 2 ? (
          <div className="flex h-[250px] flex-col">
            <div className="mb-4 grid grid-cols-2 gap-2">
              {PROJECT_TYPE_PREVIEW_OPTIONS.map((typeOption, index) => (
                <div
                  key={typeOption}
                  className={`rounded-[10px] border-[1.5px] px-3 py-2.5 text-center text-[12px] font-medium transition-all duration-150 ${
                    selectedTypeIndex === index
                      ? "border-accent bg-[rgba(135,130,245,0.08)] text-accent"
                      : "border-transparent bg-input-bg text-text-primary"
                  }`}
                >
                  {typeOption}
                </div>
              ))}
            </div>

            <button className="mt-auto inline-flex h-12 items-center justify-center rounded-[12px] bg-accent px-5 text-[15px] font-medium text-white">
              Continue
            </button>
          </div>
        ) : null}

        {previewStep === 5 ? (
          <div className="flex h-[250px] flex-col">
            <div className="mb-6">
              {previewRoadmap.map((phase, index) => (
                <div key={phase} className="flex items-center gap-3.5">
                  <div className="flex w-[18px] flex-shrink-0 flex-col items-center">
                    <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                    {index < previewRoadmap.length - 1 ? <span className="h-5 w-px bg-border" /> : null}
                  </div>
                  <div className="flex flex-1 items-center justify-between py-1">
                    <span className="text-[14px] font-medium text-text-primary">{phase}</span>
                    <span className="text-[13px] text-text-secondary">{index + 3} tasks</span>
                  </div>
                </div>
              ))}
            </div>

            <button className="mt-auto inline-flex h-12 items-center justify-center rounded-[12px] bg-accent px-5 text-[15px] font-medium text-white">
              {isCreating ? "Creating..." : "Create Project"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ProjectDetailPhaseRailPreview({ phaseAdded }: { phaseAdded: boolean }) {
  const phases = [
    {
      id: "landing-discovery",
      name: "Discovery",
      status: "completed" as const,
      tasksDone: 2,
      tasksTotal: 2,
    },
    {
      id: "landing-design",
      name: "Design",
      status: phaseAdded ? ("completed" as const) : ("active" as const),
      tasksDone: phaseAdded ? 2 : 1,
      tasksTotal: 2,
    },
    ...(phaseAdded
      ? [
          {
            id: "landing-qa",
            name: "QA",
            status: "active" as const,
            tasksDone: 0,
            tasksTotal: 2,
          },
        ]
      : []),
  ];
  const selectedId = phaseAdded ? "landing-qa" : "landing-design";

  return (
    <div className="w-full" aria-hidden>
      <div className="mx-auto flex w-full max-w-[280px] items-center">
        {phases.map((phase, index) => (
          <div key={phase.id} className="flex flex-1 items-center">
            <button
              type="button"
              tabIndex={-1}
              className="flex min-w-[72px] flex-col items-center text-center"
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  phase.status === "completed"
                    ? "bg-text-tertiary"
                    : phase.status === "active"
                      ? "bg-accent"
                      : "border border-[#D9D9D9] bg-transparent"
                }`}
              />
              <span
                className={`mt-2 text-[11px] ${
                  selectedId === phase.id ? "font-medium text-text-primary" : "text-text-secondary"
                }`}
              >
                {phase.name}
              </span>
              <span className="mt-1 text-[11px] text-text-tertiary">
                {phase.tasksDone} of {phase.tasksTotal}
              </span>
            </button>
            {index < phases.length - 1 ? (
              <div
                className={`h-px flex-1 ${
                  phase.status === "completed" ? "bg-accent/45" : "bg-border"
                }`}
              />
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-center">
        <div
          className={`inline-flex items-center gap-2 text-[13px] ${
            phaseAdded ? "text-accent" : "text-text-tertiary"
          }`}
        >
          <span>+</span>
          {phaseAdded ? "QA phase added" : "Add phase"}
        </div>
      </div>
    </div>
  );
}

function TaskDetailChecklistPreview({
  firstChecked,
  secondChecked,
}: {
  firstChecked: boolean;
  secondChecked: boolean;
}) {
  return (
    <div
      className="mx-auto w-full max-w-[280px] rounded-[10px] border border-border-subtle bg-white px-3 py-2.5"
      aria-hidden
    >
      <div className="space-y-1.5">
        <PreviewChecklistRow checked={firstChecked} label="Homepage wireframes" />
        <PreviewChecklistRow checked={secondChecked} label="Payment flow revision" withBorder />
      </div>
    </div>
  );
}

function DashboardPaymentsPreview({
  className,
  zoomed = false,
}: {
  className?: string;
  zoomed?: boolean;
}) {
  const receivedTotal = DASHBOARD_PREVIEW_PAYMENT_ROWS.reduce((sum, row) => sum + row.amount, 0);
  const outstandingTotal = Math.round(receivedTotal * 0.5);
  const pendingDisplay = formatPreviewCurrency(outstandingTotal);

  return (
    <div
      className={[
        "landing-step-dashboard-payments-preview",
        zoomed ? "is-zoomed" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden
    >
      <div className="rounded-[12px] border border-border bg-white px-[22px] py-5">
        <h2 className="mb-3 font-heading text-[15px] font-medium text-text-primary">Payments</h2>
        <div className="grid gap-5 md:grid-cols-[minmax(240px,0.95fr)_minmax(0,1.35fr)_minmax(128px,auto)] md:items-start">
          <div className="grid min-w-0 grid-cols-2 gap-5 md:pr-3">
            <PreviewMetric label="Outstanding" value={formatPreviewCurrency(outstandingTotal)} />
            <PreviewMetric
              label="Received"
              value={formatPreviewCurrency(receivedTotal)}
              accent
            />
          </div>

          <div className="min-w-0 space-y-2 border-t border-border-subtle pt-3 md:border-t-0 md:border-l md:pl-5 md:pt-0">
            {DASHBOARD_PREVIEW_PAYMENT_ROWS.map((row) => (
              <div key={row.name} className="flex items-center gap-2 text-[13px]">
                <div className="h-5 w-5 overflow-hidden rounded-full bg-input-bg">
                  <img
                    src={row.avatarUrl}
                    alt={row.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <span className="truncate text-text-primary">{row.name}</span>
              </div>
            ))}
          </div>

          <div className="min-w-0 space-y-2 text-left md:text-right">
            {DASHBOARD_PREVIEW_PAYMENT_ROWS.map((row) => (
              <div
                key={`${row.name}-${row.amount}`}
                className="flex items-center gap-1.5 text-[13px] md:justify-end"
              >
                <span className="text-accent">✓</span>
                <span className="font-medium whitespace-nowrap tabular-nums text-accent">
                  {formatPreviewCurrency(row.amount)}
                </span>
              </div>
            ))}
            <p className="pt-0.5 text-[13px] text-text-secondary">
              <span className="mr-1">Pending</span>
              <span className="whitespace-nowrap tabular-nums">{pendingDisplay}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewChecklistRow({
  checked,
  label,
  withBorder = false,
}: {
  checked: boolean;
  label: string;
  withBorder?: boolean;
}) {
  return (
    <div
      className={`group flex items-center gap-2.5 py-1.5 text-[13px] ${
        withBorder ? "border-t border-border-subtle" : ""
      }`}
    >
      <span
        className={`inline-flex h-4 w-4 items-center justify-center rounded-[4px] border text-[10px] ${
          checked
            ? "border-accent bg-accent text-white"
            : "border-border bg-white text-transparent"
        }`}
      >
        ✓
      </span>
      <span
        className={`block truncate transition-colors ${
          checked ? "text-text-tertiary line-through" : "text-text-primary"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function PreviewMetric({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[12px] text-text-secondary">{label}</p>
      <p
        className={`mt-1 font-heading text-[18px] leading-none font-semibold whitespace-nowrap tabular-nums ${
          accent ? "text-accent" : "text-text-primary"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function formatPreviewCurrency(value: number) {
  if (!Number.isFinite(value)) return "—";
  return `$${Math.abs(value).toLocaleString("en-US")}`;
}

function AutoHoverTimelinePreview({
  projects,
  horizon,
  className,
  cycleMs,
  showRevenue = false,
}: {
  projects: Project[];
  horizon: TimelineHorizon;
  className?: string;
  cycleMs: number;
  showRevenue?: boolean;
}) {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const revenueRef = useRef<HTMLDivElement | null>(null);
  const [timelineRenderKey, setTimelineRenderKey] = useState(0);
  const [revenueZoomed, setRevenueZoomed] = useState(false);
  const [cursor, setCursor] = useState({
    x: 0,
    y: 0,
    visible: false,
    active: false,
  });

  useEffect(() => {
    let disposed = false;
    let markerIndex = 0;
    const timeoutIds: number[] = [];

    const schedule = (callback: () => void, delay: number) => {
      const timeoutId = window.setTimeout(() => {
        if (!disposed) {
          callback();
        }
      }, delay);
      timeoutIds.push(timeoutId);
    };

    const runCycle = () => {
      const preview = previewRef.current;
      const stage = stageRef.current;
      if (!preview || !stage) {
        schedule(runCycle, 500);
        return;
      }

      const links = Array.from(stage.querySelectorAll<HTMLAnchorElement>("a"));
      links.forEach((link) => {
        link.tabIndex = -1;
        link.setAttribute("aria-hidden", "true");
      });

      const markers = Array.from(stage.querySelectorAll<HTMLElement>("[data-curve-marker]"));
      if (markers.length === 0) {
        schedule(runCycle, 600);
        return;
      }

      const marker = markers[markerIndex % markers.length];
      markerIndex += 1;
      if (!marker) {
        schedule(runCycle, cycleMs);
        return;
      }

      const previewBounds = preview.getBoundingClientRect();
      const markerBounds = marker.getBoundingClientRect();
      const targetX = markerBounds.left + markerBounds.width / 2 - previewBounds.left;
      const targetY = markerBounds.top + markerBounds.height / 2 - previewBounds.top;
      const clientX = markerBounds.left + markerBounds.width / 2;
      const clientY = markerBounds.top + markerBounds.height / 2;

      setCursor({ x: targetX - 34, y: targetY + 30, visible: true, active: false });

      schedule(() => {
        // Cursor tip sits around (3,2) in a 24x24 icon.
        setCursor({ x: targetX - 3, y: targetY + 10, visible: true, active: true });
        marker.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, clientX, clientY }));
        marker.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX, clientY }));
      }, 220);

      schedule(() => {
        marker.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));
      }, cycleMs - 950);

      if (showRevenue) {
        schedule(() => {
          const revenue = revenueRef.current;
          if (!revenue) {
            return;
          }
          const revenueBounds = revenue.getBoundingClientRect();
          const revenueX = revenueBounds.left + revenueBounds.width / 2 - previewBounds.left;
          const revenueY = revenueBounds.top + revenueBounds.height / 2 - previewBounds.top;
          setCursor({ x: revenueX - 3, y: revenueY + 10, visible: true, active: true });
          setRevenueZoomed(true);
        }, cycleMs - 760);

        schedule(() => {
          setRevenueZoomed(false);
          setCursor((current) => ({ ...current, active: false }));
          setTimelineRenderKey((value) => value + 1);
        }, cycleMs - 300);
      } else {
        schedule(() => {
          setCursor((current) => ({ ...current, active: false }));
          setTimelineRenderKey((value) => value + 1);
        }, cycleMs - 380);
      }

      schedule(runCycle, cycleMs);
    };

    schedule(runCycle, 950);

    return () => {
      disposed = true;
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [cycleMs, horizon, projects]);

  return (
    <div
      ref={previewRef}
      className={["landing-step-timeline-preview", className ?? ""].filter(Boolean).join(" ")}
    >
      <div ref={stageRef} className="landing-step-timeline-demo-stage">
        <Timeline key={timelineRenderKey} projects={projects} horizon={horizon} />
      </div>
      {showRevenue ? (
        <div
          ref={revenueRef}
          className="landing-step-revenue-zoom"
          aria-hidden="true"
        >
          <DashboardPaymentsPreview zoomed={revenueZoomed} />
        </div>
      ) : null}
      <div
        aria-hidden="true"
        className={[
          "landing-step-timeline-cursor",
          cursor.visible ? "is-visible" : "",
          cursor.active ? "is-active" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ left: `${cursor.x}px`, top: `${cursor.y}px` }}
      >
        <svg viewBox="0 0 24 24">
          <path d="M3 2 L3 20 L8.4 14.5 L12.1 21 L15.4 19.1 L11.7 12.8 L19.5 12.8 Z" />
        </svg>
      </div>
    </div>
  );
}

function useLoopTick(length: number, intervalMs: number) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTick((value) => (value + 1) % length);
    }, intervalMs);
    return () => window.clearInterval(intervalId);
  }, [intervalMs, length]);

  return tick;
}

function createTimelinePreviewProjects(): Project[] {
  const now = Date.now();
  const baseCreatedAt = now - 40 * DAY_MS;
  const userId = "landing-preview-user";

  const phaseAndTasks = (
    projectId: string,
    defs: Array<{
      id: string;
      name: string;
      status: Phase["status"];
      progress: number;
      tasks: Array<{ id: string; title: string; done: boolean; createdAt: number }>;
    }>,
  ): Phase[] =>
    defs.map((phaseDef, phaseIndex) => ({
      id: phaseDef.id,
      projectId,
      name: phaseDef.name,
      order: phaseIndex,
      status: phaseDef.status,
      progress: phaseDef.progress,
      tasks: phaseDef.tasks.map((taskDef, taskIndex): Task => ({
        id: taskDef.id,
        phaseId: phaseDef.id,
        title: taskDef.title,
        isCompleted: taskDef.done,
        attachments: [],
        order: taskIndex,
        createdAt: taskDef.createdAt,
        updatedAt: taskDef.createdAt + 2 * 60 * 60 * 1000,
      })),
    }));

  const websiteId = "landing-project-website";
  const brandId = "landing-project-brand";
  const portalId = "landing-project-portal";

  return [
    {
      id: websiteId,
      userId,
      name: "Website redesign",
      clientName: "Acme Studio",
      clientAvatarUrl: PREVIEW_AVATARS.acme,
      type: "web-design",
      status: "active",
      startDate: now - 120 * DAY_MS,
      endDate: now - 42 * DAY_MS,
      phases: phaseAndTasks(websiteId, [
        {
          id: `${websiteId}-phase-discovery`,
          name: "Discovery",
          status: "completed",
          progress: 100,
          tasks: [
            {
              id: `${websiteId}-task-a`,
              title: "Kickoff call complete",
              done: true,
              createdAt: now - 18 * DAY_MS,
            },
          ],
        },
        {
          id: `${websiteId}-phase-design`,
          name: "Design",
          status: "active",
          progress: 62,
          tasks: [
            {
              id: `${websiteId}-task-b`,
              title: "Homepage wireframes",
              done: false,
              createdAt: now - DAY_MS,
            },
            {
              id: `${websiteId}-task-c`,
              title: "Checkout UX pass",
              done: false,
              createdAt: now - 2 * DAY_MS,
            },
          ],
        },
      ]),
      progress: 58,
      createdAt: baseCreatedAt,
    },
    {
      id: brandId,
      userId,
      name: "Brand refresh",
      clientName: "Nova Coffee",
      clientAvatarUrl: PREVIEW_AVATARS.nova,
      type: "branding",
      status: "active",
      startDate: now - 90 * DAY_MS,
      endDate: now - 8 * DAY_MS,
      phases: phaseAndTasks(brandId, [
        {
          id: `${brandId}-phase-research`,
          name: "Research",
          status: "completed",
          progress: 100,
          tasks: [
            {
              id: `${brandId}-task-a`,
              title: "Audience interviews",
              done: true,
              createdAt: now - 11 * DAY_MS,
            },
          ],
        },
        {
          id: `${brandId}-phase-identity`,
          name: "Identity",
          status: "active",
          progress: 44,
          tasks: [
            {
              id: `${brandId}-task-b`,
              title: "Logo direction review",
              done: false,
              createdAt: now - 3 * DAY_MS,
            },
          ],
        },
      ]),
      progress: 47,
      createdAt: baseCreatedAt + DAY_MS,
    },
    {
      id: portalId,
      userId,
      name: "Client portal",
      clientName: "Morrow Labs",
      clientAvatarUrl: PREVIEW_AVATARS.morrow,
      type: "app-design",
      status: "active",
      startDate: now - 28 * DAY_MS,
      endDate: now + 46 * DAY_MS,
      phases: phaseAndTasks(portalId, [
        {
          id: `${portalId}-phase-plan`,
          name: "Planning",
          status: "completed",
          progress: 100,
          tasks: [
            {
              id: `${portalId}-task-a`,
              title: "Feature scope signed off",
              done: true,
              createdAt: now - 5 * DAY_MS,
            },
          ],
        },
        {
          id: `${portalId}-phase-build`,
          name: "Build",
          status: "active",
          progress: 36,
          tasks: [
            {
              id: `${portalId}-task-b`,
              title: "API hooks integration",
              done: false,
              createdAt: now - 12 * 60 * 60 * 1000,
            },
            {
              id: `${portalId}-task-c`,
              title: "Portal auth states",
              done: false,
              createdAt: now - 36 * 60 * 60 * 1000,
            },
          ],
        },
      ]),
      progress: 35,
      createdAt: baseCreatedAt + 2 * DAY_MS,
    },
    {
      id: "landing-project-arc",
      userId,
      name: "Mobile app UX",
      clientName: "Arc Health",
      clientAvatarUrl: PREVIEW_AVATARS.arc,
      type: "product-design",
      status: "active",
      startDate: now - 14 * DAY_MS,
      endDate: now + 82 * DAY_MS,
      phases: phaseAndTasks("landing-project-arc", [
        {
          id: "landing-project-arc-phase-discovery",
          name: "Discovery",
          status: "completed",
          progress: 100,
          tasks: [
            {
              id: "landing-project-arc-task-a",
              title: "User interviews",
              done: true,
              createdAt: now - 12 * DAY_MS,
            },
          ],
        },
        {
          id: "landing-project-arc-phase-ui",
          name: "UI Design",
          status: "active",
          progress: 41,
          tasks: [
            {
              id: "landing-project-arc-task-b",
              title: "Flow refinements",
              done: false,
              createdAt: now - 18 * 60 * 60 * 1000,
            },
          ],
        },
      ]),
      progress: 41,
      createdAt: baseCreatedAt + 3 * DAY_MS,
    },
    {
      id: "landing-project-pine",
      userId,
      name: "Campaign landing page",
      clientName: "Pine Media",
      clientAvatarUrl: PREVIEW_AVATARS.pine,
      type: "web-design",
      status: "active",
      startDate: now - 55 * DAY_MS,
      endDate: now + 18 * DAY_MS,
      phases: phaseAndTasks("landing-project-pine", [
        {
          id: "landing-project-pine-phase-plan",
          name: "Planning",
          status: "completed",
          progress: 100,
          tasks: [
            {
              id: "landing-project-pine-task-a",
              title: "Messaging approved",
              done: true,
              createdAt: now - 52 * DAY_MS,
            },
          ],
        },
        {
          id: "landing-project-pine-phase-build",
          name: "Build",
          status: "active",
          progress: 67,
          tasks: [
            {
              id: "landing-project-pine-task-b",
              title: "Hero animation",
              done: false,
              createdAt: now - DAY_MS,
            },
          ],
        },
      ]),
      progress: 65,
      createdAt: baseCreatedAt + 4 * DAY_MS,
    },
  ];
}

function createTimelineInteractivePreviewProjects(): Project[] {
  const source = createTimelinePreviewProjects();
  const byId = new Map(source.map((project) => [project.id, project]));
  const now = Date.now();

  const website = byId.get("landing-project-website");
  const pine = byId.get("landing-project-pine");
  const arc = byId.get("landing-project-arc");

  if (!website || !pine || !arc) {
    return source.slice(0, 3);
  }

  return [
    {
      ...website,
      startDate: now - 340 * DAY_MS,
      endDate: now - 270 * DAY_MS,
    },
    {
      ...pine,
      startDate: now - 245 * DAY_MS,
      endDate: now - 170 * DAY_MS,
    },
    {
      ...arc,
      startDate: now - 165 * DAY_MS,
      endDate: now - 95 * DAY_MS,
    },
  ];
}
