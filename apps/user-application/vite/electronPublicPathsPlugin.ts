import type { Plugin } from "vite";

function rewritePublicAssetPaths(code: string) {
  return code
    .replace(/(['"`])\/logos\//g, "$1./logos/")
    .replace(/url\((['"]?)\/logos\//g, "url($1./logos/")
    .replace(/(['"`])\/apple-touch-icon\.png/g, "$1./apple-touch-icon.png");
}

export function electronPublicPathsPlugin(): Plugin {
  let shouldRewrite = false;

  return {
    name: "electron-public-paths",
    configResolved(config) {
      shouldRewrite = config.command === "build";
    },
    transform(code, id) {
      if (!shouldRewrite) {
        return;
      }

      if (id.includes("node_modules")) {
        return;
      }

      if (!/\.(tsx?|jsx?|css)$/.test(id)) {
        return;
      }

      if (!code.includes("/logos/") && !code.includes("/apple-touch-icon.png")) {
        return;
      }

      return {
        code: rewritePublicAssetPaths(code),
        map: null,
      };
    },
    transformIndexHtml(html) {
      return shouldRewrite ? rewritePublicAssetPaths(html) : html;
    },
  };
}
