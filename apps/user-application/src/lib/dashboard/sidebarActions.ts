import type { NavigateOptions } from "@tanstack/react-router";
import { setProjectBackDestination } from "@/lib/projectBackDestination";

export type SidebarNavigate = (options: NavigateOptions) => void | Promise<void>;

export function getSidebarNavDestination(routeKey: string): NavigateOptions | null {
  switch (routeKey) {
    case "dashboard":
      return { to: "/" };
    case "integrations":
      return { to: "/integrations" };
    case "settings":
      return { to: "/settings" };
    case "portal":
      return { to: "/client-portal" };
    case "tasks":
      return { to: "/tasks" };
    case "project":
      return { to: "/projects" };
    default:
      return null;
  }
}

export function navigateSidebarRoute(navigate: SidebarNavigate, routeKey: string) {
  const destination = getSidebarNavDestination(routeKey);
  if (destination) {
    void navigate(destination);
  }
}

export function openSidebarProject(
  navigate: SidebarNavigate,
  resetSearch: () => void,
  projectId: string,
) {
  resetSearch();
  setProjectBackDestination({ href: "/", label: "Back to dashboard" });
  void navigate({ to: "/project/$projectId", params: { projectId } });
}

export function viewAllSidebarProjects(navigate: SidebarNavigate, resetSearch: () => void) {
  resetSearch();
  void navigate({ to: "/projects" });
}

export function openSidebarCreateProject(navigate: SidebarNavigate) {
  void navigate({ to: "/projects/create" });
}

export function openSidebarSettings(navigate: SidebarNavigate) {
  void navigate({ to: "/settings" });
}

export function logoutFromSidebar(
  navigate: SidebarNavigate,
  logout: () => void | Promise<void>,
): Promise<void> {
  return Promise.resolve(logout()).then(() => {
    void navigate({ to: "/" });
  });
}
