import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: "./",
  define: { __DEMO__: JSON.stringify(mode === "demo") },
  server: { proxy: { "/api": "http://127.0.0.1:3001" } },
}));
