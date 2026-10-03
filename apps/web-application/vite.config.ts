import { readFileSync } from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
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

export default defineConfig(({ mode, isSsrBuild }) => ({
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
}));
