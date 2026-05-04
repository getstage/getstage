import { useState, type ReactNode } from "react";
import { StageSidebar } from "@/dashboard/components/StageSidebar";
import { dashboardSnapshot } from "@/dashboard/data/dashboardSnapshot";

export function WorkspaceFrame({
  children,
  defaultSidebarCollapsed = false,
}: {
  children: ReactNode;
  defaultSidebarCollapsed?: boolean;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(defaultSidebarCollapsed);

  return (
    <div className="flex h-screen items-start gap-[8px] bg-[#f5f5f5] p-[4px]">
      <StageSidebar
        projects={dashboardSnapshot.projects}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />
      <main
        data-sidebar-collapsed={sidebarCollapsed}
        className="flex min-w-0 flex-1 self-stretch overflow-y-auto rounded-[8px] border border-[#f5f5f5] bg-white"
      >
        {children}
      </main>
    </div>
  );
}
