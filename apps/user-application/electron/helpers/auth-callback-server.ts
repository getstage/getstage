import { createServer, type Server } from "node:http";
import { logDesktopInfo } from "./desktop-log";
import { desktopAuthHandoffSchema } from "@shared/models/desktop";
import {
  DEV_DESKTOP_AUTH_CALLBACK_HOST,
  DEV_DESKTOP_AUTH_CALLBACK_PATH,
  DEV_DESKTOP_AUTH_CALLBACK_PORT,
  getStageAuthUrlFromLocalCallback,
} from "./auth";
import type { DesktopAuthController } from "../auth";
import type { DesktopIntegrationsController } from "../integrations";

const DEV_DESKTOP_INTEGRATIONS_PATH_PREFIX = "/integrations/";

type DesktopAuthCallbackServerOptions = {
  authController: DesktopAuthController;
  integrationsController: DesktopIntegrationsController;
};

const DEV_DESKTOP_AUTH_LOGIN_PATH = "/login";
const HTML_HEADERS = {
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Private-Network": "true",
  "Content-Type": "text/html; charset=utf-8",
};

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

function parseDesktopAuthPayload(raw: string, contentType: string | undefined) {
  if (contentType?.includes("application/json")) {
    return JSON.parse(raw);
  }

  const params = new URLSearchParams(raw);
  return {
    code: params.get("code"),
    state: params.get("state"),
  };
}

export function createDesktopAuthCallbackServer({
  authController,
  integrationsController,
}: DesktopAuthCallbackServerOptions) {
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

        if (request.method === "OPTIONS") {
          response.writeHead(204, HTML_HEADERS);
          response.end();
          return;
        }

        if (requestUrl.pathname === DEV_DESKTOP_AUTH_LOGIN_PATH) {
          authController.openLogin()
            .then(() => {
              response.writeHead(200, HTML_HEADERS);
              response.end(htmlResponse("Stage Desktop login started", "Follow the browser sign-in flow."));
            })
            .catch((error: unknown) => {
              const message = error instanceof Error ? error.message : "Could not start desktop login.";
              response.writeHead(500, HTML_HEADERS);
              response.end(htmlResponse("Stage Desktop login failed", message));
            });
          return;
        }

        if (requestUrl.pathname !== DEV_DESKTOP_AUTH_CALLBACK_PATH) {
          if (requestUrl.pathname.startsWith(DEV_DESKTOP_INTEGRATIONS_PATH_PREFIX)) {
            integrationsController.handleCallbackUrl(requestUrl.toString());
            response.writeHead(200, HTML_HEADERS);
            response.end(
              htmlResponse(
                "Stage Desktop connected",
                "Your integration is connected. You can return to the Stage app.",
              ),
            );
            return;
          }

          response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
          response.end("Not found");
          return;
        }

        if (request.method === "POST") {
          const chunks: Buffer[] = [];

          request.on("data", (chunk: Buffer) => {
            chunks.push(chunk);
          });

          request.on("end", () => {
            try {
              const payload = desktopAuthHandoffSchema.parse(
                parseDesktopAuthPayload(
                  Buffer.concat(chunks).toString("utf8"),
                  request.headers["content-type"],
                ),
              );
              const stageUrl = getStageAuthUrlFromLocalCallback(requestUrl.toString());
              const callbackUrl = new URL(stageUrl);

              callbackUrl.searchParams.set("code", payload.code);
              callbackUrl.searchParams.set("state", payload.state);
              handleAuthCallback(callbackUrl.toString(), response);
            } catch (error) {
              const message = error instanceof Error ? error.message : "Invalid desktop auth payload.";
              response.writeHead(400, HTML_HEADERS);
              response.end(htmlResponse("Stage Desktop sign-in failed", message));
            }
          });
          return;
        }

        handleAuthCallback(getStageAuthUrlFromLocalCallback(requestUrl.toString()), response);
      });

      function handleAuthCallback(url: string, response: import("node:http").ServerResponse) {
        authController.handleCallbackUrl(url)
          .then((result) => {
            if (result.ok) {
              response.writeHead(200, HTML_HEADERS);
              response.end(htmlResponse("Stage Desktop connected", "You can return to the Stage app."));
              return;
            }

            response.writeHead(400, HTML_HEADERS);
            response.end(htmlResponse("Stage Desktop sign-in failed", result.error));
          })
          .catch((error: unknown) => {
            const message = error instanceof Error ? error.message : "Unknown desktop auth callback error.";
            console.warn(`[stage-auth] ${message}`);
            response.writeHead(500, HTML_HEADERS);
            response.end(htmlResponse("Stage Desktop sign-in failed", message));
          });
      }

      server.listen(
        DEV_DESKTOP_AUTH_CALLBACK_PORT,
        DEV_DESKTOP_AUTH_CALLBACK_HOST,
        () => {
          logDesktopInfo(
            "stage-auth",
            `local desktop auth callback server listening on http://${DEV_DESKTOP_AUTH_CALLBACK_HOST}:${DEV_DESKTOP_AUTH_CALLBACK_PORT}${DEV_DESKTOP_AUTH_CALLBACK_PATH}`,
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
