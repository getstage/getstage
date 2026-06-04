/**
 * Stage Engine writes generated project artifacts to Convex in both dev and prod.
 * Keep queries enabled by default so local AI runs immediately hydrate the tabs.
 * Set VITE_SKIP_PROJECT_AI_ARTIFACT_QUERIES=1 only for isolated mock/layout work.
 */
export const SHOULD_QUERY_PROJECT_AI_ARTIFACTS =
  import.meta.env.VITE_SKIP_PROJECT_AI_ARTIFACT_QUERIES !== "1";
