import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  workers: 1,
  use: { baseURL: "http://127.0.0.1:4326", viewport: { width: 1280, height: 1000 }, trace: "retain-on-failure" },
  webServer: {
    command: "pnpm exec vite --config tests/flows-canvas/vite.config.ts --host 127.0.0.1 --port 4326 --strictPort",
    url: "http://127.0.0.1:4326",
    reuseExistingServer: false,
  },
});
