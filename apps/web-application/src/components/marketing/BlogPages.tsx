import { useState } from "react";
import { blogPosts, findBlogPost, type BlogPost } from "@/marketing/blogPosts";
import { BLOG_META } from "@/marketing/pageMeta";
import { findUseCase } from "@/marketing/useCases";
import { Breadcrumbs, MarketingLayout, TrialCallout } from "./MarketingLayout";
import { NotFoundContent } from "./NotFoundContent";

const dateFormat = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

function formatDate(isoDate: string) {
  return dateFormat.format(new Date(`${isoDate}T00:00:00Z`));
}

function secondsFromTimestamp(time: string) {
  return time.split(":").reduce((total, part) => total * 60 + Number(part), 0);
}

export function BlogIndexPage() {
  return (
    <MarketingLayout {...BLOG_META}>
      <header className="content-hero">
        <p className="eyebrow">Blog</p>
        <h1>Designing products with AI, step by step.</h1>
        <p className="content-lede">
          Case studies, tools and walkthroughs from the Stage team, with the full video for every
          post.
        </p>
      </header>
      <ul className="content-grid blog-grid" role="list">
        {blogPosts.map((post) => (
          <li key={post.slug}>
            <a className="blog-card" href={`/blog/${post.slug}`}>
              <img
                src={post.video.thumbnail}
                alt=""
                width={1280}
                height={720}
                loading="lazy"
                decoding="async"
              />
              <span className="blog-card-meta">
                {post.category} · <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
              </span>
              <strong>{post.title}</strong>
              <span>{post.description}</span>
            </a>
          </li>
        ))}
      </ul>
      <TrialCallout heading="See it on your own project." />
    </MarketingLayout>
  );
}

export function BlogPostPage({ slug }: { slug: string }) {
  const post = findBlogPost(slug);
  if (!post) {
    return <NotFoundContent backHref="/blog" backLabel="All posts" />;
  }

  return (
    <MarketingLayout title={post.metaTitle} description={post.description}>
      <article className="blog-post">
        <Breadcrumbs items={[{ label: "Blog", href: "/blog" }, { label: post.title }]} />
        <header className="content-hero blog-post-hero">
          <p className="eyebrow">
            {post.category} · <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>{" "}
            · {post.author}
          </p>
          <h1>{post.title}</h1>
          <p className="content-lede">{post.description}</p>
        </header>
        <BlogVideo post={post} />
        <div className="content-prose">
          {post.sections.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>
          ))}
        </div>
        <RelatedUseCases slugs={post.relatedUseCases} />
      </article>
      <TrialCallout heading="Try the workflow from this video." />
    </MarketingLayout>
  );
}

// Thumbnail first; the YouTube iframe only loads on click, from the chosen chapter.
function BlogVideo({ post }: { post: BlogPost }) {
  const [start, setStart] = useState<number | null>(null);
  const { youtubeId, thumbnail } = post.video;

  return (
    <section className="blog-video" aria-label="Video">
      <div className="blog-video-frame">
        {start === null ? (
          <button type="button" className="blog-video-poster" onClick={() => setStart(0)}>
            <img src={thumbnail} alt="" width={1280} height={720} decoding="async" />
            <span className="blog-video-play" aria-hidden="true" />
            <span className="sr-only">Play video: {post.title}</span>
          </button>
        ) : (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&start=${start}`}
            title={post.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )}
      </div>
      <nav className="blog-chapters" aria-label="Chapters">
        <h2>Chapters</h2>
        <ol>
          {post.chapters.map((chapter) => (
            <li key={chapter.time}>
              <button type="button" onClick={() => setStart(secondsFromTimestamp(chapter.time))}>
                <span>{chapter.time}</span>
                {chapter.label}
              </button>
            </li>
          ))}
        </ol>
      </nav>
    </section>
  );
}

function RelatedUseCases({ slugs }: { slugs: string[] }) {
  const related = slugs.flatMap((slug) => findUseCase(slug) ?? []);
  if (related.length === 0) return null;

  return (
    <section className="content-section" aria-labelledby="related-use-cases">
      <h2 className="content-group-title" id="related-use-cases">
        Related use cases
      </h2>
      <ul className="content-grid" role="list">
        {related.map((useCase) => (
          <li key={useCase.slug}>
            <a className="content-card" href={`/use-cases/${useCase.slug}`}>
              <strong>{useCase.label}</strong>
              <span>{useCase.summary}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
