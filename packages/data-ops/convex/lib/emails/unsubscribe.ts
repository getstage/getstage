import { httpAction } from "../../_generated/server";
import { internal } from "../../_generated/api";

// One-click unsubscribe landing page. The link in every email footer is
// {CONVEX_SITE_URL}/emails/unsubscribe?token=<emailUnsubscribeToken>. The token
// is generated lazily when the first email is scheduled (see handlers.ts) and
// stored on the user, so we never expose the userId in the URL.
//
// The mutation is idempotent: setting emailUnsubscribedAt twice is harmless,
// and shouldSkip() in the send path checks the flag so no further emails go out.
export const unsubscribeHandler = httpAction(async (ctx, req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return htmlResponse(MISSING_TOKEN_HTML, 400);
  }

  const result = await ctx.runMutation(internal.emails.setUnsubscribedByToken, { token });

  if (!result.ok) {
    return htmlResponse(INVALID_TOKEN_HTML, 404);
  }

  return htmlResponse(UNSUBSCRIBED_HTML, 200);
});

function htmlResponse(body: string, status: number) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

const UNSUBSCRIBED_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>You're unsubscribed · Stage</title>
    <style>
      body { margin: 0; background: #f7f7f7; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1a1a1a; }
      .card { max-width: 480px; margin: 64px auto; padding: 40px; background: #fff; border-radius: 12px; text-align: center; }
      h1 { font-size: 22px; margin: 0 0 12px; }
      p { font-size: 15px; line-height: 1.5; color: #555; margin: 0 0 16px; }
      a { color: #1a1a1a; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>You're unsubscribed</h1>
      <p>You won't receive any more product emails from Stage. This takes effect immediately.</p>
      <p><a href="https://getstage.co">Back to Stage</a></p>
    </div>
  </body>
</html>`;

const MISSING_TOKEN_HTML = `<!doctype html><html lang="en"><body><p>This unsubscribe link is incomplete. Reply to any Stage email if you'd like to opt out.</p></body></html>`;

const INVALID_TOKEN_HTML = `<!doctype html><html lang="en"><body><p>This unsubscribe link is invalid or has expired. Reply to any Stage email if you'd like to opt out.</p></body></html>`;
