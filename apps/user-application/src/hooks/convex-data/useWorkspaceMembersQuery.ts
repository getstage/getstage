import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { z } from "zod";
import type { Id } from "@stage/data-ops/convex/data-model";
import { useDesktopAuth } from "@/lib/auth";
import { api } from "@/lib/convexApi";

const workspaceMemberSchema = z.object({
  _id: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  avatarUrl: z.string().nullable().optional(),
  overLimit: z.boolean(),
});

const workspaceMembersSchema = z.array(workspaceMemberSchema);

const workspaceInviteSchema = z.object({
  _id: z.string(),
  email: z.string(),
  expiresAt: z.number(),
  createdAt: z.number(),
});

const workspaceInvitesSchema = z.array(workspaceInviteSchema);

export type WorkspaceMember = z.infer<typeof workspaceMemberSchema>;
export type WorkspaceInvite = z.infer<typeof workspaceInviteSchema>;

// Members of the current user's workspace (the people they invited). The owner
// is not included — the caller renders the owner row separately.
export function useWorkspaceMembersQuery(ownerUserId?: string | null) {
  const { isAuthenticated, isLoading: isAuthLoading } = useDesktopAuth();
  const { data: members, isPending } = useQuery(
    convexQuery(
      api.workspaceMembers.list,
      isAuthenticated
        ? ownerUserId
          ? { ownerUserId: ownerUserId as Id<"users"> }
          : {}
        : "skip",
    ),
  );
  const data = useMemo<WorkspaceMember[] | undefined>(
    () => (members === undefined ? undefined : workspaceMembersSchema.parse(members)),
    [members],
  );

  return {
    data,
    isLoading: isAuthLoading || (isAuthenticated && isPending),
    error: null,
  };
}

export function useWorkspaceInvitesQuery(ownerUserId?: string | null) {
  const { isAuthenticated, isLoading: isAuthLoading } = useDesktopAuth();
  const { data: invites, isPending } = useQuery(
    convexQuery(
      api.workspaceMembers.listPending,
      isAuthenticated
        ? ownerUserId
          ? { ownerUserId: ownerUserId as Id<"users"> }
          : {}
        : "skip",
    ),
  );
  const data = useMemo<WorkspaceInvite[] | undefined>(
    () => (invites === undefined ? undefined : workspaceInvitesSchema.parse(invites)),
    [invites],
  );

  return {
    data,
    isLoading: isAuthLoading || (isAuthenticated && isPending),
    error: null,
  };
}
