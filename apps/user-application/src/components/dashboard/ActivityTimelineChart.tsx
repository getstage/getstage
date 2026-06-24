import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { setProjectBackDestination } from "@/lib/projectBackDestination";
import { useToggleTaskCompletionMutation } from "@/hooks/convex-data";
import type { CSSProperties } from "react";
import type { DashboardChartPoint, DashboardProject, DashboardTask } from "@/models/dashboard/dashboard";
import type { DashboardPeriod } from "./DashboardHeader";
import {
  buildRoundedSteppedAreaPath,
  DAY_MS,
  formatProjectRange,
  getAvatarBubbleWidth,
  getProjectTasks,
  isProjectActiveOnDay,
} from "@/lib/dashboard/activityTimelineChart";

const PLOT_TOP = 89;
const PLOT_BASE_Y = 297;
const BAR_MAX_HEIGHT = 208;
const CHART_HEIGHT = 394;
const LABEL_TOP = 304;
const BAR_GAP = 2;
const GRID_BLEED_X = 100;
const INDICATOR_TOP = 68;
const PROJECT_CARD_WIDTH = 187;

function estimateTimelineLabelWidth(label: string) {
  return label.length * 7 + 4;
}

function getBaselineLabelIndexes(count: number) {
  if (count <= 0) return new Set<number>();
  if (count <= 4) {
    return new Set(Array.from({ length: count }, (_, index) => index));
  }

  return new Set([
    0,
    Math.round((count - 1) / 3),
    Math.round(((count - 1) * 2) / 3),
    count - 1,
  ]);
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
  const toggleTaskCompletion = useToggleTaskCompletionMutation();
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
  const projectGridLines = useMemo(
    () =>
      Array.from({ length: max }, (_, index) => {
        const value = index + 1;
        return {
          value,
          y: PLOT_BASE_Y - (value / max) * BAR_MAX_HEIGHT,
        };
      }),
    [max],
  );

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
    if (bars.length === 0) return [];
    const baselineIndexes = getBaselineLabelIndexes(chartPoints.length);

    const candidates: Array<{
      index: number;
      label: string;
      priority: number;
      x: number;
      width: number;
    }> = [];

    chartPoints.forEach((point, index) => {
      const bar = bars[index];
      if (!bar || (!baselineIndexes.has(index) && index !== activeIndex)) return;

      const isEdgeLabel = index === 0 || index === chartPoints.length - 1;
      const isActiveLabel = index === activeIndex;
      candidates.push({
        index,
        label: point.label,
        priority: isActiveLabel ? 4 : isEdgeLabel ? 3 : 2,
        x: bar.x + bar.width / 2,
        width: estimateTimelineLabelWidth(point.label),
      });
    });

    const placed: typeof candidates = [];
    for (const candidate of [...candidates].sort((a, b) => b.priority - a.priority || a.index - b.index)) {
      const collides = placed.some((label) =>
        Math.abs(label.x - candidate.x) < (label.width + candidate.width) / 2 + 8,
      );
      if (!collides) {
        placed.push(candidate);
      }
    }

    return placed.map((label) => label.index).sort((a, b) => a - b);
  }, [activeIndex, bars, chartPoints]);

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
  const indicatorBubbleWidth = getAvatarBubbleWidth(activeProjects.length);
  const indicatorBubbleLeft = activeBar
    ? Math.min(
        Math.max(0, activeBar.x + activeBar.width / 2 - indicatorBubbleWidth / 2),
        Math.max(0, width - indicatorBubbleWidth),
      )
    : 0;
  const showHoverCardOnLeft =
    indicatorBubbleLeft + indicatorBubbleWidth + 8 + PROJECT_CARD_WIDTH > width;

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

          {projectGridLines.map((line) => (
            <line
              key={line.value}
              x1={-GRID_BLEED_X}
              y1={line.y}
              x2={width + GRID_BLEED_X}
              y2={line.y}
              stroke="#e5e5e5"
              strokeWidth="1"
              strokeDasharray="6 8"
            />
          ))}
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
          className="absolute z-20"
          style={{
            left: indicatorBubbleLeft,
            top: Math.max(0, PLOT_BASE_Y - activeBar.height - 40),
          }}
        >
          <div className="relative" onPointerLeave={() => setHoveredProjectId(null)}>
            <div className="flex items-center overflow-hidden rounded-full bg-[#E7E6FD] p-[4px] shadow-[0px_0.45px_0.5px_0px_rgba(10,10,10,0.35)]">
              <div className="flex isolate items-center">
                {activeProjects.map((project, index) => (
                  <ProjectBadge
                    key={project.id}
                    accentColor={project.accentColor}
                    label={project.logoLabel}
                    imageUrl={project.projectImageUrl}
                    onClick={() => {
                      setProjectBackDestination({ href: "/", label: "Back to dashboard" });
                      void navigate({
                        to: "/project/$projectId",
                        params: { projectId: project.id },
                      });
                    }}
                    onPointerEnter={() => setHoveredProjectId(project.id)}
                    onFocus={() => setHoveredProjectId(project.id)}
                    onBlur={() => setHoveredProjectId(null)}
                    className={cn(
                      "focus-visible:ring-2 focus-visible:ring-[#3b368e] focus-visible:ring-offset-2",
                      index < activeProjects.length - 1 && "mr-[-13px]",
                    )}
                    style={{
                      zIndex: hoveredProjectId === project.id
                        ? activeProjects.length + 1
                        : activeProjects.length - index,
                    }}
                  />
                ))}
              </div>
            </div>
            {hoveredProject ? (
              <ProjectHoverCard
                project={hoveredProject}
                tasks={getProjectTasks(hoveredProject, tasks)}
                placement={showHoverCardOnLeft ? "left" : "right"}
                onTaskClick={(task) => {
                  void navigate({
                    to: "/tasks/$taskId",
                    params: { taskId: task.id },
                    search: {
                      from: "tasks",
                      projectId: task.projectId,
                    },
                  });
                }}
                onTaskToggle={(task) => toggleTaskCompletion.mutate(task.id)}
              />
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

                  setProjectBackDestination({ href: "/", label: "Back to dashboard" });
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

function ProjectBadge({
  accentColor,
  label,
  imageUrl,
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
  imageUrl?: string;
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
        imageUrl && "bg-white",
        className,
      )}
      style={{ background: imageUrl ? "#ffffff" : accentColor, ...style }}
    >
      {imageUrl ? (
        <img src={imageUrl} alt="" aria-hidden="true" className="h-full w-full object-cover" />
      ) : (
        label
      )}
    </button>
  );
}

