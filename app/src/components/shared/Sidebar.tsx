import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useAuth, useSignOut } from "@/lib/auth";
import { useQuery as useConvexQuery } from "convex/react";
import { api } from "@/lib/convex";
import { Avatar } from "@/components/ui/Avatar";
import stageLogo from "@/assets/logos/stage-logo-light.png";

const NAV_ITEMS = [
  { name: "Dashboard", to: "/dashboard" as const, icon: "/logos/dashboard/dashboard.svg" },
  { name: "Projects", to: "/dashboard" as const, icon: "/logos/dashboard/projects.svg" },
  { name: "Tasks", to: "/dashboard" as const, icon: "/logos/dashboard/task.svg" },
  { name: "Integrations", to: "/settings" as const, icon: "/logos/dashboard/integrations.svg" },
  { name: "Settings", to: "/settings" as const, icon: "/logos/dashboard/settings.svg" },
  { name: "Client Portal", to: "/settings" as const, icon: "/logos/dashboard/clientportal.svg" },
];

function getDefaultActiveItem(path: string): string {
  if (path.startsWith("/settings")) return "Settings";
  return "Dashboard";
}

const FEEDBACK_TALLY_URL = "https://tally.so/r/OD0gqM";

export function Sidebar() {
  const { user, isAuthenticated } = useAuth();
  const signOut = useSignOut();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [activeItem, setActiveItem] = useState(() => getDefaultActiveItem(currentPath));

  const projects = useConvexQuery(
    api.projects.getDockProjects,
    isAuthenticated ? {} : "skip",
  );

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
          <Link to="/dashboard" className="flex items-center gap-[2px] outline-none">
            <img
              src={stageLogo}
              alt="Stage"
              className={collapsed ? "h-[24px] w-auto" : "h-[22px] w-auto"}
            />
          </Link>
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
          {/* Search + main nav */}
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
                const isActive = activeItem === item.name;

                return (
                  <Link
                    key={item.name}
                    to={item.to}
                    onClick={() => setActiveItem(item.name)}
                    className={`flex items-center outline-none transition-colors ${
                      collapsed
                        ? `h-[32px] w-[32px] justify-center rounded-[8px] ${
                            isActive
                              ? "bg-[#1a1a1a]"
                              : "bg-transparent hover:bg-[#ebebeb]"
                          }`
                        : `w-full gap-[8px] rounded-[6px] px-[12px] py-[6px] ${
                            isActive
                              ? "bg-[#e5e5e5] text-[#0a0a0a]"
                              : "bg-transparent text-[#525252] hover:bg-[#ebebeb]"
                          }`
                    }`}
                  >
                    <img
                      src={item.icon}
                      alt={collapsed ? item.name : ""}
                      aria-hidden={!collapsed}
                      className={`h-[15px] w-[15px] ${collapsed && isActive ? "brightness-0 invert" : ""}`}
                    />
                    {!collapsed && (
                      <span className="text-[13px] font-medium">
                        {item.name}
                      </span>
                    )}
                  </Link>
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
                <Link
                  to="/new-project"
                  className="flex items-center rounded-[4px] bg-white p-[4px] shadow-[0px_0.45px_1px_0px_rgba(10,10,10,0.25)] outline-none transition-colors hover:bg-[#fafafa]"
                >
                  <img
                    src="/logos/dashboard/plus.svg"
                    alt="New project"
                    className="h-[12px] w-[12px]"
                  />
                </Link>
              </div>
            )}

            {/* Project list */}
            <div className={`flex flex-col gap-[8px] ${collapsed ? "items-center w-full" : ""}`}>
              {(projects ?? []).map((project) => (
                <Link
                  key={project.id}
                  to="/project/$id"
                  params={{ id: project.id }}
                  className={`flex items-center outline-none transition-colors hover:bg-[#ebebeb] ${
                    collapsed
                      ? "h-[32px] w-[32px] justify-center rounded-[8px]"
                      : "w-full gap-[8px] rounded-[6px] px-[12px] py-[6px]"
                  }`}
                >
                  {project.projectImageUrl ?? project.clientAvatarUrl ? (
                    <img
                      src={project.projectImageUrl ?? project.clientAvatarUrl}
                      alt={collapsed ? project.name : ""}
                      className="h-[24px] w-[24px] shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-[#e5e5e5] text-[10px] font-medium text-[#525252]">
                      {project.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {!collapsed && (
                    <span className="truncate text-[13px] font-medium text-[#525252]">
                      {project.name}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom section */}
      <div className={`flex flex-col gap-[8px] ${collapsed ? "items-center w-full" : ""}`}>
        {/* Help & Feedback */}
        <a
          href={FEEDBACK_TALLY_URL}
          target="_blank"
          rel="noreferrer"
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
        </a>

        {/* User profile */}
        {user && (
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                if (collapsed) {
                  setCollapsed(false);
                } else {
                  setProfileMenuOpen((prev) => !prev);
                }
              }}
              className={`flex cursor-pointer items-center outline-none transition-colors hover:bg-[#ebebeb] ${
                collapsed
                  ? "h-[32px] w-[32px] justify-center rounded-[8px]"
                  : "w-full justify-between rounded-[6px] px-[12px] py-[6px]"
              }`}
            >
              <div className="flex items-center gap-[8px]">
                <Avatar
                  name={user.name}
                  src={user.avatarUrl}
                  size="sm"
                  className="h-[24px] w-[24px] text-[10px]"
                />
                {!collapsed && (
                  <span className="text-[13px] font-medium text-[#0a0a0a]">
                    {user.name}
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

            {profileMenuOpen && !collapsed && (
              <ProfileMenu
                user={user}
                onClose={() => setProfileMenuOpen(false)}
                onSignOut={signOut}
              />
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

function ProfileMenu({
  user,
  onClose,
  onSignOut,
}: {
  user: { name: string; email: string };
  onClose: () => void;
  onSignOut: () => Promise<void>;
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        onKeyDown={() => {}}
        role="presentation"
      />
      <div className="absolute bottom-full left-0 z-50 mb-2 w-full rounded-[8px] border border-[#e5e5e5] bg-white p-1.5 shadow-[0_4px_16px_rgba(26,26,46,0.08)]">
        <div className="px-3 py-2.5">
          <p className="text-[14px] font-medium text-[#0a0a0a]">{user.name}</p>
          <p className="text-[13px] text-[#737373]">{user.email}</p>
        </div>
        <div className="my-1 h-px bg-[#f0f0f0]" />
        <Link
          to="/settings"
          onClick={onClose}
          className="flex w-full items-center rounded-lg px-3 py-2 text-[14px] text-[#0a0a0a] transition-colors hover:bg-[#f5f5f5]"
        >
          Settings
        </Link>
        <div className="my-1 h-px bg-[#f0f0f0]" />
        <button
          type="button"
          onClick={async () => {
            onClose();
            await onSignOut();
          }}
          className="flex w-full cursor-pointer items-center rounded-lg px-3 py-2 text-[14px] text-[#0a0a0a] transition-colors hover:bg-[#f5f5f5]"
        >
          Log out
        </button>
      </div>
    </>
  );
}
