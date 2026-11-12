import { useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useProjectsQuery } from "@stage/project-ui/data/useProjectsQuery";
import { useSettingsOverviewQuery } from "@stage/project-ui/data/useSettingsOverviewQuery";
import { buildSidebarProjectsFromSummaries, getAccountInitials } from "@stage/project-ui/sidebar/projects";
import { SidebarAccountMenu } from "@stage/project-ui/sidebar/SidebarAccountMenu";
import { SidebarCollapseControl } from "@stage/project-ui/sidebar/SidebarCollapseControl";
import { SidebarNavigation } from "@stage/project-ui/sidebar/SidebarNavigation";
import { SidebarSearch } from "@stage/project-ui/sidebar/SidebarSearch";
import { useSidebarSearch } from "@stage/project-ui/sidebar/useSidebarSearch";
import { SidebarSpaceSelect } from "@stage/project-ui/workspace/SidebarSpaceSelect";
import { useSignOut } from "@/lib/auth";
import { cn } from "@/lib/utils";

// Signed-in web app frame: Stage for Mac's sidebar (shared parts) and white content panel.

// The web's sidebar items: the Mac's, minus Tasks and Client Portal (Mac only for now).
const WEB_NAV = [
  { name: "Dashboard", icon: "/logos/dashboard/dashboard.svg", routeKey: "/app" },
  { name: "Projects", icon: "/logos/dashboard/projects.svg", routeKey: "/app/projects" },
  { name: "Integrations", icon: "/logos/dashboard/integrations.svg", routeKey: "/app/integrations" },
  { name: "Settings", icon: "/logos/dashboard/settings.svg", routeKey: "/app/settings" },
] as const;

function isNavActive(routeKey: string, pathname: string) {
  return routeKey === "/app" ? pathname === "/app" || pathname === "/app/" : pathname.startsWith(routeKey);
}

