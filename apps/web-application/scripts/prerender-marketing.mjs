// Post-build step: writes a static HTML file per marketing page into dist/, plus
// sitemap.xml and _redirects. Cloudflare serves dist/blog/<slug>.html at
// /blog/<slug>; the SPA then mounts over the same markup. Run after `vite build`.
import { build } from "vite";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { LANDING_CSS_FILES } from "./landing-css.mjs";

const DIST = path.resolve("dist");
const SSR_OUT = path.resolve(".prerender");

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function setTag(html, pattern, replacement) {
  if (!pattern.test(html)) throw new Error(`Template is missing ${pattern}`);
  return html.replace(pattern, replacement);
}

function setMeta(html, attr, key, value) {
  const pattern = new RegExp(`<meta ${attr}="${key}" content="[^"]*" />`);
  return setTag(html, pattern, `<meta ${attr}="${key}" content="${escapeHtml(value)}" />`);
}

function renderDocument(template, { meta, body, absoluteUrl }) {
  const url = absoluteUrl(meta.path === "/marketplace" ? "/component-libraries" : meta.path);
  const image = absoluteUrl(meta.image);
  let html = template;
  html = setTag(html, /<html lang="en">/, '<html lang="en" class="stage-landing-page">');
  html = setTag(html, /<title>[^<]*<\/title>/, `<title>${escapeHtml(meta.title)}</title>`);
  html = setMeta(html, "name", "description", meta.description);
  html = setMeta(html, "name", "robots", meta.noIndex ? "noindex, follow" : "index, follow, max-image-preview:large");
  html = setTag(html, /<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${url}" />`);
  html = setMeta(html, "property", "og:type", meta.type);
  html = setMeta(html, "property", "og:url", url);
  html = setMeta(html, "property", "og:title", meta.title);
  html = setMeta(html, "property", "og:description", meta.description);
  html = setMeta(html, "property", "og:image", image);
  html = setMeta(html, "property", "og:image:alt", meta.title);
  html = setMeta(html, "name", "twitter:title", meta.title);
  html = setMeta(html, "name", "twitter:description", meta.description);
  html = setMeta(html, "name", "twitter:image", image);
  html = setMeta(html, "name", "twitter:image:alt", meta.title);
  // Page-specific images are YouTube thumbnails (1280x720), not the 1200x630 card.
  html = html.replace(/\s*<meta property="og:image:(type|width|height)" content="[^"]*" \/>/g, "");
  html = setTag(
    html,
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    meta.jsonLd
      .map((entry) => `<script type="application/ld+json">${JSON.stringify(entry).replaceAll("<", "\\u003c")}</script>`)
      .join("\n  "),
  );
  const styles = LANDING_CSS_FILES.map(
    (file) => `<link rel="stylesheet" href="/landing-preview/${file}" />`,
  ).join("\n  ");
  html = setTag(html, /<\/head>/, `  ${styles}\n</head>`);
  html = setTag(html, /<body>/, `<body class="${meta.path === '/' ? '' : meta.path === '/download' ? 'download-page' : 'content-page'}">`);
  html = setTag(html, /<div id="root"><\/div>/, `<div id="root">${body}</div>`);
  return html;
}

function sitemap(entries) {
  const urls = entries
    .map((loc) => `  <url><loc>${loc}</loc></url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

async function main() {
  await build({
    logLevel: "warn",
    build: { ssr: "src/marketing/prerender.tsx", outDir: SSR_OUT, emptyOutDir: true },
  });

  try {
    const entry = await import(pathToFileURL(path.join(SSR_OUT, "prerender.js")).href);
    const template = await readFile(path.join(DIST, "index.html"), "utf8");

    for (const pagePath of entry.marketingPaths) {
      const meta = entry.metaForPath(pagePath);
      if (!meta) throw new Error(`No metadata for ${pagePath}`);
      const html = renderDocument(template, {
        meta,
        body: entry.renderPath(pagePath),
        absoluteUrl: entry.absoluteUrl,
      });
      const file = path.join(DIST, pagePath === "/" ? "index.html" : `${pagePath}.html`);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, html);
    }

    const indexedPaths = entry.marketingPaths.filter((pagePath) => !entry.metaForPath(pagePath).noIndex);
    const sitemapUrls = indexedPaths.map((pagePath) => entry.absoluteUrl(pagePath));
    await writeFile(path.join(DIST, "sitemap.xml"), sitemap(sitemapUrls));

    // Old URLs of renamed pages (Cloudflare static assets _redirects format).
    const redirectLines = entry.redirects.map((redirect) => `${redirect.from} ${redirect.to} 301`);
    await writeFile(path.join(DIST, "_redirects"), redirectLines.length ? `${redirectLines.join("\n")}\n` : "");

    console.log(
      `Pre-rendered ${entry.marketingPaths.length} marketing pages, sitemap.xml and ${redirectLines.length} redirects`,
    );
  } finally {
    await rm(SSR_OUT, { recursive: true, force: true });
  }
}

await main();
