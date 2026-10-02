import { metaForPath } from "../src/marketing/pageMeta";
interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  CONVEX_HTTP_ORIGIN?: string;
}

const PROXY_PREFIXES = ["/api/", "/stripe/", "/integrations/"] as const;

function shouldProxy(pathname: string) {
  return PROXY_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function normalizeOrigin(origin: string | undefined) {
  return origin?.trim().replace(/\/+$/, "") ?? "";
}

function buildProxyUrl(requestUrl: URL, backendOrigin: string) {
  return new URL(`${requestUrl.pathname}${requestUrl.search}`, `${backendOrigin}/`);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const requestUrl = new URL(request.url);
    const backendOrigin = normalizeOrigin(env.CONVEX_HTTP_ORIGIN);

    if (shouldProxy(requestUrl.pathname)) {
      if (!backendOrigin) {
        return new Response(
          JSON.stringify({
            error: "Stage API proxy is not configured.",
            code: "missing_backend_origin",
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
      }

      const proxyUrl = buildProxyUrl(requestUrl, backendOrigin);
      return fetch(new Request(proxyUrl.toString(), request));
    }

    const assetResponse = await env.ASSETS.fetch(request);
    const pathname = requestUrl.pathname;
    const headers=new Headers(assetResponse.headers);
    const publicMeta=metaForPath(pathname);
    const production=['getstage.co','www.getstage.co'].includes(requestUrl.hostname);
    const privatePage=/^\/(auth|profile|builders|setup-profile|billing|invite|dashboard|settings|project|new-project|portal)(\/|$)/.test(pathname)||pathname.startsWith('/download/mac');
    if(!production||privatePage)headers.set('X-Robots-Tag','noindex, nofollow');
    // Unknown page URLs fall back to the SPA's index.html; real files (e.g. /blog/<id>.jpg) are served as-is.
    const isHtml=(assetResponse.headers.get('Content-Type')??'').startsWith('text/html');
    const missingPublicPage=isHtml&&/^\/(blog|use-cases|skills|component-libraries)(\/|$)/.test(pathname)&&!publicMeta;
    if(missingPublicPage&&assetResponse.status===200){
      headers.set('X-Robots-Tag','noindex, follow');
      headers.set('Content-Type','text/html; charset=utf-8');
      return new Response('<!doctype html><html lang="en"><head><meta name="robots" content="noindex"><title>Page not found | Stage</title></head><body><main><h1>Page not found</h1><p>This page is unavailable.</p><a href="/">Return to Stage</a></main></body></html>',{status:404,headers});
    }

    if (
      assetResponse.ok &&
      pathname.startsWith("/landing-preview/") &&
      /\.(?:css|js|woff2|png|jpe?g|svg|webp|mp4)$/i.test(pathname)
    ) {

      headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
      return new Response(assetResponse.body, {
        status: assetResponse.status,
        statusText: assetResponse.statusText,
        headers,
      });
    }
    return new Response(assetResponse.body,{status:assetResponse.status,statusText:assetResponse.statusText,headers});
  },
};
