import { useMemo } from "react";
import { useQuery } from "convex/react";
import type { Id } from "@stage/data-ops/convex/data-model";
import { z } from "zod";
import { useDesktopAuth } from "@/lib/auth";
import { api } from "@/lib/convexApi";

const projectMemberSchema = z.object({
  userId: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  role: z.enum(["owner", "editor"]),
});

const projectMembersSchema = z.array(projectMemberSchema);

export type ProjectMember = z.infer<typeof projectMemberSchema>;

export function useProjectMembersQuery(projectId: string | undefined) {
  const { isAuthenticated, isLoading: isAuthLoading } = useDesktopAuth();
  const members = useQuery(
    api.tasks.getProjectMembers,
    isAuthenticated && projectId ? { projectId: projectId as Id<"projects"> } : "skip",
  );
  const data = useMemo<ProjectMember[] | undefined>(
    () => (members === undefined ? undefined : projectMembersSchema.parse(members)),
    [members],
  );

  return {
    data: data ?? [],
    isLoading: isAuthLoading || (isAuthenticated && Boolean(projectId) && members === undefined),
    error: null,
  };
}
