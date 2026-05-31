export const SIDEBAR_NAV_ITEMS = [
  { name: "Dashboard", icon: "/logos/dashboard/dashboard.svg", routeKey: "dashboard" },
  { name: "Projects", icon: "/logos/dashboard/projects.svg", routeKey: "project" },
  { name: "Tasks", icon: "/logos/dashboard/task.svg", routeKey: "tasks" },
  { name: "Integrations", icon: "/logos/dashboard/integrations.svg", routeKey: "integrations" },
  { name: "Settings", icon: "/logos/dashboard/settings.svg", routeKey: "settings" },
  { name: "Client Portal", icon: "/logos/dashboard/clientportal.svg", routeKey: "portal" },
] as const;

export type SidebarNavRouteKey = (typeof SIDEBAR_NAV_ITEMS)[number]["routeKey"];

export function isSidebarNavActive(routeKey: string, pathname: string) {
  if (routeKey === "dashboard") return pathname === "/";
  if (routeKey === "integrations") return pathname === "/integrations";
  if (routeKey === "settings") return pathname.startsWith("/settings") && pathname !== "/settings/portal";
  if (routeKey === "portal") return pathname === "/settings/portal" || pathname.startsWith("/client-portal");
  if (routeKey === "project") return pathname === "/projects" || pathname.startsWith("/project/");
  if (routeKey === "tasks") return pathname.startsWith("/tasks");
  return false;
}

export function getActiveProjectId(pathname: string) {
  if (!pathname.startsWith("/project/")) return "";
  return decodeURIComponent(pathname.split("/")[2] ?? "");
}

export function sidebarLabelClassName(collapsed: boolean) {
  return collapsed
    ? "min-w-0 max-w-0 overflow-hidden truncate whitespace-nowrap text-[13px] font-medium opacity-0 transition-[max-width,opacity] duration-200 ease-out"
    : "min-w-0 max-w-[150px] overflow-hidden truncate whitespace-nowrap text-[13px] font-medium opacity-100 transition-[max-width,opacity] duration-200 ease-out";
}
