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

    return env.ASSETS.fetch(request);
  },
};
