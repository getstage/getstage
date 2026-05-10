import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { DesktopSession } from "@shared/models/desktop";

type DesktopAuthState = {
  isAuthenticated: boolean;
  isLoading: boolean;
};

const DesktopAuthContext = createContext<DesktopAuthState | null>(null);

export function DesktopAuthProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useElectronAuthForConvex();

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

export function useElectronAuthForConvex() {
  const [session, setSession] = useState<DesktopSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    window.stageDesktop.auth.getSession()
      .then((storedSession) => {
        if (!isMounted) {
          return;
        }
        setSession(storedSession);
        setIsLoading(false);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }
        setSession(null);
        setIsLoading(false);
      });

    const unsubscribe = window.stageDesktop.auth.onSessionChanged((nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const fetchAccessToken = useCallback(() => window.stageDesktop.auth.getAccessToken(), []);

  return {
    isLoading,
    isAuthenticated: Boolean(session?.hasAccessToken),
    fetchAccessToken,
  };
}
