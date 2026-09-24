import { useMemo } from "react";
import { useQuery } from "convex/react";
import type { Id } from "@stage/data-ops/convex/data-model";
import type { ResearchConfigureFormValues } from "@/lib/project/researchConfigureInput";
import { DEFAULT_RESEARCH_CONFIGURE_FORM_VALUES } from "@/lib/project/researchConfigureInput";
import { useDesktopAuth } from "@/lib/auth";
import { api } from "@/lib/convexApi";

export function useResearchContext(projectId: string | undefined) {
  const { isAuthenticated, isLoading: isAuthLoading } = useDesktopAuth();
  const queryEnabled = isAuthenticated && Boolean(projectId);
  const record = useQuery(
    api.projectAi.getContext,
    queryEnabled ? { projectId: projectId as Id<"projects"> } : "skip",
  );

  const initialValues = useMemo<ResearchConfigureFormValues>(() => {
    if (!record) {
      return DEFAULT_RESEARCH_CONFIGURE_FORM_VALUES;
    }

    const attachments = record.briefAttachments
      ? record.briefAttachments
      : record.briefAttachmentR2ObjectKey
        ? [
            {
              name: record.briefAttachmentName ?? "Brief",
              r2ObjectKey: record.briefAttachmentR2ObjectKey,
            },
          ]
        : [];

    return {
      industry: record.industry ?? "",
      website: record.clientWebsite ?? "",
      projectBrief: record.brief ?? "",
      additionalNotes: record.notes ?? "",
      competitorUrls: record.competitorUrls ?? [],
      detailsSections: record.detailsSections ?? DEFAULT_RESEARCH_CONFIGURE_FORM_VALUES.detailsSections,
      briefFileNames: attachments.map((file) => file.name),
      briefAttachments: attachments,
    };
  }, [record]);

  return {
    initialValues,
    briefAttachmentUrl: record?.briefAttachmentUrl ?? null,
    isLoading: isAuthLoading || (queryEnabled && record === undefined),
  };
}
