import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        "room-card": resolve(__dirname, "src/room-card.js"),
        "room-card-editor": resolve(__dirname, "src/room-card-editor.js")
      },
      output: {
        entryFileNames: "[name].js",
        format: "es"
      }
    },
    outDir: "dist",
    emptyOutDir: true
  }
});
