/**
 * Auth — Convex Auth Integration
 *
 * Centralizes auth state via Convex Auth.
 * Components and routes only import from this file.
 */

import { useConvexAuth, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@/lib/convex";

export const AUTH_DEV_BYPASS_ENABLED =
  import.meta.env.VITE_AUTH_DEV_BYPASS === "true";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: string;
  plan: string;
};

export function useAuth(): {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
} {
  if (AUTH_DEV_BYPASS_ENABLED) {
    return {
      user: {
        id: "dev-user",
        email: "preview@usestage.com",
        name: "Stage Preview",
        avatarUrl: undefined,
        role: "freelancer",
        plan: "free",
      },
      isLoading: false,
      isAuthenticated: true,
    };
  }

  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();

  // Only fetch settings when authenticated
  const settingsData = useQuery(
    api.settings.getOverview,
    isAuthenticated ? {} : "skip",
  );

  const isLoading = authLoading || (isAuthenticated && settingsData === undefined);

  const user: AuthUser | null =
    isAuthenticated && settingsData
      ? {
          id: settingsData.profile.id,
          email: settingsData.profile.email,
          name: settingsData.profile.name,
          avatarUrl: settingsData.profile.avatarUrl ?? undefined,
          role: settingsData.profile.role,
          plan: settingsData.subscription?.plan ?? settingsData.profile.plan,
        }
      : null;

  return { user, isLoading, isAuthenticated };
}

export function useSignIn() {
  const { signIn } = useAuthActions();
  return signIn;
}

export function useSignOut() {
  const { signOut } = useAuthActions();
  return signOut;
}
