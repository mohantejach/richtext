import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@company/rich-text-web/styles.css": path.resolve(
        rootDir,
        "../../packages/web/src/styles.css",
      ),
      "@company/rich-text-web": path.resolve(
        rootDir,
        "../../packages/web/src/index.ts",
      ),
      "@company/rich-text-core": path.resolve(
        rootDir,
        "../../packages/core/src/index.ts",
      ),
    },
    dedupe: ["react", "react-dom"],
  },
  server: {
    port: 5173,
    host: true,
  },
});
