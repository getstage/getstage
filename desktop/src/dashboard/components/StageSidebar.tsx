import { useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import type { DashboardProject } from "../models/dashboard";
import stageLogo from "@/assets/logos/stage-logo-light.png";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { name: "Dashboard", icon: "/logos/dashboard/dashboard.svg", routeKey: "dashboard" },
  { name: "Projects", icon: "/logos/dashboard/projects.svg", routeKey: "project" },
  { name: "Tasks", icon: "/logos/dashboard/task.svg", routeKey: "tasks" },
  { name: "Integrations", icon: "/logos/dashboard/integrations.svg", routeKey: "integrations" },
  { name: "Settings", icon: "/logos/dashboard/settings.svg", routeKey: "settings" },
  { name: "Client Portal", icon: "/logos/dashboard/clientportal.svg", routeKey: "portal" },
];

export function StageSidebar({ projects }: { projects: DashboardProject[] }) {
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const activeProjectId = pathname.startsWith("/project/")
    ? decodeURIComponent(pathname.split("/")[2] ?? "")
    : "";

  function getActiveItem(routeKey: string) {
    if (routeKey === "dashboard") return pathname === "/";
    if (routeKey === "integrations") return pathname === "/integrations";
    if (routeKey === "settings") return pathname.startsWith("/settings") && pathname !== "/settings/portal";
    if (routeKey === "portal") return pathname === "/settings/portal";
    if (routeKey === "project") return pathname === "/projects" || pathname.startsWith("/project/");
    if (routeKey === "tasks") return false;
    return false;
  }

  function navigateTo(routeKey: string) {
    if (routeKey === "dashboard") void navigate({ to: "/" });
    if (routeKey === "integrations") void navigate({ to: "/integrations" });
    if (routeKey === "settings") void navigate({ to: "/settings" });
    if (routeKey === "portal") void navigate({ to: "/settings/portal" });
    if (routeKey === "project") {
      void navigate({ to: "/projects" });
    }
  }

  const labelClassName = cn(
    "min-w-0 overflow-hidden truncate whitespace-nowrap text-[13px] font-medium transition-[max-width,opacity] duration-200 ease-out",
    collapsed ? "max-w-0 opacity-0" : "max-w-[150px] opacity-100",
  );

  return (
    <nav
      className={cn(
        "flex h-full shrink-0 flex-col justify-between overflow-hidden rounded-[8px] bg-[#f5f5f5] pb-[16px] pt-[58px] transition-[width,padding] duration-200 ease-out",
        collapsed ? "w-[48px] items-center px-[8px]" : "w-[240px] px-[12px]",
      )}
    >
      {/* Top section */}
      <div className={cn("flex w-full flex-col gap-[28px]", collapsed && "items-center")}>
        {/* Logo + sidebar toggle */}
        <div className={cn("flex w-full items-center", collapsed ? "justify-center" : "justify-between")}>
          {collapsed ? (
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="group relative flex h-[32px] w-[32px] cursor-pointer items-center justify-center rounded-[6px] outline-none transition-colors hover:bg-[#ebebeb]"
              aria-label="Expand sidebar"
            >
              <img
                src="/apple-touch-icon.png"
                alt=""
                aria-hidden="true"
                className="h-[22px] w-[22px] transition-opacity duration-150 group-hover:opacity-0"
              />
              <img
                src="/logos/dashboard/close.svg"
                alt=""
                aria-hidden="true"
                className="absolute h-[20px] w-[20px] rotate-180 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
              />
            </button>
          ) : (
            <div className="flex items-center gap-[2px]">
              <img src={stageLogo} alt="Stage" className="h-[22px] w-auto" />
            </div>
          )}
          {!collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="cursor-pointer rounded-[4px] outline-none transition-colors hover:bg-[#e5e5e5]"
            >
              <img
                src="/logos/dashboard/close.svg"
                alt="Collapse sidebar"
                className="h-[20px] w-[20px]"
              />
            </button>
          )}
        </div>

        {/* Search + nav */}
        <div className={cn("flex w-full flex-col gap-[28px]", collapsed && "items-center")}>
          <div className={cn("flex w-full flex-col gap-[16px]", collapsed && "items-center")}>
            {/* Search box */}
            <div
              onClick={() => collapsed && setCollapsed(false)}
              className={cn(
                "flex h-[32px] items-center overflow-hidden rounded-[6px] bg-white text-[#525252] shadow-[0px_0.45px_0.5px_0px_rgba(10,10,10,0.15)] transition-[width,padding,gap] duration-200 ease-out",
                collapsed
                  ? "w-[32px] justify-center gap-0 px-0"
                  : "w-full justify-start gap-[8px] px-[12px]",
              )}
            >
              <img
                src="/logos/dashboard/search.svg"
                alt=""
                aria-hidden="true"
                className="h-[15px] w-[15px] shrink-0"
              />
              <input
                type="text"
                role="searchbox"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                aria-label="Search"
                tabIndex={collapsed ? -1 : 0}
                className={cn(
                  labelClassName,
                  "bg-transparent p-0 text-[#525252] outline-none placeholder:text-[#525252]",
                )}
                placeholder="Search here..."
              />
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setSearchQuery("");
                }}
                aria-label="Clear search"
                className={cn(
                  "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] text-[#a3a3a3] transition-[opacity,width] duration-150 hover:text-[#525252]",
                  collapsed || searchQuery.length === 0 ? "w-0 opacity-0" : "opacity-100",
                )}
              >
                <span aria-hidden="true" className="text-[17px] leading-none">
                  ×
                </span>
              </button>
            </div>

            {/* Navigation items */}
            <div className={cn("flex w-full flex-col gap-[8px]", collapsed && "items-center")}>
              {NAV_ITEMS.map((item) => {
                const isActive = getActiveItem(item.routeKey);

                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => navigateTo(item.routeKey)}
                    aria-label={item.name}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex h-[32px] items-center overflow-hidden outline-none transition-[width,padding,gap,background-color,color,box-shadow,border-color] duration-200 ease-out",
                      collapsed
                        ? "w-[32px] justify-center gap-0 rounded-[6px] px-0"
                        : "w-full justify-start gap-[8px] rounded-[6px] px-[12px]",
                      isActive
                        ? "border border-[#525252] bg-gradient-to-b from-[#404040] to-[#0a0a0a] text-[#fafafa] shadow-[0px_0.45px_0.5px_0px_rgba(10,10,10,0.25)]"
                        : "bg-[#f5f5f5] text-[#525252] hover:bg-[#ebebeb]",
                    )}
                  >
                    {item.routeKey === "dashboard" ? (
                      <span
                        aria-hidden="true"
                        className="h-[15px] w-[15px] shrink-0 bg-current"
                        style={{
                          WebkitMask: `url("${item.icon}") center / contain no-repeat`,
                          mask: `url("${item.icon}") center / contain no-repeat`,
                        }}
                      />
                    ) : (
                      <img
                        src={item.icon}
                        alt=""
                        aria-hidden="true"
                        className={cn(
                          "h-[15px] w-[15px] shrink-0",
                          isActive
                            ? "brightness-0 invert"
                            : "[filter:brightness(0)_saturate(100%)_invert(32%)_sepia(0%)_saturate(0%)_hue-rotate(180deg)_brightness(93%)_contrast(90%)]",
                        )}
                      />
                    )}
                    <span aria-hidden={collapsed} className={labelClassName}>
                      {item.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Projects section */}
          <div className={cn("flex w-full flex-col gap-[12px]", collapsed && "items-center")}>
            <div
              aria-hidden={collapsed}
              className={cn(
                "flex items-center justify-between px-[12px] transition-[max-height,opacity,margin] duration-200 ease-out",
                collapsed ? "max-h-0 overflow-hidden opacity-0" : "max-h-[28px] overflow-visible opacity-100",
              )}
            >
              <div className="flex items-center gap-[8px]">
                <img
                  src="/logos/dashboard/folder.svg"
                  alt=""
                  aria-hidden="true"
                  className="h-[15px] w-[15px]"
                />
                <span className="whitespace-nowrap text-[13px] font-medium text-[#525252]">
                  Projects
                </span>
              </div>
              <button
                type="button"
                className="flex h-[20px] w-[20px] items-center justify-center rounded-[4px] bg-white shadow-[0px_0.45px_0.5px_0px_rgba(10,10,10,0.25)] outline-none transition-colors hover:bg-[#fafafa]"
              >
                <img
                  src="/logos/dashboard/plus.svg"
                  alt="New project"
                  className="h-[12px] w-[12px]"
                />
              </button>
            </div>

            {/* Project list */}
            <div className={cn("flex w-full flex-col gap-[8px]", collapsed && "items-center")}>
              {projects.map((project) => {
                const isActive = activeProjectId === project.id;

                return (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => void navigate({ to: "/project/$projectId", params: { projectId: project.id } })}
                    aria-label={project.name}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex h-[36px] items-center overflow-hidden outline-none transition-[width,padding,gap,background-color,box-shadow] duration-200 ease-out",
                      collapsed
                        ? "w-[32px] justify-center gap-0 rounded-[6px] px-0"
                        : "w-full justify-start gap-[8px] rounded-[6px] px-[12px]",
                      isActive ? "bg-white shadow-[0px_0.45px_0.5px_0px_rgba(10,10,10,0.15)]" : "bg-[#f5f5f5] hover:bg-[#ebebeb]",
                    )}
                  >
                    {project.projectImageUrl ? (
                      <img
                        src={project.projectImageUrl}
                        alt={collapsed ? project.name : ""}
                        className="h-[24px] w-[24px] shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full text-[10px] font-medium text-white"
                        style={{ background: project.accentColor }}
                      >
                        {project.logoLabel}
                      </div>
                    )}
                    <span
                      aria-hidden={collapsed}
                      className={cn(labelClassName, isActive ? "text-[#0a0a0a]" : "text-[#525252]")}
                    >
                      {project.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom section */}
      <div className={cn("flex w-full flex-col gap-[8px]", collapsed && "items-center")}>
        {/* Help & Feedback */}
        <button
          type="button"
          aria-label="Help & Feedback"
          className={cn(
            "flex h-[32px] items-center overflow-hidden bg-[#f5f5f5] text-[#525252] transition-[width,padding,gap,background-color] duration-200 ease-out hover:bg-[#ebebeb]",
            collapsed
              ? "w-[32px] justify-center gap-0 rounded-[6px] px-0"
              : "w-full justify-start gap-[8px] rounded-[6px] px-[12px]",
          )}
        >
          <img
            src="/logos/dashboard/question.svg"
            alt={collapsed ? "Help & Feedback" : ""}
            aria-hidden={!collapsed}
            className="h-[15px] w-[15px]"
          />
          <span aria-hidden={collapsed} className={labelClassName}>
            Help & Feedback
          </span>
        </button>

        {/* User profile */}
        <button
          type="button"
          aria-label="Pratik Singh"
          className={cn(
            "flex h-[36px] cursor-pointer items-center overflow-hidden bg-[#f5f5f5] outline-none transition-[width,padding,background-color] duration-200 ease-out hover:bg-[#ebebeb]",
            collapsed
              ? "w-[32px] justify-center rounded-[6px] px-0"
              : "w-full justify-between rounded-[6px] px-[12px]",
          )}
        >
          <div className={cn("flex items-center", collapsed ? "gap-0" : "gap-[8px]")}>
            <div className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-[#e5e5e5] text-[10px] font-medium text-[#525252]">
              PS
            </div>
            <span aria-hidden={collapsed} className={cn(labelClassName, "text-[#0a0a0a]")}>
              Pratik Singh
            </span>
          </div>
          <img
            src="/logos/dashboard/dots.svg"
            alt=""
            aria-hidden="true"
            className={cn(
              "h-[15px] shrink-0 transition-[width,opacity] duration-150",
              collapsed ? "w-0 opacity-0" : "w-[15px] opacity-100",
            )}
          />
        </button>
      </div>
    </nav>
  );
}
