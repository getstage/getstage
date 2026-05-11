import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";
import type { DashboardChartPoint, DashboardProject, DashboardTask } from "../models/dashboard";
import type { DashboardPeriod } from "./DashboardHeader";

const PLOT_TOP = 89;
const PLOT_BASE_Y = 297;
const BAR_MAX_HEIGHT = 208;
const CHART_HEIGHT = 394;
const LABEL_TOP = 304;
const BAR_GAP = 2;
const STEP_RADIUS = 6;
const GRID_BLEED_X = 100;
const INDICATOR_TOP = 68;
const DAY_MS = 24 * 60 * 60 * 1000;
const AVATAR_SIZE = 24;
const AVATAR_BUBBLE_PADDING = 4;
const AVATAR_OVERLAP = 13;
const PROJECT_CARD_WIDTH = 286;

function getAvatarBubbleWidth(count: number) {
  if (count <= 0) return 0;
  return AVATAR_BUBBLE_PADDING * 2 + AVATAR_SIZE * count - AVATAR_OVERLAP * (count - 1);
}

function buildRoundedSteppedAreaPath(
  bars: { x: number; width: number; height: number }[],
) {
  if (bars.length === 0) return "";

  const baseY = PLOT_BASE_Y;
  const first = bars[0];
  if (!first) return "";

  const firstTop = baseY - first.height;
  const commands = [`M ${first.x} ${baseY}`];
  let currentTop = firstTop;

  if (first.height > 0) {
    commands.push(`L ${first.x} ${firstTop + STEP_RADIUS}`);
    commands.push(`Q ${first.x} ${firstTop} ${first.x + STEP_RADIUS} ${firstTop}`);
  } else {
    commands.push(`L ${first.x} ${firstTop}`);
  }

  for (let index = 0; index < bars.length; index += 1) {
    const bar = bars[index];
    const nextBar = bars[index + 1];
    if (!bar) continue;

    const top = baseY - bar.height;
    const right = bar.x + bar.width;

    if (top !== currentTop) {
      commands.push(`L ${bar.x} ${currentTop}`);
      if (bar.height > 0) {
        commands.push(`L ${bar.x} ${top + STEP_RADIUS}`);
        commands.push(`Q ${bar.x} ${top} ${bar.x + STEP_RADIUS} ${top}`);
      } else {
        commands.push(`L ${bar.x} ${top}`);
      }
      currentTop = top;
    }

    if (nextBar) {
      const nextTop = baseY - nextBar.height;
      const radius = Math.min(
        STEP_RADIUS,
        bar.width / 2,
        Math.abs(nextTop - top) / 2 || STEP_RADIUS,
      );

      if (nextTop === top) {
        commands.push(`L ${right} ${top}`);
      } else {
        commands.push(`L ${right - radius} ${top}`);
        commands.push(`Q ${right} ${top} ${right} ${top + Math.sign(nextTop - top) * radius}`);
        commands.push(`L ${right} ${nextTop - Math.sign(nextTop - top) * radius}`);
        commands.push(`Q ${right} ${nextTop} ${right + radius} ${nextTop}`);
      }

      currentTop = nextTop;
    } else if (bar.height > 0) {
      commands.push(`L ${right - STEP_RADIUS} ${top}`);
      commands.push(`Q ${right} ${top} ${right} ${top + STEP_RADIUS}`);
    } else {
      commands.push(`L ${right} ${top}`);
    }
  }

  const last = bars[bars.length - 1];
  if (!last) return "";

  commands.push(`L ${last.x + last.width} ${baseY}`);
  commands.push("Z");
  return commands.join(" ");
}

