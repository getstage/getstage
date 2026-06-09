import type { Id, TableNames } from "../../convex/_generated/dataModel";

/** Snapshot and fixture ids used in UI mocks — never valid Convex document ids. */
const MOCK_DOCUMENT_ID_PATTERN =
  /^(task|phase|project|mock)(-\d+|-[a-z0-9-]+)?$/i;

/**
 * Returns true when `value` looks like a Convex database document id.
 * Rejects known mock/snapshot ids (e.g. "task-3") before they reach Convex queries.
 */
export function isConvexDocumentId(value: string): boolean {
  if (!value) return false;
  if (MOCK_DOCUMENT_ID_PATTERN.test(value)) return false;
  if (!/^[a-z0-9]+$/.test(value)) return false;
  return value.length >= 10;
}

export function parseConvexId<TableName extends TableNames>(
  value: string | undefined | null,
): Id<TableName> | null {
  if (!value || !isConvexDocumentId(value)) return null;
  return value as Id<TableName>;
}

export function parseConvexTaskId(
  value: string | undefined | null,
): Id<"tasks"> | null {
  return parseConvexId<"tasks">(value);
}
