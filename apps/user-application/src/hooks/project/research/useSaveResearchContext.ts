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

  const setBriefFile = useCallback((file: File | null) => {
    briefFileRef.current = file;
  }, []);

  return {
    setBriefFile,
    saveResearchContext: useCallback(
      async (input: ValidatedResearchConfigureInput) => {
        let briefAttachmentR2ObjectKey: string | null = null;
        let briefAttachmentName: string | null = null;

        if (briefFileRef.current) {
          briefAttachmentR2ObjectKey = await uploadFileToR2({
            generateUploadUrl,
            syncMetadata,
            purpose: "research-brief",
            file: briefFileRef.current,
          });
          briefAttachmentName = briefFileRef.current.name;
        }

        await upsertContext({
          projectId: projectId as Id<"projects">,
          industry: input.industry,
          clientWebsite: input.website,
          competitorUrls: input.competitorUrls,
          referenceUrls: [],
          brief: input.projectBrief,
          notes: input.additionalNotes,
          briefAttachmentName,
          briefAttachmentR2ObjectKey,
        });
      },
      [generateUploadUrl, projectId, syncMetadata, upsertContext],
    ),
  };
}
