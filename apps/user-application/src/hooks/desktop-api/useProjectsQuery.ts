import { useQuery } from "@tanstack/react-query";
import { projectSummarySchema, type ProjectSummary } from "@stage/data-ops";
import { z } from "zod";
import { useDesktopBridge } from "../useDesktopBridge";

const projectListSchema = z.array(projectSummarySchema);

export function useProjectsQuery() {
  const desktop = useDesktopBridge();
  return useQuery<ProjectSummary[]>({
    queryKey: ["desktop", "api", "projects"],
    queryFn: async () => projectListSchema.parse(await desktop.api.listProjects()),
    retry: 1,
  });
}
