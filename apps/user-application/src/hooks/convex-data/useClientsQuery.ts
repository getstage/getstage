import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { z } from "zod";
import { useDesktopAuth } from "@/lib/auth";
import { api } from "@/lib/convexApi";

const clientSummarySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().optional(),
  avatarUrl: z.string().optional(),
  projectCount: z.number().int().nonnegative(),
});

const clientListSchema = z.array(clientSummarySchema);

export type ClientSummary = z.infer<typeof clientSummarySchema>;

export function useClientsQuery() {
  const { isAuthenticated, isLoading: isAuthLoading } = useDesktopAuth();
  const { data: clients, isPending } = useQuery(
    convexQuery(api.clients.listForCurrentUser, isAuthenticated ? {} : "skip"),
  );
  const data = useMemo<ClientSummary[] | undefined>(
    () => clients === undefined ? undefined : clientListSchema.parse(clients),
    [clients],
  );

  return {
    data,
    isLoading: isAuthLoading || (isAuthenticated && isPending),
    error: null,
  };
}