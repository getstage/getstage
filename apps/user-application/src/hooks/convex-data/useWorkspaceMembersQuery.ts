import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { z } from "zod";
import { useDesktopAuth } from "@/lib/auth";
import { api } from "@/lib/convexApi";

const workspaceMemberSchema = z.object({
  _id: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
});

const workspaceMembersSchema = z.array(workspaceMemberSchema);

export type WorkspaceMember = z.infer<typeof workspaceMemberSchema>;

// Members of the current user's workspace (the people they invited). The owner
// is not included — the caller renders the owner row separately.
export function useWorkspaceMembersQuery() {
  const { isAuthenticated, isLoading: isAuthLoading } = useDesktopAuth();
  const { data: members, isPending } = useQuery(
    convexQuery(api.workspaceMembers.list, isAuthenticated ? {} : "skip"),
  );
  const data = useMemo<WorkspaceMember[] | undefined>(
    () => (members === undefined ? undefined : workspaceMembersSchema.parse(members)),
    [members],
  );

  return {
    data: data ?? [],
    isLoading: isAuthLoading || (isAuthenticated && isPending),
    error: null,
  };
}
