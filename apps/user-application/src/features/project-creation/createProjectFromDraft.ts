import { createProjectInputSchema } from "@/data-ops/schema";
import { parseInputDate } from "@/lib/format";
import { uploadFileToR2 } from "@/lib/r2Uploads";
import type { ProjectType } from "@/types";
import { buildPreparedProjectPayload, type ProjectDraft } from "../../../shared/project-creation";

type MutationFn<TArgs, TResult> = (args: TArgs) => Promise<TResult>;

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
  createProject: MutationFn<ReturnType<typeof buildPreparedProjectPayload>, TResult>;
  generateUploadUrl: Parameters<typeof uploadFileToR2>[0]["generateUploadUrl"];
  syncMetadata: Parameters<typeof uploadFileToR2>[0]["syncMetadata"];
  aiRoadmaps: Record<ProjectType, Array<{ name: string; tasks: string[] }>>;
}) {
  if (!draft.projectType || !draft.method) {
    throw new Error("Project details are incomplete.");
  }

  let clientAvatarUrl: string | undefined;

  if (draft.pendingAvatarFile) {
    clientAvatarUrl = await uploadFileToR2({
      generateUploadUrl,
      syncMetadata,
      purpose: "client-avatar",
      file: draft.pendingAvatarFile,
    });
  } else if (draft.clientMode !== "existing") {
    const avatar = draft.clientAvatar?.trim();
    if (avatar && !avatar.startsWith("data:") && !avatar.startsWith("blob:")) {
      clientAvatarUrl = avatar;
    }
  }

  if (draft.clientMode !== "existing" && !clientAvatarUrl) {
    throw new Error("Upload a client photo to continue.");
  }

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
    clientEmail: draft.clientEmail.trim(),
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

  return createProject(parsedInput.data);
}
