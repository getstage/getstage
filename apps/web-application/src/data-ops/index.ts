/**
 * Data Operations — Barrel export
 *
 * Structure:
 *   schema.ts    → Zod schemas (single source of truth)
 *   queries.ts   → Legacy prototype reads  { deprecated }
 *   mutations.ts → Legacy prototype writes { deprecated }
 *   mock.ts      → Legacy prototype data   { deprecated }
 */

export * from "./queries";
export * from "./mutations";
export * from "./schema";
