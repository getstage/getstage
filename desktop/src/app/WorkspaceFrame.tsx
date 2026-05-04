import type { ReactNode } from "react";
import { StageSidebar } from "@/dashboard/components/StageSidebar";
import { dashboardSnapshot } from "@/dashboard/data/dashboardSnapshot";

export function WorkspaceFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-[#f5f5f5] p-[4px]">
      <div className="flex flex-1 overflow-hidden rounded-[8px] border border-[#f5f5f5] bg-white">
        <StageSidebar projects={dashboardSnapshot.projects} />
        <main className="flex flex-1 flex-col overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
