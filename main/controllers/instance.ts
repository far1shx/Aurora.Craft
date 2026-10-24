import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "smol-toml";
import { type ToastSender, toast } from "~/lib/toast.ts";
import { instanceConfig } from "~/service/instance.ts";
import type { InstanceConfig } from "~/types/instance.ts";

export function createInstanceController(rpc: ToastSender): {
  "instance.check": (options: { library: string; name: string }) => Promise<boolean>;
  "instance.config": (options: { library: string; name: string }) => Promise<InstanceConfig>;
  "instance.scan": (options: {
    library: string;
  }) => Promise<(InstanceConfig & { library: string })[]>;
} {
  return {
    "instance.check": async (options: { library: string; name: string }): Promise<boolean> => {
      const instance = path.join(options.library, "instances", options.name);

      return await fs
        .access(instance)
        .then(async () => {
          return (await fs.readdir(instance)).length > 0;
        })
        .catch(() => {
          return false;
        });
    },
    "instance.config": (options: { library: string; name: string }): Promise<InstanceConfig> =>
      instanceConfig({ options, rpc }),
    "instance.scan": async (options: {
      library: string;
    }): Promise<(InstanceConfig & { library: string })[]> => {
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
        toast(rpc, {
          title: "部分实例无法读取",
          description: `${missing.join("、")} 未找到配置文件或仍在安装`,
          type: "error",
        });
      }

      return valid;
    },
  };
}

export type InstanceController = ReturnType<typeof createInstanceController>;
