import * as path from "node:path";
import envPaths from "env-paths";
import { rpc } from "mirinjs/rpc";
import { parse, stringify } from "smol-toml";
import appConfig from "../../mirin.config.ts";

const config = path.join(
  envPaths(appConfig.name, { suffix: "" }).config.replace(/[\\/]Config$/, ""),
  "config",
);

export const configController = rpc.router({
  get: rpc.mutation(async ({ name, root = config }: { name: string; root?: string }) => {
    const file = Bun.file(path.join(root, `${name}.toml`));

    if (!(await file.exists())) {
      return {};
    }

    try {
      return parse(await file.text());
    } catch {
      return {};
    }
  }),
  set: rpc.mutation(
    async ({
      name,
      data,
      root = config,
    }: {
      name: string;
      data: Record<string, unknown>;
      root?: string;
    }) => {
      const destination = path.join(root, `${name}.toml`);
      await Bun.write(destination, stringify(data));
    },
  ),
});

export type ConfigController = typeof configController;
