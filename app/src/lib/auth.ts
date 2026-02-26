/**
 * Auth — PLACEHOLDER
 *
 * { Replace: Clerk or Auth0 }
 *
 * All auth-related functions are centralized here.
 * Components and routes only import from this file.
 * When integrating auth: only this file needs to change.
 */

import { useState } from "react";
import type { User } from "@/types";

// TEMP: keep auth fully bypassed while building routes and UI.
export const AUTH_BYPASS_ENABLED = true;

// --- Mock user for development ---

const MOCK_USER: User = {
  id: "user_001",
  email: "werner@stage.com",
  name: "Werner Dieben",
  avatarUrl: "https://randomuser.me/api/portraits/men/46.jpg",
  role: "freelancer",
  plan: "pro",
  createdAt: Date.now() - 90 * 24 * 60 * 60 * 1000,
};

// --- Auth state hook ---

export function useAuth(): {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
} {
  // { Replace: Clerk's useUser() or Auth0's useAuth0() }
  const [isLoading] = useState(false);
  const user = AUTH_BYPASS_ENABLED ? MOCK_USER : null;
  return {
    user,
    isLoading,
    isAuthenticated: Boolean(user),
  };
}

// --- Auth actions ---

export async function signIn(_email: string): Promise<void> {
  // { Replace: Clerk/Auth0 passwordless email flow }
  await new Promise((r) => setTimeout(r, 500));
}

export async function verifyCode(
  _code: string,
): Promise<{ isNewUser: boolean }> {
  // { Replace: Clerk/Auth0 code verification }
  await new Promise((r) => setTimeout(r, 500));
  return { isNewUser: false };
}

export async function signOut(): Promise<void> {
  // { Replace: Clerk/Auth0 signOut }
  window.location.href = "/";
}

export async function getCurrentUser(): Promise<User | null> {
  // { Replace: Clerk/Auth0 session check }
  return AUTH_BYPASS_ENABLED ? MOCK_USER : null;
}
