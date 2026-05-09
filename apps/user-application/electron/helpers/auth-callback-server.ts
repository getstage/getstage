import { createServer, type Server } from "node:http";
import {
  DEV_DESKTOP_AUTH_CALLBACK_HOST,
  DEV_DESKTOP_AUTH_CALLBACK_PATH,
  DEV_DESKTOP_AUTH_CALLBACK_PORT,
  getStageAuthUrlFromLocalCallback,
} from "./auth";
import type { DesktopAuthController } from "../auth";

function htmlResponse(title: string, body: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 48px; color: #111; }
      main { max-width: 520px; }
      h1 { font-size: 24px; margin: 0 0 12px; }
      p { color: #555; font-size: 15px; line-height: 1.5; }
    </style>
  </head>
  <body>
    <main>
      <h1>${title}</h1>
      <p>${body}</p>
    </main>
  </body>
</html>`;
}

export function createDesktopAuthCallbackServer(authController: DesktopAuthController) {
  let server: Server | null = null;

  return {
    start() {
      if (server) {
        return;
      }

      server = createServer((request, response) => {
        const requestUrl = new URL(
          request.url ?? DEV_DESKTOP_AUTH_CALLBACK_PATH,
          `http://${DEV_DESKTOP_AUTH_CALLBACK_HOST}:${DEV_DESKTOP_AUTH_CALLBACK_PORT}`,
        );

        if (requestUrl.pathname !== DEV_DESKTOP_AUTH_CALLBACK_PATH) {
          response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
          response.end("Not found");
          return;
        }

        authController.handleCallbackUrl(getStageAuthUrlFromLocalCallback(requestUrl.toString()))
          .then((result) => {
            if (result.ok) {
              response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
              response.end(htmlResponse("Stage Desktop connected", "You can return to the Stage app."));
              return;
            }

            response.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
            response.end(htmlResponse("Stage Desktop sign-in failed", result.error));
          })
          .catch((error: unknown) => {
            const message = error instanceof Error ? error.message : "Unknown desktop auth callback error.";
            console.warn(`[stage-auth] ${message}`);
            response.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
            response.end(htmlResponse("Stage Desktop sign-in failed", message));
          });
      });

      server.listen(
        DEV_DESKTOP_AUTH_CALLBACK_PORT,
        DEV_DESKTOP_AUTH_CALLBACK_HOST,
        () => {
          console.info(
            `[stage-auth] local desktop auth callback server listening on http://${DEV_DESKTOP_AUTH_CALLBACK_HOST}:${DEV_DESKTOP_AUTH_CALLBACK_PORT}${DEV_DESKTOP_AUTH_CALLBACK_PATH}`,
          );
        },
      );

      server.on("error", (error) => {
        console.warn(`[stage-auth] local desktop auth callback server failed: ${error.message}`);
      });
    },

    stop() {
      server?.close();
      server = null;
    },
  };
}
