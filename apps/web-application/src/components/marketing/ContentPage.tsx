import { blogPosts, findPage, useCases, type Page, type PageBlock } from "@/marketing/content";
import { BlogCards, YouTubeVideo } from "./BlogPages";
import { linkProps } from "./links";
import { MarketingLayout } from "./MarketingLayout";
import { NotFoundContent } from "./NotFoundContent";
import { RichText } from "./RichText";
import { UseCaseCards } from "./UseCasePages";

// A marketing page from content.json (getstage.co/<slug>): a stack of blocks, each
// mapped to the same markup and styles as the use-case and blog pages.
export function ContentPage({ slug }: { slug: string }) {
  const page = findPage(slug);
  if (!page) {
    return <NotFoundContent backHref="/" backLabel="Home" />;
  }

  return (
    <MarketingLayout title={page.seo.metaTitle} description={page.seo.metaDescription}>
      <PageBlocks page={page} />
    </MarketingLayout>
  );
}

function PageBlocks({ page }: { page: Page }) {
  return page.blocks.map((block, index) => <Block key={`${block.type}-${index}`} block={block} />);
}

function Block({ block }: { block: PageBlock }) {
  switch (block.type) {
    case "hero":
      return (
        <header className="content-hero">
          {block.eyebrow && <p className="eyebrow">{block.eyebrow}</p>}
          <h1>{block.heading}</h1>
          {block.lede && <p className="content-lede">{block.lede}</p>}
          {block.buttonLabel && block.buttonHref && (
            <a className="button button-primary" {...linkProps(block.buttonHref)}>
              {block.buttonLabel}
            </a>
          )}
        </header>
      );
    case "richText":
      return (
        <section className="content-section content-prose">
          {block.heading && <h2>{block.heading}</h2>}
          <RichText nodes={block.body} />
        </section>
      );
    case "steps":
      return (
        <section className="content-section">
          <h2>{block.heading}</h2>
          <ol className="content-steps">
            {block.items.map((step) => (
              <li key={step.title}>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </section>
      );
    case "checklist":
      return (
        <section className="content-section content-prose">
          <h2>{block.heading}</h2>
          <ul className="content-checks">
            {block.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      );
    case "faq":
      return (
        <section className="content-section content-prose">
          <h2>{block.heading}</h2>
          {block.items.map((item) => (
            <details key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </section>
      );
    case "cardGrid":
      return (
        <section className="content-section">
          {block.heading && <h2 className="content-group-title">{block.heading}</h2>}
          <ul className="content-grid" role="list">
            {block.items.map((card) => (
              <li key={card.title}>
                <a className="content-card" {...linkProps(card.href)}>
                  <strong>{card.title}</strong>
                  <span>{card.body}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      );
    case "useCaseLinks":
      return (
        <section className="content-section">
          <h2 className="content-group-title">{block.heading}</h2>
          <UseCaseCards
            items={block.group === "all" ? useCases : useCases.filter((useCase) => useCase.group === block.group)}
          />
        </section>
      );
    case "blogList":
      return (
        <section className="content-section">
          <h2 className="content-group-title">{block.heading}</h2>
          <BlogCards posts={blogPosts.slice(0, block.limit)} />
        </section>
      );
    case "video":
      return (
        <YouTubeVideo youtubeId={block.youtubeId} title={block.title} thumbnail={block.thumbnail} chapters={[]} />
      );
    case "image":
      return (
        <figure className="content-figure">
          <img
            src={block.image.url}
            alt={block.image.alt}
            width={block.image.width}
            height={block.image.height}
            loading="lazy"
            decoding="async"
          />
          {block.caption && <figcaption>{block.caption}</figcaption>}
        </figure>
      );
    case "cta":
      return (
        <section className="content-cta">
          <h2>{block.heading}</h2>
          {block.body && <p>{block.body}</p>}
          <a className="button button-primary" {...linkProps(block.buttonHref)}>
            {block.buttonLabel}
          </a>
        </section>
      );
  }
}
