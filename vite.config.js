import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/room-card.js"),
      name: "RoomCard",
      fileName: () => "room-card.js",
      formats: ["es"]
    },
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: "room-card.js"
      }
    }
  }
});
