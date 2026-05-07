import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { DashboardChartPoint } from "../models/dashboard";

const PLOT_TOP = 89;
const PLOT_BASE_Y = 297;
const BAR_MAX_HEIGHT = 208;
const CHART_HEIGHT = 394;
const LABEL_TOP = 304;
const BAR_GAP = 2;
const STEP_RADIUS = 6;
const GRID_BLEED_X = 100;
const INDICATOR_TOP = 68;
const INDICATOR_AVATARS = [
  {
    id: "baseframe",
    label: "B",
    variant: "dark" as const,
    dateRange: "May 6 - Jun 5, 2026",
    projectName: "BaseFrame",
    clientName: "baseframe.design",
    phaseName: "Discovery",
    taskSummary: "2 tasks due this week.",
  },
  {
    id: "tefosmus",
    label: "T",
    variant: "blue" as const,
    dateRange: "May 6 - Jun 5, 2026",
    projectName: "Tefosmus",
    clientName: "Tefsm.co",
    phaseName: "Discovery",
    taskSummary: "No tasks in this phase.",
  },
];
const AVATAR_SIZE = 24;
const AVATAR_OVERLAP = 13;
const AVATAR_BUBBLE_PADDING = 4;
const PROJECT_CARD_WIDTH = 286;

function getAvatarBubbleWidth(count: number) {
  if (count <= 0) return AVATAR_BUBBLE_PADDING * 2;
  return AVATAR_SIZE * count - AVATAR_OVERLAP * (count - 1) + AVATAR_BUBBLE_PADDING * 2;
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

export function ActivityTimelineChart({ points }: { points: DashboardChartPoint[] }) {
  const gradientId = useId().replace(/:/g, "");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => setWidth(Math.round(el.getBoundingClientRect().width));
    update();

    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const max = Math.max(...points.map((p) => p.value), 1);
  const barCount = points.length;

  const bars = useMemo(() => {
    if (width === 0 || barCount === 0) return [];

    const barWidth = (width - BAR_GAP * (barCount - 1)) / barCount;
    return points.map((point, i) => ({
      x: i * (barWidth + BAR_GAP),
      width: barWidth,
      height: point.value <= 0 ? 0 : Math.max(4, (point.value / max) * BAR_MAX_HEIGHT),
    }));
  }, [width, barCount, points, max]);

  const areaPath = useMemo(() => buildRoundedSteppedAreaPath(bars), [bars]);
  const activeBar = activeIndex === null ? undefined : bars[activeIndex];

  return (
    <div
      ref={containerRef}
      className="relative min-w-[360px]"
      style={{ height: CHART_HEIGHT }}
      onPointerLeave={() => {
        setActiveIndex(null);
        setActiveProjectId(null);
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

      {activeBar && activeBar.height > 0 && (
        <div
          className="absolute z-20 flex items-center rounded-full bg-[#e7e6fd] p-[4px] shadow-[0px_0.45px_0.5px_0px_rgba(10,10,10,0.35)]"
          style={{
            left: Math.min(
              activeBar.x + activeBar.width / 2 + 10,
              Math.max(0, width - getAvatarBubbleWidth(INDICATOR_AVATARS.length)),
            ),
            top: Math.max(0, PLOT_BASE_Y - activeBar.height - 12),
          }}
        >
          <div className="flex items-center">
            {INDICATOR_AVATARS.map((avatar, index) => (
              <div
                key={avatar.id}
                className={cn("relative", index > 0 && "-ml-[13px]", index === 0 ? "z-[2]" : "z-[1]")}
                onPointerEnter={() => setActiveProjectId(avatar.id)}
                onPointerLeave={() => setActiveProjectId(null)}
                onFocus={() => setActiveProjectId(avatar.id)}
                onBlur={() => setActiveProjectId(null)}
              >
                <ProjectBadge
                  label={avatar.label}
                  variant={avatar.variant}
                  className="focus-visible:ring-2 focus-visible:ring-[#3b368e] focus-visible:ring-offset-2"
                />
                {activeProjectId === avatar.id ? <ProjectHoverCard project={avatar} /> : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {width > 0 && (
        <div className="absolute left-0 top-0 z-10 h-full w-full">
          {bars.map((bar, index) => (
            <button
              key={points[index]?.label ?? index}
              type="button"
              className="absolute top-0 h-full cursor-crosshair outline-none"
              style={{
                left: bar.x,
                width: bar.width,
              }}
              onPointerEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              onBlur={() => setActiveIndex(null)}
              aria-label={`${points[index]?.label ?? "Point"}: ${points[index]?.value ?? 0}`}
            />
          ))}
        </div>
      )}

      <div
        className="absolute left-0 right-0 flex justify-between text-[12px] font-medium leading-[1.5] text-[#a3a3a3]"
        style={{ top: LABEL_TOP }}
        aria-hidden
      >
        {points.map((point, i) => (
          <span
            key={point.label}
            className={cn(
              i !== 0 && i !== points.length - 1 && "max-[560px]:hidden",
              i === activeIndex
                ? "text-center text-[#737373]"
                : i === 0
                  ? "text-left"
                  : i === points.length - 1
                    ? "text-right"
                    : "text-center",
            )}
          >
            {point.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function ProjectBadge({
  label,
  className,
  variant = "dark",
}: {
  label: string;
  className?: string;
  variant?: "dark" | "blue";
}) {
  return (
    <button
      type="button"
      className={cn(
        "relative flex h-[24px] w-[24px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#fafafa] text-[9px] font-semibold text-white outline-none",
        variant === "blue" ? "bg-[#1687ff]" : "bg-[#171717]",
        className,
      )}
    >
      {label}
    </button>
  );
}

function ProjectHoverCard({ project }: { project: (typeof INDICATOR_AVATARS)[number] }) {
  return (
    <div
      className="absolute bottom-[calc(100%+20px)] left-1/2 w-[286px] -translate-x-1/2 rounded-[8px] border border-[#e5e5e5] bg-white px-[16px] py-[14px] text-left shadow-[0px_18px_45px_rgba(10,10,10,0.12)]"
      style={{ width: PROJECT_CARD_WIDTH }}
    >
      <div className="text-[13px] font-medium leading-[1.35] text-[#8a8a8a]">{project.dateRange}</div>
      <div className="mt-[8px] text-[16px] font-semibold leading-[1.25] text-[#111121]">{project.projectName}</div>
      <div className="mt-[8px] text-[13px] font-medium leading-[1.35] text-[#8a8a8a]">{project.clientName}</div>
      <div className="mt-[8px] text-[13px] font-medium leading-[1.35] text-[#8a8a8a]">{project.phaseName}</div>
      <div className="mt-[14px] border-t border-[#e5e5e5] pt-[12px] text-[13px] font-medium leading-[1.35] text-[#8a8a8a]">
        {project.taskSummary}
      </div>
      <span className="absolute bottom-[-8px] left-1/2 h-[16px] w-[16px] -translate-x-1/2 rotate-45 border-b border-r border-[#e5e5e5] bg-white" />
    </div>
  );
}
