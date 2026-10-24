import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "smol-toml";
import type { AppRPC } from "~/lib/rpc-schema.ts";
import { type ToastSender, toast } from "~/lib/toast.ts";
import type { InstanceConfig } from "~/types/instance.ts";

export async function instanceConfig({
  options,
  rpc,
}: {
  options: AppRPC["bun"]["requests"]["instance.config"]["params"];
  rpc?: ToastSender;
}): Promise<InstanceConfig> {
  const file = path.join(options.library, "instances", options.name, "ac.config.toml");

  if (await fs.exists(file)) {
    return parse(await Bun.file(file).text()) as unknown as InstanceConfig;
  }

  if (rpc) {
    toast(rpc, {
      title: "未找到实例配置文件",
      type: "error",
    });
  }

  throw Error("instance configuration file not found");
}
