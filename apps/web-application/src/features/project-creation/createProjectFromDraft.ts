import { createProjectInputSchema } from "@/data-ops/schema";
import { parseInputDate } from "@/lib/format";
import { uploadFileToR2 } from "@/lib/r2Uploads";
import type { ProjectType } from "@/types";
import { buildPreparedProjectPayload, type ProjectDraft } from "../../../shared/project-creation";
import type { z } from "zod";

type MutationFn<TArgs, TResult> = (args: TArgs) => Promise<TResult>;
export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;

export async function buildProjectPayloadFromDraft({
  draft,
  activePhases,
  generateUploadUrl,
  syncMetadata,
  aiRoadmaps,
}: {
  draft: ProjectDraft;
  activePhases: typeof draft.phases;
  generateUploadUrl: Parameters<typeof uploadFileToR2>[0]["generateUploadUrl"];
  syncMetadata: Parameters<typeof uploadFileToR2>[0]["syncMetadata"];
  aiRoadmaps: Record<ProjectType, Array<{ name: string; tasks: string[] }>>;
}): Promise<CreateProjectInput> {
  if (!draft.projectType || !draft.method) {
    throw new Error("Project details are incomplete.");
  }

  const clientAvatarUrl = draft.pendingAvatarFile
    ? await uploadFileToR2({
        generateUploadUrl,
        syncMetadata,
        purpose: "client-avatar",
        file: draft.pendingAvatarFile,
      })
    : draft.clientAvatar?.trim() || undefined;

  const projectImageUrl = draft.pendingProjectImageFile
    ? await uploadFileToR2({
        generateUploadUrl,
        syncMetadata,
        purpose: "project-marker",
        file: draft.pendingProjectImageFile,
      })
    : draft.projectImage?.trim() || undefined;

  const payload = buildPreparedProjectPayload({
    projectName: draft.projectName,
    projectImageUrl,
    clientName: draft.clientName.trim() || draft.projectName.trim(),
    clientEmail: draft.clientEmail.trim() || undefined,
    clientAvatarUrl,
    projectType: draft.projectType,
    method: draft.method,
    startDate: parseInputDate(draft.startDate),
    endDate: parseInputDate(draft.endDate),
    activePhases,
    aiRoadmaps,
  });

  const parsedInput = createProjectInputSchema.safeParse(payload);
  if (!parsedInput.success) {
    throw new Error(parsedInput.error.issues[0]?.message ?? "Could not create the project.");
  }

  return parsedInput.data;
}

export async function createProjectFromDraft<TResult>({
  draft,
  activePhases,
  createProject,
  generateUploadUrl,
  syncMetadata,
  aiRoadmaps,
}: {
  draft: ProjectDraft;
  activePhases: typeof draft.phases;
  createProject: MutationFn<CreateProjectInput, TResult>;
  generateUploadUrl: Parameters<typeof uploadFileToR2>[0]["generateUploadUrl"];
  syncMetadata: Parameters<typeof uploadFileToR2>[0]["syncMetadata"];
  aiRoadmaps: Record<ProjectType, Array<{ name: string; tasks: string[] }>>;
}) {
  const payload = await buildProjectPayloadFromDraft({
    draft,
    activePhases,
    generateUploadUrl,
    syncMetadata,
    aiRoadmaps,
  });

  return createProject(payload);
}
