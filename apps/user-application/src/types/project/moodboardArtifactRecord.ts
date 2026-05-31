import type { MoodboardArtifact } from "@stage/data-ops/contracts";
import type { MoodboardTabData } from "@/types/project/moodboardTab";

export type MoodboardArtifactRecord = {
  id: string;
  projectId: string;
  runId: string | null;
  title: string;
  summary: string | null;
  status: string;
  createdAt: number;
  updatedAt: number;
  artifact: MoodboardArtifact;
  tabData: MoodboardTabData;
};
