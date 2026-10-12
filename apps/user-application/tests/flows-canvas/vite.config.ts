import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  root: resolve(__dirname, "fixture"),
  publicDir: resolve(__dirname, "../../public"),
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": resolve(__dirname, "../../src") } },
  server: { fs: { allow: [resolve(__dirname, "../../../..")] } },
  optimizeDeps: { exclude: ["@stage/data-ops/contracts", "@stage/data-ops/domain"] },
});