// Figma icons are one colour; a mask lets the same file follow the text colour (active vs inactive).
export function MaskIcon({ src, className }: { src: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block shrink-0 bg-current", className)}
      style={{ maskImage: `url("${src}")`, WebkitMaskImage: `url("${src}")`, maskSize: "100% 100%", WebkitMaskSize: "100% 100%" }}
    />
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const signOut = useSignOut();
  const pathname = useLocation({ select: (location) => location.pathname });
  const [collapsed, setCollapsed] = useState(false);
  const projects = buildSidebarProjectsFromSummaries(useProjectsQuery().data ?? []);
  const search = useSidebarSearch(projects, collapsed);
  const profile = useSettingsOverviewQuery().data?.profile;
  const accountLabel = profile?.name ?? "";
  // A project uses the Mac app's full-width step screens; the other pages keep the narrow Figma column.
  const wide = pathname.startsWith("/app/projects/");
  const openProject = (projectId: string) => {
    search.resetSearch();
    void navigate({ to: "/app/projects/$projectId", params: { projectId } });
  };

  return (
    <div className="auth-page flex h-dvh min-h-[480px] min-w-0 items-start gap-[8px] overflow-hidden bg-[#f5f5f5] p-[4px] pl-[8px] leading-[normal] text-[#0A0A0A]">
      <nav
        className={cn(
          "stage-sidebar relative hidden h-full min-h-0 shrink-0 flex-col overflow-y-auto overflow-x-hidden rounded-[8px] bg-[#f5f5f5] pb-[clamp(8px,2vh,16px)] pt-[clamp(8px,2vh,14px)] transition-[width,padding] duration-200 ease-out md:flex",
          collapsed ? "w-[60px] items-center px-[14px]" : "w-[240px] px-[12px]",
        )}
      >
        <div className={cn("flex min-h-0 w-full flex-1 flex-col gap-[clamp(14px,4vh,28px)]", collapsed && "items-center")}>
          <SidebarCollapseControl collapsed={collapsed} canExpand onCollapsedChange={setCollapsed} />
          <SidebarSpaceSelect collapsed={collapsed} />
          <div className={cn("flex w-full shrink-0 flex-col gap-[clamp(10px,2.5vh,16px)]", collapsed && "items-center")}>
            <SidebarSearch
              collapsed={collapsed}
              canExpand
              searchQuery={search.searchQuery}
              matchingProjects={search.matchingProjects}
              compactSearchProjects={search.compactSearchProjects}
              normalizedSearchQuery={search.normalizedSearchQuery}
              showSearchPreview={search.showSearchPreview}
              isCompactSearchOpen={search.isCompactSearchOpen}
              onSearchQueryChange={search.setSearchQuery}
              onSearchFocusedChange={search.setIsSearchFocused}
              onCompactSearchOpenChange={search.setIsCompactSearchOpen}
              onCollapsedChange={setCollapsed}
              onOpenProject={openProject}
              onViewAllProjects={() => {
                search.resetSearch();
                void navigate({ to: "/app/projects" });
              }}
            />
            <SidebarNavigation
              collapsed={collapsed}
              items={WEB_NAV}
              isActive={(routeKey) => isNavActive(routeKey, pathname)}
              onNavigate={(routeKey) => void navigate({ to: routeKey })}
            />
          </div>
        </div>
        <div className={cn("mt-auto flex w-full shrink-0 flex-col gap-[clamp(8px,2vh,16px)] pt-[clamp(8px,2vh,16px)]", collapsed && "items-center")}>
          {!collapsed ? <div className="h-px w-full shrink-0 bg-[#E5E5E5]" /> : null}
          <SidebarAccountMenu
            collapsed={collapsed}
            canExpand
            accountInitials={getAccountInitials(accountLabel)}
            accountLabel={accountLabel}
            accountAvatarUrl={profile?.avatarUrl ?? undefined}
            accountMeta={profile?.email ?? ""}
            onCollapsedChange={setCollapsed}
            onOpenSettings={() => void navigate({ to: "/app/settings" })}
            onLogOut={async () => {
              await signOut();
              window.location.assign("/");
            }}
          />
        </div>
      </nav>
      <main className="flex h-full min-w-0 flex-1 flex-col self-stretch overflow-auto rounded-[8px] border border-[#f5f5f5] bg-white px-4 py-11">
        <div className={cn("mx-auto flex w-full flex-col gap-8", wide ? "max-w-[1120px]" : "max-w-[684px]")}>{children}</div>
      </main>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-2 leading-[1.2]">
        <h1 className="text-[20px] font-semibold text-[#0A0A0A]">{title}</h1>
        <p className="text-[13px] font-medium text-[#737373]">{subtitle}</p>
      </div>
      {action}
    </header>
  );
}

// Grey card with a header row and a white inner panel (Figma "Frame 212/213").
export function Card({ title, subtitle, aside, bodyClassName, children }: {
  title: string;
  subtitle?: string;
  aside?: ReactNode;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-1 overflow-hidden rounded-[12px] border-[0.5px] border-[#D4D4D4] bg-[#F5F5F5] p-1 shadow-[0_1px_4px_-2px_rgba(10,10,10,0.4)]">
      <div className={cn("flex items-center justify-between gap-3 px-3", subtitle ? "pb-3 pt-2" : "py-2")}>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-[13px] font-medium leading-[1.5] text-[#0A0A0A]">{title}</h2>
          {subtitle ? <p className="text-[12px] text-[#525252]">{subtitle}</p> : null}
        </div>
        {aside}
      </div>
      <div className={cn("flex flex-col rounded-[8px] border-[0.5px] border-[#D4D4D4] bg-white shadow-[0_1px_4px_-2px_rgba(10,10,10,0.4)]", bodyClassName ?? "gap-3 p-3")}>
        {children}
      </div>
    </section>
  );
}

export function StatusBadge({ status, size = "md" }: { status: "connected" | "off" | "warning"; size?: "sm" | "md" }) {
  const label = status === "connected" ? "Connected" : status === "warning" ? "Needs the Stage Mac app" : "Not Connected";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border-[0.5px] font-medium whitespace-nowrap",
        size === "sm" ? "px-1 py-0.5 text-[11px]" : "px-2.5 py-1 text-[12px]",
        status === "connected" && "border-[#34D399] bg-[#D1FAE5] text-[#022C22] shadow-[0_1px_5px_-3.5px_rgba(0,0,0,0.5)]",
        status === "warning" && "border-[#FBBF24] bg-[#FEF3C7] px-1.5 text-[#451A03] shadow-[0_1px_5px_-3.5px_rgba(0,0,0,0.5)]",
        status === "off" && (size === "sm" ? "border-[#E5E5E5] bg-[#FAFAFA] font-normal text-[#737373]/70" : "border-[#D4D4D4] bg-[#F5F5F5] text-[#737373] shadow-[0_1px_5px_-3.5px_rgba(0,0,0,0.5)]"),
      )}
    >
      {label}
    </span>
  );
}
