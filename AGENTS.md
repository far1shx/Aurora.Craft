# AGENTS.md

Aurora Craft：基于 [mirin](https://github.com/Netko-Labs/mirin)（Bun + Chromium/CEF 桌面框架）的跨平台 Minecraft 启动器。

## 常用命令

- `bun install` — 安装依赖（包管理器是 Bun，有 bun.lock）
- `bun run dev` — 启动桌面应用 + Vite dev server（端口 5173，strictPort）
- `bun run build` — 打包独立应用（前端产物在 `dist/`，可执行应用在 `build/`）
- `bunx biome check --write .` — lint + 格式化（package.json 中没有 lint/format 脚本）
- `bunx tsc --noEmit` — 类型检查
- `bunx mirin doctor` — 检查项目与环境；`bunx mirin check` — 启动一次并截图，可做冒烟验证
- 没有测试框架，也没有 CI

## 架构：双进程 + 类型化 RPC

- `main/` — 主进程，运行在 **Bun 运行时**（可用 `Bun.file`、`Bun.write`、`bun:ffi`）
- `ui/` — 渲染进程（React 19），只有浏览器 API，与主进程**只能通过 RPC 通信**
- 路径别名（tsconfig.json 与 vite.config.ts **两处都有定义，改动需同步**）：
  - `@/*` → `ui/*`，`~/*` → `main/*`
  - import 需带 `.ts`/`.tsx` 扩展名（`allowImportingTsExtensions`）

### RPC 模式（新增功能的核心流程）

1. 在 `main/controllers/*.ts` 用 `rpc.router({...})` 定义 `rpc.query` / `rpc.mutation` / `rpc.event`
2. 在 `main/main.ts` 的 `nestedRouter({...})` 中注册命名空间，路由会扁平为 `"namespace.method"`
3. UI 侧通过 `@/lib/controller.ts` 导出的 `api` 调用：`api.window.min(null)`；事件用 `api.event.task.on(cb)`（返回取消订阅函数）

**关键约束：UI 只能 `import type { AppController } from "~/main.ts"`，绝不能把主进程的运行时值 import 进 UI 代码。**

- 处理器入参类型用 `~/lib/utils.ts` 的 `QueryInput` / `MutationInput` / `EventPayload` 从路由类型反推，不要手写重复类型
- 主进程向 UI 广播用 `app.rpc["event.toast"]?.broadcast(...)`（见 `main/lib/toast.ts`）；全局事件只有 `event.task`（任务进度）和 `event.toast`（通知），在 `ui/app.tsx` 统一订阅
- 业务逻辑放 `main/service/`（Minecraft 安装、实例、启动、库规则）和 `main/lib/`（下载等），controller 只做薄封装

## UI 约定

- Tailwind CSS 4 **CSS-first**：没有 tailwind.config，主题变量在 `ui/assets/globals.css`
- shadcn 配置为 `base-nova` 风格，底层是 **@base-ui/react（不是 Radix）**，图标库 tabler；`bunx shadcn add <name>` 生成到 `ui/components/ui/`，另配置了 @kibo-ui registry
- 目录划分：`ui/components/ui/`（shadcn 生成）、`aurora/`（自研通用组件）、`app/`（导航/标题栏）、`sheet/`（任务面板）、`command/`；页面在 `ui/pages/`，路由在 `ui/main.tsx` 的 `createHashRouter` 中手动注册
- 客户端状态用 **valtio** proxy（`ui/store/`、`ui/config/settings.ts`），服务端状态用 TanStack Query
- 设置持久化：`settingsConfig`（valtio）subscribe + debounce 自动经 `api.config.set` 存为 TOML，落盘在 OS 配置目录（`envPaths`，见 `main/controllers/config.ts`）
- 长任务模式：UI 侧 `task.add(title)`（`ui/lib/task.ts`）创建条目 → 主进程经 `event.task` 按 id 广播进度 → `TaskSheet` 展示
- motion 库的 import 路径是 `"motion/react"`；`import.meta.env.APP_VERSION` 由 vite.config.ts 从 package.json 注入

## 代码风格（Biome，比默认严格，容易踩坑）

- `noExplicitAny`、`noImplicitAnyLet`、nursery `useExplicitType` 均为 **error** —— 变量/参数普遍需要显式类型标注（这是代码中大量 `const x: string = ...` 的原因）
- `noUnusedImports` / `noUnusedVariables` 为 error
- 双引号、总是分号、行宽 100、2 空格缩进、import 按字典序自动整理
- 确需绕过规则时用 `// biome-ignore lint/<rule>: <说明>` 注释
- TypeScript：`strict` + `noUncheckedIndexedAccess`（索引访问需判空）+ `verbatimModuleSyntax`（纯类型导入必须写 `import type`）

## 其他

- `mirin.config.ts` 是应用清单（app id、入口 `main/main.ts`、窗口定义）；其中 Windows 下通过 `bun:ffi` 调 user32.dll 按系统 DPI 缩放窗口尺寸
- `.mirin/`、`dist/`、`build/` 均为生成产物（已 gitignore），不要手动修改或提交
- 提交信息使用中文，格式如 `[初次提交]`
