import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "originkit-dist",
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: "src/rizz-clickfx.tsx",
      output: {
        entryFileNames: "rizz-clickfx.js",
        assetFileNames: "rizz-clickfx.css"
      }
    }
  }
});