import { blogPosts, findBlogPost } from "./blogPosts";
import { DEFAULT_OG_IMAGE, SITE_NAME, absoluteUrl } from "./site";
import { findUseCase, useCases } from "./useCases";

export type PageMeta = {
  path: string;
  title: string;
  description: string;
  image: string;
  type: "website" | "article";
  jsonLd: Array<Record<string, unknown>>;
};

export const USE_CASES_META = {
  title: "Use cases | Stage",
  description:
    "See how freelance designers, agencies, founders and vibe coders use Stage to research, set a direction and plan products before they build.",
};

export const BLOG_META = {
  title: "Blog | Stage",
  description:
    "Tutorials, case studies and tools for designing products with AI: research, visual direction, flows and briefs your coding agent follows.",
};

// Every public marketing page that is pre-rendered and listed in the sitemap.
export const marketingPaths = [
  "/use-cases",
  ...useCases.map((useCase) => `/use-cases/${useCase.slug}`),
  "/blog",
  ...blogPosts.map((post) => `/blog/${post.slug}`),
];

function breadcrumb(items: Array<{ name: string; path: string }>) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

function withContext(entries: Array<Record<string, unknown>>) {
  return [{ "@context": "https://schema.org", "@graph": entries }];
}

export function metaForPath(path: string): PageMeta | null {
  if (path === "/use-cases") {
    return {
      path,
      ...USE_CASES_META,
      image: DEFAULT_OG_IMAGE,
      type: "website",
      jsonLd: withContext([breadcrumb([{ name: "Use cases", path }])]),
    };
  }

  if (path === "/blog") {
    return {
      path,
      ...BLOG_META,
      image: DEFAULT_OG_IMAGE,
      type: "website",
      jsonLd: withContext([
        { "@type": "Blog", name: `${SITE_NAME} blog`, url: absoluteUrl(path) },
        breadcrumb([{ name: "Blog", path }]),
      ]),
    };
  }

  const useCaseSlug = path.match(/^\/use-cases\/([^/]+)$/)?.[1];
  const useCase = useCaseSlug ? findUseCase(useCaseSlug) : undefined;
  if (useCase) {
    return {
      path,
      title: useCase.metaTitle,
      description: useCase.metaDescription,
      image: DEFAULT_OG_IMAGE,
      type: "website",
      jsonLd: withContext([
        breadcrumb([
          { name: "Use cases", path: "/use-cases" },
          { name: useCase.label, path },
        ]),
        {
          "@type": "FAQPage",
          mainEntity: useCase.faq.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: { "@type": "Answer", text: item.answer },
          })),
        },
      ]),
    };
  }

  const postSlug = path.match(/^\/blog\/([^/]+)$/)?.[1];
  const post = postSlug ? findBlogPost(postSlug) : undefined;
  if (post) {
    const url = absoluteUrl(path);
    const image = absoluteUrl(post.video.thumbnail);
    return {
      path,
      title: post.metaTitle,
      description: post.description,
      image: post.video.thumbnail,
      type: "article",
      jsonLd: withContext([
        {
          "@type": "BlogPosting",
          headline: post.title,
          description: post.description,
          datePublished: post.publishedAt,
          author: { "@type": "Person", name: post.author },
          publisher: {
            "@type": "Organization",
            name: SITE_NAME,
            logo: { "@type": "ImageObject", url: absoluteUrl("/android-chrome-512x512.png") },
          },
          image,
          mainEntityOfPage: url,
        },
        {
          "@type": "VideoObject",
          name: post.title,
          description: post.description,
          thumbnailUrl: image,
          uploadDate: post.publishedAt,
          embedUrl: `https://www.youtube.com/embed/${post.video.youtubeId}`,
          contentUrl: `https://www.youtube.com/watch?v=${post.video.youtubeId}`,
          ...(post.video.duration ? { duration: post.video.duration } : {}),
        },
        breadcrumb([
          { name: "Blog", path: "/blog" },
          { name: post.title, path },
        ]),
      ]),
    };
  }

  return null;
}
