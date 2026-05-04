import { useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import type { DashboardProject } from "../models/dashboard";
import stageLogo from "@/assets/logos/stage-logo-light.png";

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
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  function getActiveItem(routeKey: string) {
    if (routeKey === "dashboard") return pathname === "/";
    if (routeKey === "integrations") return pathname === "/integrations";
    if (routeKey === "settings") return pathname.startsWith("/settings") && pathname !== "/settings/portal";
    if (routeKey === "portal") return pathname === "/settings/portal";
    if (routeKey === "project" || routeKey === "tasks") return pathname.startsWith("/project/");
    return false;
  }

  function navigateTo(routeKey: string) {
    if (routeKey === "dashboard") void navigate({ to: "/" });
    if (routeKey === "integrations") void navigate({ to: "/integrations" });
    if (routeKey === "settings") void navigate({ to: "/settings" });
    if (routeKey === "portal") void navigate({ to: "/settings/portal" });
    if (routeKey === "project" || routeKey === "tasks") {
      void navigate({ to: "/project/$projectId", params: { projectId: "test" } });
    }
  }

  return (
    <nav
      className={`flex h-full shrink-0 flex-col justify-between overflow-hidden rounded-[6px] bg-[#f5f5f5] py-[16px] transition-all duration-200 ${
        collapsed ? "w-[60px] items-center px-[8px]" : "w-[240px] px-[12px]"
      }`}
    >
      {/* Top section */}
      <div className={`flex flex-col gap-[28px] ${collapsed ? "items-center w-full" : ""}`}>
        {/* Logo + sidebar toggle */}
        <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
          {collapsed ? (
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="cursor-pointer outline-none"
            >
              <img
                src="/apple-touch-icon.png"
                alt="Stage"
                className="h-[24px] w-[24px]"
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
        <div className={`flex flex-col gap-[28px] ${collapsed ? "w-full items-center" : ""}`}>
          <div className={`flex flex-col gap-[16px] ${collapsed ? "w-full items-center" : ""}`}>
            {/* Search box */}
            {collapsed ? (
              <button
                type="button"
                onClick={() => setCollapsed(false)}
                className="flex h-[32px] w-[32px] cursor-pointer items-center justify-center rounded-[6px] bg-white shadow-[0px_0.45px_1px_0px_rgba(10,10,10,0.15)]"
              >
                <img
                  src="/logos/dashboard/search.svg"
                  alt="Search"
                  className="h-[15px] w-[15px]"
                />
              </button>
            ) : (
              <div className="flex w-full items-center gap-[8px] rounded-[6px] bg-white px-[12px] py-[6px] shadow-[0px_0.45px_1px_0px_rgba(10,10,10,0.15)]">
                <img
                  src="/logos/dashboard/search.svg"
                  alt=""
                  aria-hidden="true"
                  className="h-[15px] w-[15px]"
                />
                <span className="text-[13px] font-medium text-[#525252]">
                  Search here...
                </span>
              </div>
            )}

            {/* Navigation items */}
            <div className={`flex flex-col gap-[8px] ${collapsed ? "items-center w-full" : ""}`}>
              {NAV_ITEMS.map((item) => {
                const isActive = getActiveItem(item.routeKey);

                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => navigateTo(item.routeKey)}
                    className={`flex items-center outline-none transition-colors ${
                      collapsed
                        ? `h-[32px] w-[32px] justify-center rounded-[8px] ${
                            isActive
                              ? "bg-[#e5e5e5]"
                              : "bg-transparent hover:bg-[#ebebeb]"
                          }`
                        : `w-full gap-[8px] rounded-[6px] px-[12px] py-[6px] ${
                            isActive
                              ? "bg-[#e5e5e5] text-[#0a0a0a]"
                              : "bg-transparent text-[#525252] hover:bg-[#ebebeb]"
                          }`
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`h-[15px] w-[15px] shrink-0 ${isActive ? "opacity-100" : "opacity-70"}`}
                      style={{
                        backgroundColor: "currentColor",
                        WebkitMask: `url("${item.icon}") center / contain no-repeat`,
                        mask: `url("${item.icon}") center / contain no-repeat`,
                      }}
                    />
                    {collapsed ? <span className="sr-only">{item.name}</span> : null}
                    {!collapsed && (
                      <span className="text-[13px] font-medium">
                        {item.name}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Projects section */}
          <div className={`flex flex-col gap-[12px] ${collapsed ? "w-full items-center" : ""}`}>
            {!collapsed && (
              <div className="flex items-center justify-between px-[12px]">
                <div className="flex items-center gap-[8px]">
                  <img
                    src="/logos/dashboard/folder.svg"
                    alt=""
                    aria-hidden="true"
                    className="h-[15px] w-[15px]"
                  />
                  <span className="text-[13px] font-medium text-[#525252]">
                    Projects
                  </span>
                </div>
                <button
                  type="button"
                  className="flex items-center rounded-[4px] bg-white p-[4px] shadow-[0px_0.45px_1px_0px_rgba(10,10,10,0.25)] outline-none transition-colors hover:bg-[#fafafa]"
                >
                  <img
                    src="/logos/dashboard/plus.svg"
                    alt="New project"
                    className="h-[12px] w-[12px]"
                  />
                </button>
              </div>
            )}

            {/* Project list */}
            <div className={`flex flex-col gap-[8px] ${collapsed ? "items-center w-full" : ""}`}>
              {projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => void navigate({ to: "/project/$projectId", params: { projectId: project.id } })}
                  className={`flex items-center outline-none transition-colors hover:bg-[#ebebeb] ${
                    collapsed
                      ? "h-[32px] w-[32px] justify-center rounded-[8px]"
                      : "w-full gap-[8px] rounded-[6px] px-[12px] py-[6px]"
                  }`}
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
                  {!collapsed && (
                    <span className="truncate text-[13px] font-medium text-[#525252]">
                      {project.name}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom section */}
      <div className={`flex flex-col gap-[8px] ${collapsed ? "items-center w-full" : ""}`}>
        {/* Help & Feedback */}
        <button
          type="button"
          className={`flex items-center transition-colors hover:bg-[#ebebeb] ${
            collapsed
              ? "h-[32px] w-[32px] justify-center rounded-[8px]"
              : "gap-[8px] rounded-[6px] px-[12px] py-[6px] text-[#525252]"
          }`}
        >
          <img
            src="/logos/dashboard/question.svg"
            alt={collapsed ? "Help & Feedback" : ""}
            aria-hidden={!collapsed}
            className="h-[15px] w-[15px]"
          />
          {!collapsed && (
            <span className="text-[13px] font-medium">
              Help & Feedback
            </span>
          )}
        </button>

        {/* User profile */}
        <button
          type="button"
          className={`flex cursor-pointer items-center outline-none transition-colors hover:bg-[#ebebeb] ${
            collapsed
              ? "h-[32px] w-[32px] justify-center rounded-[8px]"
              : "w-full justify-between rounded-[6px] px-[12px] py-[6px]"
          }`}
        >
          <div className="flex items-center gap-[8px]">
            <div className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-[#e5e5e5] text-[10px] font-medium text-[#525252]">
              PS
            </div>
            {!collapsed && (
              <span className="text-[13px] font-medium text-[#0a0a0a]">
                Pratik Singh
              </span>
            )}
          </div>
          {!collapsed && (
            <img
              src="/logos/dashboard/dots.svg"
              alt=""
              aria-hidden="true"
              className="h-[15px] w-[15px]"
            />
          )}
        </button>
      </div>
    </nav>
  );
}
