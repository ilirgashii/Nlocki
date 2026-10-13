import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

process.env.VITE_BACKEND_CANISTER_ID ||= process.env.CANISTER_ID_BACKEND;
process.env.VITE_BACKEND_HOST ||= process.env.DFX_NETWORK === "ic" ? "https://icp-api.io" : "http://127.0.0.1:4943";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: { proxy: { "/api/auth": { target: process.env.AUTH_PROXY_TARGET || "http://127.0.0.1:3010", changeOrigin: false }, "/api": { target: process.env.API_PROXY_TARGET || "http://127.0.0.1:3010", changeOrigin: false } } },
  build: { sourcemap: false },
});
