import { useCallback, useRef } from "react";
import { useMutation } from "convex/react";
import type { Id } from "@stage/data-ops/convex/data-model";
import type { ValidatedResearchConfigureInput } from "@/lib/project/researchConfigureInput";
import { api } from "@/lib/convexApi";
import { uploadFileToR2 } from "@/lib/r2Uploads";

export function useSaveResearchContext(projectId: string) {
  const upsertContext = useMutation(api.projectAi.upsertContext);
  const generateUploadUrl = useMutation(api.r2.generateUploadUrl);
  const syncMetadata = useMutation(api.r2.syncMetadata);
  const briefFileRef = useRef<File | null>(null);
  const briefRemovalRequestedRef = useRef(false);

  const setBriefFile = useCallback((file: File | null) => {
    briefFileRef.current = file;
    if (file) {
      briefRemovalRequestedRef.current = false;
    }
  }, []);

  const markBriefForRemoval = useCallback(() => {
    briefFileRef.current = null;
    briefRemovalRequestedRef.current = true;
  }, []);

  return {
    setBriefFile,
    markBriefForRemoval,
    saveResearchContext: useCallback(
      async (input: ValidatedResearchConfigureInput) => {
        let briefAttachment:
          | { briefAttachmentName: string; briefAttachmentR2ObjectKey: string }
          | { briefAttachmentName: null; briefAttachmentR2ObjectKey: null }
          | Record<string, never> = {};

        if (briefFileRef.current) {
          const briefAttachmentR2ObjectKey = await uploadFileToR2({
            generateUploadUrl,
            syncMetadata,
            purpose: "research-brief",
            file: briefFileRef.current,
            scopeId: projectId,
          });
          briefAttachment = {
            briefAttachmentName: briefFileRef.current.name,
            briefAttachmentR2ObjectKey,
          };
        } else if (briefRemovalRequestedRef.current) {
          briefAttachment = {
            briefAttachmentName: null,
            briefAttachmentR2ObjectKey: null,
          };
        }

        await upsertContext({
          projectId: projectId as Id<"projects">,
          industry: input.industry,
          clientWebsite: input.website,
          competitorUrls: input.competitorUrls,
          referenceUrls: [],
          brief: input.projectBrief,
          notes: input.additionalNotes,
          ...briefAttachment,
        });

        briefFileRef.current = null;
        briefRemovalRequestedRef.current = false;
      },
      [generateUploadUrl, projectId, syncMetadata, upsertContext],
    ),
  };
}
