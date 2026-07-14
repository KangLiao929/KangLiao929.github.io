import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: "static",
  base: "/projects/puffin-16m/",
  publicDir: false,
  plugins: [react()],
  build: {
    outDir: "../dist-static",
    emptyOutDir: true,
    sourcemap: false,
  },
});
