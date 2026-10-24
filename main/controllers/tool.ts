import fs from "node:fs/promises";
import envPaths from "env-paths";

const data = envPaths("aurora.craft", { suffix: "" }).data.replace(/[\\/]Data$/, "");

export const toolController = {
  "tool.defaultLibraryPath": async (_: null): Promise<string> => {
    await fs.mkdir(data, { recursive: true });
    return data;
  },
};

export type ToolController = typeof toolController;
