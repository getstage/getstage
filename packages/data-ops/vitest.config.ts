import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({resolve:{alias:{"@":fileURLToPath(new URL("../../apps/web-application/src",import.meta.url))}}});
