import { useEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { getInitials } from "@/lib/utils";

export type DockProject = {
  id: string;
  name: string;
  clientName: string;
  clientAvatarUrl?: string;
  projectImageUrl?: string;
};

const DOCK_BASE_SIZE = 44;
const DOCK_MAX_SIZE = 72;
const DOCK_SIGMA = 55;

/* ─── Navigation icons (from prototype v2Icons) ─── */

const NAV_ITEMS = [
  {
    name: "Dashboard",
    to: "/dashboard" as const,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    name: "Projects",
    to: "/dashboard" as const,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    name: "Tasks",
    to: "/dashboard" as const,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    name: "Integrations",
    to: "/settings" as const,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v4" />
        <path d="M12 18v4" />
        <path d="M4.93 4.93l2.83 2.83" />
        <path d="M16.24 16.24l2.83 2.83" />
        <path d="M2 12h4" />
        <path d="M18 12h4" />
        <path d="M4.93 19.07l2.83-2.83" />
        <path d="M16.24 7.76l2.83-2.83" />
      </svg>
    ),
  },
  {
    name: "Settings",
    to: "/settings" as const,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
  {
    name: "Client Portal",
    to: "/settings" as const,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

type ProjectDockProps = {
  projects: DockProject[];
  interactive?: boolean;
};

export function ProjectDock({ projects, interactive = true }: ProjectDockProps) {
  const totalItems = projects.length + NAV_ITEMS.length;
  const dockItemRefs = useRef<Array<HTMLElement | null>>([]);
  const [dockIsHovering, setDockIsHovering] = useState(false);
  const [navExpanded, setNavExpanded] = useState(false);
  const [dockSizes, setDockSizes] = useState<number[]>([]);
  const [activeDockIndex, setActiveDockIndex] = useState<number | null>(null);

  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  // The effective item count for magnification depends on whether nav is expanded
  const effectiveItemCount = navExpanded ? totalItems : projects.length;

  useEffect(() => {
    dockItemRefs.current = dockItemRefs.current.slice(0, totalItems);
    setDockSizes(Array.from({ length: totalItems }, () => DOCK_BASE_SIZE));
    setActiveDockIndex(null);
  }, [totalItems]);

  const handleDockMouseMove = (clientX: number) => {
    if (effectiveItemCount === 0) return;

    let closestIndex = 0;
    let minDistance = Number.POSITIVE_INFINITY;

    const nextSizes: number[] = [];
    for (let index = 0; index < effectiveItemCount; index++) {
      const item = dockItemRefs.current[index];
      if (!item) {
        nextSizes.push(DOCK_BASE_SIZE);
        continue;
      }

      const rect = item.getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      const distance = Math.abs(clientX - center);

      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }

      const scale = Math.exp(-(distance * distance) / (2 * DOCK_SIGMA * DOCK_SIGMA));
      nextSizes.push(Math.round(DOCK_BASE_SIZE + (DOCK_MAX_SIZE - DOCK_BASE_SIZE) * scale));
    }

    setDockSizes(nextSizes);
    setActiveDockIndex(closestIndex);
  };

  return (
    <div
      className="pointer-events-none fixed left-1/2 z-40 -translate-x-1/2"
      style={{ bottom: "max(20px, calc(env(safe-area-inset-bottom) + 8px))" }}
    >
      <div
        className="pointer-events-auto flex items-end gap-2 rounded-[18px] border border-white/10 bg-[#151520] px-4 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.24)]"
        onMouseEnter={() => {
          setDockIsHovering(true);
          setNavExpanded(true);
        }}
        onMouseMove={(event) => handleDockMouseMove(event.clientX)}
        onMouseLeave={() => {
          setDockIsHovering(false);
          setNavExpanded(false);
          setDockSizes(Array.from({ length: totalItems }, () => DOCK_BASE_SIZE));
          setActiveDockIndex(null);
        }}
      >
        {/* Project avatar items */}
        {projects.map((project, index) => {
          const size = dockSizes[index] ?? DOCK_BASE_SIZE;
          const isActive = activeDockIndex === index;

          const content = (
            <>
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

              {project.projectImageUrl ?? project.clientAvatarUrl ? (
                <img
                  src={project.projectImageUrl ?? project.clientAvatarUrl}
                  alt={project.name}
                  className={`h-full w-full rounded-full object-cover shadow-[0_2px_8px_rgba(0,0,0,0.2)] ${
                    isActive ? "shadow-[0_4px_14px_rgba(135,130,245,0.34)]" : ""
                  }`}
                />
              ) : (
                <div
                  className={`flex h-full w-full items-center justify-center rounded-full bg-[rgba(135,130,245,0.16)] text-[13px] font-semibold text-accent ring-1 ring-[rgba(135,130,245,0.22)] ${
                    isActive ? "shadow-[0_4px_14px_rgba(135,130,245,0.34)]" : ""
                  }`}
                >
                  {getInitials(project.name)}
                </div>
              )}
            </>
          );

          const sharedProps = {
            ref: (element: HTMLElement | null) => {
              dockItemRefs.current[index] = element;
            },
            className:
              "relative block shrink-0 cursor-pointer outline-none focus:outline-none focus-visible:outline-none",
            style: {
              width: `${size}px`,
              height: `${size}px`,
              transition: dockIsHovering ? "none" : "width 200ms ease, height 200ms ease",
            },
          };

          return interactive ? (
            <Link
              key={project.id}
              to="/project/$id"
              params={{ id: project.id }}
              {...sharedProps}
            >
              {content}
            </Link>
          ) : (
            <button
              key={project.id}
              type="button"
              aria-label={project.name}
              {...sharedProps}
            >
              {content}
            </button>
          );
        })}

        {/* Expandable nav section: divider + navigation icons */}
        {projects.length > 0 && (
          <div
            className="flex items-end"
            style={{
              maxWidth: navExpanded ? "400px" : "0px",
              opacity: navExpanded ? 1 : 0,
              clipPath: "inset(-100px 0px -100px 0px)",
              transition: "max-width 250ms ease, opacity 200ms ease",
            }}
          >
            {/* Divider between projects and nav icons */}
            <div className="mx-1 h-7 w-px shrink-0 self-center bg-white/12" />

            {/* Navigation icon items */}
            <div className="flex items-end gap-2">
              {NAV_ITEMS.map((navItem, navIndex) => {
                const index = projects.length + navIndex;
                const size = dockSizes[index] ?? DOCK_BASE_SIZE;
                const isHovered = activeDockIndex === index;
                const isNavActive = currentPath === navItem.to || currentPath.startsWith(navItem.to + "/");

                return (
                  <Link
                    key={navItem.name}
                    to={navItem.to}
                    ref={(element: HTMLElement | null) => {
                      dockItemRefs.current[index] = element;
                    }}
                    className={`relative flex shrink-0 cursor-pointer items-center justify-center rounded-[12px] outline-none transition-colors focus:outline-none focus-visible:outline-none ${
                      isNavActive
                        ? "bg-white/12"
                        : isHovered
                          ? "bg-white/8"
                          : "bg-transparent"
                    }`}
                    style={{
                      width: `${size}px`,
                      height: `${size}px`,
                      transition: dockIsHovering ? "none" : "width 200ms ease, height 200ms ease",
                    }}
                  >
                    {/* Tooltip */}
                    <div
                      className={`pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-[8px] border border-white/6 bg-[#333546] px-2.5 py-1.5 text-[12px] font-medium text-white opacity-0 shadow-[0_4px_16px_rgba(0,0,0,0.3)] transition-opacity duration-150 ${
                        isHovered ? "opacity-100" : ""
                      }`}
                    >
                      {navItem.name}
                    </div>

                    {/* Icon */}
                    <div
                      className={`h-5 w-5 transition-colors ${
                        isNavActive
                          ? "text-white"
                          : isHovered
                            ? "text-white/80"
                            : "text-white/50"
                      }`}
                    >
                      {navItem.icon}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
