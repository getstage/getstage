import { useCallback, useRef } from "react";
import { useMutation } from "convex/react";
import type { Id } from "@stage/data-ops/convex/data-model";
import {
  MAX_BRIEF_FILES,
  type ResearchBriefAttachment,
  type ValidatedResearchConfigureInput,
} from "@/lib/project/researchConfigureInput";
import { api } from "@/lib/convexApi";
import { uploadFileToR2 } from "@/lib/r2Uploads";

export function useSaveResearchContext(projectId: string) {
  const upsertContext = useMutation(api.projectAi.upsertContext);
  const generateUploadUrl = useMutation(api.r2.generateUploadUrl);
  const syncMetadata = useMutation(api.r2.syncMetadata);
  const briefFilesRef = useRef<File[]>([]);

  const setBriefFile = useCallback((files: File[]) => {
    briefFilesRef.current = files.slice(0, MAX_BRIEF_FILES);
  }, []);

  const markBriefForRemoval = useCallback(() => {
    briefFilesRef.current = [];
  }, []);

  return {
    setBriefFile,
    markBriefForRemoval,
    saveResearchContext: useCallback(
      async (input: ValidatedResearchConfigureInput) => {
        const uploaded: ResearchBriefAttachment[] = [];
        for (const file of briefFilesRef.current) {
          const r2ObjectKey = await uploadFileToR2({
            generateUploadUrl,
            syncMetadata,
            purpose: "research-brief",
            file,
            scopeId: projectId,
          });
          uploaded.push({ name: file.name, r2ObjectKey });
        }

        const briefAttachments = [...(input.briefAttachments ?? []), ...uploaded]
          .filter((file) => file.name.trim() && file.r2ObjectKey.trim())
          .slice(0, MAX_BRIEF_FILES);
        const first = briefAttachments[0];

        await upsertContext({
          projectId: projectId as Id<"projects">,
          industry: input.industry,
          clientWebsite: input.website,
          competitorUrls: input.competitorUrls,
          detailsSections: input.detailsSections,
          referenceUrls: [],
          brief: input.projectBrief,
          notes: input.additionalNotes,
          briefAttachments,
          briefAttachmentName: first?.name ?? null,
          briefAttachmentR2ObjectKey: first?.r2ObjectKey ?? null,
        });

        briefFilesRef.current = [];
      },
      [generateUploadUrl, projectId, syncMetadata, upsertContext],
    ),
  };
}
