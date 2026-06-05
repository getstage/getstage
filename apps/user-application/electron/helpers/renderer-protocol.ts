import { net, protocol } from "electron";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const SCHEME = "app";
const HOST = "stage";

export function registerRendererProtocolSchemes() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: SCHEME,
      privileges: {
        secure: true,
        standard: true,
        supportFetchAPI: true,
        corsEnabled: true,
      },
    },
  ]);
}

export function installRendererProtocol(rendererRoot: string) {
  protocol.handle(SCHEME, (request) => {
    const url = new URL(request.url);
    const relativePath = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";
    const filePath = join(rendererRoot, relativePath);

    return net.fetch(pathToFileURL(filePath).toString());
  });
}

export function rendererAppUrl(relativePath = "index.html", query?: Record<string, string>) {
  const url = new URL(`${SCHEME}://${HOST}/${relativePath}`);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return url.toString();
}
