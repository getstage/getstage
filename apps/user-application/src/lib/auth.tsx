import { createContext, useContext, type ReactNode } from "react";
import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";

type DesktopAuthState = {
  isAuthenticated: boolean;
  isLoading: boolean;
};

const DesktopAuthContext = createContext<DesktopAuthState | null>(null);

export function DesktopAuthProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();

  return (
    <DesktopAuthContext.Provider value={{ isAuthenticated, isLoading }}>
      {children}
    </DesktopAuthContext.Provider>
  );
}

export function useDesktopAuth() {
  const value = useContext(DesktopAuthContext);
  if (!value) {
    throw new Error("useDesktopAuth must be used within DesktopAuthProvider.");
  }
  return value;
}

export function useDesktopSignIn() {
  const { signIn } = useAuthActions();
  return signIn;
}

export function useDesktopSignOut() {
  const { signOut } = useAuthActions();
  return signOut;
}
