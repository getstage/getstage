import type { ReactNode } from "react";
import { Navigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { PageLoading } from "@/components/shared/PageLoading";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/convex";
import { hasMcpPlan } from "@/lib/mcp";

// Projects and Integrations need a finished onboarding and a paid plan; otherwise /app takes over.
export function RequireApp({ path, children }: { path: string; children: ReactNode }) {
  const { isLoading, isAuthenticated, user } = useAuth();
  const state = useQuery(api.onboarding.getState, isAuthenticated ? {} : "skip");
  if (isLoading || (isAuthenticated && state === undefined)) return <PageLoading />;
  if (!isAuthenticated || !user || !state) return <Navigate to="/auth" search={{ redirect: path }} replace />;
  if (!state.isCompleted || !hasMcpPlan(user.plan)) return <Navigate to="/app" replace />;
  return children;
}
