import { AnimatePresence, motion } from "motion/react";
import { Avatar } from "@/components/ui/Avatar";
import { CHART_HEIGHT } from "@/components/dashboard/timeline/constants";
import type {
  ProfileHoverDetails,
  ProfileHoverState,
  TimelineTrackingState,
} from "@/components/dashboard/timeline/types";

type TimelineOverlaysProps = {
  profileHover: ProfileHoverState | null;
  profileHoverDetails: ProfileHoverDetails | null;
  tracking: TimelineTrackingState | null;
};

export function TimelineOverlays({
  profileHover,
  profileHoverDetails,
  tracking,
}: TimelineOverlaysProps) {
  return (
    <>
      {profileHover ? (
        <>
          <div
            className="pointer-events-none absolute top-0 z-[3] w-px -translate-x-1/2 bg-accent/26 transition-opacity duration-200"
            style={{ left: `${profileHover.x}px`, height: `${CHART_HEIGHT}px` }}
          />
          <div
            className="pointer-events-none absolute z-[3] h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/65"
            style={{ left: `${profileHover.x}px`, top: `${profileHover.y}px` }}
          />
        </>
      ) : null}

      {tracking && !profileHover ? (
        <>
          <div
            className="pointer-events-none absolute top-0 z-[3] w-px -translate-x-1/2 bg-accent/26"
            style={{ left: `${tracking.x}px`, height: `${CHART_HEIGHT}px` }}
          />
          <div
            className="pointer-events-none absolute z-[3] h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/72"
            style={{ left: `${tracking.x}px`, top: `${tracking.barTop}px` }}
          />
          {tracking.activeProjects.length > 0 ? (
            <div
              className="pointer-events-none absolute z-[15] -translate-x-1/2 -translate-y-full rounded-[12px] border border-border bg-white px-4 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.08)]"
              style={{
                left: `${tracking.tipLeft}px`,
                top: `${tracking.tipTop}px`,
                width: `${tracking.tipWidth}px`,
              }}
            >
              <p className="mb-1.5 text-[12px] text-text-secondary">{tracking.dateFull}</p>
              <p className="mb-2 text-[14px] font-medium text-text-primary">
                Active projects: {tracking.activeProjects.length}
              </p>
              <div className="space-y-1.5">
                {tracking.activeProjects.slice(0, 5).map((project) => (
                  <div
                    key={`tracking-${project.id}`}
                    className="flex items-center gap-2 text-[13px] text-text-primary"
                  >
                    <Avatar
                      name={project.name}
                      src={project.projectImageUrl ?? project.clientAvatarUrl}
                      size="sm"
                      variant="project"
                      className="h-4 w-4 text-[9px]"
                    />
                    <span className="truncate">{project.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      <AnimatePresence>
        {profileHoverDetails ? (
          <motion.aside
            initial={{ opacity: 0, y: 4 }}
            animate={{
              opacity: 1,
              y: 0,
              transition: { duration: 0.15, delay: 0.15 },
            }}
            exit={{ opacity: 0, y: 2, transition: { duration: 0.15 } }}
            className="pointer-events-none absolute z-30 -translate-y-full rounded-[12px] border border-border bg-white px-4 py-3 text-text-primary shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
            style={{
              left: `${profileHoverDetails.left}px`,
              top: `${profileHoverDetails.top}px`,
              width: `${profileHoverDetails.width}px`,
            }}
          >
            <span
              aria-hidden
              className="absolute -bottom-[7px] h-3.5 w-3.5 -translate-x-1/2 rotate-45 border-b border-r border-border bg-white"
              style={{ left: `${profileHoverDetails.arrowLeft}px` }}
            />
            <p className="text-[12px] text-text-secondary">{profileHoverDetails.tooltipDateRange}</p>
            <p className="mt-1 truncate text-[15px] font-medium text-text-primary">
              {profileHoverDetails.projectName}
            </p>
            <p className="mt-1 truncate text-[13px] text-text-secondary">
              {profileHoverDetails.clientName}
            </p>
            <p className="mt-1 truncate text-[13px] text-text-secondary">
              {profileHoverDetails.phaseName}
            </p>

            <div className="mt-2.5 border-t border-border-subtle pt-2">
              {profileHoverDetails.tasks.length > 0 ? (
                profileHoverDetails.tasks.map((task) => (
                  <p
                    key={task.id}
                    className={`truncate py-0.5 text-[12px] ${
                      task.isCompleted ? "text-text-secondary" : "text-text-primary"
                    }`}
                  >
                    <span className="mr-1">{task.isCompleted ? "\u2611" : "\u2610"}</span>
                    {task.title}
                    {task.isRecentlyAdded ? <span className="ml-1 text-accent/70">\u25CF</span> : null}
                  </p>
                ))
              ) : (
                <p className="text-[12px] text-text-secondary">No tasks in this phase.</p>
              )}

              {profileHoverDetails.overflowCount > 0 ? (
                <p className="mt-0.5 text-[12px] text-text-secondary">
                  +{profileHoverDetails.overflowCount} more
                </p>
              ) : null}
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </>
  );
}
