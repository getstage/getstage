import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { getInitials } from "@/lib/utils";

export type DockProject = {
  id: string;
  name: string;
  clientName: string;
  clientAvatarUrl?: string;
  projectImageUrl?: string;
};

/* ─── Navigation items using SVG icons from /logos/dashboard/ ─── */

const NAV_ITEMS = [
  { name: "Dashboard", to: "/dashboard" as const, icon: "/logos/dashboard/dashboard.svg" },
  { name: "Projects", to: "/dashboard" as const, icon: "/logos/dashboard/projects.svg" },
  { name: "Tasks", to: "/dashboard" as const, icon: "/logos/dashboard/task.svg" },
  { name: "Integrations", to: "/settings" as const, icon: "/logos/dashboard/integrations.svg" },
  { name: "Settings", to: "/settings" as const, icon: "/logos/dashboard/settings.svg" },
  { name: "Client Portal", to: "/settings" as const, icon: "/logos/dashboard/clientportal.svg" },
];

type ProjectDockProps = {
  projects: DockProject[];
  interactive?: boolean;
};

export function ProjectDock({ projects, interactive = true }: ProjectDockProps) {
  const [hoveredNavIndex, setHoveredNavIndex] = useState<number | null>(null);
  const [navExpanded, setNavExpanded] = useState(false);

  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  return (
    <div
      className="pointer-events-none fixed left-1/2 z-40 -translate-x-1/2"
      style={{ bottom: "18px" }}
    >
      <div
        className="pointer-events-auto flex items-center gap-0 rounded-[12px] border border-[#525252] bg-gradient-to-b from-[#262626] to-[#0a0a0a] p-[4px] shadow-[0px_0.45px_1px_0px_rgba(10,10,10,0.25),0px_1px_1px_0px_rgba(0,0,0,0.25)]"
        onMouseEnter={() => setNavExpanded(true)}
        onMouseLeave={() => {
          setNavExpanded(false);
          setHoveredNavIndex(null);
        }}
      >
        {/* Project avatars — overlapping layout */}
        {projects.length > 0 && (
          <div className="flex items-center pr-[25px]">
            {projects.map((project, index) => {
              const content = project.projectImageUrl ?? project.clientAvatarUrl ? (
                <img
                  src={project.projectImageUrl ?? project.clientAvatarUrl}
                  alt={project.name}
                  className="h-[28px] w-[28px] rounded-[8px] object-cover"
                />
              ) : (
                <div className="flex h-[28px] w-[28px] items-center justify-center rounded-[8px] bg-[rgba(135,130,245,0.16)] text-[10px] font-semibold text-[#9e99f8]">
                  {getInitials(project.name)}
                </div>
              );

              const wrapper = interactive ? (
                <Link
                  key={project.id}
                  to="/project/$id"
                  params={{ id: project.id }}
                  className="mr-[-25px] block shrink-0 rounded-[8px] p-[4px] outline-none transition-opacity hover:opacity-80"
                  style={{ zIndex: projects.length - index }}
                >
                  {content}
                </Link>
              ) : (
                <div
                  key={project.id}
                  className="mr-[-25px] shrink-0 rounded-[8px] p-[4px]"
                  style={{ zIndex: projects.length - index }}
                >
                  {content}
                </div>
              );

              return wrapper;
            })}
          </div>
        )}

        {/* Expandable nav section */}
        <div
          className="flex items-center"
          style={{
            maxWidth: navExpanded ? "400px" : "0px",
            opacity: navExpanded ? 1 : 0,
            clipPath: "inset(-100px -100px -100px -100px)",
            transition: "max-width 250ms ease, opacity 200ms ease",
          }}
        >
          {/* Divider */}
          {projects.length > 0 && (
            <div className="mx-1 h-7 w-px shrink-0 bg-[#525252]" />
          )}

          {/* Navigation icons */}
          <div className="flex items-center gap-[2px]">
            {NAV_ITEMS.map((navItem, navIndex) => {
              const isHovered = hoveredNavIndex === navIndex;
              const isNavActive =
                currentPath === navItem.to || currentPath.startsWith(navItem.to + "/");
              const someHovered = hoveredNavIndex !== null;
              const dimmed = someHovered && !isHovered;

              return (
                <div key={navItem.name} className="relative">
                  <Link
                    to={navItem.to}
                    className={`relative flex h-[37px] w-[37px] shrink-0 cursor-pointer items-center justify-center rounded-[8px] outline-none transition-all duration-150 focus:outline-none ${
                      isHovered || isNavActive
                        ? "bg-[#404040]"
                        : "bg-transparent"
                    } ${dimmed ? "opacity-40" : "opacity-100"}`}
                    onMouseEnter={() => setHoveredNavIndex(navIndex)}
                    onMouseLeave={() => setHoveredNavIndex(null)}
                  >
                    <img
                      src={navItem.icon}
                      alt={navItem.name}
                      className="h-5 w-5 brightness-0 invert"
                    />
                  </Link>

                  {/* Tooltip */}
                  {isHovered && (
                    <div
                      className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-[6px] border border-[#525252] bg-gradient-to-b from-[#262626] to-[#0a0a0a] px-2.5 py-1.5 text-[13px] font-medium text-[#fafafa] shadow-[0px_0.45px_1px_0px_rgba(10,10,10,0.25)]"
                    >
                      {navItem.name}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
