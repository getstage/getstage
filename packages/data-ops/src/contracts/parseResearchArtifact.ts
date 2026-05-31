import { researchArtifactSchema, type ResearchArtifact } from "./research";

export function parseResearchArtifactContent(contentJson: string): ResearchArtifact | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(contentJson) as unknown;
  } catch {
    return null;
  }

  const direct = researchArtifactSchema.safeParse(parsed);
  if (direct.success) {
    return direct.data;
  }

  // Engine embeds Refero metadata; drop it if only that subtree fails validation.
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const withoutRefero = { ...(parsed as Record<string, unknown>) };
    delete withoutRefero.referoContext;
    const fallback = researchArtifactSchema.safeParse(withoutRefero);
    if (fallback.success) {
      return fallback.data;
    }
  }

  return null;
}

export function formatResearchArtifactParseIssues(contentJson: string): string[] {
  try {
    const parsed = JSON.parse(contentJson) as unknown;
    const result = researchArtifactSchema.safeParse(parsed);
    if (result.success) {
      return [];
    }
    return result.error.issues.slice(0, 8).map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
      return `${path}: ${issue.message}`;
    });
  } catch (error) {
    return [error instanceof Error ? error.message : "Invalid JSON"];
  }
}