export function ActivityTimelineChart({
  points,
  projects,
  tasks = [],
}: {
  points: DashboardChartPoint[];
  projects?: DashboardProject[];
  tasks?: DashboardTask[];
  period: DashboardPeriod;
}) {
  const navigate = useNavigate();
  const gradientId = useId().replace(/:/g, "");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => setWidth(Math.round(el.getBoundingClientRect().width));
    update();

    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const chartPoints = useMemo(() => {
    if (!projects?.length) return points;

    return points.map((point) => {
      if (!point.timestamp) return point;

      const dayStart = point.timestamp;
      const dayEnd = dayStart + DAY_MS;
      const activeProjects = projects.filter((project) =>
        isProjectActiveOnDay(project, dayStart, dayEnd),
      );

      return {
        ...point,
        value: activeProjects.length,
      };
    });
  }, [points, projects]);

  const max = Math.max(...chartPoints.map((p) => p.value), 1);
  const barCount = chartPoints.length;

  const bars = useMemo(() => {
    if (width === 0 || barCount === 0) return [];

    const barWidth = (width - BAR_GAP * (barCount - 1)) / barCount;
    return chartPoints.map((point, i) => ({
      x: i * (barWidth + BAR_GAP),
      width: barWidth,
      height: point.value <= 0 ? 0 : Math.max(4, (point.value / max) * BAR_MAX_HEIGHT),
    }));
  }, [width, barCount, chartPoints, max]);

  const areaPath = useMemo(() => buildRoundedSteppedAreaPath(bars), [bars]);
  const activeBar = activeIndex === null ? undefined : bars[activeIndex];
  const visibleLabelIndexes = useMemo(() => {
    const indexes = new Set<number>();
    chartPoints.forEach((point, index) => {
      if (point.showLabel) indexes.add(index);
    });
    if (activeIndex !== null) indexes.add(activeIndex);
    return Array.from(indexes).sort((a, b) => a - b);
  }, [activeIndex, chartPoints]);

  const projectsByPointIndex = useMemo(
    () =>
      chartPoints.map((point) => {
        if (!point.timestamp) return [];
        return (projects ?? []).filter((project) =>
          isProjectActiveOnDay(project, point.timestamp!, point.timestamp! + DAY_MS),
        );
      }),
    [chartPoints, projects],
  );
  const activeProjects = activeIndex === null ? [] : (projectsByPointIndex[activeIndex] ?? []);
  const hoveredProject = activeProjects.find((project) => project.id === hoveredProjectId);

  return (
    <div
      ref={containerRef}
      className="relative min-w-[360px]"
      style={{ height: CHART_HEIGHT }}
      onPointerLeave={() => {
        setActiveIndex(null);
        setHoveredProjectId(null);
      }}
    >
      {width > 0 && (
        <svg
          width={width}
          height={CHART_HEIGHT}
          viewBox={`0 0 ${width} ${CHART_HEIGHT}`}
          className="absolute inset-0 overflow-visible"
        >
          <defs>
            <linearGradient
              id={gradientId}
              x1="0"
              y1={PLOT_TOP}
              x2="0"
              y2={PLOT_BASE_Y}
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#9e99f8" />
              <stop offset="100%" stopColor="#6b63d8" />
            </linearGradient>
          </defs>

          <line
            x1={-GRID_BLEED_X}
            y1="172"
            x2={width + GRID_BLEED_X}
            y2="172"
            stroke="#e5e5e5"
            strokeWidth="1"
            strokeDasharray="6 8"
          />
          <line
            x1={-GRID_BLEED_X}
            y1="216"
            x2={width + GRID_BLEED_X}
            y2="216"
            stroke="#e5e5e5"
            strokeWidth="1"
            strokeDasharray="6 8"
          />
          <line
            x1={-GRID_BLEED_X}
            y1="253"
            x2={width + GRID_BLEED_X}
            y2="253"
            stroke="#e5e5e5"
            strokeWidth="1"
            strokeDasharray="6 8"
          />
          <line
            x1={-GRID_BLEED_X}
            y1={PLOT_BASE_Y}
            x2={width + GRID_BLEED_X}
            y2={PLOT_BASE_Y}
            stroke="#d4d4d4"
            strokeWidth="1"
            strokeDasharray="6 8"
          />

          {areaPath && (
            <path
              d={areaPath}
              fill={`url(#${gradientId})`}
              stroke="#5f58cf"
              strokeWidth="1"
              strokeLinejoin="round"
            />
          )}

          {activeBar && activeBar.height > 0 && (
            <g pointerEvents="none">
              <line
                x1={activeBar.x + activeBar.width / 2}
                y1={INDICATOR_TOP}
                x2={activeBar.x + activeBar.width / 2}
                y2={PLOT_BASE_Y}
                stroke="#3b368e"
                strokeWidth="1"
                strokeDasharray="2 3"
              />
              <circle
                cx={activeBar.x + activeBar.width / 2}
                cy={PLOT_BASE_Y - activeBar.height}
                r="3"
                fill="#3b368e"
              />
            </g>
          )}

        </svg>
      )}

      {activeBar && activeBar.height > 0 && activeProjects.length > 0 ? (
        <div
          className="absolute z-20 flex items-center rounded-full bg-[#e7e6fd] p-[4px] shadow-[0px_0.45px_0.5px_0px_rgba(10,10,10,0.35)]"
          style={{
            left: Math.min(
              activeBar.x + activeBar.width / 2 + 10,
              Math.max(0, width - getAvatarBubbleWidth(activeProjects.length)),
            ),
            top: Math.max(0, PLOT_BASE_Y - activeBar.height - 12),
          }}
        >
          <div className="relative flex isolate items-center">
            {activeProjects.map((project, index) => (
              <ProjectBadge
                key={project.id}
                accentColor={project.accentColor}
                label={project.logoLabel}
                onClick={() =>
                  void navigate({
                    to: "/project/$projectId",
                    params: { projectId: project.id },
                  })
                }
                onPointerEnter={() => setHoveredProjectId(project.id)}
                onFocus={() => setHoveredProjectId(project.id)}
                onPointerLeave={() => setHoveredProjectId(null)}
                onBlur={() => setHoveredProjectId(null)}
                className={cn(
                  "focus-visible:ring-2 focus-visible:ring-[#3b368e] focus-visible:ring-offset-2",
                  index < activeProjects.length - 1 && "mr-[-13px]",
                )}
                style={{ zIndex: activeProjects.length - index }}
              />
            ))}
            {hoveredProject ? (
              <ProjectHoverCard project={hoveredProject} tasks={getProjectTasks(hoveredProject, tasks)} />
            ) : null}
          </div>
        </div>
      ) : null}

      {width > 0 && (
        <div className="absolute left-0 top-0 z-10 h-full w-full">
          {bars.map((bar, index) => {
            const activeProjectsForPoint = projectsByPointIndex[index] ?? [];
            const project = activeProjectsForPoint[0];

            return (
              <button
                key={chartPoints[index]?.label ?? index}
                type="button"
                className={cn(
                  "absolute top-0 h-full outline-none",
                  project ? "cursor-pointer" : "cursor-crosshair",
                )}
                style={{
                  left: bar.x,
                  width: bar.width,
                }}
                onClick={() => {
                  if (!project) return;

                  void navigate({
                    to: "/project/$projectId",
                    params: { projectId: project.id },
                  });
                }}
                onPointerEnter={() => setActiveIndex(index)}
                onFocus={() => setActiveIndex(index)}
                onBlur={() => setActiveIndex(null)}
                aria-label={`${chartPoints[index]?.label ?? "Point"}: ${
                  chartPoints[index]?.value ?? 0
                }`}
              />
            );
          })}
        </div>
      )}

      {width > 0 ? (
        <div
          className="absolute left-0 right-0 text-[12px] font-medium leading-[1.5] text-[#a3a3a3]"
          style={{ top: LABEL_TOP }}
          aria-hidden
        >
        {visibleLabelIndexes.map((i) => {
          const point = chartPoints[i];
          const bar = bars[i];
          if (!point || !bar) return null;

          return (
          <span
            key={`${point.label}-${i}`}
            className={cn(
              "absolute -translate-x-1/2 whitespace-nowrap",
              i === activeIndex && "text-[#737373]",
            )}
            style={{ left: bar.x + bar.width / 2 }}
          >
            {point.label}
          </span>
          );
        })}
        </div>
      ) : null}
    </div>
  );
}

