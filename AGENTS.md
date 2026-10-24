Aurora Craft：基于 [Electrobun](https://electrobun.dev)（Bun + WebView/CEF）的跨平台 Minecraft 启动器。

## 常用命令

- `bun install` — 安装依赖（包管理器是 Bun，有 bun.lock）
- `bun run dev` — 默认开发模式：Vite dev server(5173) + 应用并行，UI 热更新；`dist/` 已存在时不再构建
- `bun run dev:watch` — 构建一次 + `hutch electrobun dev --watch`（改主进程自动重启，UI 不热更新）
- `bun run build` — 生产构建（Vite 构建 + `hutch electrobun build --env=stable`）
- `bun run vite:build` — 只构建前端（输出到 `dist/`）
- `bun run app:dev` — 只启动应用（HMR 模式的另一半，便于单独调试主进程）
- `bunx biome check --write .` — lint + 格式化
- `bunx tsc --noEmit` — 类型检查
- 没有测试框架，也没有 CI

前置条件：全局安装 Hutch（`hutch --version` 可用），Electrobun 核心与 Bun toolchain 由 Hutch 管理在 `~/.hutch`。

## 架构：双进程 + 类型化 RPC

- `main/` — 主进程，运行在 **Bun 运行时**（可用 `Bun.file`、`Bun.write`）
- `ui/` — 渲染进程（React 19），只有浏览器 API，与主进程**只能通过 RPC 通信**
- 路径别名（tsconfig.json 与 vite.config.ts **两处都有定义，改动需同步**）：`@/*` → `ui/*`，`~/*` → `main/*`
- import 需带 `.ts`/`.tsx` 扩展名（`allowImportingTsExtensions`）

### 构建链路（Electrobun 不内置 Vite）

1. `vite build` 把 `index.html` + `ui/` 打包到 `dist/`（`base: "./"`，供 `views://` 使用）
2. `electrobun.config.ts` 的 `build.copy` 把 `dist/index.html`、`dist/assets` 复制到 `views/main/`
3. 主进程加载 `views://main/index.html`；dev 模式下若检测到 5173 端口则改连 Vite dev server
4. `electrobun.config.ts` 里 **不要**直接 copy 源 `index.html`（它引用未编译的 `/ui/main.tsx`）

### RPC 模式（新增功能的核心流程）

1. 在 `main/lib/rpc-schema.ts` 的 `AppRequests` / `AppMessages` 中定义类型
2. 在 `main/controllers/*.ts` 中实现对应 handler
3. 在 `main/main.ts` 中合并所有 handler，通过 `BrowserView.defineRPC<AppRPC>()` 创建实例后 `rpc.setRequestHandler(...)`
4. UI 侧通过 `@/lib/controller.ts` 导出的 `api` 调用：`api.window.min(null)`；事件用 `api.event.task.on(cb)`

**消息方向容易搞反（Electrobun 的 send 发往「对端」的 messages）：**

- 主进程 → UI 的事件写在 `webview.messages`（`AppMessages`），主进程用 `rpc.send["event.task"](payload)`，UI 用 `rpc.addMessageListener("event.task", cb)`
- UI → 主进程的单向消息才写在 `bun.messages`

**关键约束：UI 只能 `import type` 引用 `main/` 下的类型，绝不能把主进程的运行时值 import 进 UI 代码。**

- `ui/lib/rpc.ts` 负责创建 Electroview 并注入 transport，必须由 `ui/main.tsx` 首先 import
- 长任务（安装/下载）请求把 `maxRequestTime` 设为 `Infinity`
- 业务逻辑放 `main/service/` 和 `main/lib/`，controller 只做薄封装；需要 toast 的 controller 用工厂函数接收 rpc

## UI 约定

- Tailwind CSS 4 **CSS-first**：没有 tailwind.config，主题变量在 `ui/assets/globals.css`
- shadcn 配置为 `base-nova` 风格，底层是 **@base-ui/react（不是 Radix）**，图标库 tabler；`bunx shadcn add <name>` 生成到 `ui/components/ui/`
- 目录划分：`ui/components/ui/`（shadcn 生成）、`aurora/`（自研通用组件）、`app/`（导航/标题栏）、`sheet/`（任务面板）、`command/`；页面在 `ui/pages/`，路由在 `ui/main.tsx` 的 `createHashRouter` 中手动注册
- 客户端状态用 **valtio** proxy（`ui/store/`、`ui/config/settings.ts`），服务端状态用 TanStack Query
- 设置持久化：`settingsConfig`（valtio）subscribe + debounce 自动经 `api.config.set` 存为 TOML，落盘在 OS 配置目录（`envPaths`，见 `main/controllers/config.ts`）
- 长任务模式：UI 侧 `task.add(title)`（`ui/lib/task.ts`）创建条目 → 主进程经 `event.task` 按 id 广播进度 → `TaskSheet` 展示
- 无边框标题栏：`titleBarStyle: "hiddenInset"` + CSS `WebkitAppRegion: "drag"/"no-drag"`（`ui/lib/drag.ts`）
- motion 库的 import 路径是 `"motion/react"`；`import.meta.env.APP_VERSION` 由 vite.config.ts 从 package.json 注入

## 代码风格（Biome，比默认严格，容易踩坑）

- `noExplicitAny`、`noImplicitAnyLet`、nursery `useExplicitType` 均为 **error** —— 变量/参数/返回值普遍需要显式类型标注
- `noUnusedImports` / `noUnusedVariables` 为 error
- 双引号、总是分号、行宽 100、2 空格缩进、import 按字典序自动整理
- 确需绕过规则时用 `// biome-ignore lint/<rule>: <说明>` 注释
- TypeScript：`strict` + `noUncheckedIndexedAccess` + `verbatimModuleSyntax`

## 配置文件

- `electrobun.config.ts` — 应用清单（app/identifier/version、主进程入口、`build.copy`、窗口相关构建项）
- `hutch.config.ts` — Hutch 任务（install / prepare / dev / hmr / dev:hmr / build）
- `vite.config.ts` — Vite 配置（root、别名、Electrobun SDK 别名、`dist` 输出）
- `tsconfig.json` — TypeScript 配置，paths 同时包含项目别名与 Electrobun SDK 类型（SDK 由 `.hutch/devkit` 投影）

## 其他

- `.hutch/`、`dist/`、`build/`、`artifacts/` 均为生成产物（已 gitignore），不要手动修改或提交
- Electrobun 的 `BrowserWindow` 目前不支持最小窗口尺寸；如需限制需自行监听 resize
- 提交信息使用中文，格式如 `[初次提交]`
