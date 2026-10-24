import * as path from "node:path";
import envPaths from "env-paths";
import { parse, stringify } from "smol-toml";

const config = path.join(
  envPaths("aurora.craft", { suffix: "" }).config.replace(/[\\/]Config$/, ""),
  "config",
);

export const configController = {
  "config.get": async ({
    name,
    root = config,
  }: {
    name: string;
    root?: string;
  }): Promise<Record<string, unknown>> => {
    const file = Bun.file(path.join(root, `${name}.toml`));

    if (!(await file.exists())) {
      return {};
    }

    try {
      return parse(await file.text());
    } catch {
      return {};
    }
  },
  "config.set": async ({
    name,
    data,
    root = config,
  }: {
    name: string;
    data: Record<string, unknown>;
    root?: string;
  }): Promise<void> => {
    const destination = path.join(root, `${name}.toml`);
    await Bun.write(destination, stringify(data));
  },
};

export type ConfigController = typeof configController;
