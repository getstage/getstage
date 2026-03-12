import {
  CURVE_HEIGHT,
  FULL_DATE_FORMATTER,
  RECENT_TASK_WINDOW_MS,
  SHORT_DATE_FORMATTER,
  TOOLTIP_ARROW_INSET,
  TOOLTIP_WIDTH,
  TRACKING_TOOLTIP_WIDTH,
} from "@/components/dashboard/timeline/constants";
import {
  curveYAt,
  dateToPercent,
  generateCurve,
  getGroupingThreshold,
  getMarkerEdgeInset,
  getViewRange,
  groupProjects,
  pointsToPath,
} from "@/components/dashboard/timeline/geometry";
import type {
  ProfileHoverDetails,
  ProfileHoverState,
  TimelineHorizon,
  TimelineLayout,
  TimelineTrackingState,
} from "@/components/dashboard/timeline/types";
import type { Project } from "@/types";

export function buildTimelineLayout({
  projects,
  horizon,
  nowTimestamp,
  regionWidth,
}: {
  projects: Project[];
  horizon: TimelineHorizon;
  nowTimestamp: number;
  regionWidth: number;
}): TimelineLayout {
  const width = Math.max(regionWidth, 1);
  const view = getViewRange(projects, horizon, nowTimestamp);
  const rangeMs = Math.max(view.end - view.start, 24 * 60 * 60 * 1000);
  const curve = generateCurve(view.start, view.end, projects);
  const curvePath = pointsToPath(curve, width);
  const fillPath = `${curvePath} L ${width.toFixed(1)} ${CURVE_HEIGHT} L 0 ${CURVE_HEIGHT} Z`;

  const visibleProjects = projects
    .filter((project) => project.startDate <= view.end && project.endDate >= view.start)
    .sort((a, b) => a.startDate - b.startDate);

  const positioned = visibleProjects.map((project) => {
    const displayDate = Math.min(project.endDate, view.end);
    const pct = dateToPercent(displayDate, view.start, view.end);
    return { project, pct };
  });

  const threshold = getGroupingThreshold(horizon, width);
  const groups = groupProjects(positioned, threshold, curve);

  return {
    width,
    start: view.start,
    end: view.end,
    rangeMs,
    curve,
    curvePath,
    fillPath,
    visibleProjects,
    groups,
    edgeInset: getMarkerEdgeInset(width),
  };
}

export function markerOpacity(project: Project, hoveredProjectId: string | null) {
  if (hoveredProjectId && project.id !== hoveredProjectId) {
    return 0.2;
  }
  return 1;
}

function getPhasesByOrder(project: Project) {
  return [...project.phases].sort((a, b) => a.order - b.order);
}

function getPhaseAtProgress(project: Project, progress: number) {
  const phases = getPhasesByOrder(project);
  if (phases.length === 0) {
    return null;
  }

  const normalizedProgress = Math.max(0, Math.min(progress, 1));
  const phaseIndex = Math.min(phases.length - 1, Math.floor(normalizedProgress * phases.length));
  return phases[phaseIndex] ?? phases[phases.length - 1] ?? null;
}

function getCurrentPhaseName(project: Project) {
  const active = project.phases.find((phase) => phase.status === "active");
  if (active) {
    return active.name;
  }

  const upcoming = project.phases.find((phase) => phase.status === "upcoming");
  if (upcoming && project.status !== "completed") {
    return upcoming.name;
  }

  return project.phases[project.phases.length - 1]?.name ?? "Phase";
}

export function buildTrackingState({
  x,
  layout,
}: {
  x: number;
  layout: TimelineLayout;
}): TimelineTrackingState {
  const frac = layout.width <= 0 ? 0 : x / layout.width;
  const elevation = curveYAt(frac, layout.curve);
  const curveTop = CURVE_HEIGHT - elevation;
  const dateTimestamp = layout.start + layout.rangeMs * frac;
  const activeProjects = layout.visibleProjects.filter(
    (project) => project.startDate <= dateTimestamp && project.endDate >= dateTimestamp,
  );
  const tipWidth = Math.min(TRACKING_TOOLTIP_WIDTH, Math.max(120, layout.width - 16));
  const tipHalf = tipWidth / 2;
  const tipMin = Math.min(tipHalf + 8, Math.max(8, layout.width / 2));
  const tipMax = Math.max(tipMin, layout.width - tipHalf - 8);

  return {
    x,
    curveTop,
    dateFull: FULL_DATE_FORMATTER.format(new Date(dateTimestamp)),
    activeProjects,
    tipLeft: Math.max(tipMin, Math.min(x, tipMax)),
    tipTop: Math.max(0, curveTop - 16),
    tipWidth,
  };
}

export function buildProfileHoverDetails({
  profileHover,
  visibleProjects,
  width,
  nowTimestamp,
}: {
  profileHover: ProfileHoverState | null;
  visibleProjects: Project[];
  width: number;
  nowTimestamp: number;
}): ProfileHoverDetails | null {
  if (!profileHover) {
    return null;
  }

  const project = visibleProjects.find((entry) => entry.id === profileHover.projectId);
  if (!project) {
    return null;
  }

  const phaseAtCursor = getPhaseAtProgress(project, profileHover.progress);
  const tasks = [...(phaseAtCursor?.tasks ?? [])].sort((a, b) => a.order - b.order);
  const visibleTasks = tasks.slice(0, 5);
  const overflowCount = Math.max(0, tasks.length - visibleTasks.length);
  const tooltipDateRange = `${SHORT_DATE_FORMATTER.format(new Date(project.startDate))} – ${FULL_DATE_FORMATTER.format(new Date(project.endDate))}`;
  const tooltipWidth = Math.min(TOOLTIP_WIDTH, Math.max(120, width - 16));
  const halfWidth = tooltipWidth / 2;
  const left = Math.max(8, Math.min(profileHover.x - halfWidth, Math.max(8, width - tooltipWidth - 8)));
  const arrowLeft = Math.max(
    TOOLTIP_ARROW_INSET,
    Math.min(profileHover.x - left, tooltipWidth - TOOLTIP_ARROW_INSET),
  );

  return {
    tooltipDateRange,
    projectName: project.name,
    clientName: project.clientName,
    phaseName: phaseAtCursor?.name ?? getCurrentPhaseName(project),
    tasks: visibleTasks.map((task) => ({
      ...task,
      isRecentlyAdded:
        !task.isCompleted && nowTimestamp - task.createdAt <= RECENT_TASK_WINDOW_MS,
    })),
    overflowCount,
    left,
    top: profileHover.y - 18 - 12,
    width: tooltipWidth,
    arrowLeft,
  };
}