function isProjectActiveOnDay(project: DashboardProject, dayStart: number, dayEnd: number) {
  const projectStart = project.startDate ?? project.endDate;
  const projectEnd = project.endDate ?? project.startDate;
  if (!projectStart || !projectEnd) return false;

  const start = startOfDay(projectStart);
  const end = startOfDay(projectEnd) + DAY_MS;
  return start < dayEnd && end > dayStart;
}

function startOfDay(timestamp: number) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function formatProjectRange(project: DashboardProject) {
  if (!project.startDate || !project.endDate) return "Timeline";

  const start = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
  }).format(project.startDate);
  const end = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(project.endDate);

  return `${start} - ${end}`;
}

function getProjectTasks(project: DashboardProject, tasks: DashboardTask[]) {
  const now = Date.now();
  return tasks
    .filter((task) => task.projectName === project.name && !task.isCompleted)
    .filter((task) => (task.dueDate ?? task.updatedAt) >= now)
    .sort((a, b) => (a.dueDate ?? a.updatedAt) - (b.dueDate ?? b.updatedAt))
    .slice(0, 3);
}

function ProjectBadge({
  accentColor,
  label,
  className,
  onClick,
  onPointerEnter,
  onPointerLeave,
  onFocus,
  onBlur,
  style,
}: {
  accentColor: string;
  label: string;
  className?: string;
  onClick?: () => void;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  style?: CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onFocus={onFocus}
      onBlur={onBlur}
      className={cn(
        "relative flex h-[24px] w-[24px] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-[#fafafa] text-[9px] font-semibold text-white outline-none transition-transform hover:scale-105",
        className,
      )}
      style={{ background: accentColor, ...style }}
    >
      {label}
    </button>
  );
}

