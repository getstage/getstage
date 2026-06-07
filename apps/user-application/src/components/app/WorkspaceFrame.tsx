import { type ReactNode } from "react";
import { DesktopUpdateBanner } from "@/components/app/DesktopUpdateBanner";
import { StageSidebar } from "@/components/dashboard/StageSidebar";
import { buildSidebarProjectsFromSummaries } from "@/lib/dashboard/projectContextDashboard";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useProjectsQuery, useSettingsOverviewQuery } from "@/hooks/convex-data";
import { useDesktopSession } from "@/hooks/engine/useDesktopSession";
import { useSidebarState } from "@/hooks/useSidebarState";

export function WorkspaceFrame({
  children,
}: {
  children: ReactNode;
}) {
  const projectsQuery = useProjectsQuery();
  const settingsOverviewQuery = useSettingsOverviewQuery();
  const session = useDesktopSession();
  const [sidebarCollapsed, setSidebarCollapsed] = useSidebarState(false);
  const isCompact = useMediaQuery("(max-width: 860px)");
  const effectiveSidebarCollapsed = isCompact || sidebarCollapsed;
  const sidebarProjects = buildSidebarProjectsFromSummaries(projectsQuery.data ?? []);

  const profile = settingsOverviewQuery.data?.profile;
  const accountLabel = profile?.name || session.data?.name || session.data?.email || session.data?.userId || "Not signed in";
  const accountAvatarUrl = profile?.avatarUrl ?? undefined;
  const accountMeta = profile?.email ?? (session.data?.hasAccessToken ? "Connected" : "Connect in Settings");
  const accountInitials = getAccountInitials(accountLabel);

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
          accountAvatarUrl={accountAvatarUrl}
          accountMeta={accountMeta}
          projects={sidebarProjects}
          collapsed={effectiveSidebarCollapsed}
          canExpand={!isCompact}
          onCollapsedChange={setSidebarCollapsed}
        />
        <main
          data-sidebar-collapsed={effectiveSidebarCollapsed}
          className="flex min-w-0 flex-1 flex-col self-stretch overflow-hidden rounded-[8px] border border-[#f5f5f5] bg-white"
        >
          <DesktopUpdateBanner />
          <div className="min-h-0 flex-1 overflow-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}

function getAccountInitials(label: string) {
  if (!label || label === "Not signed in") {
    return "ST";
  }

  const [first, second] = label
    .split(/[\s@._-]+/)
    .filter(Boolean);

  return `${first?.[0] ?? "S"}${second?.[0] ?? first?.[1] ?? "T"}`.toUpperCase();
}
