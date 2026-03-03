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
const MOCK_OTP_CODE = "123456";
const MOCK_OTP_EMAIL_KEY = "stage.auth.pending_email";
const MOCK_AUTH_METHOD_KEY = "stage.auth.method";
const AUTH_METHODS = ["email_otp", "google"] as const;

export type AuthMethod = (typeof AUTH_METHODS)[number];
export type AuthSession = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  methods: AuthMethod[];
};

export type RequestEmailOtpInput = {
  email: string;
};

export type VerifyEmailOtpInput = {
  email: string;
  code: string;
};

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

export function useAuthSession(): AuthSession {
  // { Replace: Clerk's useUser() or Auth0's useAuth0() }
  const [isLoading] = useState(false);
  const user = AUTH_BYPASS_ENABLED ? MOCK_USER : null;
  return {
    user,
    isLoading,
    isAuthenticated: Boolean(user),
    methods: [...AUTH_METHODS],
  };
}

export function useAuth(): {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
} {
  const session = useAuthSession();
  return {
    user: session.user,
    isLoading: session.isLoading,
    isAuthenticated: session.isAuthenticated,
  };
}

// --- Auth actions ---

export async function requestEmailOtp(input: RequestEmailOtpInput): Promise<void> {
  // { Replace: Convex Auth / Better Auth email OTP flow }
  await new Promise((r) => setTimeout(r, 500));
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(MOCK_OTP_EMAIL_KEY, input.email);
    window.sessionStorage.setItem(MOCK_AUTH_METHOD_KEY, "email_otp");
  }
}

export async function verifyEmailOtp(
  input: VerifyEmailOtpInput,
): Promise<{ isNewUser: boolean }> {
  // { Replace: Convex Auth / Better Auth OTP verification }
  await new Promise((r) => setTimeout(r, 500));
  const pendingEmail =
    typeof window !== "undefined"
      ? window.sessionStorage.getItem(MOCK_OTP_EMAIL_KEY)
      : null;
  if (input.code !== MOCK_OTP_CODE || (pendingEmail && pendingEmail !== input.email)) {
    throw new Error("Invalid code");
  }
  return { isNewUser: false };
}

export async function signInWithGoogle(): Promise<void> {
  // { Replace: Convex Auth / Better Auth Google OAuth }
  await new Promise((r) => setTimeout(r, 500));
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(MOCK_AUTH_METHOD_KEY, "google");
  }
}

// Backwards-compatible wrappers during the transition.
export async function signIn(email: string): Promise<void> {
  return requestEmailOtp({ email });
}

export async function verifyCode(code: string): Promise<{ isNewUser: boolean }> {
  const email =
    typeof window !== "undefined"
      ? window.sessionStorage.getItem(MOCK_OTP_EMAIL_KEY) ?? MOCK_USER.email
      : MOCK_USER.email;
  return verifyEmailOtp({ email, code });
}

export async function signOut(): Promise<void> {
  // { Replace: Clerk/Auth0 signOut }
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(MOCK_OTP_EMAIL_KEY);
    window.sessionStorage.removeItem(MOCK_AUTH_METHOD_KEY);
  }
  window.location.href = "/";
}

export async function getCurrentUser(): Promise<User | null> {
  // { Replace: Clerk/Auth0 session check }
  return AUTH_BYPASS_ENABLED ? MOCK_USER : null;
}
