/**
 * Auth — Convex Auth Integration
 *
 * Centralizes auth state via Convex Auth.
 * Components and routes only import from this file.
 */

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@/lib/convex";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: string;
  plan: string;
};

type AuthState = {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const identity = useQuery(api.viewer.getIdentity, isAuthenticated ? {} : "skip");
  const isLoading = authLoading || (isAuthenticated && identity === undefined);

  useEffect(() => {
    if (authLoading || !isAuthenticated || identity === undefined) {
      return;
    }

    if (identity === null) {
      void signOut();
    }
  }, [authLoading, identity, isAuthenticated, signOut]);

  return (
    <AuthContext.Provider
      value={{
        user: identity ?? null,
        isLoading,
        isAuthenticated: isAuthenticated && identity !== null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
} {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return value;
}

export function useSignIn() {
  const { signIn } = useAuthActions();
  return signIn;
}

export function useSignOut() {
  const { signOut } = useAuthActions();
  return signOut;
}
