import { createContext, useContext, type ReactNode } from "react";

// What differs between Stage for Mac and the web app. Each app provides it once at its root;
// shared screens and data hooks read it instead of importing app code.
export type StagePlatform = {
  kind: "desktop" | "web";
  // Signed in and ready for Convex queries (Mac: Electron session; web: Convex auth).
  session: { isAuthenticated: boolean; isLoading: boolean };
  // Opens a link outside the app (Mac: system browser; web: same tab, e.g. Stripe).
  openExternal: (url: string) => Promise<void>;
  // In-app destinations the shared screens link to.
  navigate: (destination: AppDestination) => void;
};

export type AppDestination = "dashboard" | "plans" | "plans-for-teams" | "settings-billing" | "settings-team";

const PlatformContext = createContext<StagePlatform | null>(null);

export function PlatformProvider({ value, children }: { value: StagePlatform; children: ReactNode }) {
  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

export function usePlatform() {
  const platform = useContext(PlatformContext);
  if (!platform) throw new Error("usePlatform must be used inside PlatformProvider.");
  return platform;
}
