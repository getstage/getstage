/** In local dev we use sessionStorage mocks; skip Convex artifact queries unless backend is wired. */
export const SHOULD_QUERY_PROJECT_AI_ARTIFACTS = !import.meta.env.DEV;
