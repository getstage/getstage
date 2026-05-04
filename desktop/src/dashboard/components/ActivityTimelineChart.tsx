import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { DashboardChartPoint } from "../models/dashboard";

const BAR_MAX_HEIGHT = 200;
const CHART_HEIGHT = 240;
const BAR_GAP = 2;

function buildSteppedAreaPath(
  bars: { x: number; width: number; height: number }[],
) {
  if (bars.length === 0) return "";

  const baseY = BAR_MAX_HEIGHT;
  const first = bars[0];
  if (!first) return "";

  const commands = [`M ${first.x} ${baseY}`];
  let previousTop = baseY;

  for (const bar of bars) {
    const top = baseY - bar.height;
    const right = bar.x + bar.width;
    commands.push(`L ${bar.x} ${previousTop}`);
    commands.push(`L ${bar.x} ${top}`);
    commands.push(`L ${right} ${top}`);
    previousTop = top;
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
      height: Math.max(4, (point.value / max) * BAR_MAX_HEIGHT),
    }));
  }, [width, barCount, points, max]);

  const areaPath = useMemo(() => buildSteppedAreaPath(bars), [bars]);

  return (
    <div ref={containerRef} className="relative" style={{ height: CHART_HEIGHT }}>
      {width > 0 && (
        <svg
          width={width}
          height={CHART_HEIGHT}
          viewBox={`0 0 ${width} ${CHART_HEIGHT}`}
          className="absolute inset-0"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(135,130,245,0.45)" />
              <stop offset="100%" stopColor="rgba(135,130,245,0.12)" />
            </linearGradient>
          </defs>

          {/* Dashed grid lines */}
          <line x1="0" y1={BAR_MAX_HEIGHT * 0.33} x2={width} y2={BAR_MAX_HEIGHT * 0.33}
            stroke="#e4e4e4" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="0" y1={BAR_MAX_HEIGHT * 0.66} x2={width} y2={BAR_MAX_HEIGHT * 0.66}
            stroke="#e4e4e4" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="0" y1={BAR_MAX_HEIGHT} x2={width} y2={BAR_MAX_HEIGHT}
            stroke="#d8d8d8" strokeWidth="1" strokeDasharray="4 4" />

          {/* Stepped area fill */}
          {areaPath && (
            <path d={areaPath} fill={`url(#${gradientId})`} />
          )}

          {/* Bar outlines */}
          {bars.map((bar, i) => (
            <rect
              key={points[i]?.label}
              x={bar.x}
              y={BAR_MAX_HEIGHT - bar.height}
              width={bar.width}
              height={bar.height}
              rx={4}
              fill="transparent"
              stroke="rgba(135,130,245,0.3)"
              strokeWidth="1"
            />
          ))}
        </svg>
      )}

      {/* Date labels */}
      <div
        className="absolute bottom-0 left-0 right-0 flex text-[11px] text-[#9a9a9a]"
        aria-hidden
      >
        {points.map((point, i) => (
          <span
            key={point.label}
            className="flex-1 text-center"
            style={{ paddingLeft: i === 0 ? 0 : BAR_GAP / 2 }}
          >
            {point.label}
          </span>
        ))}
      </div>
    </div>
  );
}
