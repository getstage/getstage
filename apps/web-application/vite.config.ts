import { readFileSync } from "node:fs";
import path from "node:path";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { LANDING_CSS_DIR, LANDING_CSS_FILES } from "./scripts/landing-css.mjs";

function stageLandingCss(): Plugin {
  const cssFiles = LANDING_CSS_FILES.map((file) => path.resolve(LANDING_CSS_DIR, file));

  return {
    name: "stage-landing-css",
    resolveId(id) {
      if (id === "virtual:stage-landing-css") return id;
      return undefined;
    },
    load(id) {
      if (id === "virtual:stage-landing-css") {
        const css = cssFiles.map((file) => {
          this.addWatchFile(file);
          return readFileSync(file, "utf8");
        });
        return `export default ${JSON.stringify(css.join("\n"))};`;
      }
      return undefined;
    },
  };
}

// Builds that ship must have the competitor-logo id (same Brandfetch client id as Stage for Mac).
// It lives in the untracked .env.<mode>.local, never in git.
// The marketing prerender (server-side build) never reaches the browser, so it doesn't need it.
function requireShippedEnv(command: string, mode: string, isSsrBuild: boolean | undefined) {
  if (command !== "build" || isSsrBuild || (mode !== "testing" && mode !== "production")) return;
  if (!loadEnv(mode, process.cwd(), "VITE_").VITE_BRANDFETCH_CLIENT_ID) {
    throw new Error(`VITE_BRANDFETCH_CLIENT_ID is missing: add it to apps/web-application/.env.${mode}.local (same value as the Mac app).`);
  }
}

export default defineConfig(({ command, mode, isSsrBuild }) => {
  requireShippedEnv(command, mode, isSsrBuild);
  return {
    plugins: [
      stageLandingCss(),
      tsconfigPaths(),
      TanStackRouterVite({
        routesDirectory: "./src/routes",
        generatedRouteTree: "./src/routeTree.gen.ts",
        autoCodeSplitting: true,
      }),
      react(),
      tailwindcss(),
    ],
    server: {
      port: 3000,
    },
    esbuild:
      mode === "production"
        ? {
            drop: ["console", "debugger"],
          }
        : undefined,
    build: {
      target: "esnext",
      // The SSR build only pre-renders marketing pages (scripts/prerender-marketing.mjs);
      // vendor chunking applies to the browser bundle.
      rollupOptions: isSsrBuild
        ? {}
        : {
            output: {
              manualChunks: {
                "react-vendor": ["react", "react-dom"],
                "router": ["@tanstack/react-router"],
                "query": ["@tanstack/react-query"],
                "motion": ["motion"],
              },
            },
          },
    },
  };
});
