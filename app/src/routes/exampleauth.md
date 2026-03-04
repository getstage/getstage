import { AppSidebar } from "@/components/common/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Outlet, createFileRoute, useLocation, redirect } from "@tanstack/react-router";
import { DashboardHeader } from "@/components/dashboard-header";
import { getSessionCached, getAccessCached } from "@/lib/auth-helpers";

export const Route = createFileRoute("/app/_authed")({
  component: RouteComponent,
  beforeLoad: async ({ location }) => {
    // 1. Session check
    const session = await getSessionCached();
    if (!session.data?.session) {
      throw redirect({ to: "/auth/login" });
    }

    // 2. Access check (skip for upgrade page)
    const isUpgradePage = location.pathname === "/app/upgrade";
    if (!isUpgradePage) {
      const hasAccess = await getAccessCached();
      if (!hasAccess) {
        throw redirect({ to: "/app/upgrade" });
      }
    }
  },
});