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
    const entries = await fs.readdir(instances, {
      withFileTypes: true,
    });

    const results = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map(async (entry) => {
          try {
            return {
              ...parse(await Bun.file(path.join(instances, entry.name, "ac.config.toml")).text()),
              library: options.library,
            } as unknown as InstanceConfig & { library: string };
          } catch {
            toast({
              title: "未找到实例配置文件",
              description: `实例 ${entry.name} 未找到配置文件`,
              type: "error",
            });
            return undefined;
          }
        }),
    );

    return results.filter((item) => item !== undefined);
  }),
});

export type InstanceController = typeof instanceController;
