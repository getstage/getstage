import { useEffect, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import type { DashboardProject } from "../models/dashboard";
import stageLogo from "@/assets/logos/stage-logo-light.png";
import { useDesktopBridge } from "@/hooks/useDesktopBridge";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { name: "Dashboard", icon: "/logos/dashboard/dashboard.svg", routeKey: "dashboard" },
  { name: "Projects", icon: "/logos/dashboard/projects.svg", routeKey: "project" },
  { name: "Tasks", icon: "/logos/dashboard/task.svg", routeKey: "tasks" },
  { name: "Integrations", icon: "/logos/dashboard/integrations.svg", routeKey: "integrations" },
  { name: "Settings", icon: "/logos/dashboard/settings.svg", routeKey: "settings" },
  { name: "Client Portal", icon: "/logos/dashboard/clientportal.svg", routeKey: "portal" },
];

export function StageSidebar({
  accountInitials,
  accountLabel,
  accountMeta,
  projects,
  collapsed,
  canExpand = true,
  onCollapsedChange,
}: {
  accountInitials: string;
  accountLabel: string;
  accountMeta: string;
  projects: DashboardProject[];
  collapsed: boolean;
  canExpand?: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const desktop = useDesktopBridge();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const activeProjectId = pathname.startsWith("/project/")
    ? decodeURIComponent(pathname.split("/")[2] ?? "")
    : "";

  function getActiveItem(routeKey: string) {
    if (routeKey === "dashboard") return pathname === "/";
    if (routeKey === "integrations") return pathname === "/integrations";
    if (routeKey === "settings") return pathname.startsWith("/settings") && pathname !== "/settings/portal";
    if (routeKey === "portal") return pathname === "/settings/portal" || pathname.startsWith("/client-portal");
    if (routeKey === "project") return pathname === "/projects" || pathname.startsWith("/project/");
    if (routeKey === "tasks") return pathname.startsWith("/tasks");
    return false;
  }

  function navigateTo(routeKey: string) {
    if (routeKey === "dashboard") void navigate({ to: "/" });
    if (routeKey === "integrations") void navigate({ to: "/integrations" });
    if (routeKey === "settings") void navigate({ to: "/settings" });
    if (routeKey === "portal") void navigate({ to: "/client-portal" });
    if (routeKey === "tasks") void navigate({ to: "/tasks" });
    if (routeKey === "project") {
      void navigate({ to: "/projects" });
    }
  }

  function openSettings() {
    setIsUserMenuOpen(false);
    void navigate({ to: "/settings" });
  }

  async function logOut() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await desktop.auth.logout();
      setIsUserMenuOpen(false);
      void navigate({ to: "/" });
    } catch (error) {
      console.error("[stage-sidebar] log out failed", error);
    } finally {
      setIsLoggingOut(false);
    }
  }

  useEffect(() => {
    if (!isUserMenuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isUserMenuOpen]);

  const labelClassName = cn(
    "min-w-0 overflow-hidden truncate whitespace-nowrap text-[13px] font-medium transition-[max-width,opacity] duration-200 ease-out",
    collapsed ? "max-w-0 opacity-0" : "max-w-[150px] opacity-100",
  );

  return (
    <nav
      className={cn(
        "stage-sidebar relative flex h-full min-h-0 shrink-0 flex-col rounded-[8px] bg-[#f5f5f5] pb-[clamp(8px,2vh,16px)] pt-[clamp(8px,2vh,14px)] transition-[width,padding] duration-200 ease-out",
        collapsed ? "w-[60px] items-center px-[14px]" : "w-[240px] px-[12px]",
      )}
    >
      {/* Top section */}
      <div className={cn("flex min-h-0 w-full flex-1 flex-col gap-[clamp(14px,4vh,28px)]", collapsed && "items-center")}>
        {/* Logo + sidebar toggle */}
        <div className={cn("flex w-full shrink-0 items-center", collapsed ? "justify-center" : "justify-between")}>
          {collapsed ? (
            <button
              type="button"
              onClick={() => canExpand && onCollapsedChange(false)}
              className={cn(
                "group relative flex h-[32px] w-[32px] items-center justify-center rounded-[6px] outline-none transition-colors",
                canExpand ? "cursor-pointer hover:bg-[#ebebeb]" : "cursor-default",
              )}
              aria-label={canExpand ? "Expand sidebar" : "Stage"}
              aria-disabled={!canExpand}
            >
              <img
                src="/apple-touch-icon.png"
                alt=""
                aria-hidden="true"
                className={cn("h-[22px] w-[22px] transition-opacity duration-150", canExpand && "group-hover:opacity-0")}
              />
              {canExpand ? (
                <img
                  src="/logos/dashboard/close.svg"
                  alt=""
                  aria-hidden="true"
                  className="absolute h-[20px] w-[20px] rotate-180 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                />
              ) : null}
            </button>
          ) : (
            <div className="flex items-center gap-[2px]">
              <img src={stageLogo} alt="Stage" className="h-[22px] w-auto" />
            </div>
          )}
          {!collapsed && (
            <button
              type="button"
              onClick={() => onCollapsedChange(true)}
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
        <div className={cn("sidebar-scroll-area flex min-h-0 w-full flex-1 flex-col gap-[clamp(14px,4vh,28px)] overflow-y-auto overflow-x-hidden overscroll-contain pr-[2px] [-webkit-overflow-scrolling:touch]", collapsed && "w-[40px] items-center px-[4px] pr-[4px]")}>
          <div className={cn("flex w-full shrink-0 flex-col gap-[clamp(10px,2.5vh,16px)]", collapsed && "items-center")}>
            {/* Search box */}
            <div
              onClick={() => collapsed && onCollapsedChange(false)}
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
            </div>

            {/* Navigation items */}
            <div className={cn("flex w-full flex-col gap-[clamp(4px,1.5vh,8px)]", collapsed && "items-center")}>
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
                      "cursor-pointer",
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
          <div className={cn("flex min-h-0 w-full flex-col gap-[clamp(8px,2vh,12px)]", collapsed && "items-center")}>
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
                onClick={() => void navigate({ to: "/projects/create" })}
                className="flex h-[20px] w-[20px] cursor-pointer items-center justify-center rounded-[4px] bg-white shadow-[0px_0.45px_0.5px_0px_rgba(10,10,10,0.25)] outline-none transition-colors hover:bg-[#fafafa]"
              >
                <img
                  src="/logos/dashboard/plus.svg"
                  alt="New project"
                  className="h-[12px] w-[12px]"
                />
              </button>
            </div>

            {/* Project list */}
            <div className={cn("flex w-full flex-col gap-[clamp(4px,1.5vh,8px)]", collapsed && "items-center")}>
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
                      "cursor-pointer",
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
      <div
        ref={userMenuRef}
        className={cn("relative mt-[clamp(8px,2vh,16px)] flex w-full shrink-0 flex-col gap-[clamp(4px,1.5vh,8px)]", collapsed && "items-center")}
      >
        {/* Help & Feedback */}
        <button
          type="button"
          aria-label="Help & Feedback"
          className={cn(
            "flex h-[32px] items-center overflow-hidden bg-[#f5f5f5] text-[#525252] transition-[width,padding,gap,background-color] duration-200 ease-out hover:bg-[#ebebeb]",
            "cursor-pointer",
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
        <div className="relative w-full">
          {isUserMenuOpen && !collapsed ? (
            <div
              className="absolute bottom-[44px] left-0 z-50 w-full rounded-[8px] bg-[#F5F5F5] p-[4px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
              role="menu"
              aria-label="Account menu"
            >
              <div className="rounded-[6px] bg-white p-[8px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
                <div className="px-[4px] pb-[8px] pt-[2px]">
                  <p className="truncate text-[13px] font-semibold leading-[1.25] text-[#0A0A0A]">
                    {accountLabel}
                  </p>
                  <p className="mt-[3px] truncate text-[12px] font-medium leading-[1.25] text-[#737373]">
                    {accountMeta}
                  </p>
                </div>
                <div className="h-px bg-[#E5E5E5]" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={openSettings}
                  className="mt-[4px] flex h-[32px] w-full cursor-pointer items-center rounded-[6px] px-[8px] text-left text-[13px] font-medium leading-none text-[#171717] outline-none transition-colors hover:bg-[#F5F5F5]"
                >
                  Settings
                </button>
                <div className="my-[4px] h-px bg-[#E5E5E5]" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void logOut()}
                  disabled={isLoggingOut}
                  className="flex h-[32px] w-full cursor-pointer items-center rounded-[6px] px-[8px] text-left text-[13px] font-medium leading-none text-[#171717] outline-none transition-colors hover:bg-[#F5F5F5] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoggingOut ? "Logging out…" : "Log out"}
                </button>
              </div>
            </div>
          ) : null}

          <button
            type="button"
            aria-label={accountLabel}
            aria-haspopup="menu"
            aria-expanded={isUserMenuOpen}
            onClick={() => {
              if (collapsed && canExpand) {
                onCollapsedChange(false);
                return;
              }
              if (collapsed) return;

              setIsUserMenuOpen((current) => !current);
            }}
            className={cn(
              "flex h-[36px] cursor-pointer items-center overflow-hidden bg-[#f5f5f5] outline-none transition-[width,padding,background-color] duration-200 ease-out hover:bg-[#ebebeb]",
              collapsed
                ? "w-[32px] justify-center rounded-[6px] px-0"
                : "w-full justify-between rounded-[6px] px-[12px]",
            )}
          >
            <div className={cn("flex items-center", collapsed ? "gap-0" : "gap-[8px]")}>
              <div className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-[#e5e5e5] text-[10px] font-medium text-[#525252]">
                {accountInitials}
              </div>
              <span aria-hidden={collapsed} className={cn(labelClassName, "text-[#0a0a0a]")}>
                {accountLabel}
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
      </div>
    </nav>
  );
}
