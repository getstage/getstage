import { readFileSync } from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";

function stageLandingHtml(): Plugin {
  const modules = {
    "virtual:stage-landing-home-html": path.resolve("public/landing-preview/index.html"),
    "virtual:stage-landing-download-html": path.resolve(
      "public/landing-preview/download/index.html",
    ),
  } as const;

  return {
    name: "stage-landing-html",
    resolveId(id) {
      if (id in modules) return id;
      return undefined;
    },
    load(id) {
      const file = modules[id as keyof typeof modules];
      if (!file) return undefined;
      this.addWatchFile(file);
      return `export default ${JSON.stringify(readFileSync(file, "utf8"))};`;
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [
    stageLandingHtml(),
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
    rollupOptions: {
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
