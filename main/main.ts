import { app } from "mirinjs";
import { configController } from "~/controllers/config.ts";
import { eventController } from "~/controllers/event.ts";
import { installController } from "~/controllers/install.ts";
import { instanceController } from "~/controllers/instance.ts";
import { launchController } from "~/controllers/launch.ts";
import { modrinthController } from "~/controllers/modrinth.ts";
import { toolController } from "~/controllers/tool.ts";
import { windowController } from "~/controllers/window.ts";
import { nestedRouter } from "~/lib/nested-rpc.ts";

export const appController = nestedRouter({
  window: windowController,
  install: installController,
  config: configController,
  tool: toolController,
  modrinth: modrinthController,
  event: eventController,
  launch: launchController,
  instance: instanceController,
});

export type AppController = typeof appController;

app.serve(appController);

app.on("ready", () => undefined);
app.on("window-all-closed", () => {
  app.quit();
});
