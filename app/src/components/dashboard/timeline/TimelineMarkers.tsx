import type { MouseEvent as ReactMouseEvent } from "react";
import { Link } from "@tanstack/react-router";
import { Avatar } from "@/components/ui/Avatar";
import { MARKER_RADIUS } from "@/components/dashboard/timeline/constants";
import { clamp } from "@/components/dashboard/timeline/geometry";
import { markerOpacity } from "@/components/dashboard/timeline/selectors";
import type { TimelineLayout } from "@/components/dashboard/timeline/types";
import type { Project } from "@/types";

type TimelineMarkersProps = {
  layout: TimelineLayout;
  interactive: boolean;
  hoveredProjectId: string | null;
  onMarkerEnter: (project: Project, markerTimestamp: number, markerElement: HTMLElement) => void;
  onMarkerLeave: (projectId: string) => void;
};

export function TimelineMarkers({
  layout,
  interactive,
  hoveredProjectId,
  onMarkerEnter,
  onMarkerLeave,
}: TimelineMarkersProps) {
  return (
    <>
      {layout.groups.map((group) => {
        const groupLeft = clamp(
          (group.pct / 100) * layout.width,
          layout.edgeInset,
          layout.width - layout.edgeInset,
        );
        const markerTop = group.curveTop - MARKER_RADIUS;
        const markerTimestamp = layout.start + layout.rangeMs * (group.pct / 100);
        const visibleItems = group.items.slice(0, 3);
        const overflow = Math.max(group.items.length - visibleItems.length, 0);

        if (group.items.length === 1) {
          const item = group.items[0];
          if (!item) {
            return null;
          }

          const markerProps = {
            "data-curve-marker": true,
            className:
              "absolute z-[6] block h-9 w-9 -translate-x-1/2 overflow-hidden rounded-full border-2 border-white shadow-[0_0_0_2.5px_#8782F5] transition-[transform,box-shadow,opacity] duration-200 hover:scale-110 hover:shadow-[0_0_0_2.5px_#8782F5,0_3px_12px_rgba(26,26,46,0.12)]",
            style: {
              left: `${groupLeft}px`,
              top: `${markerTop}px`,
              opacity: markerOpacity(item.project, hoveredProjectId),
            },
            onMouseEnter: (event: ReactMouseEvent<HTMLElement>) =>
              onMarkerEnter(item.project, markerTimestamp, event.currentTarget),
            onMouseLeave: () => onMarkerLeave(item.project.id),
          };

          return interactive ? (
            <Link
              key={group.key}
              to="/project/$id"
              params={{ id: item.project.id }}
              {...markerProps}
            >
              <Avatar
                name={item.project.clientName}
                src={item.project.clientAvatarUrl}
                size="md"
                className="h-full w-full text-[11px]"
              />
            </Link>
          ) : (
            <button
              key={group.key}
              type="button"
              aria-label={item.project.name}
              {...markerProps}
            >
              <Avatar
                name={item.project.clientName}
                src={item.project.clientAvatarUrl}
                size="md"
                className="h-full w-full text-[11px]"
              />
            </button>
          );
        }

        return (
          <div
            key={group.key}
            className="group absolute z-[6] -translate-x-1/2"
            style={{ left: `${groupLeft}px`, top: `${markerTop}px` }}
          >
            <div className="flex flex-col items-center">
              {visibleItems.map((item, index) =>
                interactive ? (
                  <Link
                    key={item.project.id}
                    to="/project/$id"
                    params={{ id: item.project.id }}
                    data-curve-marker
                    className={`relative block h-9 w-9 overflow-hidden rounded-full border-2 border-white shadow-[0_0_0_2.5px_#8782F5] transition-[margin,transform,box-shadow,opacity] duration-200 hover:scale-110 hover:shadow-[0_0_0_2.5px_#8782F5,0_3px_12px_rgba(26,26,46,0.12)] ${
                      index > 0 ? "-mt-8 group-hover:mt-2" : ""
                    }`}
                    style={{
                      zIndex: visibleItems.length - index,
                      opacity: markerOpacity(item.project, hoveredProjectId),
                    }}
                    onMouseEnter={(event) =>
                      onMarkerEnter(item.project, markerTimestamp, event.currentTarget)
                    }
                    onMouseLeave={() => onMarkerLeave(item.project.id)}
                  >
                    <Avatar
                      name={item.project.clientName}
                      src={item.project.clientAvatarUrl}
                      size="md"
                      className="h-full w-full text-[11px]"
                    />
                  </Link>
                ) : (
                  <button
                    key={item.project.id}
                    type="button"
                    aria-label={item.project.name}
                    data-curve-marker
                    className={`relative block h-9 w-9 overflow-hidden rounded-full border-2 border-white shadow-[0_0_0_2.5px_#8782F5] transition-[margin,transform,box-shadow,opacity] duration-200 hover:scale-110 hover:shadow-[0_0_0_2.5px_#8782F5,0_3px_12px_rgba(26,26,46,0.12)] ${
                      index > 0 ? "-mt-8 group-hover:mt-2" : ""
                    }`}
                    style={{
                      zIndex: visibleItems.length - index,
                      opacity: markerOpacity(item.project, hoveredProjectId),
                    }}
                    onMouseEnter={(event) =>
                      onMarkerEnter(item.project, markerTimestamp, event.currentTarget)
                    }
                    onMouseLeave={() => onMarkerLeave(item.project.id)}
                  >
                    <Avatar
                      name={item.project.clientName}
                      src={item.project.clientAvatarUrl}
                      size="md"
                      className="h-full w-full text-[11px]"
                    />
                  </button>
                ),
              )}

              {overflow > 0 ? (
                <div className="relative -mt-8 flex h-9 w-9 items-center justify-center rounded-full border-[2.5px] border-white bg-border text-[11px] font-medium text-text-secondary transition-[margin,opacity] duration-200 group-hover:mt-2">
                  +{overflow}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </>
  );
}
