export type LandingDocument = {
  title: string;
  description: string;
  bodyClass: string;
  innerHtml: string;
};

const SCRIPT_TAG = /<script\b[\s\S]*?<\/script>/gi;

function decodeAttr(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"');
}

export function extractLandingDocument(html: string): LandingDocument {
  const title = decodeAttr(html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? "Stage");
  const description = decodeAttr(
    html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1] ?? "",
  );
  const bodyTag = html.match(/<body([^>]*)>/i)?.[1] ?? "";
  const bodyClass = bodyTag.match(/class="([^"]*)"/i)?.[1] ?? "";
  const innerHtml = html
    .replace(/^[\s\S]*?<body[^>]*>/i, "")
    .replace(/<\/body>[\s\S]*$/i, "")
    .replace(SCRIPT_TAG, "")
    .replaceAll("/landing-preview/download/", "/download")
    .replaceAll('href="/landing-preview/#', 'href="/#')
    .replaceAll('href="/landing-preview/"', 'href="/"')
    .replace('role="status"', 'id="download-status" role="status"');

  return { title, description, bodyClass, innerHtml };
}
