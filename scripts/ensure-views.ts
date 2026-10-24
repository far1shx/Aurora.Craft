/**
 * 确保 dist/ 存在。
 *
 * Electrobun 的 `build.copy` 要求源文件必须存在，所以即使使用 HMR（UI 由
 * Vite dev server 提供），应用包里也需要一份 views 回退资源。
 * 已在 `app:dev` 前调用：仅当 dist/index.html 缺失时才执行一次构建。
 */

import { existsSync } from "node:fs";

if (!existsSync("dist/index.html")) {
  console.log("[aurora] dist/ 缺失，先执行一次 vite build ...");

  const result = Bun.spawnSync([process.execPath, "x", "vite", "build"], {
    stdio: ["inherit", "inherit", "inherit"],
  });

  if (result.exitCode !== 0) {
    process.exit(result.exitCode ?? 1);
  }
}
