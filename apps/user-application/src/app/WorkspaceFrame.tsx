import { type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { StageSidebar } from "@/dashboard/components/StageSidebar";
import { buildSidebarProjectsFromProjectContext } from "@/dashboard/helpers/projectContextDashboard";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useDesktopBridge } from "@/hooks/useDesktopBridge";
import { useSidebarState } from "@/hooks/useSidebarState";
import { useSelectedProjectContext } from "@/hooks/useSelectedProjectContext";

export function WorkspaceFrame({
  children,
}: {
  children: ReactNode;
}) {
  const desktop = useDesktopBridge();
  const selectedProject = useSelectedProjectContext();
  const [sidebarCollapsed, setSidebarCollapsed] = useSidebarState(false);
  const isCompact = useMediaQuery("(max-width: 860px)");
  const effectiveSidebarCollapsed = isCompact || sidebarCollapsed;
  const liveProjectContext = selectedProject.isFallback ? null : selectedProject.context;
  const sidebarProjects = buildSidebarProjectsFromProjectContext(liveProjectContext);
  const session = useQuery({
    queryKey: ["desktop", "auth", "session"],
    queryFn: () => desktop.auth.getSession(),
    retry: false,
  });
  const sessionUserId = session.data?.userId;
  const accountLabel = sessionUserId ?? "Not signed in";
  const accountMeta = session.data?.hasAccessToken ? "Connected" : "Connect in Settings";
  const accountInitials = sessionUserId
    ? sessionUserId.slice(0, 2).toUpperCase()
    : "ST";

  return (
    <div className="flex h-dvh min-h-[480px] min-w-0 flex-col overflow-hidden bg-[#f5f5f5]">
      <div
        className="stage-window-chrome flex h-[46px] shrink-0 items-center justify-center"
        onDoubleClick={() => void window.stageDesktop.window.toggleMaximize()}
      >
        <span className="select-none text-[13px] font-medium text-[#737373]">Stage</span>
      </div>
      <div className="flex min-h-0 flex-1 items-start gap-[8px] overflow-hidden pb-[4px] pl-[8px] pr-[4px] pt-0">
        <StageSidebar
          accountInitials={accountInitials}
          accountLabel={accountLabel}
          accountMeta={accountMeta}
          projects={sidebarProjects}
          collapsed={effectiveSidebarCollapsed}
          canExpand={!isCompact}
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
