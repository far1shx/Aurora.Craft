import fs from "node:fs/promises";
import path from "node:path";
import { rpc } from "mirinjs/rpc";
import { parse } from "smol-toml";
import { toast } from "~/lib/toast.ts";
import { instanceConfig } from "~/service/instance.ts";
import type { InstanceConfig } from "~/types/instance.ts";

export const instanceController = rpc.router({
  check: rpc.query(async (options: { library: string; name: string }) => {
    const instance = path.join(options.library, "instances", options.name);

    return await fs
      .access(instance)
      .then(async () => {
        return (await fs.readdir(instance)).length > 0;
      })
      .catch(() => {
        return false;
      });
  }),
  config: rpc.query(
    (options: { library: string; name: string }): ReturnType<typeof instanceConfig> =>
      instanceConfig({ options }),
  ),
  scan: rpc.query(async (options: { library: string }) => {
    const instances = path.join(options.library, "instances");

    const entries = await fs.readdir(instances, { withFileTypes: true }).catch(() => []);

    const results = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map(async (entry): Promise<(InstanceConfig & { library: string }) | string> => {
          try {
            const config = parse(
              await Bun.file(path.join(instances, entry.name, "ac.config.toml")).text(),
            );

            return { ...config, library: options.library } as unknown as InstanceConfig & {
              library: string;
            };
          } catch {
            return entry.name;
          }
        }),
    );

    const valid = results.filter(
      (item): item is InstanceConfig & { library: string } => typeof item !== "string",
    );
    const missing = results.filter((item): item is string => typeof item === "string");

    if (missing.length > 0) {
      toast({
        title: "部分实例无法读取",
        description: `${missing.join("、")} 未找到配置文件或仍在安装`,
        type: "error",
      });
    }

    return valid;
  }),
});

export type InstanceController = typeof instanceController;
