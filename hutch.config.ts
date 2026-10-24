export default {
  packageManager: "bun",
  scripts: {
    install: ["bun", "install"],
    prepare: ["hutch", "electrobun", "prepare"],
    "vite:dev": ["bunx", "vite", "--port", "5173"],
    "vite:build": ["bunx", "vite", "build"],
    "ensure:views": ["bun", "scripts/ensure-views.ts"],
    dev: ["bunx", "concurrently", "hutch run vite:dev", "hutch run app:dev"],
    "app:dev": "hutch run prepare && hutch run ensure:views && hutch electrobun dev",
    "dev:watch": "hutch run prepare && hutch run vite:build && hutch electrobun dev --watch",
    build: "hutch run prepare && hutch run vite:build && hutch electrobun build --env=stable",
  },
};
