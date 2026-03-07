import type { ReactNode } from "react";
import { useMatches } from "@tanstack/react-router";
import { Navbar } from "@/components/shared/Navbar";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const matches = useMatches();
  const hideNavbar = matches.some((match) => match.routeId.includes("new-project"));

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      {!hideNavbar && <Navbar />}
      <main className="flex-1">{children}</main>
    </div>
  );
}
