/**
 * Data Operations — Barrel export
 *
 * Structure:
 *   schema.ts    → Zod schemas (single source of truth)
 *   queries.ts   → Read operations  { Replace: Convex useQuery }
 *   mutations.ts → Write operations { Replace: Convex useMutation }
 *   mock.ts      → Mock data for development
 */

export * from "./queries";
export * from "./mutations";
export * from "./schema";