function ProjectHoverCard({ project, tasks }: { project: DashboardProject; tasks: DashboardTask[] }) {
  return (
    <div
      className="absolute bottom-[calc(100%+20px)] left-1/2 -translate-x-1/2 rounded-[12px] border border-[#e5e5e5] bg-white px-[16px] py-[14px] text-left shadow-[0px_18px_45px_rgba(10,10,10,0.12)]"
      style={{ width: PROJECT_CARD_WIDTH }}
    >
      <div className="text-[13px] font-medium leading-[1.35] text-[#8a8a8a]">
        {formatProjectRange(project)}
      </div>
      <div className="mt-[8px] text-[16px] font-semibold leading-[1.25] text-[#111121]">{project.name}</div>
      {project.clientName ? (
        <div className="mt-[8px] text-[14px] font-medium leading-[1.35] text-[#8a8a8a]">{project.clientName}</div>
      ) : null}
      {project.phaseName ? (
        <div className="mt-[8px] text-[14px] font-medium leading-[1.35] text-[#8a8a8a]">{project.phaseName}</div>
      ) : null}
      <div className="mt-[14px] border-t border-[#e5e5e5] pt-[12px]">
        {tasks.length > 0 ? (
          <div className="flex flex-col gap-[10px]">
            {tasks.map((task) => (
              <div key={task.id} className="flex min-w-0 items-center gap-[9px] text-[13px] font-medium leading-[1.35] text-[#1f1f33]">
                <span className="h-[7px] w-[7px] shrink-0 rounded-[2px] border border-[#1f1f33]" />
                <span className="min-w-0 flex-1 truncate">{task.title}</span>
                <span className="h-[9px] w-[9px] shrink-0 rounded-full bg-[#a8a1ff]" />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[13px] font-medium leading-[1.35] text-[#8a8a8a]">No tasks in this phase.</div>
        )}
      </div>
      <span className="absolute bottom-[-8px] left-1/2 h-[16px] w-[16px] -translate-x-1/2 rotate-45 border-b border-r border-[#e5e5e5] bg-white" />
    </div>
  );
}
