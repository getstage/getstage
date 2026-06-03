import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { setProjectBackDestination } from "@/lib/projectBackDestination";
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
const PROJECT_CARD_WIDTH = 286;

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
        className,
      )}
      style={{ background: accentColor, ...style }}
    >
      {imageUrl ? (
        <img src={imageUrl} alt="" aria-hidden="true" className="h-full w-full object-cover" />
      ) : (
        label
      )}
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
