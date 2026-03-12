import { useMemo, useState, type RefObject } from "react";
import { CURVE_HEIGHT } from "@/components/dashboard/timeline/constants";
import { clamp } from "@/components/dashboard/timeline/geometry";
import {
  buildProfileHoverDetails,
  buildTrackingState,
} from "@/components/dashboard/timeline/selectors";
import type {
  ProfileHoverState,
  TimelineLayout,
  TimelineTrackingState,
} from "@/components/dashboard/timeline/types";
import type { Project } from "@/types";

export function useTimelineInteraction({
  regionRef,
  layout,
  nowTimestamp,
}: {
  regionRef: RefObject<HTMLDivElement | null>;
  layout: TimelineLayout;
  nowTimestamp: number;
}) {
  const [profileHover, setProfileHover] = useState<ProfileHoverState | null>(null);
  const [tracking, setTracking] = useState<TimelineTrackingState | null>(null);
  const hoveredProjectId = profileHover?.projectId ?? null;

  function handleMouseMove(clientX: number) {
    const region = regionRef.current;
    if (!region || hoveredProjectId) {
      return;
    }

    const bounds = region.getBoundingClientRect();
    const x = clamp(clientX - bounds.left, 0, layout.width);
    setTracking(buildTrackingState({ x, layout }));
  }

  function handleMarkerEnter(
    project: Project,
    markerTimestamp: number,
    markerElement: HTMLElement,
  ) {
    setTracking(null);

    const region = regionRef.current;
    if (!region) {
      return;
    }

    const regionBounds = region.getBoundingClientRect();
    const markerBounds = markerElement.getBoundingClientRect();
    const markerX = clamp(
      markerBounds.left + markerBounds.width / 2 - regionBounds.left,
      0,
      layout.width,
    );
    const markerY = clamp(
      markerBounds.top + markerBounds.height / 2 - regionBounds.top,
      0,
      CURVE_HEIGHT,
    );
    const projectDuration = Math.max(project.endDate - project.startDate, 1);
    const progress = clamp((markerTimestamp - project.startDate) / projectDuration, 0, 1);

    setProfileHover({
      projectId: project.id,
      x: markerX,
      y: markerY,
      progress,
    });
  }

  function clearMarkerHover(projectId: string) {
    setProfileHover((current) => (current?.projectId === projectId ? null : current));
  }

  const profileHoverDetails = useMemo(
    () =>
      buildProfileHoverDetails({
        profileHover,
        visibleProjects: layout.visibleProjects,
        width: layout.width,
        nowTimestamp,
      }),
    [layout, nowTimestamp, profileHover],
  );

  return {
    profileHover,
    profileHoverDetails,
    tracking,
    hoveredProjectId,
    handleMouseMove,
    handleMarkerEnter,
    clearMarkerHover,
    clearAllHover: () => {
      setTracking(null);
      setProfileHover(null);
    },
  };
}
