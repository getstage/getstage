import { useQuery } from "@tanstack/react-query";
import {
  projectContextSchema,
  summarizeProjectContext,
  type ProjectContext,
} from "@stage/data-ops";
import { useDesktopBridge } from "./useDesktopBridge";
import {
  selectedProjectContext,
  selectedProjectContextSummary,
} from "../project-context";

type SelectedProjectContextResult = {
  context: ProjectContext;
  error: unknown;
  isFallback: boolean;
  isLoading: boolean;
  summary: string;
};

export function useSelectedProjectContext(): SelectedProjectContextResult {
  const desktop = useDesktopBridge();
  const query = useQuery({
    queryKey: ["desktop", "project-context", "selected"],
    queryFn: async () => {
      const context = await desktop.projectContext.getSelected();
      return context ? projectContextSchema.parse(context) : null;
    },
    retry: 1,
  });
  const context = query.data ?? selectedProjectContext;
  const isFallback = !query.data;

  return {
    context,
    error: query.error,
    isFallback,
    isLoading: query.isLoading,
    summary: isFallback ? selectedProjectContextSummary : summarizeProjectContext(context),
  };
}
