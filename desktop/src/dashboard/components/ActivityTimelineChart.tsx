import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { DashboardChartPoint } from "../models/dashboard";

const PLOT_TOP = 89;
const PLOT_BASE_Y = 297;
const BAR_MAX_HEIGHT = 208;
const CHART_HEIGHT = 394;
const LABEL_TOP = 304;
const BAR_GAP = 2;
const STEP_RADIUS = 6;
const GRID_BLEED_X = 44;

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

  return (
    <div ref={containerRef} className="relative" style={{ height: CHART_HEIGHT }}>
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
        </svg>
      )}

      <div
        className="absolute left-0 right-0 flex justify-between text-[12px] font-medium leading-[1.5] text-[#a3a3a3]"
        style={{ top: LABEL_TOP }}
        aria-hidden
      >
        {points.map((point, i) => (
          <span
            key={point.label}
            className={i === 0 ? "text-left" : i === points.length - 1 ? "text-right" : "text-center"}
          >
            {point.label}
          </span>
        ))}
      </div>
    </div>
  );
}
