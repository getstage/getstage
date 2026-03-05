import { useEffect, useRef, useState, type ReactNode } from "react";
import { Timeline, type TimelineHorizon } from "@/components/dashboard/Timeline";
import {
  ProjectCreationAnimatedPreview,
  DashboardPaymentsPreview,
  ProjectDetailPhaseRailPreview,
  TaskDetailChecklistPreview,
} from "./StepPreviews";
import type { Phase, Project, Task } from "@/types";

const DAY_MS = 24 * 60 * 60 * 1000;
const PREVIEW_AVATARS = {
  acme: "https://randomuser.me/api/portraits/women/44.jpg",
  nova: "https://randomuser.me/api/portraits/men/31.jpg",
  morrow: "https://randomuser.me/api/portraits/women/65.jpg",
  arc: "https://randomuser.me/api/portraits/men/52.jpg",
  pine: "https://randomuser.me/api/portraits/women/24.jpg",
} as const;
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
            <h2 className="landing-section-title">Get started in minutes</h2>
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
      cycleMs={4600}
      showRevenue
    />
  );
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
  const [viewMode, setViewMode] = useState<"timeline" | "payments">("timeline");
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
      const switchToPaymentsDelay = Math.max(1600, cycleMs - 1900);
      const markerOutDelay = Math.max(900, switchToPaymentsDelay - 220);
      const paymentsFocusDelay = switchToPaymentsDelay + 280;

      setViewMode("timeline");
      setRevenueZoomed(false);
      setCursor({ x: targetX - 34, y: targetY + 28, visible: true, active: false });

      schedule(() => {
        // Cursor tip sits around (3,2) in a 24x24 icon.
        setCursor({ x: targetX - 3, y: targetY - 2, visible: true, active: true });
        marker.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, clientX, clientY }));
        marker.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX, clientY }));
      }, 220);

      schedule(() => {
        marker.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));
      }, markerOutDelay);

      if (showRevenue) {
        schedule(() => {
          setCursor((current) => ({ ...current, visible: false, active: false }));
          setViewMode("payments");
        }, switchToPaymentsDelay);

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
        }, paymentsFocusDelay);

        schedule(() => {
          setRevenueZoomed(false);
          setCursor((current) => ({ ...current, active: false }));
        }, cycleMs - 980);

        schedule(() => {
          setCursor((current) => ({ ...current, visible: false, active: false }));
        }, cycleMs - 760);

        schedule(() => {
          setTimelineRenderKey((value) => value + 1);
        }, cycleMs - 380);
      } else {
        schedule(() => {
          setCursor((current) => ({ ...current, visible: false, active: false }));
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
      <div
        ref={stageRef}
        className={[
          "landing-step-timeline-demo-stage",
          viewMode === "timeline" ? "is-visible" : "is-hidden",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <Timeline key={timelineRenderKey} projects={projects} horizon={horizon} />
      </div>
      {showRevenue ? (
        <div
          ref={revenueRef}
          className={[
            "landing-step-payments-stage",
            viewMode === "payments" ? "is-visible" : "is-hidden",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-hidden="true"
        >
          <DashboardPaymentsPreview zoomed={revenueZoomed} variant="mobile" />
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
