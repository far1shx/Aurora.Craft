import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { electrobunViteAliases } from "./.hutch/devkit/api/config/electrobun-vite";
import packageJson from "./package.json";

export default defineConfig({
  root: ".",
  // views:// 下没有站点根，必须用相对路径
  base: "./",
  resolve: {
    alias: [
      // Electrobun SDK 由 Hutch 投影到 .hutch/devkit
      ...electrobunViteAliases(fileURLToPath(new URL("./.hutch/devkit", import.meta.url))),
      { find: /^@\/(.*)$/, replacement: fileURLToPath(new URL("./ui/$1", import.meta.url)) },
      { find: /^~\/(.*)$/, replacement: fileURLToPath(new URL("./main/$1", import.meta.url)) },
    ],
  },
  server: {
    // Electrobun 主进程用 127.0.0.1 探测，显式绑定 IPv4 回环
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    // Electrobun 的构建产物在项目内，必须排除，否则 Windows 上会 EBUSY
    watch: {
      ignored: ["**/build/**", "**/dist/**", "**/.hutch/**", "**/artifacts/**"],
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    assetsInlineLimit: 4096,
  },
  plugins: [react(), tailwindcss()],
  define: {
    "import.meta.env.APP_VERSION": JSON.stringify(packageJson.version),
  },
});
