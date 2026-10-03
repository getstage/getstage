import { z } from "zod";
import { contentProblems } from "./integrity";
import { contentSchema } from "./schema";
import content from "./content.json";

// Marketing content for getstage.co (content.json, edited in the repo).
// Validation runs in the pre-render, so invalid content fails the build before deploy.
function loadContent() {
  const parsed = contentSchema.safeParse(content);
  if (!parsed.success) {
    throw new Error(`content.json is invalid:\n${z.prettifyError(parsed.error)}`);
  }
  const problems = contentProblems(parsed.data);
  if (problems.length > 0) {
    throw new Error(`content.json has problems:\n- ${problems.join("\n- ")}`);
  }
  return parsed.data;
}

export const { pages, useCases, blogPosts, redirects } = loadContent();

export const USE_CASE_GROUP_LABELS = {
  audience: "Who it's for",
  workflow: "What you do",
} as const;

export const BLOG_CATEGORY_LABELS = {
  "case-study": "Case study",
  tools: "Tools",
  tutorial: "Tutorial",
  news: "News",
} as const;

export function findPage(slug: string) {
  return pages.find((page) => page.slug === slug);
}

export function findUseCase(slug: string) {
  return useCases.find((useCase) => useCase.slug === slug);
}

export function findBlogPost(slug: string) {
  return blogPosts.find((post) => post.slug === slug);
}

export * from "./paths";
export type * from "./schema";
