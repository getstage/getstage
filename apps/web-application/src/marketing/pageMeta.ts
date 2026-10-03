import { marketplaceIntroductions, type MarketplacePath } from "./marketplace/introductions";
import marketplaceCatalog from "./marketplace/catalog.json";
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
  title: "AI Product Design Solutions for Builders & Teams | Stage",
  description:
    "See how freelance designers, agencies, founders and vibe coders use Stage to research, set a direction and plan products before they build.",
};

export const BLOG_META = {
  title: "AI Product Design Guides & Tutorials | Stage",
  description:
    "Tutorials, case studies and tools for designing products with AI: research, visual direction, flows and briefs your coding agent follows.",
};

// Every public marketing page that is pre-rendered.
export const marketingPaths = [
  "/", "/download",
  "/marketplace", "/component-libraries", "/skills", "/tools",
  ...marketplaceCatalog.filter(item => item.type !== "Tools").map(item => "/" + item.id),
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
  path=path.replace(/\/+$/, "") || "/";
  const resource = marketplaceCatalog.find(item => "/" + item.id === path && item.type !== "Tools");
  const category = ({"/marketplace":"Marketplace","/component-libraries":"Component libraries","/skills":"Skills","/tools":"Tools"} as Record<string,string>)[path];
  if(resource || category) {
    const introduction = marketplaceIntroductions[path as MarketplacePath];
    const categoryPath=resource?.type==='Skills'?'/skills':'/component-libraries';
    const title=resource?`${resource.name} — ${resource.type==='Skills'?'AI Design Skill':'Component Library'} | Stage`:introduction.title;
    const description=resource?`${resource.description} Explore ${resource.name} on Stage and save it to your profile.`:introduction.description;
    const entries:Array<Record<string,unknown>>=[breadcrumb([{name:'Home',path:'/'},{name:resource?(resource.type==='Skills'?'Skills':'Component libraries'):category!,path:resource?categoryPath:path},...(resource?[{name:resource.name,path}]:[])])];
    if(resource)entries.push({'@type':'WebPage','@id':absoluteUrl(path)+'#webpage',url:absoluteUrl(path),name:title,description,about:{'@type':'CreativeWork',name:resource.name,description:resource.description,url:resource.officialUrl||absoluteUrl(path)}});
    else entries.push({'@type':'CollectionPage',url:absoluteUrl(path),name:title,description,mainEntity:{'@type':'ItemList',itemListElement:marketplaceCatalog.filter(item=>path==='/skills'?item.type==='Skills':path==='/tools'?item.type==='Tools':item.type==='Components').map((item,index)=>({'@type':'ListItem',position:index+1,name:item.name,url:absoluteUrl(item.url||item.officialUrl||path)}))}});
    return {path,title,description,image:resource?.banner??DEFAULT_OG_IMAGE,type:'website',noIndex:false,jsonLd:withContext(entries)};
  }
  if(path==='/'||path==='/download')return {path,title:path==='/'?'Stage | Think through your product before your AI builds it':'Download Stage for macOS | AI Product Design',description:path==='/'?'Work through research, strategy, visual direction, flows and wireframes in Stage for Mac. Export a Markdown brief for Cursor, Claude Code or Codex.':'Download Stage for macOS to research competitors, plan user flows and create design briefs for AI coding tools. Includes a 14-day free trial.',image:DEFAULT_OG_IMAGE,type:'website',noIndex:false,jsonLd:withContext([{'@type':'Organization','@id':absoluteUrl('/')+'#organization',name:SITE_NAME,url:absoluteUrl('/'),logo:absoluteUrl('/android-chrome-512x512.png')},{'@type':'WebSite','@id':absoluteUrl('/')+'#website',name:SITE_NAME,url:absoluteUrl('/')},{'@type':'WebPage',name:path==='/'?'Stage':'Download Stage for macOS',url:absoluteUrl(path)}])};

  if (path === "/use-cases") {
    return {
      path,
      ...USE_CASES_META,
      image: DEFAULT_OG_IMAGE,
      type: "website",
      noIndex: false,
      jsonLd: withContext([breadcrumb([{ name: "Solutions", path }])]),
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
          { name: "Solutions", path: "/use-cases" },
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
