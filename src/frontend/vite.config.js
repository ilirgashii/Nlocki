import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

process.env.VITE_BACKEND_CANISTER_ID ||= process.env.CANISTER_ID_BACKEND;
process.env.VITE_BACKEND_HOST ||= process.env.DFX_NETWORK === "ic" ? "https://icp-api.io" : "http://127.0.0.1:4943";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: { proxy: { "/api": { target: "http://127.0.0.1:4943", changeOrigin: true } } },
  build: { sourcemap: false },
});
