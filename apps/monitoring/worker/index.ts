interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  GRAFANA_AUTH_ORIGIN?: string;
  MONITORING_ALLOWED_LOGIN?: string;
  AUTH_RATE_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> };
}
const grants = new Map<string, number>();
const headers = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
};
function deny(status = 401) {
  return new Response(status === 401 ? "Sign in with your Grafana testing account to open Stage Monitoring." : "Monitoring login is temporarily unavailable.", {
    status, headers: { ...headers, ...(status === 401 ? { "WWW-Authenticate": 'Basic realm="Stage Monitoring Testing", charset="UTF-8"' } : {}) },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const authorization = request.headers.get("Authorization");
    let origin: URL;
    try { origin = new URL(env.GRAFANA_AUTH_ORIGIN ?? ""); } catch { return deny(503); }
    if (origin.protocol !== "https:" || !/(?:^|[-.])testing(?:[-.]|$)/.test(origin.hostname)
      || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash
      || !env.MONITORING_ALLOWED_LOGIN || !env.AUTH_RATE_LIMITER) return deny(503);
    const encoded = /^Basic ([A-Za-z0-9+/=]{1,4096})$/i.exec(authorization ?? "")?.[1];
    if (!encoded || !authorization) return deny();
    try {
      const credentials = atob(encoded);
      const divider = credentials.indexOf(":");
      if (divider === -1 || credentials.slice(0, divider) !== env.MONITORING_ALLOWED_LOGIN || credentials.slice(divider + 1).length < 16) return deny();
    } catch { return deny(); }
    const digest = [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(authorization)))]
      .map(byte => byte.toString(16).padStart(2, "0")).join("");
    if ((grants.get(digest) ?? 0) <= Date.now()) {
      try {
        const permitted = await env.AUTH_RATE_LIMITER.limit({ key: request.headers.get("CF-Connecting-IP") ?? "unknown" });
        if (!permitted.success) return deny(429);
        const response = await fetch(`${origin.origin}/api/user`, {
          headers: { Authorization: authorization }, redirect: "manual", signal: AbortSignal.timeout(5000),
        });
        if (response.status !== 200) { await response.body?.cancel(); return deny(response.status === 401 || response.status === 403 ? 401 : 503); }
        const user: unknown = await response.json();
        if (!user || typeof user !== "object" || !("login" in user) || user.login !== env.MONITORING_ALLOWED_LOGIN
          || !("isGrafanaAdmin" in user) || user.isGrafanaAdmin !== true) return deny();
        if (grants.size >= 100) grants.clear();
        grants.set(digest, Date.now() + 30_000);
      } catch { return deny(503); }
    }
    // All assets, including lazy chunks and the embedded audit/spec, share this gate.
    const asset = await env.ASSETS.fetch(request);
    const secured = new Headers(asset.headers);
    for (const [key, value] of Object.entries(headers)) secured.set(key, value);
    return new Response(asset.body, { status: asset.status, statusText: asset.statusText, headers: secured });
  },
};
