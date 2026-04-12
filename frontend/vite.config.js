import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/voice": "http://localhost:5000",
      "/text": "http://localhost:5000",
      "/query": "http://localhost:5000",
      "/ingest": "http://localhost:5000",
      "/health": "http://localhost:5000",
    },
  },
});
