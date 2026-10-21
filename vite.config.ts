import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import packageJson from "./package.json";

export default defineConfig({
  root: ".",
  base: "./",
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./ui", import.meta.url)),
      "~": fileURLToPath(new URL("./main", import.meta.url)),
    },
  },
  server: { port: 5173, strictPort: true },
  plugins: [react(), tailwindcss()],
  define: {
    "import.meta.env.APP_VERSION": JSON.stringify(packageJson.version),
  },
});
