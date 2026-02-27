import { useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Link } from "@tanstack/react-router";
import { Avatar } from "@/components/ui/Avatar";
import type { Project } from "@/types";

interface TimelineProps {
  projects: Project[];
  horizon?: TimelineHorizon;
}

export type TimelineHorizon = "30d" | "90d" | "6m" | "all";

type TickGranularity = "day" | "week" | "month";

type TimelineTick = {
  key: string;
  timestamp: number;
  label: string;
  x: number;
};

type PositionedProject = {
  project: Project;
  row: number;
  left: number;
  width: number;
  currentPhase: string;
};

type PackedRows = {
  projects: Array<{ project: Project; row: number }>;
  rowCount: number;
};

type HoverState = {
  projectId: string;
  x: number;
  y: number;
  blockProgress: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const SIDE_PADDING_DAYS = 2;
const BLOCK_HEIGHT = 52;
const ROW_GAP = 10;
const MAX_VISIBLE_ROWS = 5;
const TRACK_SIDE_INSET = 24;
const EDGE_FADE_WIDTH = 64;
const EDGE_SAFE_PADDING = EDGE_FADE_WIDTH + 12;
const AXIS_TOP_GAP = 20;
const LABEL_TOP_GAP = 12;
const TOOLTIP_WIDTH = 286;
const RECENT_TASK_WINDOW_MS = 48 * 60 * 60 * 1000;
const NON_HOVER_FADE_MULTIPLIER = 0.35;

const DAY_TICK_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const MONTH_TICK_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
});

const TOOLTIP_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function startOfDay(timestamp: number) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function startOfWeekMonday(timestamp: number) {
  const date = new Date(startOfDay(timestamp));
  const day = date.getDay();
  const offset = (day + 6) % 7;
  date.setDate(date.getDate() - offset);
  return date.getTime();
}

function startOfMonth(timestamp: number) {
  const date = new Date(startOfDay(timestamp));
  date.setDate(1);
  return date.getTime();
}

function addDays(timestamp: number, days: number) {
  const date = new Date(timestamp);
  date.setDate(date.getDate() + days);
  return date.getTime();
}

function addMonths(timestamp: number, months: number) {
  const date = new Date(timestamp);
  date.setMonth(date.getMonth() + months);
  return date.getTime();
}

function getProjectSpanBounds(projects: Project[]) {
  if (projects.length === 0) {
    const today = startOfDay(Date.now());
    return { start: today, end: today + DAY_MS };
  }

  const earliestStart = Math.min(...projects.map((project) => project.startDate));
  const latestEnd = Math.max(...projects.map((project) => project.endDate));

  const start = startOfDay(earliestStart - SIDE_PADDING_DAYS * DAY_MS);
  const end = startOfDay(latestEnd + SIDE_PADDING_DAYS * DAY_MS);
  return {
    start,
    end: Math.max(end, start + DAY_MS),
  };
}

function getTimelineBounds(projects: Project[], horizon: TimelineHorizon) {
  const spanBounds = getProjectSpanBounds(projects);

  if (horizon === "all") {
    return spanBounds;
  }

  const horizonDays = horizon === "30d" ? 30 : horizon === "90d" ? 90 : 180;
  const today = startOfDay(Date.now());
  const halfRange = Math.floor(horizonDays / 2);
  const start = today - halfRange * DAY_MS;
  const end = today + (horizonDays - halfRange) * DAY_MS;

  return {
    start,
    end: Math.max(end, start + DAY_MS),
  };
}

function getTickGranularity(totalDays: number): TickGranularity {
  if (totalDays < 30) return "day";
  if (totalDays <= 90) return "week";
  return "month";
}

function getPixelsPerDay(totalDays: number) {
  if (totalDays < 30) return 56;
  if (totalDays <= 90) return 28;
  return 14;
}

function formatTickLabel(timestamp: number, granularity: TickGranularity) {
  if (granularity === "month") {
    return MONTH_TICK_FORMATTER.format(new Date(timestamp));
  }
  return DAY_TICK_FORMATTER.format(new Date(timestamp));
}

