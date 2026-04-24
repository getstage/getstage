import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  BAR_MAX_HEIGHT,
  BAR_RADIUS,
  CHART_HEIGHT,
} from "@/components/dashboard/timeline/constants";
import { buildTimelineLayout } from "@/components/dashboard/timeline/selectors";
import { TimelineMarkers } from "@/components/dashboard/timeline/TimelineMarkers";
import { TimelineOverlays } from "@/components/dashboard/timeline/TimelineOverlays";
import type { BarSegment, TimelineProps } from "@/components/dashboard/timeline/types";
import { useTimelineInteraction } from "@/components/dashboard/timeline/useTimelineInteraction";

export type { TimelineHorizon } from "@/components/dashboard/timeline/types";

function buildSteppedAreaPath(bars: BarSegment[]) {
  if (bars.length === 0) {
    return "";
  }

  const baseY = BAR_MAX_HEIGHT;
  const first = bars[0];
  if (!first) {
    return "";
  }

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
  if (!last) {
    return "";
  }

  commands.push(`L ${last.x + last.width} ${baseY}`);
  commands.push("Z");
  return commands.join(" ");
}

export function Timeline({
  projects,
  horizon = "thisMonth",
  nowTimestamp = Date.now(),
  interactive = true,
}: TimelineProps) {
  const gradientId = useId().replace(/:/g, "");
  const regionRef = useRef<HTMLDivElement | null>(null);
  const [regionWidth, setRegionWidth] = useState(0);

  useEffect(() => {
    const element = regionRef.current;
    if (!element) {
      return;
    }

    const updateWidth = () => {
      setRegionWidth(Math.round(element.getBoundingClientRect().width));
    };

    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  const layout = useMemo(
    () =>
      buildTimelineLayout({
        projects,
        horizon,
        nowTimestamp,
        regionWidth,
      }),
    [horizon, nowTimestamp, projects, regionWidth],
  );

  const interaction = useTimelineInteraction({
    regionRef,
    layout,
    nowTimestamp,
  });

  return (
    <section className="relative flex min-h-[35vh] items-center justify-center px-4 pb-[84px] pt-[50px]">
      <div
        ref={regionRef}
        className="relative w-full"
        style={{ height: `${CHART_HEIGHT}px` }}
        onMouseMove={(event) => interaction.handleMouseMove(event.clientX)}
        onMouseLeave={interaction.clearAllHover}
      >
        {/* Bar chart */}
        <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full" aria-hidden>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(135,130,245,0.45)" />
              <stop offset="100%" stopColor="rgba(135,130,245,0.12)" />
            </linearGradient>
          </defs>

          <path
            d={buildSteppedAreaPath(layout.bars)}
            fill={`url(#${gradientId})`}
            opacity="0.72"
            className="transition-all duration-300"
          />

          {layout.bars.map((bar, index) => {
            if (bar.count === 0) return null;
            const y = BAR_MAX_HEIGHT - bar.height;
            return (
              <rect
                key={index}
                x={bar.x}
                y={y}
                width={bar.width}
                height={bar.height}
                rx={BAR_RADIUS}
                ry={BAR_RADIUS}
                fill={`url(#${gradientId})`}
                className="transition-all duration-300"
              />
            );
          })}

          {/* Top edge accent on bars */}
          {layout.bars.map((bar, index) => {
            if (bar.count === 0) return null;
            const y = BAR_MAX_HEIGHT - bar.height;
            return (
              <rect
                key={`stroke-${index}`}
                x={bar.x}
                y={y}
                width={bar.width}
                height={Math.min(3, bar.height)}
                rx={BAR_RADIUS}
                ry={BAR_RADIUS}
                fill="#8782F5"
                className="transition-all duration-300"
              />
            );
          })}
        </svg>

        {/* Date labels */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-[1] flex h-[24px] items-end">
          {layout.dateLabels.map((label, index) => (
            <span
              key={index}
              className="absolute -translate-x-1/2 text-[11px] text-text-tertiary"
              style={{ left: `${label.x}px` }}
            >
              {label.label}
            </span>
          ))}
        </div>

        <TimelineMarkers
          layout={layout}
          interactive={interactive}
          hoveredProjectId={interaction.hoveredProjectId}
          onMarkerEnter={interaction.handleMarkerEnter}
          onMarkerLeave={interaction.clearMarkerHover}
        />

        <TimelineOverlays
          profileHover={interaction.profileHover}
          profileHoverDetails={interaction.profileHoverDetails}
          tracking={interaction.tracking}
        />
      </div>
    </section>
  );
}

export function TimelineSkeleton() {
  const skeletonBars = Array.from({ length: 12 }, (_, i) => ({
    x: i * (100 / 12),
    width: 100 / 12 - 2,
    height: 20 + Math.sin(i * 0.8) * 30 + Math.random() * 20,
  }));

  return (
    <section
      aria-hidden
      className="relative flex min-h-[35vh] items-center justify-center px-4 pb-[84px] pt-[50px]"
    >
      <div className="relative w-full" style={{ height: `${CHART_HEIGHT}px` }}>
        <svg
          className="pointer-events-none absolute inset-0 z-0 h-full w-full animate-pulse"
          viewBox={`0 0 100 ${CHART_HEIGHT}`}
          preserveAspectRatio="none"
        >
          {skeletonBars.map((bar, i) => (
            <rect
              key={i}
              x={bar.x + 1}
              y={BAR_MAX_HEIGHT - bar.height}
              width={bar.width}
              height={bar.height}
              rx={1}
              ry={1}
              fill="rgba(135,130,245,0.12)"
            />
          ))}
        </svg>
      </div>
    </section>
  );
}
