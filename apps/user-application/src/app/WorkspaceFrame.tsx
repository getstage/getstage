import { type ReactNode } from "react";
import { StageSidebar } from "@/dashboard/components/StageSidebar";
import { dashboardSnapshot } from "@/dashboard/data/dashboardSnapshot";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useSidebarState } from "@/hooks/useSidebarState";

export function WorkspaceFrame({
  children,
}: {
  children: ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useSidebarState(false);
  const isCompact = useMediaQuery("(max-width: 860px)");
  const effectiveSidebarCollapsed = isCompact || sidebarCollapsed;

  return (
    <div className="flex h-dvh min-h-[480px] min-w-0 flex-col overflow-hidden bg-[#f5f5f5]">
      <div
        className="stage-window-chrome flex h-[46px] shrink-0 items-center justify-center"
        onDoubleClick={() => void window.stageDesktop.window.toggleMaximize()}
      >
        <span className="select-none text-[13px] font-medium text-[#737373]">Stage</span>
      </div>
      <div className="flex min-h-0 flex-1 items-start gap-[8px] overflow-hidden p-[4px] pt-0">
        <StageSidebar
          projects={dashboardSnapshot.projects}
          collapsed={effectiveSidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />
        <main
          data-sidebar-collapsed={effectiveSidebarCollapsed}
          className="flex min-w-0 flex-1 self-stretch overflow-auto rounded-[8px] border border-[#f5f5f5] bg-white"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
