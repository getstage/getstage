import { PUBLIC_WEB_PATHS } from "@/lib/publicWebPaths";
import { RESERVED_PAGE_SLUGS, blogPostPath, pagePath, useCasePath } from "./paths";
import type { Content, PageBlock, RichText } from "./schema";

// Cross-entry rules the schema cannot express. Every problem is collected so one
// failed build lists everything that needs fixing in content.json.
export function contentProblems(content: Content): string[] {
  const problems: string[] = [];
  const livePaths = new Set<string>(PUBLIC_WEB_PATHS);

  const claim = (path: string, owner: string) => {
    if (livePaths.has(path)) problems.push(`${owner}: ${path} is already used by another page`);
    livePaths.add(path);
  };

  for (const page of content.pages) {
    if (RESERVED_PAGE_SLUGS.has(page.slug)) {
      problems.push(`Page "${page.title}": /${page.slug} is reserved by the website`);
      continue;
    }
    claim(pagePath(page.slug), `Page "${page.title}"`);
  }
  for (const useCase of content.useCases) claim(useCasePath(useCase.slug), `Use case "${useCase.label}"`);
  for (const post of content.blogPosts) claim(blogPostPath(post.slug), `Blog post "${post.title}"`);

  const checkLink = (target: string, owner: string) => {
    if (!target.startsWith("/")) return;
    const path = target.split(/[?#]/)[0] ?? target;
    if (!livePaths.has(path)) problems.push(`${owner}: link to ${target} goes nowhere`);
  };

  for (const post of content.blogPosts) {
    for (const related of post.relatedUseCases) {
      if (!livePaths.has(useCasePath(related))) {
        problems.push(`Blog post "${post.title}": related use case "${related}" is not published`);
      }
    }
    for (const url of richTextLinks(post.body)) checkLink(url, `Blog post "${post.title}"`);
  }

  for (const page of content.pages) {
    for (const block of page.blocks) {
      for (const url of blockLinks(block)) checkLink(url, `Page "${page.title}"`);
    }
  }

  for (const redirect of content.redirects) {
    if (livePaths.has(redirect.from)) {
      problems.push(`Redirect ${redirect.from}: a live page uses this URL; delete the redirect`);
    }
    checkLink(redirect.to, `Redirect ${redirect.from}`);
  }

  return problems;
}

function blockLinks(block: PageBlock): string[] {
  switch (block.type) {
    case "hero":
      return block.buttonHref ? [block.buttonHref] : [];
    case "cta":
      return [block.buttonHref];
    case "cardGrid":
      return block.items.map((item) => item.href);
    case "richText":
      return richTextLinks(block.body);
    default:
      return [];
  }
}

function richTextLinks(nodes: RichText): string[] {
  return nodes.flatMap((node) => {
    switch (node.type) {
      case "paragraph":
      case "heading":
      case "quote":
        return node.children.flatMap((child) => (child.type === "link" ? [child.url] : []));
      case "list":
        return listLinks(node.children);
      default:
        return [];
    }
  });
}

function listLinks(items: Extract<RichText[number], { type: "list" }>["children"]): string[] {
  return items.flatMap((item) =>
    item.type === "list"
      ? listLinks(item.children)
      : item.children.flatMap((child) => (child.type === "link" ? [child.url] : [])),
  );
}
