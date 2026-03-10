import type { ReactNode } from "react";
import { Navbar } from "@/components/shared/Navbar";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <Navbar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
