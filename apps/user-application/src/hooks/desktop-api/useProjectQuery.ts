import { useQuery } from "@tanstack/react-query";
import { projectDetailSchema, type ProjectDetail } from "@stage/data-ops";
import { useDesktopBridge } from "../useDesktopBridge";

export function useProjectQuery(projectId: string | undefined) {
  const desktop = useDesktopBridge();
  return useQuery<ProjectDetail>({
    queryKey: ["desktop", "api", "project", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      if (!projectId) {
        throw new Error("Missing project id.");
      }
      return projectDetailSchema.parse(await desktop.api.getProject(projectId));
    },
    retry: 1,
  });
}
