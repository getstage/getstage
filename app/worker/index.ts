/**
 * Cloudflare Worker — Static SPA server
 *
 * For now this only serves the React SPA.
 * { Replace: add Hono for /api/* routes (auth, tRPC, webhooks) }
 */

interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  // { Replace: DATABASE_URL, AUTH_SECRET, STRIPE_KEY, etc. }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Serve static assets — SPA fallback handled by wrangler config
    return env.ASSETS.fetch(request);
  },
};
