import type { ElectrobunConfig } from "electrobun";

export default {
  app: {
    name: "aurora.craft",
    identifier: "aurora.craft",
    version: "1.0.0-beta",
  },
  build: {
    mainProcess: "bun",
    bun: {
      entrypoint: "main/main.ts",
    },
    // Vite 产物：dist/index.html + dist/assets -> views/main
    copy: {
      "dist/index.html": "views/main/index.html",
      "dist/assets": "views/main/assets",
    },
    // Vite 产物由 HMR / 独立构建处理，避免 watch 模式重复触发
    watchIgnore: ["dist/**"],
    win: {
      icon: "ui/assets/icon.png",
      bundleCEF: false,
    },
    linux: {
      icon: "ui/assets/icon.png",
      bundleCEF: false,
    },
    mac: {
      bundleCEF: false,
    },
  },
  runtime: {
    exitOnLastWindowClosed: true,
  },
} satisfies ElectrobunConfig;
