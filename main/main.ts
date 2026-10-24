import { BrowserView, BrowserWindow, Updater } from "electrobun/main";
import { createAccountController } from "~/controllers/account.ts";
import { configController } from "~/controllers/config.ts";
import { installController } from "~/controllers/install.ts";
import { createInstanceController } from "~/controllers/instance.ts";
import { launchController } from "~/controllers/launch.ts";
import { modrinthController } from "~/controllers/modrinth.ts";
import { toolController } from "~/controllers/tool.ts";
import { windowController } from "~/controllers/window.ts";
import type { AppRPC } from "~/lib/rpc-schema.ts";
import { setMainWindow } from "~/lib/window.ts";

const DEV_SERVER_URL = "http://127.0.0.1:5173";
const PACKAGED_VIEW_URL = "views://main/index.html";

export const rpc = BrowserView.defineRPC<AppRPC>({
  handlers: {
    requests: {},
    messages: {},
  },
});

// Merge all controller handlers into a flat "namespace.method" handler map
type RequestHandlers = NonNullable<
  Parameters<typeof BrowserView.defineRPC<AppRPC>>[0]["handlers"]["requests"]
>;

const handlers = {
  ...windowController,
  ...installController,
  ...configController,
  ...toolController,
  ...modrinthController,
  ...launchController,
  ...createInstanceController(rpc),
  ...createAccountController(rpc),
} as unknown as RequestHandlers;

rpc.setRequestHandler(handlers);

const mainWindow = new BrowserWindow({
  title: "Aurora Craft",
  url: PACKAGED_VIEW_URL,
  frame: {
    width: 800,
    height: 520,
  },
  titleBarStyle: "hiddenInset",
  rpc,
});

setMainWindow(mainWindow);

async function upgradeToDevServer(): Promise<void> {
  try {
    const info = await Updater.getLocalInfo();
    if (info.channel !== "dev") return;

    const response = await fetch(DEV_SERVER_URL, { method: "HEAD" });
    if (!response.ok) return;

    console.log(`[aurora] HMR: using Vite dev server at ${DEV_SERVER_URL}`);
    mainWindow.webview.loadURL(DEV_SERVER_URL);
  } catch {
    // dev server 未启动，继续使用打包资源
  }
}

void upgradeToDevServer();
