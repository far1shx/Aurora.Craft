import fs from "node:fs/promises";
import envPaths from "env-paths";
import { rpc } from "mirinjs/rpc";
import appConfig from "../../mirin.config.ts";

const data = envPaths(appConfig.name, { suffix: "" }).data.replace(/[\\/]Data$/, "");

export const toolController = rpc.router({
  defaultLibraryPath: rpc.query(async (_: null) => {
    await fs.mkdir(data, { recursive: true });
    return data;
  }),
});

export type ToolController = typeof toolController;
