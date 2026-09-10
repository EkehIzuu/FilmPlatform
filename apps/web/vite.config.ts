import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@features": path.resolve(__dirname, "src/features"),
    },
  },
  server: {
    port: 3000,
    strictPort: true,
    host: true,
    open: true,
    proxy: {
      "/api": {
        target: process.env.VITE_LIVE_URL || "https://localhost:3001",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
