import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { Project } from "@/types";

const DOCK_BASE_SIZE = 44;
const DOCK_MAX_SIZE = 72;
const DOCK_SIGMA = 55;

type ProjectDockProps = {
  projects: Project[];
};

export function ProjectDock({ projects }: ProjectDockProps) {
  const dockItemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const [dockIsHovering, setDockIsHovering] = useState(false);
  const [dockSizes, setDockSizes] = useState<number[]>([]);
  const [activeDockIndex, setActiveDockIndex] = useState<number | null>(null);

  useEffect(() => {
    dockItemRefs.current = dockItemRefs.current.slice(0, projects.length);
    setDockSizes(Array.from({ length: projects.length }, () => DOCK_BASE_SIZE));
    setActiveDockIndex(null);
  }, [projects.length]);

  const handleDockMouseMove = (clientX: number) => {
    if (projects.length === 0) return;

    let closestIndex = 0;
    let minDistance = Number.POSITIVE_INFINITY;

    const nextSizes = projects.map((_, index) => {
      const item = dockItemRefs.current[index];
      if (!item) return DOCK_BASE_SIZE;

      const rect = item.getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      const distance = Math.abs(clientX - center);

      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }

      const scale = Math.exp(-(distance * distance) / (2 * DOCK_SIGMA * DOCK_SIGMA));
      return Math.round(DOCK_BASE_SIZE + (DOCK_MAX_SIZE - DOCK_BASE_SIZE) * scale);
    });

    setDockSizes(nextSizes);
    setActiveDockIndex(closestIndex);
  };

  if (projects.length === 0) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed left-1/2 z-40 -translate-x-1/2"
      style={{ bottom: "max(20px, calc(env(safe-area-inset-bottom) + 8px))" }}
    >
      <div
        className="pointer-events-auto flex items-end gap-2 rounded-[18px] border border-white/10 bg-[#151520] px-4 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.24)]"
        onMouseEnter={() => setDockIsHovering(true)}
        onMouseMove={(event) => handleDockMouseMove(event.clientX)}
        onMouseLeave={() => {
          setDockIsHovering(false);
          setDockSizes(Array.from({ length: projects.length }, () => DOCK_BASE_SIZE));
          setActiveDockIndex(null);
        }}
      >
        {projects.map((project, index) => {
          const size = dockSizes[index] ?? DOCK_BASE_SIZE;
          const isActive = activeDockIndex === index;

          return (
            <Link
              key={project.id}
              to="/project/$id"
              params={{ id: project.id }}
              ref={(element: HTMLAnchorElement | null) => {
                dockItemRefs.current[index] = element;
              }}
              className="relative block shrink-0 cursor-pointer outline-none focus:outline-none focus-visible:outline-none"
              style={{
                width: `${size}px`,
                height: `${size}px`,
                transition: dockIsHovering ? "none" : "width 200ms ease, height 200ms ease",
              }}
            >
              <div
                className={`pointer-events-none absolute bottom-full left-1/2 mb-2.5 -translate-x-1/2 whitespace-nowrap rounded-[8px] border border-white/10 bg-[#333546] px-3 py-2 opacity-0 shadow-[0_4px_16px_rgba(0,0,0,0.3)] transition-opacity duration-150 ${
                  isActive ? "opacity-100" : ""
                }`}
              >
                <div className="text-[13px] font-medium leading-[1.3] text-white">
                  {project.name}
                </div>
                <div className="text-[12px] leading-[1.3] text-white/50">
                  {project.clientName}
                </div>
              </div>

              {project.clientAvatarUrl ? (
                <img
                  src={project.clientAvatarUrl}
                  alt={project.name}
                  className={`h-full w-full rounded-full object-cover shadow-[0_2px_8px_rgba(0,0,0,0.2)] ${
                    isActive ? "shadow-[0_4px_14px_rgba(135,130,245,0.34)]" : ""
                  }`}
                />
              ) : (
                <div
                  className={`flex h-full w-full items-center justify-center rounded-full bg-[#2A2D44] text-[13px] font-medium text-white ${
                    isActive ? "shadow-[0_4px_14px_rgba(135,130,245,0.34)]" : ""
                  }`}
                >
                  {project.clientName.slice(0, 2).toUpperCase()}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
