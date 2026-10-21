import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "smol-toml";
import type { InstanceController } from "~/controllers/instance.ts";
import { toast } from "~/lib/toast.ts";
import type { QueryInput } from "~/lib/utils.ts";
import type { InstanceConfig } from "~/types/instance.ts";

export async function instanceConfig({
  options,
}: {
  options: QueryInput<InstanceController["routes"]["config"]>;
}): Promise<InstanceConfig> {
  const c = path.join(options.library, "instances", options.name, "ac.config.toml");

  if (await fs.exists(c)) return parse(await Bun.file(c).text()) as unknown as InstanceConfig;
  else {
    toast({
      title: "未找到实例配置文件",
      type: "error",
    });
    throw Error("instance configuration file not found");
  }
}
