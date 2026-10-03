import { StageLandingPage } from "@/components/stage-landing/StageLandingPage";
import { StageDownloadPage } from "@/components/stage-landing/StageDownloadPage";
import { MarketplacePage, ResourceDetailPage } from "@/components/marketing/MarketplacePages";
import { renderToStaticMarkup } from "react-dom/server";
import { BlogIndexPage, BlogPostPage } from "@/components/marketing/BlogPages";
import { ContentPage } from "@/components/marketing/ContentPage";
import { UseCasePage, UseCasesIndexPage } from "@/components/marketing/UseCasePages";

// SSR entry for scripts/prerender-marketing.mjs. Renders the same components the
// SPA mounts, so crawlers and link previews get the full page without JavaScript.
export { redirects } from "./content";
export { marketingPaths, metaForPath } from "./pageMeta";
export { SITE_URL, absoluteUrl } from "./site";

function pageForPath(path: string) {
  if(path === "/")return <StageLandingPage/>;
  if(path === "/download")return <StageDownloadPage/>;
  if(path === "/marketplace") return <MarketplacePage overview />;
  if(path === "/component-libraries") return <MarketplacePage />;
  if(path === "/skills") return <MarketplacePage category="Skills" />;
  if(path === "/tools") return <MarketplacePage category="Tools" />;
  if(path.startsWith("/skills/") || path.startsWith("/component-libraries/")) return <ResourceDetailPage id={path.slice(1)} />;
  if (path === "/use-cases") return <UseCasesIndexPage />;
  if (path === "/blog") return <BlogIndexPage />;
  const [, section, slug] = path.split("/");
  if (section === "use-cases" && slug) return <UseCasePage slug={slug} />;
  if (section === "blog" && slug) return <BlogPostPage slug={slug} />;
  if (section && !slug) return <ContentPage slug={section} />;
  throw new Error(`No marketing page for ${path}`);
}

export function renderPath(path: string) {
  return renderToStaticMarkup(pageForPath(path));
}
