// electron.vite.config.ts
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
var __electron_vite_injected_import_meta_url = "file:///Users/barnetvilem/Projects/getstage/apps/user-application/electron.vite.config.ts";
var __filename = fileURLToPath(__electron_vite_injected_import_meta_url);
var __dirname = dirname(__filename);
var electron_vite_config_default = defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: ["@stage/data-ops"] })],
    resolve: {
      alias: {
        "@shared": resolve(__dirname, "shared")
      }
    },
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, "electron/main.ts")
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin({ exclude: ["@stage/data-ops"] })],
    resolve: {
      alias: {
        "@shared": resolve(__dirname, "shared")
      }
    },
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, "electron/preload.ts")
        }
      }
    }
  },
  renderer: {
    root: ".",
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
        "@shared": resolve(__dirname, "shared")
      }
    },
    build: {
      rollupOptions: {
        input: resolve(__dirname, "index.html")
      }
    }
  }
});
export {
  electron_vite_config_default as default
};
