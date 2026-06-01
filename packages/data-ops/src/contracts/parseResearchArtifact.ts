import {
  researchArtifactSchema,
  type ResearchMatrixScore,
  type ResearchArtifact,
} from "./research";

const MATRIX_SCORES: Record<string, ResearchMatrixScore> = {
  strong: "Strong",
  ok: "OK",
  weak: "Weak",
};

function parseStoredJson(contentJson: string): unknown | null {
  try {
    let parsed: unknown = JSON.parse(contentJson);
    if (typeof parsed === "string") {
      parsed = JSON.parse(parsed);
    }
    return parsed;
  } catch {
    return null;
  }
}

function normalizeMatrixScore(score: unknown): unknown {
  if (typeof score !== "string") {
    return score;
  }

  const trimmed = score.trim();
  if (trimmed === "Strong" || trimmed === "OK" || trimmed === "Weak") {
    return trimmed;
  }

  return MATRIX_SCORES[trimmed.toLowerCase()] ?? score;
}

function normalizeCompetitiveAnalysis(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }

  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.matrixRows)) {
    return value;
  }

  return {
    ...record,
    matrixRows: record.matrixRows.map((row) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) {
        return row;
      }

      const rowRecord = row as Record<string, unknown>;
      if (!Array.isArray(rowRecord.cells)) {
        return row;
      }

      return {
        ...rowRecord,
        cells: rowRecord.cells.map((cell) => {
          if (!cell || typeof cell !== "object" || Array.isArray(cell)) {
            return cell;
          }

          const cellRecord = cell as Record<string, unknown>;
          return {
            ...cellRecord,
            score: normalizeMatrixScore(cellRecord.score),
          };
        }),
      };
    }),
  };
}

function normalizeResearchArtifactPayload(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }

  const record = value as Record<string, unknown>;

  return {
    ...record,
    apiVersion: record.apiVersion ?? "v1",
    artifactKind: record.artifactKind ?? "researchArtifact",
    competitiveAnalysis: normalizeCompetitiveAnalysis(record.competitiveAnalysis),
  };
}

function tryParseArtifact(value: unknown): ResearchArtifact | null {
  const direct = researchArtifactSchema.safeParse(value);
  if (direct.success) {
    return direct.data;
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const withoutRefero = { ...(value as Record<string, unknown>) };
    delete withoutRefero.referoContext;
    const fallback = researchArtifactSchema.safeParse(withoutRefero);
    if (fallback.success) {
      return fallback.data;
    }
  }

  return null;
}

export function parseResearchArtifactContent(contentJson: string): ResearchArtifact | null {
  const parsed = parseStoredJson(contentJson);
  if (parsed === null) {
    return null;
  }

  const normalized = normalizeResearchArtifactPayload(parsed);
  return tryParseArtifact(normalized) ?? tryParseArtifact(parsed);
}

export function formatResearchArtifactParseIssues(contentJson: string): string[] {
  const parsed = parseStoredJson(contentJson);
  if (parsed === null) {
    return ["Invalid JSON"];
  }

  const normalized = normalizeResearchArtifactPayload(parsed);
  const result = researchArtifactSchema.safeParse(normalized);
  if (result.success) {
    return [];
  }

  return result.error.issues.slice(0, 8).map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
    return `${path}: ${issue.message}`;
  });
}
