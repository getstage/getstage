import { renderToStaticMarkup } from "react-dom/server";
import { BlogIndexPage, BlogPostPage } from "@/components/marketing/BlogPages";
import { UseCasePage, UseCasesIndexPage } from "@/components/marketing/UseCasePages";

// SSR entry for scripts/prerender-marketing.mjs. Renders the same components the
// SPA mounts, so crawlers and link previews get the full page without JavaScript.
export { marketingPaths, metaForPath } from "./pageMeta";
export { SITE_URL, absoluteUrl } from "./site";

function pageForPath(path: string) {
  if (path === "/use-cases") return <UseCasesIndexPage />;
  if (path === "/blog") return <BlogIndexPage />;
  const [, section, slug] = path.split("/");
  if (section === "use-cases" && slug) return <UseCasePage slug={slug} />;
  if (section === "blog" && slug) return <BlogPostPage slug={slug} />;
  throw new Error(`No marketing page for ${path}`);
}

export function renderPath(path: string) {
  return renderToStaticMarkup(pageForPath(path));
}
