import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // В dev: base = '/', в prod: base = '/static/react/' (FastAPI отдаёт статику)
  base: command === "build" ? "/static/react/" : "/",
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:8000",
      "/static": "http://localhost:8000",
    },
  },
  build: {
    outDir: "../app/static/react",
    emptyOutDir: true,
  },
}));
