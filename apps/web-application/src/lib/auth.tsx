/**
 * Auth — Convex Auth Integration
 *
 * Centralizes auth state via Convex Auth.
 * Components and routes only import from this file.
 */

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@/lib/convex";
import { getDatafastCheckoutMetadata } from "@/lib/datafast";

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

  // Attach the DataFast visitor id to the user right after signup so the email
  // engine can detect Mac vs Windows at send time (drives the download-reminder
  // skip). The mutation is idempotent, and we only fire it once per session.
  const attachDatafastVisitor = useMutation(api.emails.attachDatafastVisitor);
  const datafastAttachedRef = useRef(false);
  useEffect(() => {
    if (authLoading || !isAuthenticated || identity === undefined || identity === null || datafastAttachedRef.current) {
      return;
    }
    const { datafastVisitorId } = getDatafastCheckoutMetadata();
    if (!datafastVisitorId) {
      return;
    }
    datafastAttachedRef.current = true;
    void attachDatafastVisitor({ datafastVisitorId }).catch((error) => {
      console.error("[emails] attachDatafastVisitor failed", error);
    });
  }, [authLoading, isAuthenticated, identity, attachDatafastVisitor]);

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
