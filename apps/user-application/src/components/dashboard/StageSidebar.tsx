import { useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import type { DashboardProject } from "@/models/dashboard/dashboard";
import { getActiveProjectId } from "@/lib/dashboard/sidebarNav";
import {
  logoutFromSidebar,
  navigateSidebarRoute,
  openSidebarCreateProject,
  openSidebarProject,
  openSidebarSettings,
  viewAllSidebarProjects,
} from "@/lib/dashboard/sidebarActions";
import { useSidebarSearch } from "@/hooks/dashboard/useSidebarSearch";
import { CreditsExhaustedModal } from "./sidebar/CreditsExhaustedModal";
import { SidebarAccountMenu } from "./sidebar/SidebarAccountMenu";
import { SidebarCollapseControl } from "./sidebar/SidebarCollapseControl";
import { SidebarCreditsCard } from "./sidebar/SidebarCreditsCard";
import { SidebarNavigation } from "./sidebar/SidebarNavigation";
import { SidebarProjectList } from "./sidebar/SidebarProjectList";
import { SidebarSearch } from "./sidebar/SidebarSearch";
import { useDesktopBridge } from "@/hooks/useDesktopBridge";
import { cn } from "@/lib/utils";

export function StageSidebar({
  accountInitials,
  accountLabel,
  accountAvatarUrl,
  accountMeta,
  projects,
  collapsed,
  canExpand = true,
  onCollapsedChange,
}: {
  accountInitials: string;
  accountLabel: string;
  accountAvatarUrl?: string;
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
  const [isCreditsExhaustedModalOpen, setIsCreditsExhaustedModalOpen] = useState(false);

  function openSubscriptions() {
    sessionStorage.setItem("stage:subscriptions-back-label", "Back to dashboard");
    void navigate({ to: "/subscriptions" });
  }

  function openBilling() {
    void navigate({ to: "/settings/billing" });
  }

  return (
    <>
      <nav
        className={cn(
          "stage-sidebar relative flex h-full min-h-0 shrink-0 flex-col overflow-y-auto overflow-x-hidden overscroll-contain rounded-[8px] bg-[#f5f5f5] pb-[clamp(8px,2vh,16px)] pt-[clamp(8px,2vh,14px)] transition-[width,padding] duration-200 ease-out [-webkit-overflow-scrolling:touch]",
          collapsed ? "w-[60px] items-center px-[14px]" : "w-[240px] px-[12px]",
        )}
      >
      <div className={cn("flex min-h-0 w-full flex-1 flex-col gap-[clamp(14px,4vh,28px)]", collapsed && "items-center")}>
        <SidebarCollapseControl
          collapsed={collapsed}
          canExpand={canExpand}
          onCollapsedChange={onCollapsedChange}
        />

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

      <div className={cn("mt-auto flex w-full shrink-0 flex-col gap-[clamp(8px,2vh,16px)] pt-[clamp(8px,2vh,16px)]", collapsed && "items-center")}>
        <SidebarCreditsCard
          collapsed={collapsed}
          creditsRemaining={0}
          onTopUp={() => setIsCreditsExhaustedModalOpen(true)}
          onManagePlan={openBilling}
        />

        {!collapsed ? <div className="h-px w-full shrink-0 bg-[#E5E5E5]" /> : null}

        <SidebarAccountMenu
          collapsed={collapsed}
          canExpand={canExpand}
          accountInitials={accountInitials}
          accountLabel={accountLabel}
          accountAvatarUrl={accountAvatarUrl}
          accountMeta={accountMeta}
          onCollapsedChange={onCollapsedChange}
          onOpenSettings={() => openSidebarSettings(navigate)}
          onLogOut={() => logoutFromSidebar(navigate, () => desktop.auth.logout())}
        />
      </div>
      </nav>

      <CreditsExhaustedModal
        open={isCreditsExhaustedModalOpen}
        onOpenChange={setIsCreditsExhaustedModalOpen}
        onContinueStart={openSubscriptions}
        onSeeOtherPlans={openSubscriptions}
      />
    </>
  );
}
