import type { ReactNode } from "react";
import { Sidebar } from "@/components/shared/Sidebar";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen bg-[#f5f5f5] p-[4px]">
      <div className="flex flex-1 overflow-hidden rounded-[8px] border border-[#f5f5f5] bg-white">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-y-auto p-[44px]">
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
