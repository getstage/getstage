import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  main: {
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
    plugins: [react(), tailwindcss()],
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
