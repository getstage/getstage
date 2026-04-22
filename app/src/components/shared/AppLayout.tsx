import type { ReactNode } from "react";
import { useQuery as useConvexQuery } from "convex/react";
import { TopBar } from "@/components/shared/TopBar";
import { ProjectDock } from "@/components/dashboard/ProjectDock";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/convex";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { isAuthenticated } = useAuth();
  const dockProjects = useConvexQuery(
    api.projects.getDockProjects,
    isAuthenticated ? {} : "skip",
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#f5f5f5] p-[4px]">
      <div className="flex flex-1 flex-col overflow-clip rounded-[8px] border border-[#f5f5f5] bg-white">
        <div className="flex flex-1 flex-col gap-[56px] overflow-y-auto px-6 py-[44px] md:px-[120px] lg:px-[200px] xl:px-[250px]">
          <TopBar />
          <main className="flex-1">{children}</main>
        </div>
      </div>

      <ProjectDock projects={dockProjects ?? []} />
    </div>
  );
}
