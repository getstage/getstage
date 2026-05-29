import { useNavigate, useRouterState } from "@tanstack/react-router";
import type { DashboardProject } from "../models/dashboard";
import { getActiveProjectId } from "../helpers/sidebarNav";
import {
  logoutFromSidebar,
  navigateSidebarRoute,
  openSidebarCreateProject,
  openSidebarProject,
  openSidebarSettings,
  viewAllSidebarProjects,
} from "../helpers/sidebarActions";
import { useSidebarSearch } from "../hooks/useSidebarSearch";
import { SidebarAccountMenu } from "./sidebar/SidebarAccountMenu";
import { SidebarCollapseControl } from "./sidebar/SidebarCollapseControl";
import { SidebarNavigation } from "./sidebar/SidebarNavigation";
import { SidebarProjectList } from "./sidebar/SidebarProjectList";
import { SidebarSearch } from "./sidebar/SidebarSearch";
import { useDesktopBridge } from "@/hooks/useDesktopBridge";
import { cn } from "@/lib/utils";

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
  const navigate = useNavigate();
  const desktop = useDesktopBridge();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const activeProjectId = getActiveProjectId(pathname);
  const search = useSidebarSearch(projects, collapsed);

  return (
    <nav
      className={cn(
        "stage-sidebar relative flex h-full min-h-0 shrink-0 flex-col rounded-[8px] bg-[#f5f5f5] pb-[clamp(8px,2vh,16px)] pt-[clamp(8px,2vh,14px)] transition-[width,padding] duration-200 ease-out",
        collapsed ? "w-[60px] items-center px-[14px]" : "w-[240px] px-[12px]",
      )}
    >
      <div className={cn("flex min-h-0 w-full flex-1 flex-col gap-[clamp(14px,4vh,28px)]", collapsed && "items-center")}>
        <SidebarCollapseControl
          collapsed={collapsed}
          canExpand={canExpand}
          onCollapsedChange={onCollapsedChange}
        />

        <div className={cn("sidebar-scroll-area flex min-h-0 w-full flex-1 flex-col gap-[clamp(14px,4vh,28px)] overflow-y-auto overflow-x-hidden overscroll-contain pr-[2px] [-webkit-overflow-scrolling:touch]", collapsed && "w-[40px] items-center px-[4px] pr-[4px]")}>
          <div className={cn("flex w-full shrink-0 flex-col gap-[clamp(10px,2.5vh,16px)]", collapsed && "items-center")}>
            <SidebarSearch
              collapsed={collapsed}
              canExpand={canExpand}
              searchQuery={search.searchQuery}
              matchingProjects={search.matchingProjects}
              compactSearchProjects={search.compactSearchProjects}
              normalizedSearchQuery={search.normalizedSearchQuery}
              showSearchPreview={search.showSearchPreview}
              isCompactSearchOpen={search.isCompactSearchOpen}
              onSearchQueryChange={search.setSearchQuery}
              onSearchFocusedChange={search.setIsSearchFocused}
              onCompactSearchOpenChange={search.setIsCompactSearchOpen}
              onCollapsedChange={onCollapsedChange}
              onOpenProject={(projectId) => openSidebarProject(navigate, search.resetSearch, projectId)}
              onViewAllProjects={() => viewAllSidebarProjects(navigate, search.resetSearch)}
            />

            <SidebarNavigation
              collapsed={collapsed}
              pathname={pathname}
              onNavigate={(routeKey) => navigateSidebarRoute(navigate, routeKey)}
            />
          </div>

          <SidebarProjectList
            collapsed={collapsed}
            projects={projects}
            activeProjectId={activeProjectId}
            onOpenProject={(projectId) => openSidebarProject(navigate, search.resetSearch, projectId)}
            onCreateProject={() => openSidebarCreateProject(navigate)}
          />
        </div>
      </div>

      <SidebarAccountMenu
        collapsed={collapsed}
        canExpand={canExpand}
        accountInitials={accountInitials}
        accountLabel={accountLabel}
        accountMeta={accountMeta}
        onCollapsedChange={onCollapsedChange}
        onOpenSettings={() => openSidebarSettings(navigate)}
        onLogOut={() => logoutFromSidebar(navigate, () => desktop.auth.logout())}
      />
    </nav>
  );
}