function ProjectHoverCard({
  project,
  tasks,
  placement,
  onTaskClick,
  onTaskToggle,
}: {
  project: DashboardProject;
  tasks: DashboardTask[];
  placement: "left" | "right";
  onTaskClick: (task: DashboardTask) => void;
  onTaskToggle: (task: DashboardTask) => void;
}) {
  return (
    <div
      className={cn(
        "absolute top-0 z-10 flex flex-col gap-[8px] overflow-hidden rounded-[4px] border-[0.5px] border-solid border-[#D4D4D4] bg-white p-[6px] text-left",
        placement === "right"
          ? "left-[calc(100%+8px)]"
          : "right-[calc(100%+8px)]",
      )}
      style={{ width: PROJECT_CARD_WIDTH }}
    >
      <div className="flex min-w-0 flex-col items-start gap-[4px]">
        <div
          className="flex h-[24px] w-[24px] shrink-0 items-center justify-center overflow-hidden text-[9px] font-semibold text-white"
          style={{ background: project.projectImageUrl ? "#ffffff" : project.accentColor }}
        >
          {project.projectImageUrl ? (
            <img
              src={project.projectImageUrl}
              alt=""
              aria-hidden="true"
              className="h-full w-full object-cover"
            />
          ) : (
            project.logoLabel
          )}
        </div>
        <div className="flex min-w-0 flex-col items-start gap-[2px]">
          <div className="max-w-full truncate text-[13px] font-medium leading-[1.2] text-[#0A0A0A]">
            {project.name}
          </div>
          <div className="max-w-full truncate text-[12px] font-medium leading-[1.5] text-[#737373]">
            {formatProjectRange(project)}
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-col items-start gap-[2px] border-t-[0.5px] border-solid border-[#D4D4D4] pt-[8px] text-[12px] font-medium leading-[1.5] text-[#4B4B4B]">
        {project.clientName ? (
          <div className="max-w-full truncate">
            {project.clientName}
          </div>
        ) : null}
        {project.phaseName ? (
          <div className="max-w-full truncate">
            {project.phaseName}
          </div>
        ) : null}
      </div>

      <div className="border-t-[0.5px] border-solid border-[#D4D4D4] pt-[8px]">
        {tasks.length > 0 ? (
          <div className="flex flex-col gap-[2px]">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex min-w-0 items-center gap-[6px] text-[12px] font-medium leading-[1.5] text-[#4B4B4B]"
              >
                <button
                  type="button"
                  onClick={() => onTaskToggle(task)}
                  className="flex h-[12px] w-[12px] shrink-0 items-center justify-center"
                  aria-label={`Complete ${task.title}`}
                >
                  <span className="h-[7px] w-[7px] rounded-[2px] border border-[#4B4B4B] transition-colors hover:border-[#0A0A0A]" />
                </button>
                <button
                  type="button"
                  onClick={() => onTaskClick(task)}
                  className="min-w-0 flex-1 truncate text-left transition-colors hover:text-[#0A0A0A] focus-visible:text-[#0A0A0A]"
                >
                  {task.title}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[12px] font-normal leading-[1.5] text-[#A3A3A3]">
            No tasks in this phase.
          </div>
        )}
      </div>
    </div>
  );
}
