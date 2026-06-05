import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { electronPublicPathsPlugin } from "./vite/electronPublicPathsPlugin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const desktopBuildEnv = {
  "process.env.VITE_CONVEX_URL": JSON.stringify(process.env.VITE_CONVEX_URL ?? ""),
  "process.env.STAGE_DESKTOP_AUTH_URL": JSON.stringify(
    process.env.STAGE_DESKTOP_AUTH_URL ?? "",
  ),
  "process.env.STAGE_UPDATE_GITHUB_TOKEN": JSON.stringify(
    process.env.STAGE_UPDATE_GITHUB_TOKEN ?? "",
  ),
  "process.env.STAGE_DESKTOP_UPDATES_URL": JSON.stringify(
    process.env.STAGE_DESKTOP_UPDATES_URL ?? "",
  ),
};

export default defineConfig({
  main: {
    define: desktopBuildEnv,
    plugins: [externalizeDepsPlugin({ exclude: ["@stage/data-ops"] })],
    resolve: {
      alias: {
        "@shared": resolve(__dirname, "shared"),
      },
    },
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, "electron/main.ts"),
        },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin({ exclude: ["@stage/data-ops"] })],
    resolve: {
      alias: {
        "@shared": resolve(__dirname, "shared"),
      },
    },
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, "electron/preload.ts"),
        },
      },
    },
  },
  renderer: {
    root: ".",
    base: "./",
    envDir: __dirname,
    plugins: [react(), tailwindcss(), electronPublicPathsPlugin()],
    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
        "@shared": resolve(__dirname, "shared"),
        "@stage/data-ops/contracts": resolve(
          __dirname,
          "../../packages/data-ops/src/contracts/index.ts",
        ),
      },
    },
    optimizeDeps: {
      exclude: ["@stage/data-ops", "@stage/data-ops/contracts"],
    },
    build: {
      rollupOptions: {
        input: resolve(__dirname, "index.html"),
      },
    },
  },
});
