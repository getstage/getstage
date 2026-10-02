import { useState } from "react";
import {
  BLOG_CATEGORY_LABELS,
  blogPostPath,
  blogPosts,
  findBlogPost,
  findUseCase,
  type BlogPost,
} from "@/marketing/content";
import { BLOG_META } from "@/marketing/pageMeta";
import { MarketingLayout, TrialCallout } from "./MarketingLayout";
import { NotFoundContent } from "./NotFoundContent";
import { RichText } from "./RichText";
import { UseCaseCards } from "./UseCasePages";

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
        <h1>Designing products with AI, step by step.</h1>
        <p className="content-lede">
          Case studies, tools and walkthroughs from the Stage team, with the full video for every
          post.
        </p>
      </header>
      <BlogCards posts={blogPosts} />
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
    <MarketingLayout title={post.seo.metaTitle} description={post.seo.metaDescription}>
      <article className="blog-post">
        <header className="content-hero blog-post-hero">
          <h1>{post.title}</h1>
          <p className="content-lede">{post.summary}</p>
          <p className="blog-post-attribution">By {post.author} · <time dateTime={post.date}>{formatDate(post.date)}</time></p>
        </header>
        <YouTubeVideo
          youtubeId={post.video.youtubeId}
          title={post.title}
          thumbnail={post.video.thumbnail}
          chapters={post.chapters}
        />
        <div className="content-prose">
          <RichText nodes={post.body} />
        </div>
        <RelatedUseCases slugs={post.relatedUseCases} />
      </article>
      <TrialCallout heading="Try the workflow from this video." />
    </MarketingLayout>
  );
}

export function BlogCards({ posts }: { posts: BlogPost[] }) {
  return (
    <ul className="content-grid blog-grid" role="list">
      {posts.map((post) => (
        <li key={post.slug}>
          <a className="blog-card" href={blogPostPath(post.slug)}>
            <img
              src={post.video.thumbnail}
              alt=""
              width={1280}
              height={720}
              loading="lazy"
              decoding="async"
            />
            <span className="blog-card-meta">
              <BlogPostMeta post={post} />
            </span>
            <strong>{post.title}</strong>
            <span>{post.summary}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function BlogPostMeta({ post }: { post: BlogPost }) {
  return (
    <>
      {BLOG_CATEGORY_LABELS[post.category]} · <time dateTime={post.date}>{formatDate(post.date)}</time>
    </>
  );
}

// Thumbnail first; the YouTube iframe only loads on click, from the chosen chapter.
export function YouTubeVideo({
  youtubeId,
  title,
  thumbnail,
  chapters,
}: {
  youtubeId: string;
  title: string;
  thumbnail: string;
  chapters: BlogPost["chapters"];
}) {
  const [start, setStart] = useState<number | null>(null);

  return (
    <section className="blog-video" aria-label="Video">
      <div className="blog-video-frame">
        {start === null ? (
          <button type="button" className="blog-video-poster" onClick={() => setStart(0)}>
            <img src={thumbnail} alt="" width={1280} height={720} decoding="async" />
            <span className="blog-video-play" aria-hidden="true" />
            <span className="sr-only">Play video: {title}</span>
          </button>
        ) : (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&start=${start}`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )}
      </div>
      {chapters.length > 0 && (
        <nav className="blog-chapters" aria-label="Chapters">
          <h2>Chapters</h2>
          <ol>
            {chapters.map((chapter) => (
              <li key={chapter.time}>
                <button type="button" onClick={() => setStart(secondsFromTimestamp(chapter.time))}>
                  <span>{chapter.time}</span>
                  {chapter.label}
                </button>
              </li>
            ))}
          </ol>
        </nav>
      )}
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
      <UseCaseCards items={related} />
    </section>
  );
}
