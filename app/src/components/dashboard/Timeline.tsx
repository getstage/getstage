import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import {
  CURVE_HEIGHT,
  SKELETON_CURVE_PATH,
  SKELETON_FILL_PATH,
  SKELETON_VIEWBOX_WIDTH,
} from "@/components/dashboard/timeline/constants";
import { buildTimelineLayout } from "@/components/dashboard/timeline/selectors";
import { TimelineMarkers } from "@/components/dashboard/timeline/TimelineMarkers";
import { TimelineOverlays } from "@/components/dashboard/timeline/TimelineOverlays";
import type { TimelineProps } from "@/components/dashboard/timeline/types";
import { useTimelineInteraction } from "@/components/dashboard/timeline/useTimelineInteraction";

gsap.registerPlugin(DrawSVGPlugin);

export type { TimelineHorizon } from "@/components/dashboard/timeline/types";

export function Timeline({
  projects,
  horizon = "thisMonth",
  nowTimestamp = Date.now(),
  interactive = true,
}: TimelineProps) {
  const gradientId = useId().replace(/:/g, "");
  const regionRef = useRef<HTMLDivElement | null>(null);
  const curveLineRef = useRef<SVGPathElement | null>(null);
  const curveFillRef = useRef<SVGPathElement | null>(null);
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

  useLayoutEffect(() => {
    const line = curveLineRef.current;
    const fill = curveFillRef.current;
    const region = regionRef.current;
    if (!line || !fill || !region) {
      return;
    }

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const context = gsap.context(() => {
      const markers = gsap.utils.toArray<HTMLElement>("[data-curve-marker]");

      gsap.set(line, { drawSVG: "0% 0%" });
      gsap.set(fill, { opacity: 0 });

      const timeline = gsap.timeline({ defaults: { ease: "sine.out" } });
      timeline.to(line, { drawSVG: "0% 100%", duration: 1 });
      timeline.to(fill, { opacity: 1, duration: 0.4 }, 0.72);

      if (markers.length > 0) {
        timeline.fromTo(
          markers,
          { opacity: 0.88, scale: 0.96 },
          {
            opacity: 1,
            scale: 1,
            duration: 0.45,
            stagger: { each: 0.04, from: "center" },
          },
          0.35,
        );
      }
    }, region);

    return () => {
      context.revert();
    };
  }, [layout.curvePath, layout.groups.length]);

  return (
    <section className="relative flex min-h-[35vh] items-center justify-center px-4 pb-[84px] pt-[50px]">
      <div
        ref={regionRef}
        className="relative w-full"
        style={{ height: `${CURVE_HEIGHT}px` }}
        onMouseMove={(event) => interaction.handleMouseMove(event.clientX)}
        onMouseLeave={interaction.clearAllHover}
      >
        <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full" aria-hidden>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(135,130,245,0.25)" />
              <stop offset="100%" stopColor="rgba(135,130,245,0)" />
            </linearGradient>
          </defs>

          <path ref={curveFillRef} d={layout.fillPath} fill={`url(#${gradientId})`} />
          <path
            ref={curveLineRef}
            d={layout.curvePath}
            fill="none"
            stroke="#8782F5"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </svg>

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
  return (
    <section
      aria-hidden
      className="relative flex min-h-[35vh] items-center justify-center px-4 pb-[84px] pt-[50px]"
    >
      <div className="relative w-full" style={{ height: `${CURVE_HEIGHT}px` }}>
        <svg
          className="pointer-events-none absolute inset-0 z-0 h-[160px] w-full"
          viewBox={`0 0 ${SKELETON_VIEWBOX_WIDTH} ${CURVE_HEIGHT}`}
          preserveAspectRatio="none"
        >
          <path d={SKELETON_FILL_PATH} fill="rgba(135,130,245,0.12)" />
          <path
            d={SKELETON_CURVE_PATH}
            fill="none"
            stroke="rgba(135,130,245,0.52)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </section>
  );
}