function buildTicks(start: number, end: number, granularity: TickGranularity) {
  const ticks: Array<{ key: string; timestamp: number; label: string }> = [];

  let cursor: number;
  let step: (value: number) => number;

  if (granularity === "day") {
    cursor = startOfDay(start);
    step = (value) => addDays(value, 1);
  } else if (granularity === "week") {
    cursor = startOfWeekMonday(start);
    step = (value) => addDays(value, 7);
  } else {
    cursor = startOfMonth(start);
    step = (value) => addMonths(value, 1);
  }

  while (cursor < start) {
    cursor = step(cursor);
  }

  while (cursor <= end) {
    ticks.push({
      key: `${granularity}-${cursor}`,
      timestamp: cursor,
      label: formatTickLabel(cursor, granularity),
    });
    cursor = step(cursor);
  }

  if (ticks.length === 0 || ticks[0]?.timestamp !== start) {
    ticks.unshift({
      key: `boundary-${start}`,
      timestamp: start,
      label: formatTickLabel(start, granularity),
    });
  }

  if (ticks[ticks.length - 1]?.timestamp !== end) {
    ticks.push({
      key: `boundary-${end}`,
      timestamp: end,
      label: formatTickLabel(end, granularity),
    });
  }

  return ticks;
}

function packRows(projects: Project[]): PackedRows {
  const rowEndTimes: number[] = [];
  const sortedProjects = [...projects].sort((a, b) => {
    if (a.startDate !== b.startDate) return a.startDate - b.startDate;
    return a.endDate - b.endDate;
  });

  const packed = sortedProjects.map((project) => {
    let row = -1;

    for (let index = 0; index < rowEndTimes.length; index += 1) {
      const rowEnd = rowEndTimes[index];
      if (rowEnd !== undefined && project.startDate > rowEnd) {
        row = index;
        break;
      }
    }

    if (row === -1) {
      row = rowEndTimes.length;
      rowEndTimes.push(project.endDate);
    } else {
      const existingEnd = rowEndTimes[row] ?? project.endDate;
      rowEndTimes[row] = Math.max(existingEnd, project.endDate);
    }

    return { project, row };
  });

  return {
    projects: packed,
    rowCount: rowEndTimes.length,
  };
}

function getPhasesByOrder(project: Project) {
  return [...project.phases].sort((a, b) => a.order - b.order);
}

function getPhaseAtProgress(project: Project, progress: number) {
  const phases = getPhasesByOrder(project);
  if (phases.length === 0) return null;

  const normalizedProgress = clamp(progress, 0, 1);
  const phaseIndex = Math.min(phases.length - 1, Math.floor(normalizedProgress * phases.length));
  return phases[phaseIndex] ?? phases[phases.length - 1] ?? null;
}

function getCurrentPhaseName(project: Project) {
  const active = project.phases.find((phase) => phase.status === "active");
  if (active) return active.name;

  const upcoming = project.phases.find((phase) => phase.status === "upcoming");
  if (upcoming && project.status !== "completed") return upcoming.name;

  return project.phases[project.phases.length - 1]?.name ?? "Phase";
}

function getBaseBlockOpacity(project: Project) {
  if (project.status === "completed") return 0.62;
  if (project.status === "paused") return 0.82;
  return 1;
}

function getRenderedBlockOpacity(
  project: Project,
  hoveredProjectId: string | null,
  isHovered: boolean,
) {
  const base = getBaseBlockOpacity(project);
  if (!hoveredProjectId) return base;
  if (isHovered) return 1;
  return Math.max(0.18, base * NON_HOVER_FADE_MULTIPLIER);
}

