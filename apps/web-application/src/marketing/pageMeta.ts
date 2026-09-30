import {
  blogPostPath,
  blogPosts,
  findBlogPost,
  findPage,
  findUseCase,
  pagePath,
  pages,
  useCasePath,
  useCases,
  type Seo,
} from "./content";
import { DEFAULT_OG_IMAGE, SITE_NAME, absoluteUrl } from "./site";

export type PageMeta = {
  path: string;
  title: string;
  description: string;
  image: string;
  type: "website" | "article";
  // Rendered as <meta name="robots" content="noindex"> and left out of the sitemap.
  noIndex: boolean;
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

// Every public marketing page that is pre-rendered.
export const marketingPaths = [
  ...pages.map((page) => pagePath(page.slug)),
  "/use-cases",
  ...useCases.map((useCase) => useCasePath(useCase.slug)),
  "/blog",
  ...blogPosts.map((post) => blogPostPath(post.slug)),
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

function faqPage(items: Array<{ question: string; answer: string }>) {
  return {
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

function withContext(entries: Array<Record<string, unknown>>) {
  return [{ "@context": "https://schema.org", "@graph": entries }];
}

function seoMeta(seo: Seo, fallbackImage: string) {
  return {
    title: seo.metaTitle,
    description: seo.metaDescription,
    image: seo.shareImage ?? fallbackImage,
    noIndex: seo.noIndex,
  };
}

// "10:11" → "PT10M11S" (ISO 8601 duration for VideoObject).
function isoDuration(length: string) {
  const [seconds = 0, minutes = 0, hours = 0] = length.split(":").map(Number).reverse();
  return `PT${hours ? `${hours}H` : ""}${minutes ? `${minutes}M` : ""}${seconds}S`;
}

export function metaForPath(path: string): PageMeta | null {
  if (path === "/use-cases") {
    return {
      path,
      ...USE_CASES_META,
      image: DEFAULT_OG_IMAGE,
      type: "website",
      noIndex: false,
      jsonLd: withContext([breadcrumb([{ name: "Use cases", path }])]),
    };
  }

  if (path === "/blog") {
    return {
      path,
      ...BLOG_META,
      image: DEFAULT_OG_IMAGE,
      type: "website",
      noIndex: false,
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
      ...seoMeta(useCase.seo, DEFAULT_OG_IMAGE),
      type: "website",
      jsonLd: withContext([
        breadcrumb([
          { name: "Use cases", path: "/use-cases" },
          { name: useCase.label, path },
        ]),
        faqPage(useCase.faq),
      ]),
    };
  }

  const postSlug = path.match(/^\/blog\/([^/]+)$/)?.[1];
  const post = postSlug ? findBlogPost(postSlug) : undefined;
  if (post) {
    const url = absoluteUrl(path);
    const meta = seoMeta(post.seo, post.video.thumbnail);
    const image = absoluteUrl(meta.image);
    return {
      path,
      ...meta,
      type: "article",
      jsonLd: withContext([
        {
          "@type": "BlogPosting",
          headline: post.title,
          description: meta.description,
          datePublished: post.date,
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
          description: meta.description,
          thumbnailUrl: absoluteUrl(post.video.thumbnail),
          uploadDate: post.date,
          embedUrl: `https://www.youtube.com/embed/${post.video.youtubeId}`,
          contentUrl: `https://www.youtube.com/watch?v=${post.video.youtubeId}`,
          ...(post.video.length ? { duration: isoDuration(post.video.length) } : {}),
        },
        breadcrumb([
          { name: "Blog", path: "/blog" },
          { name: post.title, path },
        ]),
      ]),
    };
  }

  const pageSlug = path.match(/^\/([^/]+)$/)?.[1];
  const page = pageSlug ? findPage(pageSlug) : undefined;
  if (page) {
    const faqItems = page.blocks.flatMap((block) => (block.type === "faq" ? block.items : []));
    return {
      path,
      ...seoMeta(page.seo, DEFAULT_OG_IMAGE),
      type: "website",
      jsonLd: withContext([
        breadcrumb([{ name: page.title, path }]),
        ...(faqItems.length > 0 ? [faqPage(faqItems)] : []),
      ]),
    };
  }

  return null;
}