export function Timeline({ projects, horizon = "all" }: TimelineProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [hoverState, setHoverState] = useState<HoverState | null>(null);

  const layout = useMemo(() => {
    const bounds = getTimelineBounds(projects, horizon);
    const rangeMs = Math.max(bounds.end - bounds.start, DAY_MS);
    const totalDays = Math.max(1, Math.ceil(rangeMs / DAY_MS));
    const granularity = getTickGranularity(totalDays);
    const plotWidth = Math.max(1100, totalDays * getPixelsPerDay(totalDays));
    const timelineWidth = plotWidth + EDGE_SAFE_PADDING * 2;
    const drawableWidth = Math.max(plotWidth - TRACK_SIDE_INSET * 2, 1);

    const toX = (timestamp: number) => {
      const ratio = (timestamp - bounds.start) / rangeMs;
      return (
        EDGE_SAFE_PADDING + TRACK_SIDE_INSET + clamp(ratio * drawableWidth, 0, drawableWidth)
      );
    };

    const ticks: TimelineTick[] = buildTicks(bounds.start, bounds.end, granularity).map((tick) => ({
      ...tick,
      x: toX(tick.timestamp),
    }));

    const visibleProjects = projects.filter(
      (project) => project.endDate >= bounds.start && project.startDate <= bounds.end,
    );
    const packed = packRows(visibleProjects);
    const positionedProjects: PositionedProject[] = packed.projects.map((entry) => {
      const clampedStart = clamp(entry.project.startDate, bounds.start, bounds.end);
      const clampedEnd = clamp(entry.project.endDate, bounds.start, bounds.end);
      const left = toX(clampedStart);
      const right = toX(clampedEnd + DAY_MS);
      return {
        project: entry.project,
        row: entry.row,
        left,
        width: Math.max(right - left, 44),
        currentPhase: getCurrentPhaseName(entry.project),
      };
    });

    const now = Date.now();
    const todayX = now >= bounds.start && now <= bounds.end ? toX(now) : null;

    return {
      rowCount: packed.rowCount,
      timelineWidth,
      ticks,
      projects: positionedProjects,
      todayX,
    };
  }, [horizon, projects]);

  const rowPitch = BLOCK_HEIGHT + ROW_GAP;
  const rowCount = Math.max(layout.rowCount, 1);
  const visibleRows = Math.min(rowCount, MAX_VISIBLE_ROWS);
  const rowsViewportHeight = visibleRows * rowPitch - ROW_GAP;
  const rowsContentHeight = rowCount * rowPitch - ROW_GAP;
  const axisY = rowsViewportHeight + AXIS_TOP_GAP;
  const contentHeight = axisY + LABEL_TOP_GAP + 26;

  const hoveredProjectId = hoverState?.projectId ?? null;

  const hoverDetails = useMemo(() => {
    if (!hoverState) return null;

    const entry = layout.projects.find((projectEntry) => projectEntry.project.id === hoverState.projectId);
    if (!entry) return null;

    const phaseAtCursor = getPhaseAtProgress(entry.project, hoverState.blockProgress);
    const tasks = [...(phaseAtCursor?.tasks ?? [])].sort((a, b) => a.order - b.order);
    const visibleTasks = tasks.slice(0, 5);
    const overflowCount = Math.max(0, tasks.length - visibleTasks.length);

    const projectDuration = Math.max(entry.project.endDate - entry.project.startDate, 0);
    const hoveredTimestamp = entry.project.startDate + projectDuration * hoverState.blockProgress;
    const tooltipDate = TOOLTIP_DATE_FORMATTER.format(new Date(hoveredTimestamp));

    const tooltipHeight = 96 + visibleTasks.length * 18 + (overflowCount > 0 ? 18 : 0);
    const tooltipLeft = clamp(hoverState.x + 18, 12, layout.timelineWidth - TOOLTIP_WIDTH - 12);
    const maxTooltipTop = Math.max(12, axisY - tooltipHeight - 8);
    const tooltipTop = clamp(hoverState.y - tooltipHeight - 12, 12, maxTooltipTop);

    return {
      projectName: entry.project.name,
      phaseName: phaseAtCursor?.name ?? entry.currentPhase,
      tasks: visibleTasks,
      overflowCount,
      tooltipDate,
      left: tooltipLeft,
      top: tooltipTop,
    };
  }, [axisY, hoverState, layout.projects, layout.timelineWidth]);

  const handleProjectHover = (
    event: ReactMouseEvent<HTMLAnchorElement>,
    entry: PositionedProject,
  ) => {
    const rect = contentRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = clamp(event.clientX - rect.left, 0, layout.timelineWidth);
    const y = clamp(event.clientY - rect.top, 0, axisY);
    const blockProgress = clamp((x - entry.left) / Math.max(entry.width, 1), 0, 1);

    setHoverState({
      projectId: entry.project.id,
      x,
      y,
      blockProgress,
    });
  };

  return (
    <section className="relative h-[60vh] min-h-[420px] max-h-[640px]">
      <div className="h-full px-6 sm:px-10 lg:px-14">
        <div className="relative h-full">
          <div
            className="h-full overflow-x-auto overflow-y-hidden"
            onMouseLeave={() => setHoverState(null)}
            onScroll={() => setHoverState(null)}
          >
            <div
              ref={contentRef}
              className="relative min-w-full"
              style={{ width: `${layout.timelineWidth}px`, height: `${contentHeight}px` }}
            >
              {layout.ticks.map((tick) => (
                <div
                  key={`tick-line-${tick.key}`}
                  className="pointer-events-none absolute top-0 z-0 w-px bg-border-subtle"
                  style={{ left: `${tick.x}px`, height: `${axisY}px` }}
                />
              ))}

              {hoverState && (
                <>
                  <div
                    className="pointer-events-none absolute top-0 z-30 w-px bg-accent/35 transition-opacity duration-200"
                    style={{ left: `${hoverState.x}px`, height: `${axisY}px` }}
                  />
                  <div
                    className="pointer-events-none absolute z-30 h-2 w-2 -translate-x-1/2 rounded-full bg-accent"
                    style={{ left: `${hoverState.x}px`, top: `${axisY - 3}px` }}
                  />
                </>
              )}

              {layout.todayX !== null && (
                <>
                  <div
                    className="pointer-events-none absolute top-0 z-20 w-px bg-cyan/65"
                    style={{ left: `${layout.todayX}px`, height: `${axisY}px` }}
                  >
                    <div className="absolute left-1/2 top-full mt-1 -translate-x-1/2 text-[11px] font-medium text-cyan">
                      Today
                    </div>
                  </div>
                  <div
                    className="pointer-events-none absolute z-20 h-2 w-2 -translate-x-1/2 rounded-full bg-cyan"
                    style={{ left: `${layout.todayX}px`, top: `${axisY - 3}px` }}
                  />
                </>
              )}

              <div
                className="absolute left-0 top-0 w-full overflow-y-auto pr-1"
                style={{ height: `${rowsViewportHeight}px` }}
              >
                <div className="relative" style={{ height: `${rowsContentHeight}px` }}>
                  {layout.projects.length === 0 ? (
                    <div className="flex h-full items-center justify-center">
                      <div className="rounded-[10px] border border-border-subtle bg-white px-4 py-2 text-[13px] text-text-secondary">
                        No projects in this horizon.
                      </div>
                    </div>
                  ) : (
                    layout.projects.map((entry) => {
                      const isHovered = hoveredProjectId === entry.project.id;
                      return (
                        <Link
                          key={entry.project.id}
                          to="/project/$id"
                          params={{ id: entry.project.id }}
                          className="absolute block pr-1.5"
                          style={{
                            left: `${entry.left}px`,
                            width: `${entry.width}px`,
                            top: `${entry.row * rowPitch}px`,
                            height: `${BLOCK_HEIGHT}px`,
                          }}
                          onMouseEnter={(event) => handleProjectHover(event, entry)}
                          onMouseMove={(event) => handleProjectHover(event, entry)}
                          onMouseLeave={() => {
                            setHoverState((current) =>
                              current?.projectId === entry.project.id ? null : current,
                            );
                          }}
                        >
                          <article
                            className="flex h-full items-center gap-2.5 overflow-hidden rounded-[10px] border border-border-subtle bg-white px-3 shadow-[0_2px_8px_rgba(26,26,46,0.04)] transition-[opacity,border-color] duration-200 hover:border-border"
                            style={{
                              opacity: getRenderedBlockOpacity(
                                entry.project,
                                hoveredProjectId,
                                isHovered,
                              ),
                            }}
                          >
                            <Avatar
                              name={entry.project.clientName}
                              src={entry.project.clientAvatarUrl}
                              size="sm"
                              className="h-6 w-6 shrink-0 text-[10px]"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] font-medium text-text-primary">
                                {entry.project.name}
                              </p>
                              <p className="truncate text-[11px] text-text-secondary">
                                {entry.currentPhase}
                              </p>
                            </div>
                            {entry.project.status === "completed" && (
                              <span className="shrink-0 rounded-full bg-bg-subtle px-1.5 py-0.5 text-[10px] text-text-secondary">
                                ✓
                              </span>
                            )}
                          </article>
                        </Link>
                      );
                    })
                  )}
                </div>
              </div>

              <div
                className="pointer-events-none absolute border-t border-border"
                style={{
                  left: `${EDGE_SAFE_PADDING + TRACK_SIDE_INSET}px`,
                  right: `${EDGE_SAFE_PADDING + TRACK_SIDE_INSET}px`,
                  top: `${axisY}px`,
                }}
              />

              {layout.ticks.map((tick) => (
                <div
                  key={`tick-label-${tick.key}`}
                  className="pointer-events-none absolute z-10 text-[11px] text-text-secondary"
                  style={{
                    left: `${tick.x}px`,
                    top: `${axisY + LABEL_TOP_GAP}px`,
                    transform: "translateX(-50%)",
                  }}
                >
                  {tick.label}
                </div>
              ))}

              <AnimatePresence>
                {hoverDetails && (
                  <motion.aside
                    initial={{ opacity: 0, y: 4 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.15, delay: 0.15 },
                    }}
                    exit={{ opacity: 0, y: 2, transition: { duration: 0.15 } }}
                    className="pointer-events-none absolute z-40 rounded-[10px] bg-[#1A1A2E] px-4 py-3 text-white shadow-[0_14px_30px_rgba(12,14,31,0.38)]"
                    style={{
                      left: `${hoverDetails.left}px`,
                      top: `${hoverDetails.top}px`,
                      width: `${TOOLTIP_WIDTH}px`,
                    }}
                  >
                    <p className="text-[11px] text-white/55">{hoverDetails.tooltipDate}</p>
                    <p className="mt-1 truncate text-[14px] font-medium text-white">
                      {hoverDetails.projectName}
                    </p>
                    <p className="mt-1 truncate text-[12px] text-white/70">
                      {hoverDetails.phaseName}
                    </p>

                    <div className="mt-2.5 border-t border-white/12 pt-2">
                      {hoverDetails.tasks.length > 0 ? (
                        hoverDetails.tasks.map((task) => {
                          const isRecentlyAdded =
                            !task.isCompleted &&
                            Date.now() - task.createdAt <= RECENT_TASK_WINDOW_MS;
                          return (
                            <p
                              key={task.id}
                              className={`truncate py-0.5 text-[12px] ${
                                task.isCompleted ? "text-white/45" : "text-white/85"
                              }`}
                            >
                              <span className="mr-1">{task.isCompleted ? "☑" : "☐"}</span>
                              {task.title}
                              {isRecentlyAdded && <span className="ml-1 text-cyan">●</span>}
                            </p>
                          );
                        })
                      ) : (
                        <p className="text-[12px] text-white/60">No tasks in this phase.</p>
                      )}

                      {hoverDetails.overflowCount > 0 && (
                        <p className="mt-0.5 text-[12px] text-white/60">
                          +{hoverDetails.overflowCount} more
                        </p>
                      )}
                    </div>
                  </motion.aside>
                )}
              </AnimatePresence>
            </div>
          </div>
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-50 bg-gradient-to-r from-bg via-bg/95 to-transparent backdrop-blur-[2px]"
            style={{ width: `${EDGE_FADE_WIDTH}px` }}
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-50 bg-gradient-to-l from-bg via-bg/95 to-transparent backdrop-blur-[2px]"
            style={{ width: `${EDGE_FADE_WIDTH}px` }}
          />
        </div>
      </div>
    </section>
  );
}
